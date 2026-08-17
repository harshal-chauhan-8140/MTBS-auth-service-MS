import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { JWKSMock } from 'mock-jwks';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { User } from '../../src/modules/user/userEntity.js';
import { RefreshToken } from '../../src/modules/token/refreshTokenEntity.js';
import { createJWKMock, extractTokens, isJwt, JWKS_HOST, userData } from '../utils.js';

describe('POST /auth/verify', () => {
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

  // register gives us a real refresh token; the access token has to be re-minted
  // through the jwks mock so the authenticate middleware can verify it
  const createSession = async () => {
    const registerResponse = await request(app).post('/auth/register').send(userData);
    const { refreshToken } = extractTokens(registerResponse.headers);

    const user = await connection.getRepository(User).findOneOrFail({
      where: { email: userData.email },
    });

    const accessToken = jwks.token({ sub: String(user.id), role: user.role });

    return { user, accessToken, refreshToken };
  };

  const verify = (accessToken?: string | null, refreshToken?: string | null) => {
    const cookies: string[] = [];
    if (accessToken) cookies.push(`accessToken=${accessToken}`);
    if (refreshToken) cookies.push(`refreshToken=${refreshToken}`);

    return request(app).post('/auth/verify').set('Cookie', cookies).send();
  };

  describe('given valid access and refresh tokens', () => {
    it('should return 200 status code', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await verify(accessToken, refreshToken);

      expect(response.statusCode).toBe(200);
    });

    it('should return valid JSON response', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await verify(accessToken, refreshToken);

      expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return the id of the user', async () => {
      const { user, accessToken, refreshToken } = await createSession();

      const response = await verify(accessToken, refreshToken);

      expect(response.body.id).toBe(user.id);
      expect(response.body.status).toBe('success');
    });

    it('should set fresh access and refresh token cookies', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await verify(accessToken, refreshToken);
      const tokens = extractTokens(response.headers);

      expect(isJwt(tokens.accessToken)).toBe(true);
      expect(isJwt(tokens.refreshToken)).toBe(true);
    });

    it('should issue a refresh token different from the one used', async () => {
      const { accessToken, refreshToken } = await createSession();

      const response = await verify(accessToken, refreshToken);

      expect(extractTokens(response.headers).refreshToken).not.toBe(refreshToken);
    });

    it('should rotate the refresh token row in the database', async () => {
      const { user, accessToken, refreshToken } = await createSession();
      const repository = connection.getRepository(RefreshToken);

      const before = await repository
        .createQueryBuilder('refreshToken')
        .where('refreshToken.userId = :userId', { userId: user.id })
        .getMany();
      expect(before).toHaveLength(1);

      await verify(accessToken, refreshToken);

      const after = await repository
        .createQueryBuilder('refreshToken')
        .where('refreshToken.userId = :userId', { userId: user.id })
        .getMany();

      expect(after).toHaveLength(1);
      expect(after[0].id).not.toBe(before[0].id);
    });
  });

  describe('given missing or invalid tokens', () => {
    it('should return 401 when no tokens are provided', async () => {
      const response = await verify();

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the access token is missing', async () => {
      const { refreshToken } = await createSession();

      const response = await verify(null, refreshToken);

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the refresh token is missing', async () => {
      const { accessToken } = await createSession();

      const response = await verify(accessToken, null);

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the refresh token is malformed', async () => {
      const { accessToken } = await createSession();

      const response = await verify(accessToken, 'not.a.valid.token');

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when an already rotated refresh token is reused', async () => {
      const { accessToken, refreshToken } = await createSession();

      await verify(accessToken, refreshToken);
      const response = await verify(accessToken, refreshToken);

      expect(response.statusCode).toBe(401);
    });
  });
});
