'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

// Each test gets a fresh app on its own temp data file, seeded with two tasks.
async function seededApp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const app = createApp({ dataFile: path.join(dir, 'tasks.json') });
  await request(app).post('/tasks').send({ title: 'Buy milk' });
  await request(app).post('/tasks').send({ title: 'Walk dog' });
  return app;
}

test('PUT /tasks/:id updates title and completed', async (t) => {
  const app = await seededApp(t);

  const res = await request(app).put('/tasks/1').send({ title: ' Buy oat milk ', completed: true });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.id, 1);
  assert.strictEqual(res.body.title, 'Buy oat milk');
  assert.strictEqual(res.body.completed, true);

  const list = await request(app).get('/tasks');
  assert.deepStrictEqual(list.body.map((t) => [t.id, t.title, t.completed]), [
    [1, 'Buy oat milk', true],
    [2, 'Walk dog', false],
  ]);
});

test('PUT /tasks/:id with only completed keeps the title', async (t) => {
  const app = await seededApp(t);
  const res = await request(app).put('/tasks/2').send({ completed: true });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.title, 'Walk dog');
  assert.strictEqual(res.body.completed, true);
});

test('PUT /tasks/:id rejects an empty title or non-boolean completed', async (t) => {
  const app = await seededApp(t);

  const badTitle = await request(app).put('/tasks/1').send({ title: '  ' });
  assert.strictEqual(badTitle.status, 400);
  assert.deepStrictEqual(badTitle.body, { error: 'title must be a non-empty string' });

  const badCompleted = await request(app).put('/tasks/1').send({ completed: 'yes' });
  assert.strictEqual(badCompleted.status, 400);
  assert.deepStrictEqual(badCompleted.body, { error: 'completed must be a boolean' });

  // Nothing was changed by the rejected requests.
  const list = await request(app).get('/tasks');
  assert.deepStrictEqual([list.body[0].title, list.body[0].completed], ['Buy milk', false]);
});

test('PUT /tasks/:id returns 404 for an unknown id', async (t) => {
  const app = await seededApp(t);
  for (const id of ['99', 'abc']) {
    const res = await request(app).put(`/tasks/${id}`).send({ completed: true });
    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(res.body, { error: 'Task not found' });
  }
});

test('DELETE /tasks/:id removes the task', async (t) => {
  const app = await seededApp(t);

  const res = await request(app).delete('/tasks/1');
  assert.strictEqual(res.status, 204);
  assert.strictEqual(res.text, '');

  const list = await request(app).get('/tasks');
  assert.deepStrictEqual(list.body.map((t) => t.id), [2]);
});

test('DELETE /tasks/:id returns 404 for an unknown id', async (t) => {
  const app = await seededApp(t);
  const res = await request(app).delete('/tasks/99');
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(res.body, { error: 'Task not found' });

  const again = await request(app).delete('/tasks/1');
  assert.strictEqual(again.status, 204);
  const gone = await request(app).delete('/tasks/1');
  assert.strictEqual(gone.status, 404);
});
