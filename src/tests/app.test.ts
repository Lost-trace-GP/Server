import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('App', () => {
  it('should respond to health check', async () => {
    const response = await request(app).get('/api/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'success',
      message: 'API is running',
    });
  });
});
