# Contributing

Thanks for helping. This is a small project with a few rules that keep it easy to host and safe to expose.

## Setup

```bash
git clone https://github.com/ZumaDeveloppement/robrun-api.git
cd robrun-api
npm test
```

Node.js 20 or newer is the only requirement. There is nothing to install.

## Rules

- **No runtime dependencies.** The API uses Node's standard library only.
- **Read-only and public data only.** Do not add routes that expose private data, and keep every public route a `GET`.
- **Validate every input** (bounds, formats) and return an `ApiError` with the right status.
- **Cache calls to Steam** through `src/lib/cache.js` so visitors never multiply requests to Steam.
- **Every change comes with a test** in `test/api.test.js`. Steam is mocked there, so tests run offline.

## Adding a route

1. Add an entry in `src/routes/index.js` (method, path, cache duration, handler).
2. Put the data access in a function under `src/services/`.
3. Add tests, then document the route in both `README.md` and `README.fr.md`.

Run `npm run smoke` to check the result against the real Steam API.

## Pull requests

Keep them small and focused, and describe what changes for API users. Breaking a response format needs a new
version prefix (`/v2`), never a silent change under `/v1`.
