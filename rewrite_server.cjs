const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');

// Replace fs/promises with fs/promises and better-sqlite3
serverContent = serverContent.replace(
  'import { createServer as createViteServer } from "vite";',
  'import { createServer as createViteServer } from "vite";\nimport Database from "better-sqlite3";'
);

// Add DB initialization
serverContent = serverContent.replace(
  'const STORAGE_FILE = path.join(process.cwd(), "storage.json");',
  `const STORAGE_FILE = path.join(process.cwd(), "storage.json");\nconst SQLITE_FILE = path.join(process.cwd(), "storage.db");\n\nconst db = new Database(SQLITE_FILE);\ndb.pragma('journal_mode = WAL');\ndb.exec(\`\n  CREATE TABLE IF NOT EXISTS kv_store (\n    key TEXT PRIMARY KEY,\n    value TEXT\n  )\n\`);`
);

// Replace readStorage
const readStorageRegex = /async function readStorage\(\) \{[\s\S]*?\n\}/m;
const newReadStorage = `async function readStorage() {
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get('app_state') as { value: string } | undefined;
    if (row) {
      const parsed = JSON.parse(row.value);
      if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.interval === 60) {
        parsed.qrSyncSettings.interval = 0;
      }
      if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.presets && !parsed.qrSyncSettings.presets.includes(0)) {
        parsed.qrSyncSettings.presets = [0, ...parsed.qrSyncSettings.presets].sort((a: number, b: number) => a - b);
      }
      return parsed;
    }
  } catch (error) {
    console.error("SQLite read error", error);
  }

  // Fallback to legacy storage.json migration
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    await writeStorage(parsed);
    return parsed;
  } catch (error) {
    // Ignore ENOENT
  }

  const defaultState = {
    qrStorageV2: {},
    qrStorageLastUpdated: 0,
    qrSyncSettings: {
      interval: 0,
      presets: [0, 1, 5, 15, 30, 60, 120]
    }
  };
  await writeStorage(defaultState);
  return defaultState;
}`;
serverContent = serverContent.replace(readStorageRegex, newReadStorage);

// Replace writeStorage
const writeStorageRegex = /async function writeStorage\(data: any\) \{[\s\S]*?\n\}/m;
const newWriteStorage = `async function writeStorage(data: any) {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)');
    stmt.run('app_state', JSON.stringify(data));
  } catch (err) {
    console.error("SQLite write error", err);
  }
}`;
serverContent = serverContent.replace(writeStorageRegex, newWriteStorage);

// Fix db-health endpoint
serverContent = serverContent.replace(
  'const stats = await fs.stat(STORAGE_FILE).catch(() => null);',
  'const stats = await fs.stat(SQLITE_FILE).catch(() => null);'
);

fs.writeFileSync('server.ts', serverContent);
