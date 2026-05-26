import * as SQLite from 'expo-sqlite';
import { TELEMETRY_KEYS, csvEscape } from './telemetry';

const db = SQLite.openDatabaseSync('jdp_telemetry.db');

const TELEMETRY_COLUMNS = [
  ...TELEMETRY_KEYS.map((key) => ({ name: key, type: 'REAL' })),
  { name: 'gps_lat', type: 'REAL' },
  { name: 'gps_lon', type: 'REAL' },
  { name: 'gps_speed', type: 'REAL' },
  { name: 'gps_accuracy', type: 'REAL' },
  { name: 'raw_json', type: 'TEXT' },
];

const SESSION_COLUMNS = [
  { name: 'vin', type: 'TEXT' },
  { name: 'hw', type: 'TEXT' },
  { name: 'sw', type: 'TEXT' },
  { name: 'sw_upg', type: 'TEXT' },
  { name: 'serial', type: 'TEXT' },
  { name: 'preset', type: 'TEXT' },
  { name: 'selected_pids', type: 'TEXT' },
  { name: 'raw_trace_enabled', type: 'INTEGER DEFAULT 0' },
  { name: 'app_version', type: 'TEXT' },
  { name: 'location_start_lat', type: 'REAL' },
  { name: 'location_start_lon', type: 'REAL' },
  { name: 'location_end_lat', type: 'REAL' },
  { name: 'location_end_lon', type: 'REAL' },
];

export const initDatabase = () => {
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA synchronous = NORMAL;');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);
  ensureColumns('sessions', SESSION_COLUMNS);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS telemetry_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      timestamp TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  ensureColumns('telemetry_records', TELEMETRY_COLUMNS);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS raw_can_frames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      timestamp_ms INTEGER,
      can_id INTEGER,
      is_ext INTEGER,
      dlc INTEGER,
      data_hex TEXT,
      direction TEXT,
      bus TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS session_markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      label TEXT,
      note TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      field TEXT,
      value REAL,
      threshold REAL,
      kind TEXT,
      message TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS debug_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      message TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
    );
  `);

  db.execSync('CREATE INDEX IF NOT EXISTS idx_telemetry_session_id ON telemetry_records(session_id, id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_raw_session_id ON raw_can_frames(session_id, id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_markers_session_id ON session_markers(session_id, id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_alerts_session_id ON alerts(session_id, id);');
};

export const startSession = (description, metadata = {}) => {
  const fields = [
    'description',
    'vin',
    'hw',
    'sw',
    'sw_upg',
    'serial',
    'preset',
    'selected_pids',
    'raw_trace_enabled',
    'app_version',
    'location_start_lat',
    'location_start_lon',
  ];

  const values = [
    description || 'Sesja nienazwana',
    metadata.vin || null,
    metadata.hw || null,
    metadata.sw || null,
    metadata.sw_upg || null,
    metadata.serial || null,
    metadata.preset || null,
    metadata.selected_pids ? JSON.stringify(metadata.selected_pids) : null,
    metadata.raw_trace_enabled ? 1 : 0,
    metadata.app_version || null,
    metadata.location?.coords?.latitude ?? null,
    metadata.location?.coords?.longitude ?? null,
  ];

  const placeholders = fields.map(() => '?').join(', ');
  const result = db.runSync(`INSERT INTO sessions (${fields.join(', ')}) VALUES (${placeholders});`, values);
  return result.lastInsertRowId;
};

export const updateSessionMetadata = (sessionId, metadata = {}) => {
  if (!sessionId) return;
  const updates = [];
  const values = [];

  Object.entries({
    vin: metadata.vin,
    hw: metadata.hw,
    sw: metadata.sw,
    sw_upg: metadata.sw_upg,
    serial: metadata.serial,
    preset: metadata.preset,
    selected_pids: metadata.selected_pids ? JSON.stringify(metadata.selected_pids) : undefined,
    raw_trace_enabled:
      metadata.raw_trace_enabled === undefined ? undefined : metadata.raw_trace_enabled ? 1 : 0,
    location_end_lat: metadata.location?.coords?.latitude,
    location_end_lon: metadata.location?.coords?.longitude,
  }).forEach(([key, value]) => {
    if (value === undefined) return;
    updates.push(`${key} = ?`);
    values.push(value);
  });

  if (updates.length === 0) return;
  values.push(sessionId);
  db.runSync(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?;`, values);
};

export const insertBulkRecords = (sessionId, recordsBuffer) => {
  if (!sessionId || recordsBuffer.length === 0) return;

  const fields = ['session_id', 'timestamp', ...TELEMETRY_COLUMNS.map((column) => column.name)];
  const placeholders = fields.map(() => '?').join(', ');

  db.withTransactionSync(() => {
    const statement = db.prepareSync(`
      INSERT INTO telemetry_records (${fields.join(', ')})
      VALUES (${placeholders});
    `);

    try {
      recordsBuffer.forEach((record) => {
        statement.executeSync([
          sessionId,
          record.timestamp,
          ...TELEMETRY_COLUMNS.map((column) => record[column.name] ?? null),
        ]);
      });
    } finally {
      statement.finalizeSync();
    }
  });
};

