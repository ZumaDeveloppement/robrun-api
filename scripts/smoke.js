const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'robrun-smoke-'));
const { createServer } = require('../src/server');

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalLog = console.log;
  console.log = () => {};

  const paths = ['/v1/health', '/v1/players', '/v1/players/history?hours=1', '/v1/patchnotes?limit=2', '/v1/patchnotes/latest', '/v1/achievements', '/v1/reviews', '/v1/price?country=fr', '/v1/community', '/v1/leaderboard'];
  let bad = 0;
  for (const p of paths) {
    const res = await fetch(base + p);
    const body = await res.json();

    const expectedEmpty = (p === '/v1/community' && res.status === 503) || (p === '/v1/leaderboard' && res.status === 404);
    const good = res.status === 200 || expectedEmpty;
    if (!good) bad += 1;
    originalLog(`${good ? '✅' : '❌'} ${p} → ${res.status}${expectedEmpty ? ' (vide : le bot n\'a encore rien envoyé)' : ''}`);
    originalLog('   ' + JSON.stringify(body).slice(0, 230));
  }
  server.close();
  process.exit(bad ? 1 : 0);
})();
