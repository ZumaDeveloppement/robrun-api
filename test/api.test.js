const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'robrun-api-'));
process.env.API_TOKEN = 'a'.repeat(64);
process.env.RATE_LIMIT = '120';

const realFetch = global.fetch;
const steamCalls = [];
let steamDown = false;
const FIXTURES = {
  GetNumberOfCurrentPlayers: { response: { player_count: 12345, result: 1 } },
  GetNewsForApp: {
    appnews: {
      newsitems: [
        { gid: '1', title: 'Patch 1', author: 'dev', date: 1_700_000_000, contents: 'old' },
        { gid: '2', title: 'Patch 2', author: 'dev', date: 1_800_000_000, contents: '[h1]Titre[/h1][list][*]un[*][b]deux[/b][/list][url=javascript:alert(1)]piège[/url] [url=https://exemple.fr/x]lien[/url][img]{STEAM_CLAN_IMAGE}/a.png[/img]' },
      ],
    },
  },
  GetGlobalAchievementPercentagesForApp: { achievementpercentages: { achievements: [{ name: 'RARE', percent: '1.5' }, { name: 'COMMON', percent: 80 }] } },
  appreviewhistogram: { success: 1, results: { rollups: [{ date: 1, recommendations_up: 40, recommendations_down: 10 }, { date: 2, recommendations_up: 50, recommendations_down: 0 }] } },
  appdetails: { 4262460: { success: true, data: { name: 'ROB RUN', is_free: false, price_overview: { currency: 'EUR', initial: 999, final: 799, discount_percent: 20, final_formatted: '7,99€' }, release_date: { coming_soon: false, date: '1 Nov, 2026' } } } },
};
global.fetch = async (url, opts) => {
  const u = String(url);
  if (u.startsWith('http://127.0.0.1')) return realFetch(url, opts);
  steamCalls.push(u);
  if (steamDown) throw new Error('réseau coupé');
  const key = Object.keys(FIXTURES).find((k) => u.includes(k));
  if (!key) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify(FIXTURES[key]), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const { createServer } = require('../src/server');
const history = require('../src/services/history');
const community = require('../src/services/community');
const cache = require('../src/lib/cache');
const { createRateLimiter } = require('../src/lib/rateLimit');

let server;
let base;
test.before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const get = (p, opts) => fetch(base + p, opts);
const json = async (p, opts) => {
  const res = await get(p, opts);
  return { res, body: await res.json() };
};
const post = (p, body, token = process.env.API_TOKEN, extra = {}) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('/v1 liste les routes publiques, jamais la route interne', async () => {
  const { res, body } = await json('/v1');
  assert.equal(res.status, 200);
  assert.ok(body.routes.length >= 9);
  assert.ok(!JSON.stringify(body).includes('internal'));
});

test('en-têtes de sécurité, CORS et limite de débit présents', async () => {
  const { res } = await json('/v1/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.ok(res.headers.get('x-ratelimit-remaining'));
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('/v1/players : joueurs en direct + résumé 24 h', async () => {
  history.record(10_000, Date.now() - 3_600_000);
  history.record(20_000, Date.now() - 1_800_000);
  const { res, body } = await json('/v1/players');
  assert.equal(res.status, 200);
  assert.equal(body.players, 12345);
  assert.equal(body.last24h.peak, 20_000);
  assert.equal(body.last24h.average, 15_000);
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30');
});

test('/v1/players/history : points, validation des paramètres', async () => {
  const { body } = await json('/v1/players/history?hours=2');
  assert.equal(body.hours, 2);
  assert.ok(body.points.length >= 2);
  assert.equal((await get('/v1/players/history?hours=0')).status, 400);
  assert.equal((await get('/v1/players/history?hours=99999')).status, 400);
  assert.equal((await get('/v1/players/history?hours=abc')).status, 400);
  assert.equal((await get('/v1/players/history?hours=1e3')).status, 400);
});

test('l\'historique est réduit à 500 points au maximum', () => {
  history._reset();
  const now = Date.now();
  for (let i = 0; i < 1200; i += 1) history.record(1000 + i, now - (1200 - i) * 30_000 * 3 + 1);
  assert.ok(history.range(720).length <= 500);
});

test('/v1/patchnotes : plus récent d\'abord, Markdown propre, liens dangereux retirés', async () => {
  const { body } = await json('/v1/patchnotes');
  assert.equal(body.items[0].title, 'Patch 2');
  assert.equal(body.items[1].title, 'Patch 1');
  const md = body.items[0].markdown;
  assert.match(md, /# Titre/);
  assert.match(md, /- un/);
  assert.match(md, /\*\*deux\*\*/);
  assert.ok(!md.includes('javascript:'), 'lien javascript: conservé !');
  assert.match(md, /\[lien\]\(https:\/\/exemple\.fr\/x\)/);
  assert.ok(!md.includes('STEAM_CLAN_IMAGE'));
  assert.match(body.items[0].url, /^https:\/\/store\.steampowered\.com\/news\/app\/4262460\/view\/2$/);
  assert.equal((await json('/v1/patchnotes?limit=1')).body.items.length, 1);
  assert.equal((await get('/v1/patchnotes?limit=31')).status, 400);
});

test('/v1/patchnotes/latest', async () => {
  const { body } = await json('/v1/patchnotes/latest');
  assert.equal(body.id, '2');
});

test('/v1/achievements : triés du plus courant au plus rare', async () => {
  const { body } = await json('/v1/achievements');
  assert.deepEqual(body.achievements.map((a) => a.name), ['COMMON', 'RARE']);
  assert.equal(body.achievements[1].percent, 1.5);
});

test('/v1/reviews et /v1/price', async () => {
  const reviews = (await json('/v1/reviews')).body;
  assert.equal(reviews.total, 100);
  assert.equal(reviews.positivePercent, 90);
  assert.equal(reviews.lastWeek.positivePercent, 100);
  const price = (await json('/v1/price?country=FR')).body;
  assert.equal(price.country, 'fr');
  assert.equal(price.price.final, 7.99);
  assert.equal(price.price.discountPercent, 20);
  assert.equal((await get('/v1/price?country=zzz')).status, 400);
  assert.equal((await get('/v1/price?country=1;2')).status, 400);
});

test('communauté : indisponible → jeton obligatoire → publication → lecture', async () => {
  community._reset();
  assert.equal((await get('/v1/community')).status, 503);
  assert.equal((await get('/v1/leaderboard')).status, 404);

  const payload = { server: { members: 202, online: 51, inVoice: 4 }, leaderboard: { xp: [{ name: 'Zed‮\u0000\n<b>', level: 5, xp: 1200, discordId: '123456789012345678' }], coins: [{ name: 'Amy', coins: 300 }] } };
  assert.equal((await post('/v1/internal/community', payload, null)).status, 401);
  assert.equal((await post('/v1/internal/community', payload, 'b'.repeat(64))).status, 401);
  assert.equal((await post('/v1/internal/community', payload, 'x')).status, 401);
  assert.equal((await get('/v1/community')).status, 503, 'une requête refusée ne doit rien publier');

  const ok = await post('/v1/internal/community', payload);
  assert.equal(ok.status, 200);
  const { body } = await json('/v1/community');
  assert.equal(body.members, 202);
  assert.equal(body.online, 51);
  const lb = (await json('/v1/leaderboard')).body;
  assert.equal(lb.xp[0].rank, 1);
  assert.ok(!/[\u0000‮\n]/.test(lb.xp[0].name), 'caractères de contrôle non retirés');
  assert.ok(!JSON.stringify(lb).includes('123456789012345678'), 'un identifiant Discord a fuité');
  assert.ok(!('discordId' in lb.xp[0]));
});

test('communauté : données invalides refusées', async () => {
  const bad = [
    {},
    { server: { members: -1, online: 0, inVoice: 0 } },
    { server: { members: 1.5, online: 0, inVoice: 0 } },
    { server: { members: '12', online: 0, inVoice: 0 } },
    { server: { members: 1, online: 1, inVoice: 1 }, leaderboard: { xp: new Array(11).fill({ name: 'a', level: 1, xp: 1 }) } },
    { server: { members: 1, online: 1, inVoice: 1 }, leaderboard: 'x' },
  ];
  for (const payload of bad) assert.equal((await post('/v1/internal/community', payload)).status, 400, JSON.stringify(payload).slice(0, 60));
  assert.equal((await post('/v1/internal/community', '{pas du json')).status, 400);
  assert.equal((await post('/v1/internal/community', {}, process.env.API_TOKEN, { 'Content-Type': 'text/plain' })).status, 400);
  assert.equal((await post('/v1/internal/community', 'x'.repeat(70 * 1024))).status, 413);
});

test('routes inconnues, méthodes interdites, CORS préliminaire', async () => {
  const unknown = await json('/v1/nimporte');
  assert.equal(unknown.res.status, 404);
  assert.equal(unknown.body.error.code, 'not_found');
  const wrong = await post('/v1/players', {}, null);
  assert.equal(wrong.status, 405);
  assert.match(wrong.headers.get('allow'), /GET/);
  assert.equal((await get('/v1/players', { method: 'DELETE' })).status, 405);
  const options = await get('/v1/players', { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.ok(!/POST/.test(options.headers.get('access-control-allow-methods')), 'POST ne doit pas être ouvert aux navigateurs');
  assert.equal((await get('/v1/players/', {})).status, 200, 'slash final toléré');
  const head = await get('/v1/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('Steam en panne : erreur 502 propre, sans détail interne', async () => {
  steamDown = true;
  const { res, body } = await json('/v1/price?country=de');
  steamDown = false;
  assert.equal(res.status, 502);
  assert.equal(body.error.code, 'upstream_error');
  assert.ok(!/réseau coupé|ECONN|stack/i.test(JSON.stringify(body)));
});

test('cache : 20 visiteurs simultanés = 1 seul appel à Steam', async () => {
  cache.clear();
  steamCalls.length = 0;
  await Promise.all(Array.from({ length: 20 }, () => get('/v1/reviews')));
  assert.equal(steamCalls.filter((u) => u.includes('appreviewhistogram')).length, 1);
});

test('jeu sans succès (Steam répond 403) : liste vide, pas une erreur', async () => {
  const previous = global.fetch;
  global.fetch = async (url, opts) => (String(url).includes('GetGlobalAchievementPercentagesForApp') ? new Response('{}', { status: 403 }) : previous(url, opts));
  cache.clear();
  const { res, body } = await json('/v1/achievements');
  global.fetch = previous;
  cache.clear();
  assert.equal(res.status, 200);
  assert.equal(body.count, 0);
  assert.deepEqual(body.achievements, []);
});

test('une redirection de Steam n\'est jamais suivie', async () => {
  const previous = global.fetch;
  let seenRedirect = null;
  global.fetch = async (url, opts) => {
    if (String(url).includes('appreviewhistogram')) {
      seenRedirect = opts?.redirect;
      throw new TypeError('redirect refused');
    }
    return previous(url, opts);
  };
  cache.clear();
  const res = await get('/v1/reviews');
  global.fetch = previous;
  cache.clear();
  assert.equal(seenRedirect, 'error');
  assert.equal(res.status, 502);
});

test('cache : valeur périmée de secours si Steam tombe', async () => {
  cache.clear();
  let fail = false;
  const loader = async () => {
    if (fail) throw new Error('down');
    return 42;
  };
  assert.equal((await cache.memo('k', 0, loader)).value, 42);
  fail = true;
  const again = await cache.memo('k', 0, loader);
  assert.equal(again.value, 42);
  assert.equal(again.stale, true);
  await assert.rejects(cache.memo('autre', 0, loader));
});

test('limite de débit : unité', () => {
  const hit = createRateLimiter({ windowMs: 60_000, max: 3 });
  assert.deepEqual([1, 2, 3, 4].map(() => hit('1.1.1.1').allowed), [true, true, true, false]);
  assert.equal(hit('2.2.2.2').allowed, true, 'une autre IP n\'est pas touchée');
});

test('limite de débit : le serveur répond 429 une fois la limite dépassée', async () => {
  let last;
  for (let i = 0; i < 130; i += 1) last = await get('/v1/health');
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) >= 1);
  assert.equal((await last.json()).error.code, 'rate_limited');
});
