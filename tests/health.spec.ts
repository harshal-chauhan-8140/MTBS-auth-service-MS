import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('should return 200 with a running message', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe('server is running.');
  });

  it('should serve the jwks document from the public directory', async () => {
    const response = await request(app).get('/.well-known/jwks.json');

    expect(response.statusCode).toBe(200);
    expect(response.body.keys.length).toBeGreaterThan(0);
  });
});
