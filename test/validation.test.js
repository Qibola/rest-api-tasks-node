'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');
const { validateTaskBody, parseId, MAX_TITLE_LENGTH } = require('../src/validate');

function tempApp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return createApp({ dataFile: path.join(dir, 'tasks.json') });
}

test('validateTaskBody accepts valid create and update bodies', () => {
  assert.deepStrictEqual(validateTaskBody({ title: 'Buy milk' }), []);
  assert.deepStrictEqual(validateTaskBody({ title: 'x', completed: true }), []);
  assert.deepStrictEqual(validateTaskBody({ completed: false }, { partial: true }), []);
});

test('validateTaskBody reports every problem at once', () => {
  assert.deepStrictEqual(validateTaskBody({ title: '', completed: 'no', color: 'red' }), [
    'unknown field: color',
    'title must be a non-empty string',
    'completed must be a boolean',
  ]);
});

test('validateTaskBody limits title length', () => {
  assert.deepStrictEqual(validateTaskBody({ title: 'a'.repeat(MAX_TITLE_LENGTH) }), []);
  assert.deepStrictEqual(validateTaskBody({ title: 'a'.repeat(MAX_TITLE_LENGTH + 1) }), [
    `title must be at most ${MAX_TITLE_LENGTH} characters`,
  ]);
});

test('validateTaskBody rejects non-object and empty update bodies', () => {
  assert.deepStrictEqual(validateTaskBody(undefined), ['title is required']);
  assert.deepStrictEqual(validateTaskBody([1], { partial: true }), ['body must be a JSON object']);
  assert.deepStrictEqual(validateTaskBody({}, { partial: true }), [
    'provide at least one of: title, completed',
  ]);
});

test('parseId only accepts positive integers', () => {
  assert.strictEqual(parseId('7'), 7);
  for (const raw of ['0', '-1', '1.5', 'abc', '01', '']) assert.strictEqual(parseId(raw), null);
});

test('POST /tasks with unknown fields returns 400 with details', async (t) => {
  const res = await request(tempApp(t)).post('/tasks').send({ title: 'ok', id: 5 });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body, { error: 'Validation failed', details: ['unknown field: id'] });
});

test('PUT /tasks/:id with an empty body returns 400', async (t) => {
  const app = tempApp(t);
  await request(app).post('/tasks').send({ title: 'Buy milk' });
  const res = await request(app).put('/tasks/1').send({});
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body.details, ['provide at least one of: title, completed']);
});

test('non-numeric ids return 400 for PUT and DELETE', async (t) => {
  const app = tempApp(t);
  for (const req of [request(app).put('/tasks/abc').send({ completed: true }), request(app).delete('/tasks/0')]) {
    const res = await req;
    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(res.body, { error: 'id must be a positive integer' });
  }
});

test('malformed JSON returns a JSON 400, not an HTML error page', async (t) => {
  const res = await request(tempApp(t))
    .post('/tasks')
    .set('Content-Type', 'application/json')
    .send('{"title": ');
  assert.strictEqual(res.status, 400);
  assert.match(res.headers['content-type'], /application\/json/);
  assert.deepStrictEqual(res.body, { error: 'Malformed JSON body' });
});
