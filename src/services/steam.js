const config = require('../config');
const { memo } = require('../lib/cache');
const { getJson } = require('../lib/http');
const { upstream } = require('../lib/errors');
const { toMarkdown } = require('./markdown');

const { api, store, timeoutMs, cache: ttl } = config.steam;
const appId = config.appId;
const withMeta = ({ value, at, stale }) => ({ ...value, updatedAt: new Date(at).toISOString(), ...(stale ? { stale: true } : {}) });

async function players() {
  const res = await memo('players', ttl.players, async () => {
    const data = (await getJson(`${api}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`, timeoutMs)).response;
    if (data?.result !== 1 || !Number.isInteger(data.player_count) || data.player_count < 0) throw upstream('Invalid response from Steam.');
    return { appId, players: data.player_count };
  });
  return { ...withMeta(res) };
}

async function news(limit = 10) {
  const res = await memo('news', ttl.news, async () => {
    const data = await getJson(`${api}/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=30&maxlength=0&feeds=steam_community_announcements`, timeoutMs);
    const items = data?.appnews?.newsitems;
    if (!Array.isArray(items)) throw upstream('Invalid response from Steam.');
    return items
      .filter((n) => n && n.gid && n.title && Number.isFinite(Number(n.date)))
      .map((n) => ({
        id: String(n.gid),
        title: String(n.title),
        url: `${store}/news/app/${appId}/view/${encodeURIComponent(n.gid)}`,
        author: n.author ? String(n.author) : null,
        publishedAt: new Date(Number(n.date) * 1000).toISOString(),
        markdown: toMarkdown(String(n.contents ?? '')),
      }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });
  return { items: res.value.slice(0, limit), total: res.value.length, updatedAt: new Date(res.at).toISOString(), ...(res.stale ? { stale: true } : {}) };
}

async function achievements() {
  const res = await memo('achievements', ttl.achievements, async () => {
    const data = await getJson(`${api}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`, timeoutMs, { allow: [403] });
    const list = data?.achievementpercentages?.achievements;
    if (!data || list === undefined) return { achievements: [] };
    if (!Array.isArray(list)) throw upstream('Invalid response from Steam.');
    return {
      achievements: list
        .map((a) => ({ name: String(a.name), percent: Math.round(Number(a.percent) * 100) / 100 }))
        .filter((a) => Number.isFinite(a.percent))
        .sort((a, b) => b.percent - a.percent),
    };
  });
  return { appId, count: res.value.achievements.length, ...res.value, updatedAt: new Date(res.at).toISOString(), ...(res.stale ? { stale: true } : {}) };
}

async function reviews() {
  const res = await memo('reviews', ttl.reviews, async () => {
    const data = await getJson(`${store}/appreviewhistogram/${appId}?l=english`, timeoutMs);
    const weeks = data?.results?.rollups;
    if (data?.success !== 1 || !Array.isArray(weeks)) throw upstream('Invalid response from Steam.');
    const sum = (field) => weeks.reduce((total, w) => total + (Number(w?.[field]) || 0), 0);
    const positive = sum('recommendations_up');
    const negative = sum('recommendations_down');
    const total = positive + negative;
    const last = weeks.at(-1);
    const lastTotal = last ? (Number(last.recommendations_up) || 0) + (Number(last.recommendations_down) || 0) : 0;
    return {
      appId,
      total,
      positive,
      negative,
      positivePercent: total ? Math.round((positive / total) * 1000) / 10 : null,
      lastWeek: lastTotal ? { positivePercent: Math.round(((Number(last.recommendations_up) || 0) / lastTotal) * 1000) / 10, total: lastTotal } : null,
    };
  });
  return withMeta(res);
}

async function price(cc = 'us') {
  const res = await memo(`price:${cc}`, ttl.price, async () => {
    const data = await getJson(`${store}/api/appdetails?appids=${appId}&cc=${cc}&filters=basic,price_overview,release_date`, timeoutMs);
    const entry = data?.[appId];
    if (!entry?.success || !entry.data) throw upstream('Store data unavailable.');
    const d = entry.data;
    const p = d.price_overview;
    return {
      appId,
      name: d.name ?? null,
      storeUrl: `${store}/app/${appId}`,
      free: Boolean(d.is_free),
      country: cc,
      price: p ? { currency: p.currency, initial: p.initial / 100, final: p.final / 100, discountPercent: p.discount_percent, formatted: p.final_formatted } : null,
      releaseDate: d.release_date?.coming_soon ? null : (d.release_date?.date ?? null),
    };
  });
  return withMeta(res);
}

module.exports = { players, news, achievements, reviews, price };
