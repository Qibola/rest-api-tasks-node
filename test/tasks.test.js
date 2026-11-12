'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

// Each test gets its own temp data file so tests never touch data/tasks.json.
function tempDataFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'tasks.json');
}

test('GET /tasks returns an empty list when there is no data file', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });
  const res = await request(app).get('/tasks');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, []);
});

test('POST /tasks creates a task and GET /tasks lists it', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });

  const created = await request(app).post('/tasks').send({ title: '  Buy milk ' });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.id, 1);
  assert.strictEqual(created.body.title, 'Buy milk');
  assert.strictEqual(created.body.completed, false);
  assert.ok(!Number.isNaN(Date.parse(created.body.createdAt)));

  await request(app).post('/tasks').send({ title: 'Walk dog' });
  const list = await request(app).get('/tasks');
  assert.deepStrictEqual(list.body.map((t) => [t.id, t.title]), [
    [1, 'Buy milk'],
    [2, 'Walk dog'],
  ]);
});

test('tasks persist to the JSON file across app instances', async (t) => {
  const dataFile = tempDataFile(t);
  await request(createApp({ dataFile })).post('/tasks').send({ title: 'Saved' });

  const onDisk = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.strictEqual(onDisk[0].title, 'Saved');

  const res = await request(createApp({ dataFile })).get('/tasks');
  assert.strictEqual(res.body.length, 1);
});

test('POST /tasks without a title returns 400', async (t) => {
  const app = createApp({ dataFile: tempDataFile(t) });
  for (const body of [{}, { title: '' }, { title: '   ' }, { title: 42 }]) {
    const res = await request(app).post('/tasks').send(body);
    assert.strictEqual(res.status, 400);
    assert.deepStrictEqual(res.body, { error: 'title is required' });
  }
});
