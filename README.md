# ROB RUN Community API

[![License: MIT](https://img.shields.io/badge/license-MIT-8a4fff.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A5%2020-8a4fff.svg)](package.json)
[![Dependencies](https://img.shields.io/badge/dependencies-0-8a4fff.svg)](package.json)
[![Discord](https://img.shields.io/badge/Discord-join-8a4fff.svg?logo=discord&logoColor=white)](https://discord.gg/rejoins)

[Français](README.fr.md)

A small, **read-only HTTP API for [ROB RUN](https://store.steampowered.com/app/4262460)** (Steam): live player count with
24 h peak and history, official patch notes, reviews, price, and optional community stats from a Discord server.

- **Zero dependencies**: Node.js ≥ 20 only.
- **Fast and kind to Steam**: cached, de-duplicated requests, last known value served if Steam is down.
- **Safe by default**: read-only, rate-limited, validated inputs, no private data.

> **Unofficial.** This project is a community tool. It is not affiliated with, endorsed by, or sponsored by the ROB RUN
> developers or Valve. ROB RUN has no public stats API, so this project only republishes data that Steam already exposes
> publicly. There are no per-player stats (kills, money, rankings): the game does not provide them.

## Quick start

```bash
git clone <this repository>
cd RobRun
cp .env.example .env     # optional: defaults work without it
npm start                # http://localhost:3000/v1
```

```bash
npm test                 # offline test suite (Steam is mocked)
npm run smoke            # real run against Steam (needs Internet)
```

You host your own copy: this repository is the code, not a hosted service.

## Documentation

Full documentation is in [`docs/`](docs/README.md):
[Getting started](docs/getting-started.md) ·
[API reference](docs/api-reference.md) ·
[Configuration](docs/configuration.md) ·
[Deployment](docs/deployment.md) ·
[Discord integration](docs/discord-integration.md) ·
[Architecture](docs/architecture.md)

## Routes

All routes are `GET` and return JSON. The live list is at `GET /v1`.

| Route | Description |
|---|---|
| `/v1/health` | Service status |
| `/v1/players` | Players online now + 24 h peak / average / low |
| `/v1/players/history?hours=24` | Player history (1–720 h, 500 points max) |
| `/v1/patchnotes?limit=10` | Official Steam announcements (Markdown), newest first |
| `/v1/patchnotes/latest` | The latest announcement |
| `/v1/achievements` | % of players owning each achievement (empty list if the game publishes none, as is the case today) |
| `/v1/reviews` | Steam reviews: total, % positive, last week |
| `/v1/price?country=us` | Price / free-to-play status in a country |
| `/v1/community` | Discord server members / online / in voice (needs the optional bot link) |
| `/v1/leaderboard` | Top 10 XP / coins (only if your bot publishes it) |

```json
GET /v1/players
{
  "appId": 4262460,
  "players": 247069,
  "updatedAt": "2026-11-23T03:22:41.471Z",
  "last24h": { "hours": 24, "peak": 365092, "peakAt": "…", "low": 180000, "average": 250000, "points": 288, "coveredSince": "…" }
}
```

Errors look like `{ "error": { "code": "bad_request", "message": "…" } }` with the right HTTP status
(400, 404, 405, 413, 429, 502, 503).

`last24h.coveredSince` tells you since when the API has really been sampling: Steam only gives the current value, so the
API records the player count every 5 minutes itself (`data/players.json`, 30 days). The 24 h peak is complete only after
24 h of uptime.

## Configuration

Environment variables (all optional, see [.env.example](.env.example)):

| Variable | Default | Meaning |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Where to listen |
| `STEAM_APP_ID` | `4262460` | Steam app id (change it to track another game) |
| `ALLOWED_ORIGINS` | `*` | Browser origins allowed by CORS, comma separated |
| `RATE_LIMIT` | `60` | Requests per minute per IP |
| `TRUST_PROXY` | `0` | Set `1` only behind a trusted reverse proxy (reads the real IP from `X-Forwarded-For`) |
| `API_TOKEN` | *(empty)* | Secret used by a Discord bot to publish community stats (see below) |
| `DATA_DIR` | `./data` | Where history files are stored |

The API speaks plain HTTP: put it behind a reverse proxy that provides HTTPS (most hosts do).

## Project structure

```
src/
  index.js          startup and graceful shutdown
  config.js         settings (.env is optional)
  server.js         HTTP: routing, security, CORS, rate limit, JSON errors
  routes/index.js   every route (one entry = one route)
  services/         steam.js, history.js, community.js, markdown.js, storage.js
  lib/              cache, rate limiter, errors, outgoing HTTP
test/api.test.js    offline tests
scripts/smoke.js    real run against Steam
```

Adding a route = one entry in `src/routes/index.js` (method, path, cache duration, handler).

## Security

- **Read-only**: only `GET` routes are public. The single `POST` route (`/v1/internal/community`) is for your bot only,
  protected by a secret token (constant-time comparison) and not reachable from browsers (no CORS).
- **No private data**: only numbers and, if you enable it, short sanitised display names. Never Discord IDs, messages, or e-mails.
- **Rate limit** per IP with `Retry-After`; inputs bounded and validated; request body limited to 64 KB.
- **Headers**: `nosniff`, `Content-Security-Policy: default-src 'none'`, `no-referrer`, no `X-Powered-By`.
- **Steam calls**: timeouts, redirects never followed, de-duplicated, cached, stale value served up to 1 h on failure.

Found a vulnerability? Please open a private security advisory rather than a public issue.

## Optional: publish Discord community stats

The `/v1/community` and `/v1/leaderboard` routes are filled by a Discord bot that sends its numbers to the API:

1. Generate a token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Put it in the API's `.env` as `API_TOKEN`.
3. Have your bot `POST` to `/v1/internal/community` with `Authorization: Bearer <token>` and a JSON body:

```json
{
  "server": { "members": 202, "online": 51, "inVoice": 4 },
  "leaderboard": {
    "xp":    [{ "name": "Alice", "level": 5, "xp": 1500 }],
    "coins": [{ "name": "Bob", "coins": 500 }]
  }
}
```

`leaderboard` is optional (10 rows max per list). Only publish display names if your members agree.

## Author

Made by **Zuma.Eu**. Questions, ideas, or want to use it in your community? Join the Discord: https://discord.gg/rejoins

## License

[MIT](LICENSE) © 2026 Zuma.Eu. Keep the copyright notice and the author's signature in the source files when you reuse the code.
