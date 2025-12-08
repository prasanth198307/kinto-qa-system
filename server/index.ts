// --- Environment variables are automatically loaded in Replit ---
import * as url from "url";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables manually (for local runs)
dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

console.log("✅ Environment loaded");
console.log("✅ DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");

// --- Dynamically import all other modules ---
const expressModule = await import("express");
const { registerRoutes } = await import("./routes");
const { setupVite, serveStatic, log } = await import("./vite");
const { notificationService } = await import("./notificationService");
const { storage } = await import("./storage");
const corsModule = await import("cors");

// Function to sync WhatsApp secrets from environment to database (one-time)
async function syncWhatsAppSecretsToDatabase() {
  try {
    const config = await storage.getNotificationConfig();
    if (!config) {
      console.log('[SYNC] No notification config found, skipping sync');
      return;
    }

    const updates: any = {};
    let synced: string[] = [];

    // Only sync if database fields are empty and env vars exist
    if (!config.metaPhoneNumberId && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      updates.metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      synced.push('Meta Phone Number ID');
    }

    if (!config.metaAccessToken && process.env.WHATSAPP_ACCESS_TOKEN) {
      updates.metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      synced.push('Meta Access Token');
    }

    if (!config.metaVerifyToken && process.env.WHATSAPP_VERIFY_TOKEN) {
      updates.metaVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      synced.push('Meta Verify Token');
    }

    if (Object.keys(updates).length > 0) {
      await storage.updateNotificationConfig(config.id, updates);
      console.log(`[SYNC] ✅ Synced WhatsApp secrets to database: ${synced.join(', ')}`);
    } else {
      console.log('[SYNC] WhatsApp secrets already in database or no env vars to sync');
    }
  } catch (error) {
    console.error('[SYNC] Error syncing WhatsApp secrets:', error);
  }
}

const express = expressModule.default;
const cors = corsModule.default;
const { Request, Response, NextFunction } = expressModule;

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ✅ Allow Express to trust proxy headers (needed for session cookies)
app.set("trust proxy", 1);

app.use(
  express.json({
    limit: '10mb', // Increase limit for large import payloads
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    
    // Start machine startup reminder checking system
    // Checks every 5 minutes for pending reminders
    setInterval(async () => {
      try {
        await notificationService.checkAndSendReminders();
      } catch (error) {
        console.error('[REMINDER SYSTEM ERROR]', error);
      }
    }, 300000); // Check every 5 minutes (300 seconds)
    
    // Start missed checklist checking system
    // Checks every 5 minutes for missed checklists
    setInterval(async () => {
      try {
        await notificationService.checkAndSendMissedChecklistNotifications();
      } catch (error) {
        console.error('[MISSED CHECKLIST SYSTEM ERROR]', error);
      }
    }, 300000); // Check every 5 minutes (300 seconds)
    
    // Start document expiry alert system
    // Checks every hour for documents nearing expiry (30 days before)
    setInterval(async () => {
      try {
        await notificationService.checkAndSendDocumentExpiryAlerts(30);
      } catch (error) {
        console.error('[DOCUMENT EXPIRY ALERT SYSTEM ERROR]', error);
      }
    }, 3600000); // Check every hour (3600 seconds)
    
    // Initial check for document expiry on startup
    notificationService.checkAndSendDocumentExpiryAlerts(30).catch(error => {
      console.error('[DOCUMENT EXPIRY ALERT STARTUP ERROR]', error);
    });
    
    // Sync WhatsApp secrets from environment to database (one-time on startup)
    syncWhatsAppSecretsToDatabase().catch(error => {
      console.error('[WHATSAPP SECRETS SYNC ERROR]', error);
    });
    
    log('✅ Machine startup reminder system initialized');
    log('✅ Missed checklist notification system initialized');
    log('✅ Document expiry alert system initialized');
    log('✅ WhatsApp secrets sync checked');
  });
})();
