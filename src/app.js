'use strict';

const express = require('express');

// Builds the Express app without starting a server, so tests can
// drive it in-process with supertest and nothing is left listening.
function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Anything that didn't match a route above.
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };
