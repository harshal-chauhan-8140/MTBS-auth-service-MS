import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { JWKSMock } from 'mock-jwks';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { User } from '../../src/modules/user/userEntity.js';
import { UserRole } from '../../src/types/index.js';
import { createJWKMock, JWKS_HOST, userData } from '../utils.js';

describe('GET /auth/self', () => {
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

  const seedUser = async () => {
    const user = await connection.getRepository(User).save({
      ...userData,
      role: UserRole.USER,
    });

    const accessToken = jwks.token({ sub: String(user.id), role: user.role });

    return { user, accessToken };
  };

  describe('given a valid access token', () => {
    it('should return 200 status code', async () => {
      const { accessToken } = await seedUser();

      const response = await request(app)
        .get('/auth/self')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send();

      expect(response.statusCode).toBe(200);
    });

    it('should return the authenticated user', async () => {
      const { user, accessToken } = await seedUser();

      const response = await request(app)
        .get('/auth/self')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send();

      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should not return the password field', async () => {
      const { accessToken } = await seedUser();

      const response = await request(app)
        .get('/auth/self')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send();

      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should accept the token from the Authorization header too', async () => {
      const { user, accessToken } = await seedUser();

      const response = await request(app)
        .get('/auth/self')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body.user.id).toBe(user.id);
    });
  });

  describe('given a missing or invalid access token', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app).get('/auth/self').send();

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the token is malformed', async () => {
      const response = await request(app)
        .get('/auth/self')
        .set('Cookie', ['accessToken=not.a.valid.token'])
        .send();

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when the token is expired', async () => {
      const { user } = await seedUser();

      const expiredToken = jwks.token({
        sub: String(user.id),
        role: user.role,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      const response = await request(app)
        .get('/auth/self')
        .set('Cookie', [`accessToken=${expiredToken}`])
        .send();

      expect(response.statusCode).toBe(401);
    });
  });
});
