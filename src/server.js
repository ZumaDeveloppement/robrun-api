/*!
 * robrun-api · src/server.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const http = require('node:http');
const config = require('./config');
const routes = require('./routes');
const { createRateLimiter } = require('./lib/rateLimit');
const { ApiError, badRequest, notFound } = require('./lib/errors');

const limiter = createRateLimiter(config.rateLimit);
const byPath = new Map();
for (const route of routes) {
  if (!byPath.has(route.path)) byPath.set(route.path, new Map());
  byPath.get(route.path).set(route.method, route);
}

function clientIp(req) {
  if (config.trustProxy) {
    const parts = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts.at(-1);
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  const all = config.allowedOrigins.includes('*');
  if (all) return { 'Access-Control-Allow-Origin': '*' };
  if (origin && config.allowedOrigins.includes(origin)) return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  return { Vary: 'Origin' };
}

function send(req, res, status, payload, extra = {}) {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cross-Origin-Resource-Policy': 'cross-origin',
    ...corsHeaders(req),
    ...extra,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const fail = (req, res, err, extra) => send(req, res, err.status, { error: { code: err.code, message: err.message } }, extra);

function readJson(req) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return reject(badRequest('Content-Type application/json is expected.'));
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      if (tooBig) return;
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        tooBig = true;
        chunks.length = 0;
        reject(new ApiError(413, 'payload_too_large', 'Request body too large.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(badRequest('Invalid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const started = Date.now();
  let status = 500;
  const done = (s) => {
    status = s;
  };
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

    const rate = limiter(clientIp(req));
    const rateHeaders = { 'X-RateLimit-Limit': String(rate.limit), 'X-RateLimit-Remaining': String(rate.remaining), 'X-RateLimit-Reset': String(Math.ceil(rate.resetAt / 1000)) };
    if (!rate.allowed) {
      done(429);
      return fail(req, res, new ApiError(429, 'rate_limited', 'Too many requests. Try again in a moment.'), { ...rateHeaders, 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) });
    }

    if (req.method === 'OPTIONS') {
      done(204);
      return send(req, res, 204, undefined, { ...rateHeaders, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' });
    }

    const methods = byPath.get(pathname);
    if (!methods) throw notFound();
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    const route = methods.get(method);
    if (!route) {
      done(405);
      return fail(req, res, new ApiError(405, 'method_not_allowed', 'Method not allowed.'), { ...rateHeaders, Allow: [...methods.keys()].join(', ') });
    }

    const body = route.body ? await readJson(req) : undefined;
    const data = await route.handler({ query: url.searchParams, body, headers: req.headers });
    done(200);
    return send(req, res, 200, data, { ...rateHeaders, 'Cache-Control': route.cache ? `public, max-age=${route.cache}` : 'no-store' });
  } catch (err) {
    if (err instanceof ApiError) {
      done(err.status);

      return fail(req, res, err, { 'Cache-Control': 'no-store', ...(err.status === 413 ? { Connection: 'close' } : {}) });
    }
    console.error('[api] erreur interne :', err);
    done(500);
    return fail(req, res, new ApiError(500, 'internal_error', 'Internal error.'), { 'Cache-Control': 'no-store' });
  } finally {
    console.log(`${new Date().toISOString()} ${req.method} ${String(req.url).split('?')[0].slice(0, 120)} ${status} ${Date.now() - started}ms`);
  }
}

function createServer() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[api] erreur fatale de requête :', err);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  server.requestTimeout = config.requestTimeoutMs;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  return server;
}

module.exports = { createServer };
