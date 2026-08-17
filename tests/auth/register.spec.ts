import request from 'supertest';
import type { DataSource } from 'typeorm';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { User } from '../../src/modules/user/userEntity.js';
import { RefreshToken } from '../../src/modules/token/refreshTokenEntity.js';
import { UserRole } from '../../src/types/index.js';
import { extractTokens, isJwt, userData } from '../utils.js';

describe('POST /auth/register', () => {
  let connection: DataSource;

  beforeAll(async () => {
    connection = await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await connection.dropDatabase();
    await connection.synchronize();
  });

  afterAll(async () => {
    await connection.destroy();
  });

  describe('given all fields', () => {
    it('should return 201 status code', async () => {
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.statusCode).toBe(201);
    });

    it('should return valid JSON response', async () => {
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.headers['content-type']).toEqual(expect.stringContaining('json'));
    });

    it('should return the id of the created user', async () => {
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.body).toHaveProperty('id');
    });

    it('should persist the user in the database', async () => {
      await request(app).post('/auth/register').send(userData);

      const users = await connection.getRepository(User).find();

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe(userData.name);
      expect(users[0].email).toBe(userData.email);
    });

    it('should assign the user role by default', async () => {
      await request(app).post('/auth/register').send(userData);

      const users = await connection.getRepository(User).find();

      expect(users[0]).toHaveProperty('role');
      expect(users[0].role).toBe(UserRole.USER);
    });

    it('should store a hashed password, never the plain one', async () => {
      await request(app).post('/auth/register').send(userData);

      const users = await connection
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .getMany();

      expect(users[0].password).not.toBe(userData.password);
      expect(users[0].password).toHaveLength(60);
    });

    it('should not expose the password on the response', async () => {
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should set access token and refresh token cookies', async () => {
      const response = await request(app).post('/auth/register').send(userData);

      const { accessToken, refreshToken } = extractTokens(response.headers);

      expect(accessToken).not.toBeNull();
      expect(refreshToken).not.toBeNull();
      expect(isJwt(accessToken)).toBe(true);
      expect(isJwt(refreshToken)).toBe(true);
    });

    it('should store the refresh token in the database', async () => {
      await request(app).post('/auth/register').send(userData);

      const users = await connection.getRepository(User).find();
      const tokens = await connection
        .getRepository(RefreshToken)
        .createQueryBuilder('refreshToken')
        .where('refreshToken.userId = :userId', { userId: users[0].id })
        .getMany();

      expect(tokens).toHaveLength(1);
    });
  });

  describe('given a duplicate email', () => {
    it('should return 400 and not create a second user', async () => {
      await request(app).post('/auth/register').send(userData);
      const response = await request(app).post('/auth/register').send(userData);

      expect(response.statusCode).toBe(400);

      const users = await connection.getRepository(User).find();
      expect(users).toHaveLength(1);
    });
  });

  describe('given missing or invalid fields', () => {
    it.each([
      ['name is missing', { ...userData, name: '' }],
      ['email is missing', { ...userData, email: '' }],
      ['password is missing', { ...userData, password: '' }],
      ['email is not a valid email', { ...userData, email: 'not-an-email' }],
      ['password is shorter than 8 chars', { ...userData, password: 'Ab@1' }],
      ['password is not strong', { ...userData, password: 'password' }],
    ])('should return 400 when %s', async (_label, body) => {
      const response = await request(app).post('/auth/register').send(body);

      expect(response.statusCode).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should not persist a user when validation fails', async () => {
      await request(app)
        .post('/auth/register')
        .send({ ...userData, email: 'not-an-email' });

      const users = await connection.getRepository(User).find();
      expect(users).toHaveLength(0);
    });

    it('should trim whitespace around the email', async () => {
      await request(app)
        .post('/auth/register')
        .send({ ...userData, email: `  ${userData.email}  ` });

      const users = await connection.getRepository(User).find();
      expect(users[0].email).toBe(userData.email);
    });
  });
});
