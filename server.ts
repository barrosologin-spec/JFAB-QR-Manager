import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const STORAGE_FILE = path.join(process.cwd(), "storage.json");
const SQLITE_FILE = path.join(process.cwd(), "storage.db");

const db = new Database(SQLITE_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 1. settings table (to store simple configuration strings & timestamps)
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// 2. containers table (representing individual container units)
db.exec(`
  CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    finalized INTEGER DEFAULT 0,
    UNIQUE(category, date, name)
  )
`);

// 3. items table (representing the barcode items/scans under each container)
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    container_id TEXT NOT NULL,
    t TEXT NOT NULL,
    ts INTEGER NOT NULL,
    duplicate INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    nfe_data TEXT,
    original_data TEXT,
    FOREIGN KEY(container_id) REFERENCES containers(id) ON DELETE CASCADE
  )
`);

// 4. Indexes for optimized indexing, queries and faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_containers_category_date ON containers(category, date);
  CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
  CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(t);
`);

// Helper to serialize deep JSON state to relational tables atomically
function saveStateToTables(data: any) {
  const transaction = db.transaction(() => {
    // 1. Save metadata / settings
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    if (data.qrStorageLastUpdated !== undefined) {
      insertSetting.run('qrStorageLastUpdated', String(data.qrStorageLastUpdated));
    }
    if (data.qrSyncSettings) {
      insertSetting.run('qrSyncSettings', JSON.stringify(data.qrSyncSettings));
    }

    // 2. Clear old data (cascades deletes to items if foreign keys are enabled, but we clear both for safety)
    db.prepare('DELETE FROM items').run();
    db.prepare('DELETE FROM containers').run();

    // 3. Insert structured data
    if (data.qrStorageV2 && typeof data.qrStorageV2 === 'object') {
      const insertContainer = db.prepare(`
        INSERT INTO containers (id, category, date, name, finalized)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const insertItem = db.prepare(`
        INSERT INTO items (id, container_id, t, ts, duplicate, archived, nfe_data, original_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let containerIdCounter = 1;
      let itemIdCounter = 1;

      for (const [category, datesObj] of Object.entries(data.qrStorageV2)) {
        if (category.startsWith('_') || typeof datesObj !== 'object' || !datesObj) continue;
        
        for (const [date, containersObj] of Object.entries(datesObj)) {
          if (typeof containersObj !== 'object' || !containersObj) continue;
          
          for (const [containerName, containerData] of Object.entries(containersObj)) {
            if (typeof containerData !== 'object' || !containerData) continue;
            
            const contObj = containerData as any;
            const containerId = `c_${containerIdCounter++}`;
            const finalized = contObj.finalized ? 1 : 0;

            insertContainer.run(containerId, category, date, containerName, finalized);

            if (contObj.items && Array.isArray(contObj.items)) {
              for (const item of contObj.items) {
                if (!item || typeof item !== 'object') continue;
                
                const itemId = `i_${itemIdCounter++}`;
                const duplicate = item.duplicate ? 1 : 0;
                const archived = item.archived ? 1 : 0;
                const nfe_data = item.nfeData ? JSON.stringify(item.nfeData) : null;
                const original_data = item.original ? JSON.stringify(item.original) : null;

                insertItem.run(
                  itemId,
                  containerId,
                  item.t || '',
                  item.ts || Date.now(),
                  duplicate,
                  archived,
                  nfe_data,
                  original_data
                );
              }
            }
          }
        }
      }
    }
  });
  
  transaction();
}

// Helper to reconstruct state from relational tables
function loadStateFromTables() {
  const state: any = {
    qrStorageV2: {},
    qrStorageLastUpdated: 0,
    qrSyncSettings: {
      interval: 0,
      presets: [0, 1, 5, 15, 30, 60, 120]
    }
  };

  // 1. Load settings/metadata
  try {
    const lastUpdatedRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('qrStorageLastUpdated') as { value: string } | undefined;
    if (lastUpdatedRow) {
      state.qrStorageLastUpdated = Number(lastUpdatedRow.value) || 0;
    }

    const syncSettingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('qrSyncSettings') as { value: string } | undefined;
    if (syncSettingsRow) {
      state.qrSyncSettings = JSON.parse(syncSettingsRow.value);
    }
  } catch (err) {
    console.error("Error loading settings from SQLite", err);
  }

  // 2. Load hierarchy
  try {
    const containers = db.prepare('SELECT * FROM containers').all() as any[];
    const items = db.prepare('SELECT * FROM items ORDER BY ts ASC').all() as any[];

    const itemsByContainer: Record<string, any[]> = {};
    for (const item of items) {
      if (!itemsByContainer[item.container_id]) {
        itemsByContainer[item.container_id] = [];
      }
      itemsByContainer[item.container_id].push({
        t: item.t,
        ts: Number(item.ts),
        duplicate: item.duplicate === 1,
        archived: item.archived === 1,
        ...(item.nfe_data ? { nfeData: JSON.parse(item.nfe_data) } : {}),
        ...(item.original_data ? { original: JSON.parse(item.original_data) } : {})
      });
    }

    for (const cont of containers) {
      const { category, date, name, finalized, id: containerId } = cont;
      
      if (!state.qrStorageV2[category]) {
        state.qrStorageV2[category] = {};
      }
      if (!state.qrStorageV2[category][date]) {
        state.qrStorageV2[category][date] = {};
      }

      state.qrStorageV2[category][date][name] = {
        finalized: finalized === 1,
        items: itemsByContainer[containerId] || []
      };
    }
  } catch (err) {
    console.error("Error loading containers/items from SQLite", err);
  }

  return state;
}

// Seamless database migration on startup
try {
  // Check if containers table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM containers').get() as { count: number } | undefined;
  if (!countRow || countRow.count === 0) {
    // Check if we have legacy kv_store data to migrate
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv_store'").get();
    if (tableCheck) {
      const appStateRow = db.prepare("SELECT value FROM kv_store WHERE key = 'app_state'").get() as { value: string } | undefined;
      if (appStateRow && appStateRow.value) {
        console.log("Migrando dados do kv_store legado para tabelas relacionais organizadas...");
        const parsed = JSON.parse(appStateRow.value);
        saveStateToTables(parsed);
        console.log("Migração concluída com sucesso!");
      }
    }
  }
} catch (err) {
  console.error("Erro durante a verificação de migração automática:", err);
}

app.use(express.json({ limit: '50mb' }));

// Proxy for NF-e API
app.post("/api/consultadanfe", async (req, res) => {
  try {
    const { chave } = req.body;
    const resp = await fetch('https://consultadanfe.com/api/v1/consulta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave }),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to consult NF-e" });
  }
});

// Helper to read storage file
async function readStorage() {
  try {
    const parsed = loadStateFromTables();
    if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.interval === 60) {
      parsed.qrSyncSettings.interval = 0;
    }
    if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.presets && !parsed.qrSyncSettings.presets.includes(0)) {
      parsed.qrSyncSettings.presets = [0, ...parsed.qrSyncSettings.presets].sort((a: number, b: number) => a - b);
    }
    return parsed;
  } catch (error) {
    console.error("SQLite load error", error);
  }

  // Fallback to legacy storage.json migration
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    saveStateToTables(parsed);
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
  saveStateToTables(defaultState);
  return defaultState;
}

// Helper to write storage file atomically to prevent corruption
async function writeStorage(data: any) {
  try {
    saveStateToTables(data);
  } catch (err) {
    console.error("SQLite write error", err);
  }
}

// GET entire state
app.get("/api/sync", async (req, res) => {
  try {
    const data = await readStorage();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read storage" });
  }
});

// GET only settings
app.get("/api/settings", async (req, res) => {
  try {
    const data = await readStorage();
    res.json(data.qrSyncSettings || { interval: 60, presets: [1, 5, 15, 30, 60, 120] });
  } catch (err) {
    res.status(500).json({ error: "Failed to read storage" });
  }
});

// POST to update entire data (Sync)
app.post("/api/sync", async (req, res) => {
  try {
    const { qrStorageV2, qrStorageLastUpdated } = req.body;
    
    // We only update if standard fields are present
    if (qrStorageLastUpdated === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const currentData = await readStorage();
    
    // Cloud conflict resolution: If local update is newer than cloud, update cloud
    if (qrStorageLastUpdated > (currentData.qrStorageLastUpdated || 0)) {
      currentData.qrStorageV2 = qrStorageV2;
      currentData.qrStorageLastUpdated = qrStorageLastUpdated;
      await writeStorage(currentData);
      return res.json({ success: true, updated: true, data: currentData });
    }
    
    // If cloud is newer, return cloud data
    return res.json({ success: true, updated: false, data: currentData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update storage" });
  }
});

// POST to update settings
app.post("/api/settings", async (req, res) => {
  try {
    const { interval, presets } = req.body;
    const currentData = await readStorage();
    
    if (interval !== undefined) currentData.qrSyncSettings.interval = interval;
    if (presets !== undefined) currentData.qrSyncSettings.presets = presets;
    
    await writeStorage(currentData);
    res.json({ success: true, settings: currentData.qrSyncSettings });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// GET database health, size and integrity status
app.get("/api/db-health", async (req, res) => {
  try {
    const stats = await fs.stat(SQLITE_FILE).catch(() => null);
    
    // Efficiently count items using relational index
    const countRow = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number } | undefined;
    const itemCount = countRow ? countRow.count : 0;

    const sizeBytes = stats ? stats.size : 0;
    let sizeFormatted = "0 KB";
    if (sizeBytes > 1024 * 1024) {
      sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeBytes > 1024) {
      sizeFormatted = `${(sizeBytes / 1024).toFixed(2)} KB`;
    } else {
      sizeFormatted = `${sizeBytes} B`;
    }

    // Verify schema integrity
    const integrityCheck = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    const isOk = !integrityCheck || Object.values(integrityCheck)[0] === 'ok';

    const integrity = isOk ? "Excelente" : "Inconsistente";
    const message = isOk 
      ? "Banco de dados relacional SQLite estruturado e totalmente íntegro." 
      : "Inconsistência física detectada no SQLite. Recomendado restaurar backup.";

    res.json({
      sizeBytes,
      sizeFormatted,
      integrity,
      message,
      itemCount,
      lastCheckTime: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ 
      sizeBytes: 0,
      sizeFormatted: "Desconhecido",
      integrity: "Falha de Verificação",
      message: `Erro ao analisar banco de dados: ${err.message}`,
      itemCount: 0,
      lastCheckTime: Date.now()
    });
  }
});

// GET simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
