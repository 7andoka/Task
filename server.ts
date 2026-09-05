import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS and pre-flight options middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/stock-data", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTOGkYpf6hSa20PDIE2BxZ0ClH7vXd9aA7yrAOxO4nN-afVgi8RdqY8EDbzD_hRHR9A8kYr34RRndv3/pub?gid=801884526&single=true&output=csv&t=' + Date.now();
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

  app.post("/api/sync-google-sheet", async (req, res) => {
    try {
      const { webhookUrl, updates, action } = req.body;
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        return res.status(400).json({ error: "يرجى توفير رابط Webhook صالح" });
      }

      const cleanUrl = webhookUrl.trim();

      if (action === 'ping') {
        // Try POST first for ping
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(cleanUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: 'ping' }),
            redirect: "follow",
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const text = await response.text();
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            // If not JSON, check if it returned HTML login / error
            if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
              return res.status(400).json({ 
                error: "صلاحية الوصول غير صحيحة: يرجى فتح سكريبت الشيت وجعل صلاحية النشر 'Who has access' = 'Anyone' (أي شخص) وليس حسابك فقط." 
              });
            }
          }

          if (parsed && (parsed.status === 'success' || parsed.status === 'ok')) {
            return res.json({ success: true, response: parsed });
          }
        } catch (postErr) {
          console.warn("POST ping attempt failed, trying GET fallback:", postErr);
        }

        // Fallback to GET for ping verification
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(cleanUrl, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const text = await response.text();
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }

          if (parsed && (parsed.status === 'success' || parsed.status === 'ok')) {
            return res.json({ 
              success: true, 
              response: { status: 'success', message: 'تم الاتصال بنجاح بشيت جوجل!' } 
            });
          }

          if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
            return res.status(400).json({ 
              error: "يتطلب الإذن: يرجى ضبط النشر (Deployment) على 'Anyone' حتى يتمكن التطبيق من الاتصال بالشيت." 
            });
          }

          return res.json({ 
            success: true, 
            response: { status: 'success', message: 'تم الاتصال بشيت جوجل بنجاح!' } 
          });
        } catch (getErr: any) {
          return res.status(500).json({ 
            error: `تعذر الوصول لرابط الويب هوك: ${getErr.message || 'مهلة الاتصال انتهت'}` 
          });
        }
      }

      // Processing Updates (syncing PO and Post Document)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response;
      try {
        response = await fetch(cleanUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ updates: updates || [] }),
          redirect: "follow",
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          return res.status(504).json({ error: "استغرقت استجابة شيت جوجل أكثر من 60 ثانية (Timeout)." });
        }
        return res.status(500).json({ error: `تعذر الاتصال برابط الويب هوك: ${fetchErr.message || 'خطأ في الشبكة'}` });
      }
      clearTimeout(timeoutId);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes("ServiceLogin") || text.includes("accounts.google.com")) {
          return res.status(400).json({ 
            error: "فشل الترحيل: يرجى ضبط صلاحية الويب هوك في Google Apps Script إلى Anyone (أي شخص)." 
          });
        }
        data = { status: 'success', raw: text };
      }

      return res.json({ success: true, response: data });
    } catch (error: any) {
      console.error("Error proxying Google Sheet sync:", error);
      return res.status(500).json({ error: error.message || "فشل الاتصال بخادم مزامنة شيت جوجل" });
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
