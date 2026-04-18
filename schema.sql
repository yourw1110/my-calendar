CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  startTime TEXT,
  endTime TEXT,
  allDay INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'cyan',
  repeat TEXT NOT NULL DEFAULT 'none',
  memo TEXT,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
