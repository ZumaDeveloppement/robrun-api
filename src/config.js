const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadDotEnv() {
  let raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || line.trim().startsWith('#')) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
loadDotEnv();

const env = process.env;
const int = (name, fallback, min, max) => {
  const value = Number.parseInt(env[name] ?? '', 10);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};
const MINUTE = 60_000;

module.exports = {
  port: int('PORT', 3000, 0, 65535),
  host: env.HOST || '0.0.0.0',
  appId: int('STEAM_APP_ID', 4262460, 1, 2_000_000_000),
  apiToken: (env.API_TOKEN || '').trim(),
  allowedOrigins: (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: { windowMs: MINUTE, max: int('RATE_LIMIT', 60, 1, 100_000) },
  trustProxy: env.TRUST_PROXY === '1',
  dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(ROOT, 'data'),
  maxBodyBytes: 64 * 1024,
  requestTimeoutMs: 15_000,
  steam: {
    api: 'https://api.steampowered.com',
    store: 'https://store.steampowered.com',
    timeoutMs: 10_000,
    cache: { players: 60_000, news: 5 * MINUTE, achievements: 30 * MINUTE, reviews: 10 * MINUTE, price: 30 * MINUTE },
  },
  history: {
    sampleEveryMs: 5 * MINUTE,
    keepDays: 30,
    maxPoints: 500,
  },
};
