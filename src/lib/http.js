const { upstream } = require('./errors');

async function getJson(url, timeoutMs, { allow = [] } = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'RobRunCommunityAPI/1.0' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  } catch {
    throw upstream();
  }
  if (allow.includes(res.status)) return null;
  if (!res.ok) throw upstream(`Steam answered with HTTP ${res.status}.`);
  try {
    return await res.json();
  } catch {
    throw upstream('Unreadable response from Steam.');
  }
}

module.exports = { getJson };
