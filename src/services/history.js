/*!
 * robrun-api · src/services/history.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const config = require('../config');
const steam = require('./steam');
const storage = require('./storage');

const FILE = 'players.json';
const keepMs = config.history.keepDays * 24 * 3_600_000;
let samples = [];
let timer = null;

function load() {
  const saved = storage.read(FILE);
  const now = Date.now();
  samples = (Array.isArray(saved) ? saved : [])
    .filter((s) => Array.isArray(s) && Number.isFinite(s[0]) && Number.isInteger(s[1]) && s[1] >= 0 && s[0] <= now && now - s[0] <= keepMs)
    .sort((a, b) => a[0] - b[0]);
}

function record(count, at = Date.now()) {
  if (samples.length && at - samples.at(-1)[0] < config.history.sampleEveryMs / 2) return false;
  samples.push([at, count]);
  while (samples.length && at - samples[0][0] > keepMs) samples.shift();
  storage.write(FILE, samples);
  return true;
}

async function sample() {
  try {
    record((await steam.players()).players);
  } catch {
  }
}

function start() {
  load();
  sample();
  timer = setInterval(sample, config.history.sampleEveryMs);
  timer.unref();
}

function stop() {
  clearInterval(timer);
}

function range(hours, maxPoints = config.history.maxPoints) {
  const since = Date.now() - hours * 3_600_000;
  const points = samples.filter((s) => s[0] >= since);
  if (points.length <= maxPoints) return points.map(([t, n]) => ({ at: new Date(t).toISOString(), players: n }));
  const size = Math.ceil(points.length / maxPoints);
  const out = [];
  for (let i = 0; i < points.length; i += size) {
    const bucket = points.slice(i, i + size);
    out.push({ at: new Date(bucket[0][0]).toISOString(), players: Math.round(bucket.reduce((sum, p) => sum + p[1], 0) / bucket.length), peak: Math.max(...bucket.map((p) => p[1])) });
  }
  return out;
}

function summary(hours) {
  const since = Date.now() - hours * 3_600_000;
  const points = samples.filter((s) => s[0] >= since);
  if (!points.length) return null;
  const peak = points.reduce((best, s) => (s[1] > best[1] ? s : best), points[0]);
  const low = points.reduce((best, s) => (s[1] < best[1] ? s : best), points[0]);
  return {
    hours,
    peak: peak[1],
    peakAt: new Date(peak[0]).toISOString(),
    low: low[1],
    average: Math.round(points.reduce((sum, p) => sum + p[1], 0) / points.length),
    points: points.length,
    coveredSince: new Date(points[0][0]).toISOString(),
  };
}

module.exports = { start, stop, record, range, summary, load, _reset: () => { samples = []; } };
