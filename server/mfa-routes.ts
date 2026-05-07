/**
 * Phase B — MFA/TOTP Routes
 * Endpoints: setup, enable, disable, validate (during login), backup codes
 */
import type { Express, Request, Response } from "express";
import * as OTPAuth from "otpauth";
import { randomBytes, createHash } from "crypto";
import QRCode from "qrcode";
import { pool } from "./db";
import { logSecurityEvent } from "./security-middleware";

const APP_NAME = "SwachERP";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(5).toString("hex").toUpperCase(); // 10-char hex
    plain.push(code);
    hashed.push(createHash("sha256").update(code).digest("hex"));
  }
  return { plain, hashed };
}

function verifyBackupCode(inputCode: string, hashedCodes: string[]): number {
  const hash = createHash("sha256").update(inputCode.toUpperCase().trim()).digest("hex");
  return hashedCodes.indexOf(hash);
}

function validateTOTP(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: token.replace(/\s/g, ""), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerMFARoutes(app: Express) {
  // ── GET /api/auth/mfa/status ─────────────────────────────────────────────
  app.get("/api/auth/mfa/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    const row = await pool.query(
      "SELECT totp_enabled, mfa_enforced FROM users WHERE id = $1",
      [user.id]
    );
    const r = row.rows[0] ?? {};
    return res.json({ totpEnabled: r.totp_enabled ?? false, mfaEnforced: r.mfa_enforced ?? false });
  });

  // ── POST /api/auth/mfa/setup ─────────────────────────────────────────────
  // Generates a new TOTP secret and returns QR code (does NOT enable MFA yet)
  app.post("/api/auth/mfa/setup", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;

    const secret = new OTPAuth.Secret({ size: 20 });
    const secretBase32 = secret.base32;

    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      label: user.email ?? user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 240, margin: 2 });

    // Store the pending secret (not yet enabled)
    await pool.query(
      "UPDATE users SET totp_secret = $1 WHERE id = $2",
      [secretBase32, user.id]
    );

    logSecurityEvent(req, "MFA_SETUP_INITIATED", `User ${user.username} initiated MFA setup`, "info", String(user.id), user.tenantId);

    return res.json({ secret: secretBase32, qrDataUrl, otpauthUri });
  });

  // ── POST /api/auth/mfa/enable ────────────────────────────────────────────
  // Verify TOTP code against pending secret, then enable MFA + return backup codes
  app.post("/api/auth/mfa/enable", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "TOTP code is required" });

    const user = req.user as any;
    const row = await pool.query("SELECT totp_secret FROM users WHERE id = $1", [user.id]);
    const secret = row.rows[0]?.totp_secret;

    if (!secret) return res.status(400).json({ message: "MFA setup not initiated. Call /api/auth/mfa/setup first." });

    if (!validateTOTP(secret, code)) {
      return res.status(400).json({ message: "Invalid TOTP code. Please try again." });
    }

    const { plain, hashed } = generateBackupCodes(8);

    await pool.query(
      "UPDATE users SET totp_enabled = true, totp_backup_codes = $1 WHERE id = $2",
      [hashed, user.id]
    );

    logSecurityEvent(req, "MFA_ENABLED", `User ${user.username} enabled MFA`, "info", String(user.id), user.tenantId);

    return res.json({
      message: "MFA enabled successfully.",
      backupCodes: plain,
      warning: "Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app.",
    });
  });

  // ── POST /api/auth/mfa/disable ───────────────────────────────────────────
  app.post("/api/auth/mfa/disable", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { code, backupCode } = req.body;
    const user = req.user as any;

    const row = await pool.query(
      "SELECT totp_secret, totp_enabled, totp_backup_codes, mfa_enforced FROM users WHERE id = $1",
      [user.id]
    );
    const r = row.rows[0];
    if (!r?.totp_enabled) return res.status(400).json({ message: "MFA is not enabled." });
    if (r.mfa_enforced) return res.status(403).json({ message: "MFA is enforced by your administrator and cannot be disabled." });

    let valid = false;
    if (code && validateTOTP(r.totp_secret, code)) valid = true;
    if (!valid && backupCode) {
      const idx = verifyBackupCode(backupCode, r.totp_backup_codes ?? []);
      if (idx !== -1) valid = true;
    }
    if (!valid) return res.status(400).json({ message: "Invalid TOTP code or backup code." });

    await pool.query(
      "UPDATE users SET totp_enabled = false, totp_secret = NULL, totp_backup_codes = '{}' WHERE id = $1",
      [user.id]
    );

    logSecurityEvent(req, "MFA_DISABLED", `User ${user.username} disabled MFA`, "warn", String(user.id), user.tenantId);
    return res.json({ message: "MFA disabled successfully." });
  });

  // ── POST /api/auth/mfa/validate ──────────────────────────────────────────
  // Second-factor validation during login (called after password succeeds)
  app.post("/api/auth/mfa/validate", async (req: Request, res: Response) => {
    const { code, backupCode } = req.body;
    const session = req.session as any;

    if (!session.pendingMfaUserId) {
      return res.status(400).json({ message: "No pending MFA session. Please log in first." });
    }
    if (Date.now() > (session.pendingMfaExpiry ?? 0)) {
      delete session.pendingMfaUserId;
      delete session.pendingMfaExpiry;
      return res.status(401).json({ message: "MFA session expired. Please log in again." });
    }

    const userId = session.pendingMfaUserId;
    const row = await pool.query(
      "SELECT id, totp_secret, totp_backup_codes FROM users WHERE id = $1",
      [userId]
    );
    const r = row.rows[0];
    if (!r) return res.status(401).json({ message: "User not found." });

    let valid = false;
    let usedBackupIndex = -1;

    if (code && validateTOTP(r.totp_secret, code)) {
      valid = true;
    } else if (backupCode) {
      usedBackupIndex = verifyBackupCode(backupCode, r.totp_backup_codes ?? []);
      if (usedBackupIndex !== -1) valid = true;
    }

    if (!valid) {
      logSecurityEvent(req, "MFA_FAILED", `MFA validation failed for user ${userId}`, "warn", String(userId));
      return res.status(401).json({ message: "Invalid authentication code." });
    }

    // Consume backup code if used
    if (usedBackupIndex !== -1) {
      const updated = [...(r.totp_backup_codes ?? [])];
      updated.splice(usedBackupIndex, 1);
      await pool.query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2", [updated, userId]);
    }

    // Complete login
    const pendingTenantId = session.pendingMfaTenantId;
    const pendingPlan = session.pendingMfaPlan;
    const pendingStatus = session.pendingMfaStatus;

    delete session.pendingMfaUserId;
    delete session.pendingMfaExpiry;
    delete session.pendingMfaTenantId;
    delete session.pendingMfaPlan;
    delete session.pendingMfaStatus;

    // Fetch full user for req.login
    const { storage } = await import("./storage");
    const user = await storage.getUser(userId);
    if (!user) return res.status(500).json({ message: "Failed to load user session." });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed after MFA." });
      session.tenantId = pendingTenantId ?? user.tenantId ?? 1;
      session.tenantPlan = pendingPlan ?? "trial";
      session.tenantStatus = pendingStatus ?? "active";
      req.session.save(() => {
        logSecurityEvent(req, "MFA_SUCCESS", `MFA validated for user ${(user as any).username}`, "info", String(userId), session.tenantId);
        return res.json(user);
      });
    });
  });

  // ── POST /api/auth/mfa/backup-codes/regenerate ───────────────────────────
  app.post("/api/auth/mfa/backup-codes/regenerate", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const { code } = req.body;
    const user = req.user as any;

    const row = await pool.query("SELECT totp_secret, totp_enabled FROM users WHERE id = $1", [user.id]);
    const r = row.rows[0];
    if (!r?.totp_enabled) return res.status(400).json({ message: "MFA is not enabled." });
    if (!code || !validateTOTP(r.totp_secret, code)) {
      return res.status(400).json({ message: "Invalid TOTP code." });
    }

    const { plain, hashed } = generateBackupCodes(8);
    await pool.query("UPDATE users SET totp_backup_codes = $1 WHERE id = $2", [hashed, user.id]);

    logSecurityEvent(req, "MFA_BACKUP_REGENERATED", `User ${user.username} regenerated backup codes`, "warn", String(user.id), user.tenantId);
    return res.json({ backupCodes: plain });
  });

  // ── Admin: GET /api/admin/users/mfa-status ───────────────────────────────
  app.get("/api/admin/users/mfa-status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (!user.isSuperAdmin && user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    const tenantId = (req.session as any)?.tenantId ?? user.tenantId;
    const rows = await pool.query(
      `SELECT id, username, email, totp_enabled, mfa_enforced, failed_login_attempts, locked_until, password_changed_at
       FROM users WHERE tenant_id = $1 ORDER BY username`,
      [tenantId]
    );
    return res.json(rows.rows);
  });

  // ── Admin: POST /api/admin/users/:id/enforce-mfa ────────────────────────
  app.post("/api/admin/users/:id/enforce-mfa", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (!user.isSuperAdmin && user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    const { enforce } = req.body;
    await pool.query("UPDATE users SET mfa_enforced = $1 WHERE id = $2", [!!enforce, req.params.id]);
    logSecurityEvent(req, enforce ? "MFA_ENFORCED" : "MFA_ENFORCEMENT_REMOVED", `Admin ${user.username} ${enforce ? "enforced" : "removed enforcement of"} MFA for user ${req.params.id}`, "warn", String(user.id), user.tenantId);
    return res.json({ message: `MFA enforcement ${enforce ? "enabled" : "disabled"}.` });
  });

  // ── Admin: POST /api/admin/users/:id/unlock ──────────────────────────────
  app.post("/api/admin/users/:id/unlock", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (!user.isSuperAdmin && user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    await pool.query(
      "UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1",
      [req.params.id]
    );
    logSecurityEvent(req, "ACCOUNT_UNLOCKED", `Admin ${user.username} unlocked account ${req.params.id}`, "warn", String(user.id), user.tenantId);
    return res.json({ message: "Account unlocked." });
  });
}
