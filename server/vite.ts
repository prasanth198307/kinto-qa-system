import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // sw.js must never be HTTP-cached — serve it directly with hard no-store so browsers
  // always fetch the latest version (prevents the stale-SW → stale-HTML → MIME error loop)
  app.get("/sw.js", (_req, res) => {
    const swPath = path.resolve(distPath, "sw.js");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    res.sendFile(swPath);
  });

  // Kill-switch page: unregisters all service workers and clears caches, then redirects to /
  app.get("/clear-sw", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head><title>Clearing cache…</title></head><body>
<p>Clearing service worker and cache…</p>
<script>
(async () => {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
  }
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  window.location.replace('/');
})();
</script></body></html>`);
  });

  // Versioned assets get long-lived cache; everything else (index.html) gets no-store
  app.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (filePath.includes("/assets/")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("sw.js") || filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
