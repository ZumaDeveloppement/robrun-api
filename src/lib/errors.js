/*!
 * robrun-api · src/lib/errors.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (message) => new ApiError(400, 'bad_request', message);
const notFound = (message = 'Route not found.') => new ApiError(404, 'not_found', message);
const unavailable = (message) => new ApiError(503, 'unavailable', message);
const upstream = (message = 'Steam is not responding right now.') => new ApiError(502, 'upstream_error', message);

module.exports = { ApiError, badRequest, notFound, unavailable, upstream };
