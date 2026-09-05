// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/stock-data", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=801884526&single=true&output=csv&t=" + Date.now();
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Google Sheet fetch failed: ${response.status} ${response.statusText}`);
      }
      const lastModified = response.headers.get("last-modified") || response.headers.get("Date");
      const text = await response.text();
      console.log("Stock data fetched. Length:", text.length, "Last-Modified:", lastModified);
      res.json({
        data: text,
        lastModified
      });
    } catch (error) {
      console.error("Error proxying stock data:", error, error?.stack);
      res.status(500).json({ error: (error.message || "Failed to fetch stock data") + (error?.stack ? " - " + error.stack : "") });
    }
  });
  app.post("/api/sync-google-sheet", async (req, res) => {
    try {
      const { webhookUrl, updates, action } = req.body;
      if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
        return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u062A\u0648\u0641\u064A\u0631 \u0631\u0627\u0628\u0637 Webhook \u0635\u0627\u0644\u062D" });
      }
      const cleanUrl = webhookUrl.trim();
      if (action === "ping") {
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 12e3);
          const response2 = await fetch(cleanUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "ping" }),
            redirect: "follow",
            signal: controller2.signal
          });
          clearTimeout(timeoutId2);
          const text2 = await response2.text();
          let parsed;
          try {
            parsed = JSON.parse(text2);
          } catch {
            if (text2.includes("ServiceLogin") || text2.includes("accounts.google.com")) {
              return res.status(400).json({
                error: "\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629: \u064A\u0631\u062C\u0649 \u0641\u062A\u062D \u0633\u0643\u0631\u064A\u0628\u062A \u0627\u0644\u0634\u064A\u062A \u0648\u062C\u0639\u0644 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0646\u0634\u0631 'Who has access' = 'Anyone' (\u0623\u064A \u0634\u062E\u0635) \u0648\u0644\u064A\u0633 \u062D\u0633\u0627\u0628\u0643 \u0641\u0642\u0637."
              });
            }
          }
          if (parsed && (parsed.status === "success" || parsed.status === "ok")) {
            return res.json({ success: true, response: parsed });
          }
        } catch (postErr) {
          console.warn("POST ping attempt failed, trying GET fallback:", postErr);
        }
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 12e3);
          const response2 = await fetch(cleanUrl, {
            method: "GET",
            redirect: "follow",
            signal: controller2.signal
          });
          clearTimeout(timeoutId2);
          const text2 = await response2.text();
          let parsed;
          try {
            parsed = JSON.parse(text2);
          } catch {
            parsed = null;
          }
          if (parsed && (parsed.status === "success" || parsed.status === "ok")) {
            return res.json({
              success: true,
              response: { status: "success", message: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u062C\u0627\u062D \u0628\u0634\u064A\u062A \u062C\u0648\u062C\u0644!" }
            });
          }
          if (text2.includes("ServiceLogin") || text2.includes("accounts.google.com")) {
            return res.status(400).json({
              error: "\u064A\u062A\u0637\u0644\u0628 \u0627\u0644\u0625\u0630\u0646: \u064A\u0631\u062C\u0649 \u0636\u0628\u0637 \u0627\u0644\u0646\u0634\u0631 (Deployment) \u0639\u0644\u0649 'Anyone' \u062D\u062A\u0649 \u064A\u062A\u0645\u0643\u0646 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0645\u0646 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0634\u064A\u062A."
            });
          }
          return res.json({
            success: true,
            response: { status: "success", message: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0634\u064A\u062A \u062C\u0648\u062C\u0644 \u0628\u0646\u062C\u0627\u062D!" }
          });
        } catch (getErr) {
          return res.status(500).json({
            error: `\u062A\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0648\u064A\u0628 \u0647\u0648\u0643: ${getErr.message || "\u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0646\u062A\u0647\u062A"}`
          });
        }
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2e4);
      const response = await fetch(cleanUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ updates: updates || [] }),
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
          return res.status(400).json({
            error: "\u0641\u0634\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0644: \u064A\u0631\u062C\u0649 \u0636\u0628\u0637 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u064A\u0628 \u0647\u0648\u0643 \u0641\u064A Google Apps Script \u0625\u0644\u0649 Anyone (\u0623\u064A \u0634\u062E\u0635)."
          });
        }
        data = { status: "success", raw: text };
      }
      res.json({ success: true, response: data });
    } catch (error) {
      console.error("Error proxying Google Sheet sync:", error);
      res.status(500).json({ error: error.message || "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u0627\u062F\u0645 \u0645\u0632\u0627\u0645\u0646\u0629 \u0634\u064A\u062A \u062C\u0648\u062C\u0644" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
