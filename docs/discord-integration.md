# Discord integration

The routes `/v1/community` and `/v1/leaderboard` are fed by a Discord bot that sends its numbers to the API. The API never
connects to Discord itself, and it cannot read any server.

## Setup

1. Generate a token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Put it in the API's `.env`: `API_TOKEN=<token>`, then restart the API.
3. Make your bot send a `POST` regularly (every 5 minutes is plenty).

## The endpoint

`POST /v1/internal/community`

| Header | Value |
|---|---|
| `Authorization` | `Bearer <token>` |
| `Content-Type` | `application/json` |

Body:

```json
{
  "server": { "members": 202, "online": 51, "inVoice": 4 },
  "leaderboard": {
    "xp":    [{ "name": "Alice", "level": 5, "xp": 1500 }],
    "coins": [{ "name": "Bob", "coins": 500 }]
  }
}
```

| Field | Rule |
|---|---|
| `server.members`, `online`, `inVoice` | Required. Integers from 0 to 10,000,000 |
| `leaderboard` | Optional. Leave it out to keep the leaderboard private |
| `leaderboard.xp`, `leaderboard.coins` | Optional lists of 10 rows maximum |
| `name` | Display name, cleaned by the API (control and invisible characters removed, 32 characters maximum) |

Answer: `200 { "ok": true, "updatedAt": "…" }`. Errors: `400` invalid body, `401` wrong or missing token,
`413` body over 64 KB, `503` when `API_TOKEN` is not set on the API.

Example with `curl`:

```bash
curl -X POST https://api.example.com/v1/internal/community \
  -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"server":{"members":202,"online":51,"inVoice":4}}'
```

Example in Node.js:

```js
await fetch(`${process.env.ROBRUN_API_URL}/v1/internal/community`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ROBRUN_API_TOKEN}` },
  body: JSON.stringify({ server: { members, online, inVoice } }),
});
```

## Privacy

- Only numbers, and optionally short display names, are accepted. There is no field for a Discord ID or a message, and
  unknown fields are ignored and never published.
- Publish the leaderboard only if your members agree to have their display name shown publicly.
- This endpoint is meant for servers only. It sends no CORS headers, so browsers cannot call it. Never put the token in a
  web page.
