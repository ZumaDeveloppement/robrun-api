/*!
 * robrun-api · src/services/community.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const storage = require('./storage');
const { badRequest } = require('../lib/errors');

const FILE = 'community.json';
let snapshot = storage.read(FILE);

const count = (v, field) => {
  if (!Number.isInteger(v) || v < 0 || v > 10_000_000) throw badRequest(`"${field}" must be a positive integer.`);
  return v;
};

const cleanName = (v) => String(v ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 32) || 'Anonymous';

function rows(list, field, extra) {
  if (list === undefined) return undefined;
  if (!Array.isArray(list) || list.length > 10) throw badRequest(`"${field}": 10 rows maximum.`);
  return list.map((row, i) => ({ rank: i + 1, name: cleanName(row?.name), ...extra(row) }));
}

function update(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('A JSON body is expected.');
  const s = body.server;
  if (!s || typeof s !== 'object') throw badRequest('"server" is required.');
  const server = { members: count(s.members, 'server.members'), online: count(s.online, 'server.online'), inVoice: count(s.inVoice, 'server.inVoice') };

  const lb = body.leaderboard;
  let leaderboard;
  if (lb !== undefined) {
    if (!lb || typeof lb !== 'object' || Array.isArray(lb)) throw badRequest('"leaderboard" is invalid.');
    leaderboard = {
      xp: rows(lb.xp, 'leaderboard.xp', (r) => ({ level: count(r?.level, 'level'), xp: count(r?.xp, 'xp') })),
      coins: rows(lb.coins, 'leaderboard.coins', (r) => ({ coins: count(r?.coins, 'coins') })),
    };
  }
  snapshot = { updatedAt: new Date().toISOString(), server, ...(leaderboard ? { leaderboard } : {}) };
  storage.write(FILE, snapshot);
  return snapshot;
}

const get = () => snapshot;

module.exports = { update, get, _reset: () => { snapshot = null; } };