export const insertBulkRawFrames = (sessionId, framesBuffer) => {
  if (!sessionId || framesBuffer.length === 0) return;

  db.withTransactionSync(() => {
    const statement = db.prepareSync(`
      INSERT INTO raw_can_frames
      (session_id, timestamp_ms, can_id, is_ext, dlc, data_hex, direction, bus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    try {
      framesBuffer.forEach((frame) => {
        statement.executeSync([
          sessionId,
          frame.timestamp_ms,
          frame.can_id,
          frame.is_ext,
          frame.dlc,
          frame.data_hex,
          frame.direction,
          frame.bus,
        ]);
      });
    } finally {
      statement.finalizeSync();
    }
  });
};

export const insertAlert = (sessionId, alert) => {
  if (!sessionId || !alert) return;
  db.runSync(
    'INSERT INTO alerts (session_id, timestamp, field, value, threshold, kind, message) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [sessionId, alert.timestamp, alert.field, alert.value, alert.threshold, alert.kind, alert.message]
  );
};

export const addSessionMarker = (sessionId, label, note = null) => {
  if (!sessionId) return null;
  const result = db.runSync('INSERT INTO session_markers (session_id, label, note) VALUES (?, ?, ?);', [
    sessionId,
    label || 'Marker',
    note,
  ]);
  return result.lastInsertRowId;
};

export const getAllSessions = () =>
  db.getAllSync(`
  SELECT
    s.*,
    (SELECT COUNT(*) FROM telemetry_records tr WHERE tr.session_id = s.id) AS record_count,
    (SELECT COUNT(*) FROM raw_can_frames rf WHERE rf.session_id = s.id) AS raw_count,
    (SELECT COUNT(*) FROM alerts a WHERE a.session_id = s.id) AS alert_count
  FROM sessions s
  ORDER BY s.id DESC;
`);

export const getRecordsForSession = (sessionId) =>
  db.getAllSync('SELECT * FROM telemetry_records WHERE session_id = ? ORDER BY id ASC;', [sessionId]);

export const getRawFramesForSession = (sessionId) =>
  db.getAllSync('SELECT * FROM raw_can_frames WHERE session_id = ? ORDER BY id ASC;', [sessionId]);

export const getMarkersForSession = (sessionId) =>
  db.getAllSync('SELECT * FROM session_markers WHERE session_id = ? ORDER BY id ASC;', [sessionId]);

export const getAlertsForSession = (sessionId) =>
  db.getAllSync('SELECT * FROM alerts WHERE session_id = ? ORDER BY id ASC;', [sessionId]);

export const getSessionStats = (sessionId) => {
  const selectFields = TELEMETRY_KEYS.map(
    (key) => `MIN(${key}) AS ${key}_min, MAX(${key}) AS ${key}_max, AVG(${key}) AS ${key}_avg`
  ).join(', ');

  return db.getFirstSync(
    `SELECT COUNT(*) AS count, ${selectFields} FROM telemetry_records WHERE session_id = ?;`,
    [sessionId]
  );
};

export const insertDebugLog = (message, sessionId = null) => {
  db.runSync('INSERT INTO debug_logs (session_id, message) VALUES (?, ?);', [sessionId, message]);
};

export const getDebugLogs = () => db.getAllSync('SELECT * FROM debug_logs ORDER BY id DESC LIMIT 1000;');

export const buildTelemetryCsv = (records) => {
  const headers = ['Timestamp', ...TELEMETRY_KEYS, 'gps_lat', 'gps_lon', 'gps_speed', 'gps_accuracy'];

  const rows = records.map((record) =>
    headers.map((header) => csvEscape(record[toRecordKey(header)])).join(',')
  );

  return `${headers.join(',')}\n${rows.join('\n')}\n`;
};

export const buildRawCanCsv = (frames) => {
  const headers = [
    'timestamp',
    'timestamp_ms',
    'bus',
    'direction',
    'can_id_hex',
    'can_id_dec',
    'is_ext',
    'dlc',
    'data_hex',
  ];
  const rows = frames.map((frame) =>
    [
      csvEscape(frame.timestamp),
      csvEscape(frame.timestamp_ms),
      csvEscape(frame.bus),
      csvEscape(frame.direction),
      csvEscape(`0x${Number(frame.can_id).toString(16).toUpperCase()}`),
      csvEscape(frame.can_id),
      csvEscape(frame.is_ext),
      csvEscape(frame.dlc),
      csvEscape(frame.data_hex),
    ].join(',')
  );

  return `${headers.join(',')}\n${rows.join('\n')}\n`;
};

const ensureColumns = (tableName, columns) => {
  const existing = db.getAllSync(`PRAGMA table_info(${tableName});`).map((column) => column.name);
  columns.forEach((column) => {
    if (existing.includes(column.name)) return;
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type};`);
  });
};

const toRecordKey = (header) => {
  if (header === 'Timestamp') return 'timestamp';
  return header;
};
