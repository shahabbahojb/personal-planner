const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const app = express();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'planner.db');
const db = new DatabaseSync(dbPath);

const DEFAULT_STATE = JSON.stringify({
  version: 2,
  theme: 'light',
  sprints: [],
  analytics: { totalFocusedMinutes: 0, totalSessions: 0, dailyLog: {} }
});

db.exec(`
  CREATE TABLE IF NOT EXISTS planner_state (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    version    INTEGER NOT NULL DEFAULT 2,
    data       TEXT    NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  INSERT OR IGNORE INTO planner_state (id, version, data, updated_at)
  VALUES (1, 2, '${DEFAULT_STATE.replace(/'/g, "''")}', unixepoch());
`);

const getStmt = db.prepare('SELECT data FROM planner_state WHERE id = 1');
const putStmt = db.prepare(
  'INSERT OR REPLACE INTO planner_state (id, version, data, updated_at) VALUES (1, ?, ?, unixepoch())'
);

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/state', (_req, res) => {
  try {
    const row = getStmt.get();
    res.json(row ? JSON.parse(row.data) : JSON.parse(DEFAULT_STATE));
  } catch (err) {
    console.error('[API] GET /api/state error:', err);
    res.status(500).json({ error: 'Failed to read state' });
  }
});

app.put('/api/state', (req, res) => {
  try {
    const data = req.body;
    putStmt.run(data.version || 2, JSON.stringify(data));
    res.json({ ok: true });
  } catch (err) {
    console.error('[API] PUT /api/state error:', err);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Planner → http://localhost:${PORT}`));
