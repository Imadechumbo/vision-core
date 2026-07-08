// backend/agent-queue-db.js
// §112: Persistent mission queue/results via SQLite (sql.js — pure JS, no native build).
//
// Design: sql.js keeps the DB in memory; after every write we call db.export()
// and flush the result to disk as a real SQLite binary file. On startup we load
// that file back into memory. kill -9 safe — the flush is synchronous before the
// route handler returns, so a crash mid-response at worst loses the last in-flight
// write, which is the same guarantee any fsync-backed DB gives at this tier.
//
// Public API (all synchronous after init()):
//   init(dataDir)  → Promise<void>   — call once before app.listen
//   push(mission)  → void
//   shift()        → Object|null     — FIFO, returns the next pending mission
//   length()       → Number          — current queue depth
//   storeResult(id, result) → void
//   getResult(id)  → Object|null
//
// File: <dataDir>/agent-queue.sqlite  (real SQLite binary, openable with sqlite3 CLI)

'use strict';

const fs   = require('fs');
const path = require('path');

let _db     = null;
let _dbPath = null;

/* ── init ──────────────────────────────────────────────────── */
async function init(dataDir) {
  if (_db) return;                        // idempotent

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  fs.mkdirSync(dataDir, { recursive: true });
  _dbPath = path.join(dataDir, 'agent-queue.sqlite');

  /* load existing DB or create fresh */
  let existingData = null;
  if (fs.existsSync(_dbPath)) {
    try { existingData = fs.readFileSync(_dbPath); }
    catch (e) { console.warn('[agent-queue-db] could not read existing DB, starting fresh:', e.message); }
  }
  _db = existingData ? new SQL.Database(existingData) : new SQL.Database();

  /* tables — IF NOT EXISTS makes this idempotent on an existing DB */
  _db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      rowid   INTEGER PRIMARY KEY AUTOINCREMENT,
      id      TEXT    NOT NULL,
      payload TEXT    NOT NULL
    )
  `);
  _db.run(`
    CREATE TABLE IF NOT EXISTS results (
      mission_id TEXT PRIMARY KEY,
      payload    TEXT NOT NULL
    )
  `);

  _save(); /* ensure file exists on disk immediately after init */
  console.log('[agent-queue-db] ready —', _dbPath);
}

/* ── internal persist ──────────────────────────────────────── */
function _save() {
  if (!_db || !_dbPath) return;
  try {
    const buf = Buffer.from(_db.export());
    fs.writeFileSync(_dbPath, buf);       /* synchronous flush — crash-safe */
  } catch (e) {
    console.error('[agent-queue-db] _save failed:', e.message);
  }
}

/* ── queue operations ──────────────────────────────────────── */
function push(mission) {
  _db.run(
    'INSERT INTO queue (id, payload) VALUES (?, ?)',
    [mission.id, JSON.stringify(mission)]
  );
  _save();
}

function shift() {
  const stmt = _db.prepare('SELECT rowid, payload FROM queue ORDER BY rowid ASC LIMIT 1');
  const hasRow = stmt.step();
  if (!hasRow) { stmt.free(); return null; }
  const [rowid, payload] = stmt.get();
  stmt.free();

  _db.run('DELETE FROM queue WHERE rowid = ?', [rowid]);
  _save();
  return JSON.parse(payload);
}

function shiftForAgent(agentId) {
  const normalizedAgentId = agentId ? String(agentId) : null;
  const stmt = _db.prepare('SELECT rowid, payload FROM queue ORDER BY rowid ASC');
  let selected = null;
  while (stmt.step()) {
    const [rowid, payload] = stmt.get();
    const mission = JSON.parse(payload);
    if (!mission.agent_id || mission.agent_id === normalizedAgentId) {
      selected = { rowid, mission };
      break;
    }
  }
  stmt.free();
  if (!selected) return null;

  _db.run('DELETE FROM queue WHERE rowid = ?', [selected.rowid]);
  _save();
  return selected.mission;
}
function length() {
  const stmt = _db.prepare('SELECT COUNT(*) FROM queue');
  stmt.step();
  const [cnt] = stmt.get();
  stmt.free();
  return cnt;
}

/* ── result storage ────────────────────────────────────────── */
function storeResult(mission_id, result) {
  _db.run(
    'INSERT OR REPLACE INTO results (mission_id, payload) VALUES (?, ?)',
    [mission_id, JSON.stringify(result)]
  );
  _save();
}

function getResult(mission_id) {
  const stmt = _db.prepare('SELECT payload FROM results WHERE mission_id = ?');
  stmt.bind([mission_id]);
  const hasRow = stmt.step();
  if (!hasRow) { stmt.free(); return null; }
  const [payload] = stmt.get();
  stmt.free();
  return JSON.parse(payload);
}

module.exports = { init, push, shift, shiftForAgent, length, storeResult, getResult };
