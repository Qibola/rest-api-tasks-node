'use strict';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../src/app');

test('GET /health returns ok', async () => {
  const res = await request(createApp()).get('/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { status: 'ok' });
});

test('unknown routes return a JSON 404', async () => {
  const res = await request(createApp()).get('/nope');
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(res.body, { error: 'Not found' });
});
