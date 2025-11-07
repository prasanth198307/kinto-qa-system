import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// --- Password helpers using scrypt (Node.js built-in) ---
const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  const derivedKey = (await scryptAsync(supplied, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");
  return timingSafeEqual(derivedKey, storedBuffer);
}

// --- Main authentication setup ---
export function setupAuth(app: Express) {
  const isProd = process.env.NODE_ENV === "production";
  const useHttps = process.env.USE_HTTPS === "true";

  // --- Session configuration ---
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: useHttps, // ✅ Secure cookies only if HTTPS enabled
      sameSite: useHttps ? "none" : "lax", // ✅ Supports both HTTP and HTTPS
    },
  };

  console.log(
    `🔧 Session configured — Secure Cookies: ${useHttps}, SameSite: ${useHttps ? "None" : "Lax"}`
  );

  // Required when behind proxy or in HTTPS setups
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // --- Passport Local Strategy (username/password login) ---
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) return done(null, false);

        const valid = await comparePasswords(password, user.password);
        if (!valid) return done(null, false);

        return done(null, user);
      } catch (err) {
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
    res.status(200).json(req.user);
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
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // --- Forgot password endpoint ---
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether user exists
        return res.status(200).json({ message: "If the email exists, a reset link will be sent" });
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

      res.status(200).json({ message: "If the email exists, a reset link will be sent" });
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
        return res.status(400).json({ message: "Token and new password are required" });

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
    console.log("🔹 Session ID:", req.sessionID);
    console.log("🔹 Authenticated:", req.isAuthenticated());
    next();
  });
}

export { hashPassword };
