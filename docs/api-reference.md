# API reference

Base path: `/v1`. All public routes use `GET` and return JSON (`Content-Type: application/json; charset=utf-8`).
Dates are ISO 8601 in UTC. A trailing slash is accepted. `HEAD` works like `GET` without a body.

Every data response contains `updatedAt` (when the data was fetched). If Steam was unreachable and an older value was
served, the response also contains `"stale": true`.

## Routes

| Route | Cache (`max-age`) | Description |
|---|---|---|
| [`GET /v1`](#get-v1) | 300 s | List of routes |
| [`GET /v1/health`](#get-v1health) | none | Service status |
| [`GET /v1/players`](#get-v1players) | 30 s | Players online now and 24 h summary |
| [`GET /v1/players/history`](#get-v1playershistory) | 60 s | Player count history |
| [`GET /v1/patchnotes`](#get-v1patchnotes) | 120 s | Official announcements |
| [`GET /v1/patchnotes/latest`](#get-v1patchnoteslatest) | 120 s | Latest announcement |
| [`GET /v1/achievements`](#get-v1achievements) | 300 s | Achievement unlock rates |
| [`GET /v1/reviews`](#get-v1reviews) | 300 s | Steam reviews |
| [`GET /v1/price`](#get-v1price) | 600 s | Price in a country |
| [`GET /v1/community`](#get-v1community) | 60 s | Discord server numbers |
| [`GET /v1/leaderboard`](#get-v1leaderboard) | 60 s | Discord top 10 |

---

### `GET /v1`

```json
{ "name": "ROB RUN Community API", "version": "1.0.0", "appId": 4262460,
  "routes": [{ "method": "GET", "path": "/v1/players", "description": "…" }] }
```

### `GET /v1/health`

```json
{ "status": "ok", "uptimeSeconds": 3600, "appId": 4262460 }
```

### `GET /v1/players`

Players online now, plus the peak, average and low of the last 24 hours (from the API's own samples).

```json
{
  "appId": 4262460,
  "players": 247069,
  "updatedAt": "2026-11-23T03:22:41.471Z",
  "last24h": {
    "hours": 24,
    "peak": 365092,
    "peakAt": "2026-11-22T19:00:00.000Z",
    "low": 180000,
    "average": 250000,
    "points": 288,
    "coveredSince": "2026-11-22T03:25:00.000Z"
  }
}
```

| Field | Meaning |
|---|---|
| `players` | Players in game right now (Steam, cached 60 s) |
| `last24h` | `null` until the first sample exists |
| `last24h.points` | Number of samples used (one every 5 minutes, so up to 288) |
| `last24h.coveredSince` | Start of the real data. Later than 24 h ago if the API started recently |

### `GET /v1/players/history`

| Parameter | Default | Range | Meaning |
|---|---|---|---|
| `hours` | `24` | 1 to 720 | How far back to look |

```json
{
  "appId": 4262460,
  "hours": 24,
  "summary": { "hours": 24, "peak": 365092, "peakAt": "…", "low": 180000, "average": 250000, "points": 288, "coveredSince": "…" },
  "points": [{ "at": "2026-11-22T03:25:00.000Z", "players": 251300 }]
}
```

At most 500 points are returned. When more samples exist, they are averaged per slice and each point also carries `peak`
(the highest sample of its slice).

### `GET /v1/patchnotes`

| Parameter | Default | Range | Meaning |
|---|---|---|---|
| `limit` | `10` | 1 to 30 | Number of announcements |

Newest first. `markdown` is the announcement text converted to Markdown (images removed; only `http(s)` links kept).

```json
{
  "items": [{
    "id": "1849827110432538",
    "title": "Patch Notes",
    "url": "https://store.steampowered.com/news/app/4262460/view/1849827110432538",
    "author": "Charlie",
    "publishedAt": "2026-11-20T14:59:56.000Z",
    "markdown": "We've got a fresh batch of changes…"
  }],
  "total": 30,
  "updatedAt": "2026-11-23T03:22:41.000Z"
}
```

### `GET /v1/patchnotes/latest`

The same object as one item above, plus `updatedAt`. `404` if there is no announcement.

### `GET /v1/achievements`

Share of players who unlocked each achievement, most common first.

```json
{ "appId": 4262460, "count": 2, "achievements": [{ "name": "FIRST_RUN", "percent": 80 }, { "name": "RARE", "percent": 1.5 }], "updatedAt": "…" }
```

If the game publishes no achievements (the case for ROB RUN today), you get `count: 0` and an empty list. This is a normal
answer, not an error.

### `GET /v1/reviews`

```json
{
  "appId": 4262460,
  "total": 89706,
  "positive": 43195,
  "negative": 46511,
  "positivePercent": 48.2,
  "lastWeek": { "positivePercent": 43.3, "total": 31444 },
  "updatedAt": "…"
}
```

Totals are the sum of all weeks of review history. `lastWeek` is `null` when there is none.

### `GET /v1/price`

| Parameter | Default | Format | Meaning |
|---|---|---|---|
| `country` | `us` | 2 letters | Store country (`fr`, `de`, `us`…) |

```json
{
  "appId": 4262460,
  "name": "ROB RUN",
  "storeUrl": "https://store.steampowered.com/app/4262460",
  "free": true,
  "country": "fr",
  "price": null,
  "releaseDate": "4 Nov, 2026",
  "updatedAt": "…"
}
```

`price` is `null` for a free game. Otherwise it is
`{ "currency": "EUR", "initial": 9.99, "final": 7.99, "discountPercent": 20, "formatted": "7,99€" }`.

### `GET /v1/community`

Numbers sent by a Discord bot (see [Discord integration](discord-integration.md)).

```json
{ "updatedAt": "2026-11-23T03:24:41.683Z", "members": 202, "online": 51, "inVoice": 4 }
```

`503 unavailable` until a bot has sent data at least once.

### `GET /v1/leaderboard`

Only available if the bot publishes it. Display names only, never identifiers.

```json
{
  "updatedAt": "…",
  "xp": [{ "rank": 1, "name": "Alice", "level": 5, "xp": 1500 }],
  "coins": [{ "rank": 1, "name": "Bob", "coins": 500 }]
}
```

`404 not_found` when the leaderboard is not published.

---

## Errors

Every error has the same shape:

```json
{ "error": { "code": "bad_request", "message": "\"hours\" must be an integer between 1 and 720." } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `bad_request` | Invalid parameter or body |
| 401 | `unauthorized` | Missing or wrong token on the bot endpoint |
| 404 | `not_found` | Unknown route, or data that is not published |
| 405 | `method_not_allowed` | Wrong method (an `Allow` header lists the right ones) |
| 413 | `payload_too_large` | Body over 64 KB |
| 429 | `rate_limited` | Too many requests (see `Retry-After`) |
| 500 | `internal_error` | Unexpected failure |
| 502 | `upstream_error` | Steam is unreachable and no older value is available |
| 503 | `unavailable` | Data not available yet |

## Headers

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` | Requests allowed per minute and left in the current window |
| `X-RateLimit-Reset` | When the window resets (Unix seconds) |
| `Retry-After` | On 429: seconds to wait |
| `Cache-Control` | `public, max-age=N` per route (see the table above) |
| `Access-Control-Allow-Origin` | CORS, see `ALLOWED_ORIGINS` |

Be kind to the service: use the `Cache-Control` values instead of polling faster than they allow.
