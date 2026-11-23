/*!
 * robrun-api · src/services/markdown.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

function toMarkdown(input) {
  let s = String(input).replace(/\r\n?/g, '\n');
  s = s.replace(/\[img\][\s\S]*?\[\/img\]/gi, '').replace(/\{STEAM_CLAN_IMAGE\}\S*/g, '');
  s = s.replace(/\[previewyoutube=[^\]]*\]\[\/previewyoutube\]/gi, '');
  s = s.replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, '\n# $1\n').replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, '\n## $1\n').replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, '\n### $1\n');
  s = s.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '**$1**').replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '*$1*').replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1').replace(/\[strike\]([\s\S]*?)\[\/strike\]/gi, '~~$1~~');
  s = s.replace(/\[\/?(?:list|olist)\]/gi, '\n').replace(/\[\*\]\s*/g, '\n- ');
  s = s.replace(/\[\/?(?!url\b)[a-z0-9]+(?:=[^\]]*)?\]/gi, '');

  s = s.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (m, url, text) => (/^https?:\/\//i.test(url.trim()) ? `[${text}](${url.trim()})` : text));
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { toMarkdown };
