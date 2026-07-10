/**
 * Phase A Security Middleware
 * - Rate limiting on auth endpoints (brute-force protection)
 * - Security response headers
 * - Login attempt logging
 */

import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

// ─── Rate Limiters ─────────────────────────────────────────────────────────────

/**
 * Login rate limiter: 10 attempts per 15 minutes per IP.
 * Protects /api/login and /api/demo-login.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
    retryAfter: 15,
  },
  handler: (req: Request, res: Response) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    console.warn(
      `[SECURITY] Rate limit hit on ${req.path} from IP ${ip} — UA: ${req.headers["user-agent"] ?? "unknown"}`
    );
    res.status(429).json({
      message: "Too many login attempts. Please try again after 15 minutes.",
      retryAfter: 15,
    });
  },
});

/**
 * Forgot-password rate limiter: 5 requests per hour per IP.
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many password reset requests. Please try again after 1 hour.",
    retryAfter: 60,
  },
});

/**
 * Reset-password rate limiter: 5 attempts per hour per IP.
 */
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many password reset attempts. Please try again after 1 hour.",
    retryAfter: 60,
  },
});

/**
 * API general limiter: 2000 requests per 15 minutes per IP.
 * Higher limit to accommodate shared proxy IPs in self-hosted deployments.
 * Catches any abusive scraping / automated attacks on non-auth routes.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => {
    // Skip for logout (must never be blocked — security critical),
    // whatsapp webhook, colloki callback, and file uploads (high-frequency legitimate traffic)
    return (
      req.path === "/api/logout" ||
      req.path === "/api/whatsapp/webhook" ||
      req.path === "/api/colloki/callback" ||
      req.path.startsWith("/uploads/")
    );
  },
  message: { message: "Too many requests. Please slow down." },
});

// ─── Security Headers ──────────────────────────────────────────────────────────

/**
 * Adds security-focused HTTP response headers.
 * Satisfies OWASP Top 10 A05 (Security Misconfiguration).
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // HTTP Strict Transport Security — 1 year, include subdomains
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy — restrict dangerous browser features
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  // XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Content Security Policy — allow same-origin + Razorpay + Colloki chat widget
  if (!req.path.startsWith("/api/")) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://micassets.micnxt.com https://meet.jit.si",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://micassets.micnxt.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://api.razorpay.com https://collokiflow.micapps.com wss: https://meet.jit.si",
        "frame-src https://api.razorpay.com https://collokiflow.micapps.com https://meet.jit.si",
      ].join("; ")
    );
  }
  next();
}

// ─── Concurrent Session Limiter ────────────────────────────────────────────────

/**
 * Maximum concurrent sessions per user.
 * When exceeded, oldest sessions are invalidated.
 * Government compliance: prevents credential sharing.
 */
const MAX_SESSIONS_PER_USER = 3;

export async function enforceConcurrentSessionLimit(
  userId: number | string,
  currentSessionId: string
): Promise<void> {
  try {
    // Get all active sessions for this user
    const result = await pool.query<{ sid: string; sess: any; expire: Date }>(
      `SELECT sid, sess, expire 
       FROM session 
       WHERE sess->'passport'->>'user' = $1
         AND expire > NOW()
       ORDER BY expire ASC`,
      [String(userId)]
    );

    const sessions = result.rows;

    if (sessions.length > MAX_SESSIONS_PER_USER) {
      // Delete oldest sessions beyond the limit (keep MAX_SESSIONS_PER_USER most recent)
      const toDelete = sessions
        .slice(0, sessions.length - MAX_SESSIONS_PER_USER)
        .filter((s) => s.sid !== currentSessionId);

      if (toDelete.length > 0) {
        const sids = toDelete.map((s) => s.sid);
        await pool.query(`DELETE FROM session WHERE sid = ANY($1)`, [sids]);
        console.log(
          `[SECURITY] Enforced session limit for user ${userId}: removed ${toDelete.length} old session(s). Kept ${MAX_SESSIONS_PER_USER}.`
        );
      }
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error("[SECURITY] Session limit enforcement error:", err);
  }
}

// ─── Audit Log Helper ──────────────────────────────────────────────────────────

/**
 * Write a security event to the audit_logs table.
 * Includes IP address and user agent for compliance.
 */
export async function logSecurityEvent(
  req: Request,
  action: string,
  description: string,
  severity: "info" | "warn" | "critical" = "info",
  userId?: string,
  tenantId?: number
): Promise<void> {
  try {
    const ip = (req.ip ?? req.socket?.remoteAddress ?? "unknown").replace(
      /^::ffff:/,
      ""
    );
    const ua = (req.headers["user-agent"] ?? "").substring(0, 500);
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, description, tenant_id, ip_address, user_agent, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        userId ?? null,
        action,
        "security",
        null,
        description,
        tenantId ?? null,
        ip,
        ua,
        severity,
      ]
    );
  } catch {
    // Audit log failure must never crash the app
  }
}
