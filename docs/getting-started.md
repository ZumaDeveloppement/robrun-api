# Getting started

## Requirements

Node.js 20 or newer. There is nothing to install: the API has no dependencies.

## Run it

```bash
git clone https://github.com/ZumaDeveloppement/robrun-api.git
cd robrun-api
npm start
```

The server listens on `http://localhost:3000`. Settings are optional: copy `.env.example` to `.env` to change them
(see [Configuration](configuration.md)).

## First requests

```bash
curl http://localhost:3000/v1
curl http://localhost:3000/v1/players
curl "http://localhost:3000/v1/patchnotes/latest"
curl "http://localhost:3000/v1/price?country=fr"
```

From JavaScript (browser or Node.js):

```js
const res = await fetch('http://localhost:3000/v1/players');
const { players, last24h } = await res.json();
console.log(`${players} players online, 24 h peak: ${last24h?.peak ?? 'not available yet'}`);
```

## Important to know

- **The 24 h peak builds up over time.** Steam only exposes the current player count, so the API records it every
  5 minutes. `last24h` is `null` right after the first start, and `last24h.coveredSince` tells you since when the data
  really covers. The history is kept in `data/players.json` for 30 days.
- **There are no per-player stats** (kills, money, rankings). The game does not publish them, and the API only serves data
  that Steam already exposes publicly.
- **You host your own copy.** This repository is the code, not a hosted service. See [Deployment](deployment.md).

## Check that it works

```bash
npm test        # 19 offline tests (Steam is simulated)
npm run smoke   # real calls to Steam (needs Internet)
```

Next: the [API reference](api-reference.md).
