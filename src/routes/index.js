/*!
 * robrun-api · src/routes/index.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const crypto = require('node:crypto');
const config = require('../config');
const steam = require('../services/steam');
const history = require('../services/history');
const community = require('../services/community');
const { ApiError, badRequest, notFound, unavailable } = require('../lib/errors');

const startedAt = Date.now();

function intParam(query, name, fallback, min, max) {
  const raw = query.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!/^\d{1,6}$/.test(raw) || value < min || value > max) throw badRequest(`"${name}" must be an integer between ${min} and ${max}.`);
  return value;
}

const sha = (text) => crypto.createHash('sha256').update(text).digest();

const routes = [
  {
    method: 'GET', path: '/v1/health', cache: 0, summary: 'État du service',
    handler: async () => ({ status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000), appId: config.appId }),
  },
  {
    method: 'GET', path: '/v1/players', cache: 30, summary: 'Joueurs en ligne maintenant + pic / moyenne des 24 dernières heures',
    handler: async () => ({ ...(await steam.players()), last24h: history.summary(24) }),
  },
  {
    method: 'GET', path: '/v1/players/history', cache: 60, summary: 'Historique du nombre de joueurs (?hours=1..720, défaut 24)',
    handler: async ({ query }) => {
      const hours = intParam(query, 'hours', 24, 1, config.history.keepDays * 24);
      return { appId: config.appId, hours, summary: history.summary(hours), points: history.range(hours) };
    },
  },
  {
    method: 'GET', path: '/v1/patchnotes', cache: 120, summary: 'Annonces officielles Steam (?limit=1..30, défaut 10)',
    handler: async ({ query }) => steam.news(intParam(query, 'limit', 10, 1, 30)),
  },
  {
    method: 'GET', path: '/v1/patchnotes/latest', cache: 120, summary: 'La dernière annonce officielle',
    handler: async () => {
      const { items, updatedAt } = await steam.news(1);
      if (!items[0]) throw notFound('No announcement.');
      return { ...items[0], updatedAt };
    },
  },
  {
    method: 'GET', path: '/v1/achievements', cache: 300, summary: 'Pourcentage de joueurs ayant débloqué chaque succès',
    handler: async () => steam.achievements(),
  },
  {
    method: 'GET', path: '/v1/reviews', cache: 300, summary: 'Note et nombre d’avis Steam',
    handler: async () => steam.reviews(),
  },
  {
    method: 'GET', path: '/v1/price', cache: 600, summary: 'Prix ou gratuité dans un pays (?country=fr, défaut us)',
    handler: async ({ query }) => {
      const country = (query.get('country') ?? 'us').toLowerCase();
      if (!/^[a-z]{2}$/.test(country)) throw badRequest('"country" must be a 2-letter country code (e.g. fr, us, de).');
      return steam.price(country);
    },
  },
  {
    method: 'GET', path: '/v1/community', cache: 60, summary: 'Stats du serveur Discord (membres, en ligne, en vocal)',
    handler: async () => {
      const snap = community.get();
      if (!snap) throw unavailable('Community stats are not available yet.');
      return { updatedAt: snap.updatedAt, ...snap.server };
    },
  },
  {
    method: 'GET', path: '/v1/leaderboard', cache: 60, summary: 'Classements de la communauté (si le bot les publie)',
    handler: async () => {
      const lb = community.get()?.leaderboard;
      if (!lb) throw notFound('Leaderboards are not published.');
      return { updatedAt: community.get().updatedAt, ...lb };
    },
  },
  {
    method: 'POST', path: '/v1/internal/community', cache: 0, body: true, internal: true,
    handler: async ({ body, headers }) => {
      if (!config.apiToken) throw unavailable('Publishing is disabled: API_TOKEN is not set.');
      const given = String(headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (!crypto.timingSafeEqual(sha(given), sha(config.apiToken))) throw new ApiError(401, 'unauthorized', 'Invalid token.');
      const snap = community.update(body);
      return { ok: true, updatedAt: snap.updatedAt };
    },
  },
];

const publicRoutes = routes.filter((r) => !r.internal).map((r) => ({ method: r.method, path: r.path, description: r.summary }));
routes.unshift({
  method: 'GET', path: '/v1', cache: 300, summary: 'Liste des routes',
  handler: async () => ({ name: 'ROB RUN Community API', version: '1.0.0', appId: config.appId, routes: publicRoutes }),
});

module.exports = routes;
