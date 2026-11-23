/*!
 * robrun-api · src/services/storage.js
 * Copyright (c) 2026 Zuma.Eu · MIT License
 * Discord: https://discord.gg/rejoins
 */

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(config.dataDir, name), 'utf8'));
  } catch {
    return null;
  }
}

function write(name, value) {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const file = path.join(config.dataDir, name);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    console.error(`[storage] écriture de ${name} impossible : ${err.message}`);
    return false;
  }
}

module.exports = { read, write };
