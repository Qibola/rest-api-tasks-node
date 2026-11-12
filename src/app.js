'use strict';

const express = require('express');
const { createStore } = require('./store');

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
    const title = req.body && req.body.title;
    // Bare-minimum check for now; fuller validation is a later roadmap step.
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    res.status(201).json(store.create({ title: title.trim() }));
  });

  // Anything that didn't match a route above.
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };
