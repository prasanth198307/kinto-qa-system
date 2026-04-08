import type { Express } from "express";
import crypto from "crypto";
import { db } from "./db";
import { tenants, subscriptions, subscriptionPlans, billingEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// ─── Razorpay plan pricing (in paise) ────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  basic:        29900,    // ₹299/month
  professional: 69900,    // ₹699/month
  enterprise:   149900,   // ₹1499/month
};

const PLAN_LABELS: Record<string, string> = {
  basic:        "Basic Plan",
  professional: "Professional Plan",
  enterprise:   "Enterprise Plan",
};

function getRazorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

// ─── Verify Razorpay payment signature ───────────────────────────────────────
function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const body    = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── Register billing routes ─────────────────────────────────────────────────
export function registerBillingRoutes(app: Express): void {

  // ── GET /api/billing/plans — list available plans with pricing ───────────
  app.get("/api/billing/plans", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const keys = getRazorpayKeys();
    const plans = [
      { plan: "basic",        label: "Basic",        priceMonthly: 29900,  currency: "INR", razorpayEnabled: !!keys },
      { plan: "professional", label: "Professional",  priceMonthly: 69900,  currency: "INR", razorpayEnabled: !!keys },
      { plan: "enterprise",   label: "Enterprise",    priceMonthly: 149900, currency: "INR", razorpayEnabled: !!keys },
    ];
    res.json({ plans, razorpayKeyId: keys?.keyId ?? null });
  });

  // ── POST /api/billing/create-order — create a Razorpay order ─────────────
  app.post("/api/billing/create-order", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan. Choose: basic, professional, enterprise" });
    }

    const keys = getRazorpayKeys();
    if (!keys) {
      return res.status(503).json({
        message: "Online payments are not configured. Please contact support to upgrade your plan.",
        razorpayEnabled: false,
      });
    }

    try {
      const Razorpay = (await import("razorpay")).default;
      const instance = new Razorpay({ key_id: keys.keyId, key_secret: keys.keySecret });

      const amount   = PLAN_PRICES[plan];
      const currency = "INR";
      const receipt  = `kinto-${tenantId}-${plan}-${Date.now()}`;

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));

      const order = await instance.orders.create({
        amount,
        currency,
        receipt,
        notes: {
          tenantId: String(tenantId),
          plan,
          tenantSlug: (tenant as any)?.slug ?? "",
        },
      });

      res.json({
        orderId:  order.id,
        amount,
        currency,
        plan,
        planLabel:    PLAN_LABELS[plan] ?? plan,
        tenantName:   tenant?.name ?? "",
        billingEmail: (tenant as any)?.billingEmail ?? "",
      });
    } catch (err: any) {
      console.error("[BILLING] create-order error:", err);
      res.status(500).json({ message: "Failed to create payment order: " + (err.message ?? err) });
    }
  });

  // ── POST /api/billing/verify-payment — verify signature + upgrade plan ────
  app.post("/api/billing/verify-payment", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const keys = getRazorpayKeys();
    if (!keys) return res.status(503).json({ message: "Payments not configured" });

    const valid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keys.keySecret);
    if (!valid) {
      console.warn(`[BILLING] Invalid signature for tenant ${tenantId}, order ${razorpay_order_id}`);
      return res.status(400).json({ message: "Payment signature verification failed" });
    }

    try {
      const currentTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      const prevPlan = (currentTenant[0] as any)?.plan ?? "trial";

      // Upgrade tenant plan + set active
      await db.execute(sql`
        UPDATE tenants SET plan = ${plan}, status = 'active', updated_at = NOW()
        WHERE id = ${tenantId}
      `);

      // Upsert subscription record
      await db.execute(sql`
        INSERT INTO subscriptions (tenant_id, plan, status, billing_cycle, amount, currency, starts_at, updated_at)
        VALUES (${tenantId}, ${plan}, 'active', 'monthly', ${PLAN_PRICES[plan]}, 'INR', NOW(), NOW())
        ON CONFLICT (tenant_id) DO UPDATE
          SET plan = ${plan}, status = 'active', billing_cycle = 'monthly',
              amount = ${PLAN_PRICES[plan]}, updated_at = NOW()
      `);

      // Record billing event
      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (${tenantId}, 'plan_upgraded', ${prevPlan}, ${plan}, 'monthly', ${PLAN_PRICES[plan]}, 'INR',
                ${'Payment ID: ' + razorpay_payment_id + ', Order: ' + razorpay_order_id}, ${(req.user as any)?.username ?? 'system'})
      `);

      // Update session
      (req.session as any).tenantPlan   = plan;
      (req.session as any).tenantStatus = "active";

      console.log(`[BILLING] Tenant ${tenantId} upgraded from ${prevPlan} → ${plan} (payment: ${razorpay_payment_id})`);

      res.json({
        success: true,
        message: `Plan upgraded to ${PLAN_LABELS[plan] ?? plan}`,
        plan,
        paymentId: razorpay_payment_id,
      });
    } catch (err: any) {
      console.error("[BILLING] verify-payment error:", err);
      res.status(500).json({ message: "Payment verified but plan update failed: " + err.message });
    }
  });

  // ── POST /api/billing/webhook — Razorpay webhook handler ─────────────────
  app.post("/api/billing/webhook", async (req: any, res) => {
    const keys = getRazorpayKeys();
    if (!keys) return res.sendStatus(200); // no keys — just ack

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? keys.keySecret;
    const signature     = req.headers["x-razorpay-signature"] as string;
    const bodyStr       = JSON.stringify(req.body);

    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature ?? ""))) {
      console.warn("[BILLING] Webhook signature mismatch");
      return res.sendStatus(400);
    }

    const event = req.body;
    console.log(`[BILLING] Webhook: ${event.event}`);

    if (event.event === "payment.captured") {
      const notes = event.payload?.payment?.entity?.notes ?? {};
      const tenantId = parseInt(notes.tenantId);
      const plan     = notes.plan;

      if (tenantId && plan && PLAN_PRICES[plan]) {
        try {
          await db.execute(sql`
            UPDATE tenants SET plan = ${plan}, status = 'active', updated_at = NOW()
            WHERE id = ${tenantId}
          `);
          console.log(`[BILLING] Webhook: upgraded tenant ${tenantId} to ${plan}`);
        } catch (err) {
          console.error("[BILLING] Webhook plan update failed:", err);
        }
      }
    }

    res.sendStatus(200);
  });

  // ── GET /api/billing/history — billing event history for this tenant ─────
  app.get("/api/billing/history", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    try {
      const events = await db.execute(sql`
        SELECT id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_at
        FROM billing_events
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json(events.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/billing/request-upgrade — request manual upgrade (no Razorpay) ──
  app.post("/api/billing/request-upgrade", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    try {
      // Log a pending billing event
      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (
          ${tenantId}, 'upgrade_requested',
          ${(req.session as any).tenantPlan ?? 'trial'},
          ${plan}, 'monthly',
          ${PLAN_PRICES[plan]}, 'INR',
          ${'Manual upgrade request — awaiting admin approval'},
          ${(req.user as any)?.username ?? 'tenant-admin'}
        )
      `);
      res.json({ message: `Upgrade request to ${PLAN_LABELS[plan] ?? plan} submitted. Our team will contact you within 24 hours.` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
