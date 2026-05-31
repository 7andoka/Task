import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/stock-data", async (req, res) => {
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=801884526&single=true&output=csv';
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error(`Google Sheet fetch failed: ${response.status} ${response.statusText}`);
      }

      const lastModified = response.headers.get('last-modified') || response.headers.get('Date');
      const text = await response.text();
      
      console.log('Stock data fetched. Length:', text.length, 'Last-Modified:', lastModified);
      
      res.json({
        data: text,
        lastModified: lastModified
      });
    } catch (error: any) {
      console.error('Error proxying stock data:', error, error?.stack);
      res.status(500).json({ error: (error.message || 'Failed to fetch stock data') + (error?.stack ? ' - ' + error.stack : '') });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
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
