'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

function tempDataFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'tasks.json');
}

test('a task can be created, completed, renamed and deleted end to end', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });

  const { body: task } = await request(app).post('/tasks').send({ title: 'Write tests' }).expect(201);
  await request(app).put(`/tasks/${task.id}`).send({ completed: true }).expect(200);
  const renamed = await request(app).put(`/tasks/${task.id}`).send({ title: 'Write more tests' }).expect(200);
  assert.deepStrictEqual(renamed.body, { ...task, title: 'Write more tests', completed: true });

  const list = await request(app).get('/tasks').expect(200);
  assert.deepStrictEqual(list.body, [renamed.body]);

  await request(app).delete(`/tasks/${task.id}`).expect(204);
  await request(app).get('/tasks').expect(200, []);
  await request(app).put(`/tasks/${task.id}`).send({ completed: false }).expect(404);
});

test('POST /tasks honours an optional completed flag', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });
  const res = await request(app).post('/tasks').send({ title: 'Already done', completed: true }).expect(201);
  assert.strictEqual(res.body.completed, true);
});

test('responses are JSON', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });
  await request(app).get('/tasks').expect('Content-Type', /application\/json/);
  await request(app).post('/tasks').send({}).expect('Content-Type', /application\/json/);
});

test('an oversized body returns a JSON 413', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });
  // express.json() rejects bodies over 100kb by default.
  const res = await request(app).post('/tasks').send({ title: 'x'.repeat(200 * 1024) });
  assert.strictEqual(res.status, 413);
  assert.deepStrictEqual(res.body, { error: 'Request body too large' });
});

test('a corrupt data file returns a JSON 500 without leaking details', async (t) => {
  const dataFile = tempDataFile(t);
  fs.writeFileSync(dataFile, '{ not json');
  t.mock.method(console, 'error', () => {}); // keep the expected log out of test output
  const res = await request(createApp({ dataFile })).get('/tasks');
  assert.strictEqual(res.status, 500);
  assert.deepStrictEqual(res.body, { error: 'Internal server error' });
});
