import request from 'supertest';
import type { DataSource } from 'typeorm';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { RefreshToken } from '../../src/modules/token/refreshTokenEntity.js';
import { extractTokens, isJwt, userData } from '../utils.js';

describe('POST /auth/login', () => {
  let connection: DataSource;

  beforeAll(async () => {
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.synchronize();

    await request(app).post('/auth/register').send(userData);
  });

  afterAll(async () => {
    await connection.destroy();
  });

  const login = (body: Record<string, string>) => request(app).post('/auth/login').send(body);

  describe('given correct credentials', () => {
    it('should return 200 status code', async () => {
      const response = await login({ email: userData.email, password: userData.password });

      expect(response.statusCode).toBe(200);
    });

    it('should return valid JSON response', async () => {
      const response = await login({ email: userData.email, password: userData.password });

      expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return the id of the logged in user', async () => {
      const response = await login({ email: userData.email, password: userData.password });

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('success');
    });

    it('should not leak the password hash in the response', async () => {
      const response = await login({ email: userData.email, password: userData.password });

      expect(JSON.stringify(response.body)).not.toContain('$2b$');
    });

    it('should set access token and refresh token cookies', async () => {
      const response = await login({ email: userData.email, password: userData.password });

      const { accessToken, refreshToken } = extractTokens(response.headers);

      expect(accessToken).not.toBeNull();
      expect(refreshToken).not.toBeNull();
      expect(isJwt(accessToken)).toBe(true);
      expect(isJwt(refreshToken)).toBe(true);
    });

    it('should persist a new refresh token per login', async () => {
      const repository = connection.getRepository(RefreshToken);
      const before = await repository.count();

      await login({ email: userData.email, password: userData.password });

      expect(await repository.count()).toBe(before + 1);
    });
  });

  describe('given wrong credentials', () => {
    it('should return 400 when the password is wrong', async () => {
      const response = await login({ email: userData.email, password: 'Wrong@1234' });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when the email does not exist', async () => {
      const response = await login({ email: 'nobody@gmail.com', password: userData.password });

      expect(response.statusCode).toBe(400);
    });

    it('should return the same message for wrong email and wrong password', async () => {
      const wrongEmail = await login({ email: 'nobody@gmail.com', password: userData.password });
      const wrongPassword = await login({ email: userData.email, password: 'Wrong@1234' });

      expect(wrongEmail.body.message).toBe(wrongPassword.body.message);
      expect(wrongPassword.body.status).toBe('error');
    });

    it('should not set any cookies on a failed login', async () => {
      const response = await login({ email: userData.email, password: 'Wrong@1234' });

      const { accessToken, refreshToken } = extractTokens(response.headers);

      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
    });
  });

  describe('given missing or invalid fields', () => {
    it.each([
      ['email is missing', { email: '', password: userData.password }],
      ['password is missing', { email: userData.email, password: '' }],
      ['email is not a valid email', { email: 'not-an-email', password: userData.password }],
    ])('should return 400 when %s', async (_label, body) => {
      const response = await login(body);

      expect(response.statusCode).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});
