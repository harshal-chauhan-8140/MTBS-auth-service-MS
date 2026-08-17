import request from 'supertest';
import type { DataSource } from 'typeorm';
import type { JWKSMock } from 'mock-jwks';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { User } from '../../src/modules/user/userEntity.js';
import { UserRole } from '../../src/types/index.js';
import { createJWKMock, JWKS_HOST, userData } from '../utils.js';

describe('POST /users', () => {
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

  const adminToken = () => jwks.token({ sub: '1', role: UserRole.ADMIN });

  describe('given an admin token and all fields', () => {
    it('should return 201 status code', async () => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.statusCode).toBe(201);
    });

    it('should return the id of the created user', async () => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.body).toHaveProperty('id');
    });

    it('should persist the user with the given role', async () => {
      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      const users = await connection.getRepository(User).find();

      expect(users).toHaveLength(1);
      expect(users[0].role).toBe(UserRole.MOVIE_THEATER_OWNER);
    });

    it('should be able to create another admin', async () => {
      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.ADMIN });

      const users = await connection.getRepository(User).find();

      expect(users[0].role).toBe(UserRole.ADMIN);
    });

    it('should not expose the password on the response', async () => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.body).not.toHaveProperty('password');
    });

    it('should store a hashed password, never the plain one', async () => {
      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      const users = await connection
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.password')
        .getMany();

      expect(users[0].password).not.toBe(userData.password);
      expect(users[0].password).toHaveLength(60);
    });

    it('should not set access token or refresh token cookies', async () => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('given a duplicate email', () => {
    it('should return 400 and not create a second user', async () => {
      const body = { ...userData, role: UserRole.MOVIE_THEATER_OWNER };

      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send(body);

      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send(body);

      expect(response.statusCode).toBe(400);

      const users = await connection.getRepository(User).find();
      expect(users).toHaveLength(1);
    });
  });

  describe('given missing or invalid fields', () => {
    const body = { ...userData, role: UserRole.MOVIE_THEATER_OWNER };

    it.each([
      ['name is missing', { ...body, name: '' }],
      ['email is missing', { ...body, email: '' }],
      ['password is missing', { ...body, password: '' }],
      ['email is not a valid email', { ...body, email: 'not-an-email' }],
      ['password is shorter than 8 chars', { ...body, password: 'Ab@1' }],
      ['role is missing', { ...body, role: '' }],
      ['role is not a recognised role', { ...body, role: 'superadmin' }],
    ])('should return 400 when %s', async (_label, invalidBody) => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send(invalidBody);

      expect(response.statusCode).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should not persist a user when validation fails', async () => {
      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${adminToken()}`])
        .send({ ...body, role: 'superadmin' });

      const users = await connection.getRepository(User).find();
      expect(users).toHaveLength(0);
    });
  });

  describe('given no or non-admin access', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/users')
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when the caller is a regular user', async () => {
      const userToken = jwks.token({ sub: '1', role: UserRole.USER });

      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${userToken}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when the caller is a theater owner', async () => {
      const ownerToken = jwks.token({ sub: '1', role: UserRole.MOVIE_THEATER_OWNER });

      const response = await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${ownerToken}`])
        .send({ ...userData, role: UserRole.ADMIN });

      expect(response.statusCode).toBe(403);
    });

    it('should not persist a user when access is denied', async () => {
      const userToken = jwks.token({ sub: '1', role: UserRole.USER });

      await request(app)
        .post('/users')
        .set('Cookie', [`accessToken=${userToken}`])
        .send({ ...userData, role: UserRole.MOVIE_THEATER_OWNER });

      const users = await connection.getRepository(User).find();
      expect(users).toHaveLength(0);
    });
  });
});
