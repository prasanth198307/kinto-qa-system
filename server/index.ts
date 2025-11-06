// --- Load environment variables early and correctly ---
import * as url from "url";
import * as path from "path";
import * as dotenv from "dotenv";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("✅ Loaded .env from:", path.resolve(__dirname, "../.env"));
console.log("✅ DATABASE_URL:", process.env.DATABASE_URL);

// --- Dynamically import all other modules after .env is loaded ---
const expressModule = await import("express");
const { registerRoutes } = await import("./routes");
const { setupVite, serveStatic, log } = await import("./vite");
import cors from "cors";                // ✅ ADD THIS

const express = expressModule.default;
const { Request, Response, NextFunction } = expressModule;

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ✅ CORS middleware to allow cookies between frontend and backend
app.use(
  cors({
    origin: "http://localhost:5173", // Your Vite React app
    credentials: true,               // Allow sending session cookies
  })
);

// ✅ Allow Express to trust proxy headers (needed for session cookies behind Vite)
app.set("trust proxy", 1);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static("public"));

// --- Logging middleware for API requests ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on port ${port}`);
  });
})();
