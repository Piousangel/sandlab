CREATE TABLE IF NOT EXISTS spill_hist (
  level_id TEXT NOT NULL,
  lh       TEXT NOT NULL,
  moves    INTEGER NOT NULL,
  tbucket  INTEGER NOT NULL,
  cnt      INTEGER NOT NULL,
  PRIMARY KEY (level_id, lh, moves, tbucket)
);

CREATE TABLE IF NOT EXISTS spill_seen (
  level_id TEXT NOT NULL,
  pid      TEXT NOT NULL,
  PRIMARY KEY (level_id, pid)
);
