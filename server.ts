import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const STORAGE_FILE = path.join(process.cwd(), "storage.json");

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
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(data);
    // Auto-migrate interval 60 to 0 to enable real-time by default as requested
    if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.interval === 60) {
      parsed.qrSyncSettings.interval = 0;
    }
    if (parsed && parsed.qrSyncSettings && parsed.qrSyncSettings.presets && !parsed.qrSyncSettings.presets.includes(0)) {
      parsed.qrSyncSettings.presets = [0, ...parsed.qrSyncSettings.presets].sort((a, b) => a - b);
    }
    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const defaultState = {
        qrStorageV2: {},
        qrStorageLastUpdated: 0,
        qrSyncSettings: {
          interval: 0,
          presets: [0, 1, 5, 15, 30, 60, 120]
        }
      };
      await fs.writeFile(STORAGE_FILE, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    
    // Auto-recovery for corrupted JSON files (SyntaxError)
    if (error instanceof SyntaxError || error.name === 'SyntaxError') {
      console.error("Corrupted STORAGE_FILE found. Backing up and resetting.", error);
      try {
        const backupPath = `${STORAGE_FILE}.corrupted_${Date.now()}`;
        // Read raw data and write to backup to preserve whatever was there
        const rawContent = await fs.readFile(STORAGE_FILE, "utf-8").catch(() => "");
        await fs.writeFile(backupPath, rawContent, "utf-8");
        console.log(`Backup created at: ${backupPath}`);
      } catch (backupErr) {
        console.error("Failed to create backup of corrupted file", backupErr);
      }
      
      const defaultState = {
        qrStorageV2: {},
        qrStorageLastUpdated: 0,
        qrSyncSettings: {
          interval: 0,
          presets: [0, 1, 5, 15, 30, 60, 120]
        }
      };
      // Overwrite corrupted file with clean state
      await fs.writeFile(STORAGE_FILE, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    
    throw error;
  }
}

// Helper to write storage file atomically to prevent corruption
async function writeStorage(data: any) {
  const tmpFile = `${STORAGE_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpFile, STORAGE_FILE);
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
    const stats = await fs.stat(STORAGE_FILE).catch(() => null);
    const data = await readStorage();
    
    let itemCount = 0;
    if (data && data.qrStorageV2) {
      Object.entries(data.qrStorageV2).forEach(([cat, catObj]: [string, any]) => {
        if (cat.startsWith('_')) return;
        Object.values(catObj || {}).forEach((dateObj: any) => {
          if (typeof dateObj !== 'object') return;
          Object.values(dateObj || {}).forEach((cont: any) => {
            if (cont && cont.items && Array.isArray(cont.items)) {
              itemCount += cont.items.length;
            }
          });
        });
      });
    }

    const sizeBytes = stats ? stats.size : 0;
    let sizeFormatted = "0 KB";
    if (sizeBytes > 1024 * 1024) {
      sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeBytes > 1024) {
      sizeFormatted = `${(sizeBytes / 1024).toFixed(2)} KB`;
    } else {
      sizeFormatted = `${sizeBytes} B`;
    }

    // Verify database structure for integrity
    let integrity = "Excelente";
    let message = "Banco de dados estruturado e totalmente íntegro.";
    if (!data.qrStorageV2 || typeof data.qrStorageV2 !== 'object') {
      integrity = "Inconsistente";
      message = "Estrutura do banco de dados corrompida ou inválida.";
    }

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
