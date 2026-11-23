/*!
 * robrun-api · .github/scripts/notify-discord.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const fs = require('node:fs');

const BRAND_COLOR = 0x8a4fff;
const MAX_COMMITS = 10;
const LABELS = {
  feat: 'Nouveauté',
  fix: 'Correctif',
  docs: 'Documentation',
  test: 'Tests',
  refactor: 'Refactorisation',
  perf: 'Performance',
  chore: 'Maintenance',
  ci: 'Intégration continue',
  build: 'Build',
  style: 'Style',
  security: 'Sécurité',
};

const escapeMarkdown = (text) => String(text).replace(/[\\`*_~|<>[\]]/g, '\\$&').replace(/@/g, '@\u200b');
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

function parseCommitMessage(message) {
  const first = String(message).split('\n')[0].trim();
  const match = first.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/);
  if (match && LABELS[match[1].toLowerCase()]) return { label: LABELS[match[1].toLowerCase()], summary: match[2] };
  return { label: 'Mise à jour', summary: first };
}

function pushEmbed(payload) {
  const commits = (payload.commits ?? []).filter((c) => c && c.id && c.message);
  const repo = payload.repository;
  const branch = String(payload.ref ?? '').replace('refs/heads/', '');
  const shown = commits.slice(0, MAX_COMMITS).map((c) => {
    const { label, summary } = parseCommitMessage(c.message);
    const author = c.author?.name ? ` · ${escapeMarkdown(c.author.name)}` : '';
    return `→ **${label}** · ${escapeMarkdown(clip(summary, 110))} — [\`${c.id.slice(0, 7)}\`](${c.url})${author}`;
  });
  if (commits.length > MAX_COMMITS) shown.push(`-# … et ${commits.length - MAX_COMMITS} autre(s) commit(s)`);

  const head = payload.head_commit;
  const description = [
    `Le dépôt **${escapeMarkdown(repo.name)}** vient d'être mis à jour.`,
    '',
    ...shown,
    '',
    payload.compare ? `[Voir les changements](${payload.compare})` : '',
  ].join('\n').trim();

  return {
    title: `Mise à jour · ${repo.name}`,
    url: repo.html_url,
    description: clip(description, 4000),
    color: BRAND_COLOR,
    fields: [
      { name: 'Branche', value: `\`${escapeMarkdown(branch)}\``, inline: true },
      { name: 'Commits', value: String(commits.length), inline: true },
      { name: 'Publié par', value: escapeMarkdown(payload.pusher?.name ?? payload.sender?.login ?? 'inconnu'), inline: true },
    ],
    footer: { text: 'ROB RUN Community API • GitHub' },
    timestamp: head?.timestamp ?? new Date().toISOString(),
  };
}

function releaseEmbed(payload) {
  const release = payload.release;
  const repo = payload.repository;
  const notes = String(release.body ?? '').replace(/\r\n?/g, '\n').trim();
  const description = [
    `Une nouvelle version de **${escapeMarkdown(repo.name)}** est disponible.`,
    '',
    notes ? clip(notes, 1500) : '',
    '',
    `[Lire les notes de version](${release.html_url})`,
  ].join('\n').trim();

  return {
    title: `Nouvelle version · ${release.name || release.tag_name}`,
    url: release.html_url,
    description: clip(description, 4000),
    color: BRAND_COLOR,
    fields: [
      { name: 'Version', value: `\`${escapeMarkdown(release.tag_name)}\``, inline: true },
      { name: 'Type', value: release.prerelease ? 'Préversion' : 'Version stable', inline: true },
    ],
    footer: { text: 'ROB RUN Community API • GitHub' },
    timestamp: release.published_at ?? new Date().toISOString(),
  };
}

/** Renvoie le message Discord à envoyer, ou null s'il n'y a rien à annoncer. */
function buildPayload(eventName, payload) {
  let embed = null;
  if (eventName === 'push') {
    if (payload.deleted || !payload.commits?.length) return null;
    embed = pushEmbed(payload);
  } else if (eventName === 'release') {
    if (payload.action !== 'published' || payload.release?.draft) return null;
    embed = releaseEmbed(payload);
  }
  if (!embed) return null;
  return { username: 'ROB RUN API', embeds: [embed], allowed_mentions: { parse: [] } };
}

async function main() {
  const url = (process.env.DISCORD_WEBHOOK_URL ?? '').trim();
  if (!url) {
    console.log('DISCORD_WEBHOOK_URL absent : aucune notification envoyée.');
    return;
  }
  if (!/^https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url)) throw new Error('DISCORD_WEBHOOK_URL invalide.');

  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const body = buildPayload(process.env.GITHUB_EVENT_NAME, event);
  if (!body) {
    console.log('Rien à annoncer pour cet événement.');
    return;
  }
  const res = await fetch(`${url}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  });
  if (!res.ok) throw new Error(`Discord a répondu ${res.status}.`);
  console.log('Notification envoyée.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { buildPayload, parseCommitMessage };
