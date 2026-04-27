'use strict';

/**
 * VISION AGENT — Config local
 * Salva token e server URL em ~/.vision-agent/config.json
 * Sem dependências externas.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CONFIG_DIR  = path.join(os.homedir(), '.vision-agent');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function load() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function save(data) {
  ensureDir();
  const current = load();
  const merged  = { ...current, ...data };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
  return merged;
}

function get(key) {
  return load()[key];
}

function set(key, value) {
  return save({ [key]: value });
}

function clear() {
  if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
}

function serverUrl() {
  return get('server_url') || process.env.VISION_CORE_URL || 'http://localhost:8787';
}

function token() {
  return get('token') || process.env.VISION_AGENT_TOKEN || null;
}

function isLoggedIn() {
  return !!token();
}

function configPath() {
  return CONFIG_FILE;
}

module.exports = { load, save, get, set, clear, serverUrl, token, isLoggedIn, configPath };
