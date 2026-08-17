import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import app from '../../src/app.js';
import { AppDataSource } from '../../src/data-source.js';
import { config } from '../../src/config/index.js';
import { UserRole } from '../../src/types/index.js';
import { userData } from '../utils.js';

describe('PATCH /users/:id/theaters', () => {
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

  const registerOwner = async () => {
    const response = await request(app).post('/auth/register-theater-owner').send(userData);

    return response.body.id as number;
  };

  describe('given the internal service key', () => {
    it("should return 200 and append the theaterId to the user's theaterIds", async () => {
      const userId = await registerOwner();

      const response = await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 7 });

      expect(response.statusCode).toBe(200);
      expect(response.body.theaterIds).toEqual([7]);
    });

    it('should not add the same theaterId twice', async () => {
      const userId = await registerOwner();

      await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 7 });

      const response = await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 7 });

      expect(response.body.theaterIds).toEqual([7]);
    });

    it('should return 404 for a user that does not exist', async () => {
      const response = await request(app)
        .patch('/users/999999/theaters')
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 7 });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for an invalid theaterId', async () => {
      const userId = await registerOwner();

      const response = await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 'not-a-number' });

      expect(response.statusCode).toBe(400);
    });

    it('should embed the updated theaterIds in the JWT on the next login', async () => {
      const userId = await registerOwner();

      await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', config.INTERNAL_SERVICE_SECRET)
        .send({ theaterId: 7 });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='))!;
      const accessToken = accessTokenCookie.split(';')[0].split('=')[1];

      const decoded = jwt.decode(accessToken) as { theaterIds?: number[]; role?: string };

      expect(decoded.theaterIds).toEqual([7]);
      expect(decoded.role).toBe(UserRole.MOVIE_THEATER_OWNER);
    });
  });

  describe('given no or an invalid internal service key', () => {
    it('should return 401 with no key', async () => {
      const userId = await registerOwner();

      const response = await request(app).patch(`/users/${userId}/theaters`).send({ theaterId: 7 });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with the wrong key', async () => {
      const userId = await registerOwner();

      const response = await request(app)
        .patch(`/users/${userId}/theaters`)
        .set('x-internal-service-key', 'wrong-key')
        .send({ theaterId: 7 });

      expect(response.statusCode).toBe(401);
    });
  });
});
