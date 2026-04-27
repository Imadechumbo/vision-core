-- VISION CORE — Schema SQLite
-- Executa via: node src/db/migrate.js

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Projetos monitorados ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  stack       TEXT NOT NULL DEFAULT 'node_express',
  path        TEXT NOT NULL,
  health_url  TEXT,
  adapter     TEXT DEFAULT 'generic',
  config      TEXT DEFAULT '{}',   -- JSON blob com configurações extras
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ── Missões ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id),
  status        TEXT NOT NULL DEFAULT 'pending',
  -- pending | running | success | failed | requires_review | high_risk
  error_input   TEXT NOT NULL,
  rca_cause     TEXT,
  rca_fix       TEXT,
  rca_confidence INTEGER DEFAULT 0,
  rca_risk      TEXT DEFAULT 'unknown',
  rca_source    TEXT DEFAULT 'hermes_llm',
  patches_count INTEGER DEFAULT 0,
  pass_gold     INTEGER DEFAULT 0,   -- 0 | 1
  gold_score    INTEGER DEFAULT 0,   -- 0-100
  gold_level    TEXT DEFAULT 'NEEDS_REVIEW', -- GOLD | SILVER | NEEDS_REVIEW
  pr_branch     TEXT,
  pr_url        TEXT,
  duration_ms   INTEGER DEFAULT 0,
  log_source    TEXT,
  narrative     TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- ── Passos da timeline de cada missão ────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id  TEXT NOT NULL REFERENCES missions(id),
  step        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | running | ok | fail
  detail      TEXT,
  elapsed_ms  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ── Patches aplicados ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id  TEXT NOT NULL REFERENCES missions(id),
  file        TEXT NOT NULL,
  find_text   TEXT NOT NULL,
  replace_text TEXT NOT NULL,
  description TEXT,
  order_idx   INTEGER DEFAULT 1,
  applied     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ── Snapshots do vault ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
  id          TEXT PRIMARY KEY,
  mission_id  TEXT NOT NULL REFERENCES missions(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  file_path   TEXT NOT NULL,
  content     TEXT NOT NULL,   -- conteúdo original antes do patch
  hash        TEXT NOT NULL,
  rolled_back INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ── Avaliações PASS GOLD ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pass_gold_evaluations (
  id               TEXT PRIMARY KEY,
  mission_id       TEXT NOT NULL REFERENCES missions(id),
  final_score      INTEGER NOT NULL,
  level            TEXT NOT NULL,
  llm_confidence   INTEGER DEFAULT 0,
  data_quality     INTEGER DEFAULT 0,
  patch_specificity INTEGER DEFAULT 0,
  risk_level       INTEGER DEFAULT 0,
  memory_score     INTEGER DEFAULT 0,
  build_passed     INTEGER DEFAULT 0,
  tests_passed     INTEGER DEFAULT 0,
  lint_passed      INTEGER DEFAULT 0,
  snapshot_exists  INTEGER DEFAULT 0,
  rollback_ready   INTEGER DEFAULT 0,
  verdict          TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- ── Fila de workers ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_queue (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'MISSION',
  payload     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed
  result      TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  started_at  TEXT,
  done_at     TEXT
);

-- ── Memória do Hermes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hermes_memory (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,
  error_snippet     TEXT NOT NULL,
  cause             TEXT NOT NULL,
  fix               TEXT NOT NULL,
  patch_applied     INTEGER DEFAULT 0,
  validation_passed INTEGER DEFAULT 0,
  confidence        INTEGER DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now'))
);

-- ── Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_missions_project ON missions(project_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_steps_mission ON mission_steps(mission_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_mission ON snapshots(mission_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON worker_queue(status);
CREATE INDEX IF NOT EXISTS idx_memory_snippet ON hermes_memory(error_snippet);
