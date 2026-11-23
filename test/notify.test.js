/*!
 * robrun-api · test/notify.test.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPayload, parseCommitMessage } = require('../.github/scripts/notify-discord');

const repository = { name: 'robrun-api', html_url: 'https://github.com/ZumaDeveloppement/robrun-api' };
const commit = (id, message, name = 'Zuma.Eu') => ({ id, message, url: `${repository.html_url}/commit/${id}`, author: { name } });
const push = (commits, extra = {}) => ({ ref: 'refs/heads/main', repository, pusher: { name: 'Zuma.Eu' }, compare: `${repository.html_url}/compare/a...b`, commits, head_commit: { timestamp: '2026-11-23T04:00:00Z' }, ...extra });

test('un push devient un message clair : libellé, résumé, lien du commit, auteur', () => {
  const out = buildPayload('push', push([commit('a'.repeat(40), 'feat: add price route'), commit('b'.repeat(40), 'fix: handle 403 from Steam')]));
  const embed = out.embeds[0];
  assert.match(embed.title, /Mise à jour · robrun-api/);
  assert.match(embed.description, /\*\*Nouveauté\*\* · add price route — \[`aaaaaaa`\]\(https:\/\/github\.com\/.+\/commit\/a{40}\)/);
  assert.match(embed.description, /\*\*Correctif\*\* · handle 403 from Steam/);
  assert.match(embed.description, /\[Voir les changements\]\(https:\/\/github\.com\/.+\/compare\//);
  assert.equal(embed.fields.find((f) => f.name === 'Commits').value, '2');
  assert.equal(embed.fields.find((f) => f.name === 'Branche').value, '`main`');
  assert.equal(embed.timestamp, '2026-11-23T04:00:00Z');
});

test('les messages libres sont acceptés, sans casser', () => {
  assert.deepEqual(parseCommitMessage('Add CI workflow for testing on Node.js'), { label: 'Mise à jour', summary: 'Add CI workflow for testing on Node.js' });
  assert.deepEqual(parseCommitMessage('docs(readme)!: new badge\n\nlong body'), { label: 'Documentation', summary: 'new badge' });
  assert.equal(parseCommitMessage('unknown: something').label, 'Mise à jour');
});

test('aucune mention possible, même avec @everyone dans un message de commit', () => {
  const out = buildPayload('push', push([commit('c'.repeat(40), 'fix: ping @everyone and <@123456> now', '@here')]));
  assert.deepEqual(out.allowed_mentions, { parse: [] });
  assert.ok(!/@everyone|@here/.test(JSON.stringify(out.embeds[0].description)), '@everyone doit être neutralisé');
  assert.ok(!out.embeds[0].description.includes('<@123456>'));
});

test('le Markdown des messages est neutralisé (pas de faux liens)', () => {
  const out = buildPayload('push', push([commit('d'.repeat(40), 'fix: [click](https://evil.example) `code` **bold**')]));
  assert.ok(!out.embeds[0].description.includes('[click](https://evil.example)'));
});

test('limites de Discord respectées avec beaucoup de commits et des messages très longs', () => {
  const commits = Array.from({ length: 30 }, (_, i) => commit(String(i).padStart(40, '0'), `feat: ${'x'.repeat(500)}`));
  const embed = buildPayload('push', push(commits)).embeds[0];
  assert.ok(embed.description.length <= 4096);
  assert.match(embed.description, /et 20 autre\(s\) commit\(s\)/);
  assert.ok(embed.title.length <= 256);
  assert.ok(embed.fields.every((f) => f.value.length <= 1024));
});

test('rien à annoncer : suppression de branche ou push sans commit', () => {
  assert.equal(buildPayload('push', push([], { deleted: true })), null);
  assert.equal(buildPayload('push', push([])), null);
});

test('une release publiée est annoncée avec ses notes et son lien', () => {
  const release = { tag_name: 'v1.1.0', name: 'ROB RUN Community API 1.1.0', html_url: `${repository.html_url}/releases/tag/v1.1.0`, body: '## Nouveautés\n- Route /v1/trend', prerelease: false, draft: false, published_at: '2026-11-23T05:00:00Z' };
  const out = buildPayload('release', { action: 'published', release, repository });
  const embed = out.embeds[0];
  assert.match(embed.title, /Nouvelle version · ROB RUN Community API 1\.1\.0/);
  assert.match(embed.description, /Route \/v1\/trend/);
  assert.match(embed.description, /\[Lire les notes de version\]\(https:\/\/github\.com\/.+v1\.1\.0\)/);
  assert.equal(embed.fields.find((f) => f.name === 'Type').value, 'Version stable');
});

test('brouillons et autres actions de release ignorés ; événements inconnus ignorés', () => {
  const release = { tag_name: 'v2', html_url: 'https://x', draft: true };
  assert.equal(buildPayload('release', { action: 'published', release, repository }), null);
  assert.equal(buildPayload('release', { action: 'created', release: { ...release, draft: false }, repository }), null);
  assert.equal(buildPayload('issues', { action: 'opened', repository }), null);
});
