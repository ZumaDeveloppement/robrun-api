# Configuration

Everything is optional. Settings come from environment variables, or from a `.env` file at the project root
(`KEY=value` lines, `#` for comments). A real environment variable always wins over `.env`.

| Variable | Default | Valid values | Meaning |
|---|---|---|---|
| `PORT` | `3000` | 0 to 65535 | Listening port. On a host that gives you a port, use that one |
| `HOST` | `0.0.0.0` | address | Listening address. `127.0.0.1` keeps it local (use with a reverse proxy) |
| `STEAM_APP_ID` | `4262460` | integer | Steam app id. ROB RUN by default; change it to track another game |
| `ALLOWED_ORIGINS` | `*` | `*` or a comma-separated list | Web origins allowed by CORS. `*` is fine for public read-only data |
| `RATE_LIMIT` | `60` | 1 to 100000 | Requests per minute per IP |
| `TRUST_PROXY` | `0` | `0` or `1` | `1` only behind a reverse proxy you control: the real IP is then read from `X-Forwarded-For` |
| `API_TOKEN` | empty | any secret | Token for the Discord bot endpoint. Empty disables the endpoint |
| `DATA_DIR` | `./data` | path | Where history and community files are written |

An invalid value falls back to the default instead of stopping the server.

## Notes

- **`TRUST_PROXY`**: leave it at `0` when the API is reachable directly. If you set `1` without a proxy in front, anyone can
  forge `X-Forwarded-For` and dodge the rate limit.
- **`ALLOWED_ORIGINS`**: when you list origins (`https://my-site.example`), browsers from other sites are refused. This
  does not stop servers and scripts from calling the API, it only governs browsers.
- **`API_TOKEN`**: generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and never commit it.
- **Fixed settings** (change them in `src/config.js`): cache durations, history retention (30 days), sampling interval
  (5 minutes), history points per response (500), request body limit (64 KB).
