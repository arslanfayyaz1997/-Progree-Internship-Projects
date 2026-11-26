process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
process.env.DATABASE_FILE = ':memory:';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

let token;
before(async () => {
  await request(app).post('/api/auth/register').send({ name: 'Test User', email: 'test@example.com', password: 'password123' }).expect(201);
  const login = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' }).expect(200);
  token = login.body.token;
});
test('health endpoint works', async () => {
  const r = await request(app).get('/health').expect(200);
  assert.equal(r.body.status, 'ok');
});
test('protected CRUD lifecycle works', async () => {
  await request(app).get('/api/projects').expect(401);
  const created = await request(app).post('/api/projects').set('Authorization', `Bearer ${token}`)
    .send({ title: 'Demo API', description: 'Integration test' }).expect(201);
  const id = created.body.data.id;
  await request(app).get(`/api/projects/${id}`).set('Authorization', `Bearer ${token}`).expect(200);
  await request(app).put(`/api/projects/${id}`).set('Authorization', `Bearer ${token}`)
    .send({ title: 'Updated API', description: 'Updated' }).expect(200);
  await request(app).delete(`/api/projects/${id}`).set('Authorization', `Bearer ${token}`).expect(204);
  await request(app).get(`/api/projects/${id}`).set('Authorization', `Bearer ${token}`).expect(404);
});