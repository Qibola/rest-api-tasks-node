'use strict';

const MAX_TITLE_LENGTH = 200;
const ALLOWED_FIELDS = ['title', 'completed'];

// Checks a task request body. Returns an array of human-readable error
// messages (empty when the body is valid), so callers can report every
// problem at once instead of one per request.
//
// `partial: true` is for updates: every field is optional, but at least
// one must be present. Otherwise (create) `title` is required.
function validateTaskBody(body, { partial = false } = {}) {
  if (body === undefined || body === null || typeof body !== 'object' || Array.isArray(body)) {
    return partial ? ['body must be a JSON object'] : ['title is required'];
  }

  const errors = [];

  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.includes(key)) errors.push(`unknown field: ${key}`);
  }

  const { title, completed } = body;

  if (title === undefined) {
    if (!partial) errors.push('title is required');
  } else if (typeof title !== 'string' || title.trim() === '') {
    errors.push('title must be a non-empty string');
  } else if (title.trim().length > MAX_TITLE_LENGTH) {
    errors.push(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    errors.push('completed must be a boolean');
  }

  if (partial && title === undefined && completed === undefined && errors.length === 0) {
    errors.push('provide at least one of: title, completed');
  }

  return errors;
}

// Parses a route `:id` into a positive integer, or returns null.
function parseId(raw) {
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

module.exports = { validateTaskBody, parseId, MAX_TITLE_LENGTH };
