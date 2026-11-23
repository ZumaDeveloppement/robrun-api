/*!
 * robrun-api · src/lib/cache.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const STALE_MAX_MS = 60 * 60_000;
const store = new Map();
const inflight = new Map();
const MAX_ENTRIES = 500;

async function memo(key, ttlMs, loader) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value, at: hit.at, stale: false };
  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const value = await loader();
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      const at = Date.now();
      store.set(key, { at, value });
      return { value, at, stale: false };
    } catch (err) {
      if (hit && Date.now() - hit.at < STALE_MAX_MS) return { value: hit.value, at: hit.at, stale: true };
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

const clear = () => {
  store.clear();
  inflight.clear();
};

module.exports = { memo, clear };
