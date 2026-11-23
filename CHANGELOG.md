# Changelog

## 1.0.0

First release.

- Routes: `players`, `players/history`, `patchnotes`, `patchnotes/latest`, `achievements`, `reviews`, `price`,
  `community`, `leaderboard`, `health`.
- Player count sampled every 5 minutes and kept for 30 days.
- Cache with request de-duplication and stale fallback when Steam is down.
- Rate limiting, input validation, security headers, token-protected endpoint for a Discord bot.
- 19 offline tests, real-run smoke test.
