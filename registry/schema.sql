CREATE TABLE IF NOT EXISTS packages (
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  authors     TEXT NOT NULL DEFAULT '[]',
  checksum    TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (name, version)
);

CREATE INDEX IF NOT EXISTS idx_packages_name
  ON packages(name);
