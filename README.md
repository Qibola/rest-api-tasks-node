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

Unknown routes return `404` with `{ "error": "Not found" }`.

## Test

```bash
npm test
```

Tests use `node:test` and `supertest`, which drive the app in-process — no server is started.

## Roadmap

- [x] Scaffold: README + package.json + Express skeleton (`/health` + JSON 404) with tests
- [ ] GET/POST `/tasks` with JSON-file storage
- [ ] PUT/DELETE `/tasks/:id`
- [ ] Input validation + consistent error responses
- [ ] Full test suite + polish

## Files

- `src/app.js` — `createApp()` builds the Express app (no listening), so tests can use it directly
- `src/server.js` — starts the app on `PORT`
- `data/` — where the task JSON file will live (contents are git-ignored)
- `test/app.test.js` — tests for `/health` and the 404 handler
