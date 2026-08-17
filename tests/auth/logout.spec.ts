import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { JWKSMock } from 'mock-jwks';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { User } from '../../src/modules/user/userEntity.js';
import { RefreshToken } from '../../src/modules/token/refreshTokenEntity.js';
import { createJWKMock, extractTokens, JWKS_HOST, userData } from '../utils.js';

describe('POST /auth/logout', () => {
  let connection: DataSource;
  let jwks: JWKSMock;

  beforeAll(async () => {
    jwks = createJWKMock(JWKS_HOST);
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    jwks.start();
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterEach(() => {
    jwks.stop();
  });

  afterAll(async () => {
    await connection.destroy();
  });

  const createSession = async () => {
    const registerResponse = await request(app).post('/auth/register').send(userData);
    const { refreshToken } = extractTokens(registerResponse.headers);

    const user = await connection.getRepository(User).findOneOrFail({
      where: { email: userData.email },
    });

    const accessToken = jwks.token({ sub: String(user.id), role: user.role });

    return { user, accessToken, refreshToken };
  };

  const logout = (accessToken?: string | null, refreshToken?: string | null) => {
    const cookies: string[] = [];
    if (accessToken) cookies.push(`accessToken=${accessToken}`);
    if (refreshToken) cookies.push(`refreshToken=${refreshToken}`);

    return request(app).post('/auth/logout').set('Cookie', cookies).send();
  };

  describe('given valid access and refresh tokens', () => {
    it('should return 200 status code', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await logout(accessToken, refreshToken);

      expect(response.statusCode).toBe(200);
    });

    it('should delete the refresh token from the database', async () => {
      const { user, accessToken, refreshToken } = await createSession();
      const repository = connection.getRepository(RefreshToken);

      const before = await repository
        .createQueryBuilder('refreshToken')
        .where('refreshToken.userId = :userId', { userId: user.id })
        .getMany();
      expect(before).toHaveLength(1);

      await logout(accessToken, refreshToken);

      const after = await repository
        .createQueryBuilder('refreshToken')
        .where('refreshToken.userId = :userId', { userId: user.id })
        .getMany();

      expect(after).toHaveLength(0);
    });

    it('should clear the access and refresh token cookies', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await logout(accessToken, refreshToken);
      const cookies = (response.headers as unknown as Record<string, string[]>)['set-cookie'] || [];

      // clearing a cookie emits an empty value with a past expiry
      expect(cookies.find((c) => c.startsWith('accessToken='))).toContain('accessToken=;');
      expect(cookies.find((c) => c.startsWith('refreshToken='))).toContain('refreshToken=;');
    });

    it('should not leave the user logged out of the database entirely', async () => {
      const { accessToken, refreshToken } = await createSession();

      await logout(accessToken, refreshToken);

      expect(await connection.getRepository(User).count()).toBe(1);
    });

    it('should make the revoked refresh token unusable on /auth/verify', async () => {
      const { accessToken, refreshToken } = await createSession();

      await logout(accessToken, refreshToken);

      const response = await request(app)
        .post('/auth/verify')
        .set('Cookie', [`accessToken=${accessToken}`, `refreshToken=${refreshToken}`])
        .send();

      expect(response.statusCode).toBe(401);
    });
  });

  describe('given missing tokens', () => {
    it('should return 401 when no tokens are provided', async () => {
      const response = await logout();

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the access token is missing', async () => {
      const { refreshToken } = await createSession();

      const response = await logout(null, refreshToken);

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the refresh token is missing', async () => {
      const { accessToken } = await createSession();

      const response = await logout(accessToken, null);

      expect(response.statusCode).toBe(401);
    });
  });
});
