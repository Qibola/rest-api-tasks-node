'use strict';

const express = require('express');
const { createStore } = require('./store');
const { validateTaskBody, parseId } = require('./validate');

// Every error response has the same shape: `{ error }`, plus `details`
// (a list of messages) when a request failed validation.
function sendError(res, status, error, details) {
  res.status(status).json(details ? { error, details } : { error });
}

// Builds the Express app without starting a server, so tests can
// drive it in-process with supertest and nothing is left listening.
// Pass `dataFile` to point the store somewhere else (tests use a temp file).
function createApp({ dataFile } = {}) {
  const store = createStore(dataFile);
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/tasks', (req, res) => {
    res.json(store.list());
  });

  app.post('/tasks', (req, res) => {
    const errors = validateTaskBody(req.body);
    if (errors.length) return sendError(res, 400, 'Validation failed', errors);
    const { title, completed = false } = req.body;
    res.status(201).json(store.create({ title: title.trim(), completed }));
  });

  app.put('/tasks/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'id must be a positive integer');
    const errors = validateTaskBody(req.body, { partial: true });
    if (errors.length) return sendError(res, 400, 'Validation failed', errors);
    const { title, completed } = req.body;
    const task = store.update(id, {
      title: title === undefined ? undefined : title.trim(),
      completed,
    });
    if (!task) return sendError(res, 404, 'Task not found');
    res.json(task);
  });

  app.delete('/tasks/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'id must be a positive integer');
    if (!store.remove(id)) return sendError(res, 404, 'Task not found');
    res.status(204).end();
  });

  // Anything that didn't match a route above.
  app.use((req, res) => {
    sendError(res, 404, 'Not found');
  });

  // Errors thrown by middleware or routes. Express recognises an error
  // handler by its four arguments, so `next` must stay even though unused.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return sendError(res, 400, 'Malformed JSON body');
    if (err.type === 'entity.too.large') return sendError(res, 413, 'Request body too large');
    console.error(err);
    sendError(res, 500, 'Internal server error');
  });

  return app;
}

module.exports = { createApp };
