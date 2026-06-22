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
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const defaultState = {
        qrStorageV2: {},
        qrStorageLastUpdated: 0,
        qrSyncSettings: {
          interval: 60,
          presets: [1, 5, 15, 30, 60, 120]
        }
      };
      await fs.writeFile(STORAGE_FILE, JSON.stringify(defaultState, null, 2), "utf-8");
      return defaultState;
    }
    throw error;
  }
}

// Helper to write storage file
async function writeStorage(data: any) {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
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
