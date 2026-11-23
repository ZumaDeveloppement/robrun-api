# Architecture

## Overview

```
 visitor ──► server.js ──► routes/index.js ──► services/steam.js ──► Steam
              │   │                 │                │
              │   │                 │                └── lib/cache.js (cache, one call for many visitors)
              │   │                 ├──► services/history.js ──► data/players.json
              │   │                 └──► services/community.js ◄── POST from a Discord bot
              │   └── lib/rateLimit.js
              └── security headers, CORS, JSON errors
```

## Modules

| File | Role |
|---|---|
| `src/index.js` | Starts the player sampling and the server, handles shutdown |
| `src/config.js` | Reads settings and the optional `.env` |
| `src/server.js` | HTTP: routing, rate limit, CORS, security headers, body reading, error answers |
| `src/routes/index.js` | The list of routes. One entry = method, path, cache duration, handler |
| `src/services/steam.js` | Calls to Steam: players, announcements, achievements, reviews, price |
| `src/services/history.js` | Samples the player count every 5 minutes and answers history and summary queries |
| `src/services/community.js` | Validates and stores the numbers sent by a bot |
| `src/services/markdown.js` | Converts Steam BBCode to Markdown |
| `src/services/storage.js` | Reads and writes JSON files atomically (temporary file, then rename) |
| `src/lib/cache.js` | Memory cache with request de-duplication and stale fallback |
| `src/lib/rateLimit.js` | Per-IP request counter |
| `src/lib/http.js` | Outgoing HTTP calls: timeout, no redirects |
| `src/lib/errors.js` | `ApiError` and the helpers that create it |

## Key behaviours

**Caching.** Each Steam call goes through `memo(key, ttl, loader)`:
- within the TTL, the stored value is returned;
- simultaneous requests for the same key share one call to Steam;
- if Steam fails and a value younger than one hour exists, it is returned with `stale: true`.

**Player history.** Steam only gives the current number. `history.js` samples it every 5 minutes into memory and into
`data/players.json`, keeps 30 days, and ignores two samples closer than half an interval (a quick restart does not
duplicate points). Long ranges are averaged down to 500 points.

**Security.** The server is read-only. Inputs are bounded and validated. The only `POST` route compares the token in
constant time. Steam responses are never followed through redirects. Errors never leak internal details.

## Adding a route

1. Write the data access in `src/services/` (use `memo` for anything that calls an external service).
2. Add an entry to `src/routes/index.js`:

```js
{
  method: 'GET', path: '/v1/example', cache: 60, summary: 'What it returns',
  handler: async ({ query }) => ({ hello: 'world' }),
}
```

3. Throw an `ApiError` (`badRequest`, `notFound`, `unavailable`) for expected failures.
4. Add tests in `test/api.test.js` and document the route in `docs/api-reference.md` and both READMEs.

Public routes appear automatically in `GET /v1`.

## Tests

`npm test` starts the server on a random port with Steam replaced by fixed answers, so tests are fast and offline. They cover
every route, validation, security headers, rate limiting, the cache (including stale fallback) and the bot endpoint.
`npm run smoke` does the same walk against the real Steam API.
