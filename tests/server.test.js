const request = require('supertest');
const app = require('../server');

test("GET / should return 200", async () => {
  const res = await request(app).get("/");
  expect(res.statusCode).toBe(200);
});
