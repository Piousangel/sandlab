CREATE TABLE IF NOT EXISTS spill_hist (
  level_id TEXT NOT NULL,
  lh       TEXT NOT NULL,
  moves    INTEGER NOT NULL,
  tbucket  INTEGER NOT NULL,
  cnt      INTEGER NOT NULL,
  PRIMARY KEY (level_id, lh, moves, tbucket)
);

CREATE TABLE IF NOT EXISTS spill_seen (
  level_id   TEXT NOT NULL,
  pid        TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (level_id, pid)
);

CREATE INDEX IF NOT EXISTS spill_seen_ip ON spill_seen (ip, created_at);
