# rest-api-tasks-node

A small task-list REST API in Node.js and Express, storing tasks in a JSON file — built one small step at a time.

## Setup

```bash
npm install
```

## Run it

```bash
npm start
```

The server listens on `http://localhost:3000` (set `PORT` to change it). Stop it with Ctrl+C.

## Endpoints

| Method | Path      | Description                 |
| ------ | --------- | --------------------------- |
| GET    | `/health` | Returns `{ "status": "ok" }` |
| GET    | `/tasks`  | Lists all tasks             |
| POST   | `/tasks`  | Creates a task from `{ "title": "..." }` → `201` with the new task |
| PUT    | `/tasks/:id` | Updates `title` and/or `completed` → `200` with the updated task |
| DELETE | `/tasks/:id` | Deletes the task → `204` with no body |

A task looks like `{ "id": 1, "title": "Buy milk", "completed": false, "createdAt": "2026-11-12T…Z" }`.

### Validation and errors

Every error response is JSON with the same shape: `{ "error": "..." }`, plus a `details` list when the request body failed validation, e.g.

```json
{ "error": "Validation failed", "details": ["title is required", "completed must be a boolean"] }
```

- POST needs a non-empty string `title` (at most 200 characters); `completed` is optional and must be a boolean.
- PUT accepts `title` and/or `completed` with the same rules, and needs at least one of them.
- Any other field (e.g. `id`) is rejected with `unknown field: <name>`.
- `:id` must be a positive integer, otherwise `400` with `{ "error": "id must be a positive integer" }`.
- PUT and DELETE return `404` with `{ "error": "Task not found" }` when no task has that id.
- A body that isn't valid JSON returns `400` with `{ "error": "Malformed JSON body" }`; unexpected failures return `500` with `{ "error": "Internal server error" }`.

Tasks are stored in `data/tasks.json` (created on the first POST).

Unknown routes return `404` with `{ "error": "Not found" }`.

## Test

```bash
npm test
```

Tests use `node:test` and `supertest`, which drive the app in-process — no server is started.

## Roadmap

- [x] Scaffold: README + package.json + Express skeleton (`/health` + JSON 404) with tests
- [x] GET/POST `/tasks` with JSON-file storage
- [x] PUT/DELETE `/tasks/:id`
- [x] Input validation + consistent error responses
- [ ] Full test suite + polish

## Files

- `src/app.js` — `createApp({ dataFile })` builds the Express app (no listening), so tests can use it directly
- `src/validate.js` — `validateTaskBody(body, { partial })` returns a list of error messages; `parseId(raw)` checks route ids
- `src/store.js` — `createStore(file)` reads/writes the task list as a JSON file
- `src/server.js` — starts the app on `PORT`
- `data/` — where `tasks.json` lives (contents are git-ignored)
- `test/app.test.js` — tests for `/health` and the 404 handler
- `test/tasks.test.js` — tests for GET/POST `/tasks`, each using its own temp data file
- `test/task-by-id.test.js` — tests for PUT/DELETE `/tasks/:id`
- `test/validation.test.js` — tests for the validators, error shape, bad ids and malformed JSON
