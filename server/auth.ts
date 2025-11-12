import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs"; // ✅ for backward compatibility
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// --- Password helpers ---
const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hash password using scrypt
 */
async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Compare password with stored hash (supports both scrypt and bcrypt)
 */
async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!supplied || !stored) throw new Error("Missing password or stored hash");

    // Detect bcrypt hashes (start with "$2")
    if (stored.startsWith("$2")) {
      return await bcrypt.compare(supplied, stored);
    }

    // Otherwise assume scrypt format
    const [salt, storedHash] = stored.split(":");
    if (!salt || !storedHash) throw new Error("Invalid stored password format");

    const derivedKey = (await scryptAsync(supplied, salt, KEY_LENGTH)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, "hex");
    return timingSafeEqual(derivedKey, storedBuffer);
  } catch (err) {
    console.error("❌ comparePasswords error:", err);
    return false;
  }
}

// --- Main authentication setup ---
export function setupAuth(app: Express) {
  // Auto-detect Replit environment (which uses HTTPS) or check explicit flag
  const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN);
  const useHttps = process.env.USE_HTTPS === "true" || isReplit;

  // --- Session configuration ---
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "insecure_dev_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: useHttps,
      sameSite: useHttps ? "none" : "lax",
    },
  };

  console.log(
    `🔧 Session configured — Secure Cookies: ${useHttps}, SameSite: ${
      useHttps ? "None" : "Lax"
    }${isReplit ? " (Replit auto-detected)" : ""}`
  );

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // --- Passport Local Strategy ---
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("🔍 Login attempt for user:", username);

        const user = await storage.getUserByUsername(username);
        console.log("🔍 User found:", !!user);
        console.log("🔍 User password exists:", !!(user?.password));
        console.log("🔍 User object keys:", user ? Object.keys(user) : "null");

        if (!user || !user.password) return done(null, false);

        const valid = await comparePasswords(password, user.password);
        if (!valid) {
          console.warn(`🚫 Invalid password for user: ${username}`);
          return done(null, false);
        }

        console.log(`✅ Login successful for ${username}`);
        return done(null, user);
      } catch (err) {
        console.error("🔥 Login error:", err);
        return done(err);
      }
    })
  );

  // --- Session serialization ---
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // --- Login endpoint ---
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Explicitly save session to ensure cookie is properly set
    req.session.save((err) => {
      if (err) {
        console.error("❌ Session save error:", err);
        return res.status(500).json({ message: "Session save failed" });
      }
      console.log(`✅ Session saved successfully`);
      console.log(`   User: ${(req.user as any)?.username}`);
      console.log(`   Session ID: ${req.sessionID}`);
      console.log(`   Cookies being set:`, res.getHeaders()['set-cookie']);
      console.log(`   Session cookie should be: connect.sid=${req.sessionID}`);
      res.status(200).json(req.user);
    });
  });

  // --- Logout endpoint ---
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.redirect("/login");
      });
    });
  });

  // --- Current user endpoint ---
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    if (user.roleId) {
      const roleData = await storage.getRole(user.roleId);
      res.json({ ...user, role: roleData?.name });
    } else {
      res.json(user);
    }
  });

  // --- Forgot password endpoint ---
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res
          .status(200)
          .json({ message: "If the email exists, a reset link will be sent" });
      }

      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      await storage.setPasswordResetToken(user.id, resetToken, resetTokenExpiry);

      console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
      console.log(
        `Reset link: ${
          process.env.REPLIT_DOMAINS || "http://localhost:5050"
        }/auth/reset-password?token=${resetToken}`
      );

      res
        .status(200)
        .json({ message: "If the email exists, a reset link will be sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // --- Reset password endpoint ---
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword)
        return res
          .status(400)
          .json({ message: "Token and new password are required" });

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry)
        return res.status(400).json({ message: "Invalid or expired reset token" });

      const hashedPassword = await hashPassword(newPassword);
      await storage.resetPassword(user.id, hashedPassword);

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // --- Debug session middleware ---
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log("🔹 Request:", req.method, req.path);
      console.log("   Cookie header:", req.headers.cookie || '(no cookies)');
      console.log("   Session ID:", req.sessionID);
      console.log("   Authenticated:", req.isAuthenticated());
    }
    next();
  });
}

export { hashPassword };
