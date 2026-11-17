'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../src/store');

// Unit tests for the JSON-file store on its own, without Express.
function tempDataFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // A nested path, to check the store creates missing folders.
  return path.join(dir, 'nested', 'tasks.json');
}

test('list() is empty until something is created', (t) => {
  const store = createStore(tempDataFile(t));
  assert.deepStrictEqual(store.list(), []);
});

test('create() assigns increasing ids and writes the file', (t) => {
  const file = tempDataFile(t);
  const store = createStore(file);
  const a = store.create({ title: 'A' });
  const b = store.create({ title: 'B', completed: true });
  assert.deepStrictEqual([a.id, b.id], [1, 2]);
  assert.strictEqual(a.completed, false);
  assert.strictEqual(b.completed, true);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [a, b]);
  assert.ok(!fs.existsSync(`${file}.tmp`), 'temp file is renamed away');
});

test('update() changes only the given fields and returns null for unknown ids', (t) => {
  const store = createStore(tempDataFile(t));
  const task = store.create({ title: 'Old' });
  const updated = store.update(task.id, { completed: true });
  assert.deepStrictEqual(updated, { ...task, completed: true });
  assert.strictEqual(store.update(99, { title: 'x' }), null);
});

test('remove() deletes one task and reports whether it found it', (t) => {
  const store = createStore(tempDataFile(t));
  store.create({ title: 'Keep' });
  const gone = store.create({ title: 'Drop' });
  assert.strictEqual(store.remove(gone.id), true);
  assert.strictEqual(store.remove(gone.id), false);
  assert.deepStrictEqual(store.list().map((x) => x.title), ['Keep']);
});

test('a corrupt data file throws instead of silently losing tasks', (t) => {
  const file = tempDataFile(t);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{ not json');
  assert.throws(() => createStore(file).list(), SyntaxError);
});
