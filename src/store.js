'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

// A tiny JSON-file store. The whole task list is read and written on
// every call — simple and fine for a small API, and it means the file
// is always the source of truth.
function createStore(file = DEFAULT_FILE) {
  function readAll() {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return []; // no file yet = no tasks
      throw err;
    }
  }

  function writeAll(tasks) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Write to a temp file, then rename, so a crash mid-write can't
    // leave a half-written tasks.json behind.
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2) + '\n');
    fs.renameSync(tmp, file);
  }

  function list() {
    return readAll();
  }

  function create({ title }) {
    const tasks = readAll();
    const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const task = {
      id: nextId,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    writeAll(tasks);
    return task;
  }

  // Applies `changes` (title and/or completed) to the task with `id`.
  // Returns the updated task, or null if there is no such task.
  function update(id, changes) {
    const tasks = readAll();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    if (changes.title !== undefined) task.title = changes.title;
    if (changes.completed !== undefined) task.completed = changes.completed;
    writeAll(tasks);
    return task;
  }

  // Removes the task with `id`. Returns true if a task was removed.
  function remove(id) {
    const tasks = readAll();
    const remaining = tasks.filter((t) => t.id !== id);
    if (remaining.length === tasks.length) return false;
    writeAll(remaining);
    return true;
  }

  return { list, create, update, remove };
}

module.exports = { createStore, DEFAULT_FILE };
