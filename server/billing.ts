import type { Express } from "express";
import crypto from "crypto";
import { db } from "./db";
import { tenants, subscriptions, subscriptionPlans, billingEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// ─── Plan configuration ───────────────────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  basic:        29900,   // ₹299/month
  professional: 69900,   // ₹699/month
  enterprise:   149900,  // ₹1499/month
};

const PLAN_IDS: Record<string, number> = {
  trial:        1,
  basic:        2,
  professional: 3,
  enterprise:   4,
};

// When a subscription expires/cancels, the tenant falls back to this plan
const FALLBACK_PLAN = "basic";

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

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const body     = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── Subscription period helpers ─────────────────────────────────────────────
function periodEnd(billingCycle: "monthly" | "yearly"): Date {
  const d = new Date();
  if (billingCycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// ─── Daily expiry cron — call once from server/index.ts ──────────────────────
export async function runSubscriptionExpiryCheck(): Promise<void> {
  try {
    // Find subscriptions that were cancelled and their current period has ended
    const expired = await db.execute(sql`
      SELECT s.tenant_id, s.plan_slug, s.billing_cycle
      FROM subscriptions s
      WHERE s.status = 'cancelled'
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end < NOW()
    `);

    for (const row of (expired.rows as any[])) {
      const { tenant_id, plan_slug } = row;
      try {
        // Mark subscription as expired
        await db.execute(sql`
          UPDATE subscriptions
          SET status = 'expired', updated_at = NOW()
          WHERE tenant_id = ${tenant_id}
        `);

        // Downgrade tenant to basic (not suspended — they just lose premium features)
        await db.execute(sql`
          UPDATE tenants
          SET plan = ${FALLBACK_PLAN}, status = 'active', updated_at = NOW()
          WHERE id = ${tenant_id}
        `);

        // Log the downgrade
        await db.execute(sql`
          INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
          VALUES (${tenant_id}, 'subscription_expired', ${plan_slug}, ${FALLBACK_PLAN}, 'monthly', 0, 'INR',
                  ${'Subscription cancelled period ended — auto-downgraded to ' + FALLBACK_PLAN}, 'system')
        `);

        console.log(`[BILLING] Subscription expired: tenant ${tenant_id} downgraded from ${plan_slug} → ${FALLBACK_PLAN}`);
      } catch (err) {
        console.error(`[BILLING] Expiry check failed for tenant ${tenant_id}:`, err);
      }
    }

    if ((expired.rows as any[]).length > 0) {
      console.log(`[BILLING] Subscription expiry check: processed ${(expired.rows as any[]).length} expired subscriptions`);
    }
  } catch (err) {
    console.error("[BILLING] Subscription expiry check error:", err);
  }
}

// ─── Register all billing routes ─────────────────────────────────────────────
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

  // ── GET /api/billing/subscription — current subscription status ───────────
  app.get("/api/billing/subscription", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    try {
      const rows = await db.execute(sql`
        SELECT plan_slug, billing_cycle, status, started_at,
               current_period_start, current_period_end, cancelled_at, cancel_reason
        FROM subscriptions
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `);
      const sub = (rows.rows as any[])[0] ?? null;

      const history = await db.execute(sql`
        SELECT id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_at
        FROM billing_events
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT 20
      `);

      res.json({ subscription: sub, history: history.rows });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
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
        orderId:      order.id,
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

  // ── POST /api/billing/verify-payment — verify signature + activate plan ───
  app.post("/api/billing/verify-payment", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingCycle = "monthly" } = req.body;

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
      const prevPlan      = (currentTenant[0] as any)?.plan ?? "trial";
      const planId        = PLAN_IDS[plan] ?? 2;
      const periodEndDate = periodEnd(billingCycle as "monthly" | "yearly");

      // Upgrade tenant plan + set active
      await db.execute(sql`
        UPDATE tenants SET plan = ${plan}, status = 'active', updated_at = NOW()
        WHERE id = ${tenantId}
      `);

      // Upsert subscription — properly set all period/slug/id fields and clear cancellation
      await db.execute(sql`
        INSERT INTO subscriptions (
          tenant_id, plan_id, plan_slug, billing_cycle, status,
          started_at, current_period_start, current_period_end,
          cancelled_at, cancel_reason, notes, created_at, updated_at
        )
        VALUES (
          ${tenantId}, ${planId}, ${plan}, ${billingCycle}, 'active',
          NOW(), NOW(), ${periodEndDate.toISOString()},
          NULL, NULL, ${'Payment: ' + razorpay_payment_id}, NOW(), NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE
          SET plan_id              = ${planId},
              plan_slug            = ${plan},
              billing_cycle        = ${billingCycle},
              status               = 'active',
              current_period_start = NOW(),
              current_period_end   = ${periodEndDate.toISOString()},
              cancelled_at         = NULL,
              cancel_reason        = NULL,
              notes                = ${'Payment: ' + razorpay_payment_id},
              updated_at           = NOW()
      `);

      // Record billing event
      const eventType = prevPlan === plan ? 'subscription_renewed' : prevPlan === 'trial' ? 'plan_activated' : 'plan_upgraded';
      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (
          ${tenantId}, ${eventType}, ${prevPlan}, ${plan}, ${billingCycle},
          ${PLAN_PRICES[plan] ?? 0}, 'INR',
          ${'Payment ID: ' + razorpay_payment_id + ' | Order: ' + razorpay_order_id + ' | Valid until: ' + periodEndDate.toDateString()},
          ${(req.user as any)?.username ?? 'tenant-admin'}
        )
      `);

      // Update session so UI reflects new plan immediately
      (req.session as any).tenantPlan   = plan;
      (req.session as any).tenantStatus = "active";

      console.log(`[BILLING] Tenant ${tenantId} plan ${eventType}: ${prevPlan} → ${plan}, valid until ${periodEndDate.toDateString()}`);

      res.json({
        success:         true,
        message:         `Plan activated: ${PLAN_LABELS[plan] ?? plan}. Valid until ${periodEndDate.toLocaleDateString("en-IN")}`,
        plan,
        periodEnd:       periodEndDate.toISOString(),
        paymentId:       razorpay_payment_id,
      });
    } catch (err: any) {
      console.error("[BILLING] verify-payment error:", err);
      res.status(500).json({ message: "Payment verified but plan update failed: " + err.message });
    }
  });

  // ── POST /api/billing/cancel — cancel subscription (stays valid until period end) ──
  app.post("/api/billing/cancel", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { reason = "" } = req.body;

    try {
      // Get current subscription
      const rows = await db.execute(sql`
        SELECT plan_slug, billing_cycle, status, current_period_end
        FROM subscriptions
        WHERE tenant_id = ${tenantId}
        LIMIT 1
      `);
      const sub = (rows.rows as any[])[0];

      if (!sub) {
        return res.status(404).json({ message: "No active subscription found" });
      }
      if (sub.status === 'cancelled') {
        return res.status(400).json({ message: "Subscription is already cancelled" });
      }
      if (sub.status === 'expired') {
        return res.status(400).json({ message: "Subscription has already expired" });
      }

      // Mark as cancelled — plan stays active until current_period_end
      await db.execute(sql`
        UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${reason}, updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `);

      // Log billing event
      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (
          ${tenantId}, 'subscription_cancelled', ${sub.plan_slug}, ${sub.plan_slug},
          ${sub.billing_cycle}, 0, 'INR',
          ${'Cancelled by tenant admin. Valid until: ' + (sub.current_period_end ? new Date(sub.current_period_end).toDateString() : 'end of period') + (reason ? ' | Reason: ' + reason : '')},
          ${(req.user as any)?.username ?? 'tenant-admin'}
        )
      `);

      const validUntil = sub.current_period_end
        ? new Date(sub.current_period_end).toLocaleDateString("en-IN")
        : "end of billing period";

      console.log(`[BILLING] Tenant ${tenantId} cancelled subscription (${sub.plan_slug}), valid until ${validUntil}`);

      res.json({
        success:    true,
        message:    `Subscription cancelled. Your ${PLAN_LABELS[sub.plan_slug] ?? sub.plan_slug} plan remains active until ${validUntil}.`,
        validUntil: sub.current_period_end,
      });
    } catch (err: any) {
      console.error("[BILLING] cancel error:", err);
      res.status(500).json({ message: "Cancellation failed: " + err.message });
    }
  });

  // ── POST /api/billing/webhook — Razorpay webhook handler ─────────────────
  app.post("/api/billing/webhook", async (req: any, res) => {
    const keys = getRazorpayKeys();
    if (!keys) return res.sendStatus(200);

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
      const notes    = event.payload?.payment?.entity?.notes ?? {};
      const tenantId = parseInt(notes.tenantId);
      const plan     = notes.plan;
      const planId   = PLAN_IDS[plan] ?? 2;

      if (tenantId && plan && PLAN_PRICES[plan]) {
        try {
          const periodEndDate = periodEnd("monthly");
          await db.execute(sql`
            UPDATE tenants SET plan = ${plan}, status = 'active', updated_at = NOW()
            WHERE id = ${tenantId}
          `);
          await db.execute(sql`
            INSERT INTO subscriptions (tenant_id, plan_id, plan_slug, billing_cycle, status, started_at, current_period_start, current_period_end, cancelled_at, created_at, updated_at)
            VALUES (${tenantId}, ${planId}, ${plan}, 'monthly', 'active', NOW(), NOW(), ${periodEndDate.toISOString()}, NULL, NOW(), NOW())
            ON CONFLICT (tenant_id) DO UPDATE
              SET plan_id = ${planId}, plan_slug = ${plan}, status = 'active',
                  current_period_start = NOW(), current_period_end = ${periodEndDate.toISOString()},
                  cancelled_at = NULL, cancel_reason = NULL, updated_at = NOW()
          `);
          console.log(`[BILLING] Webhook: tenant ${tenantId} activated on ${plan}`);
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

  // ── Helper: load catalog from DB, falls back to hardcoded list if table missing
  async function loadCatalogFromDB() {
    try {
      const rows = await db.execute(sql`
        SELECT slug, name, description, category, price_monthly, is_free, is_popular,
               dependencies, sort_order, is_active
        FROM public.module_catalog
        WHERE is_active = true
        ORDER BY sort_order, slug
      `);
      if ((rows.rows as any[]).length > 0) {
        return (rows.rows as any[]).map(r => ({
          slug:         r.slug,
          name:         r.name,
          description:  r.description,
          category:     r.category,
          priceMonthly: Number(r.price_monthly),
          free:         r.is_free,
          popular:      r.is_popular,
          dependencies: r.dependencies ?? [],
        }));
      }
    } catch (_e) {
      // Table doesn't exist yet — fall through to hardcoded fallback
    }
    // Fallback: hardcoded catalog (used before DB migration is run on production)
    const { MODULE_CATALOG } = await import("./module-catalog");
    return MODULE_CATALOG.map(m => ({
      slug:         m.slug,
      name:         m.name,
      description:  m.description,
      category:     m.category,
      priceMonthly: m.priceMonthly,
      free:         m.free,
      popular:      m.popular ?? false,
      dependencies: m.dependencies ?? [],
    }));
  }

  // ── GET /api/billing/module-catalog — full module list with prices ────────
  app.get("/api/billing/module-catalog", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      res.json(await loadCatalogFromDB());
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Mapping: old subscription_plans module slugs → new catalog slugs ────────
  // Plans use legacy slugs; the marketplace catalog uses a newer naming scheme.
  const PLAN_SLUG_TO_CATALOG: Record<string, string> = {
    purchase_orders:     "purchase",
    basic_inventory:     "inventory",
    quality_returns:     "quality",
    sales_orders:        "sales",
    logistics_transport: "logistics",
    mis:                 "dashboard",
    expenses:            "expense_claims",
    // identical slugs (pass-through)
    invoicing:           "invoicing",
    accounting:          "accounting",
    gatepasses:          "gatepasses",
    production:          "production",
    crm:                 "crm",
    maintenance:         "maintenance",
    hr_payroll:          "hr_payroll",
    warehouses:          "warehouses",
    projects:            "projects",
    healthcare:          "healthcare",
    education:           "education",
    real_estate:         "real_estate",
    pos:                 "pos",
    agriculture:         "agriculture",
    attendance:          "attendance",
    ess:                 "ess",
    appraisals:          "appraisals",
    tds_management:      "tds_management",
  };

  /** Translate plan module list (old slugs) → catalog slugs, keeping only those in the catalog */
  function planModulesToCatalogSlugs(planModules: string[], catalogSlugs: Set<string>): string[] {
    const result = new Set<string>();
    for (const pm of planModules) {
      const mapped = PLAN_SLUG_TO_CATALOG[pm] ?? pm;
      if (catalogSlugs.has(mapped)) result.add(mapped);
    }
    return Array.from(result);
  }

  // ── GET /api/billing/selected-modules — tenant's current module selection ─
  app.get("/api/billing/selected-modules", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    try {
      const [subRows, catalog] = await Promise.all([
        db.execute(sql`
          SELECT s.selected_modules, s.monthly_amount, s.plan_slug, s.status,
                 s.current_period_end, s.cancelled_at,
                 sp.modules AS plan_modules
          FROM subscriptions s
          LEFT JOIN subscription_plans sp ON sp.slug = s.plan_slug
          WHERE s.tenant_id = ${tenantId} LIMIT 1
        `),
        loadCatalogFromDB(),
      ]);
      const row = (subRows.rows as any[])[0];
      const freeModules = catalog.filter(m => m.free).map(m => m.slug);
      const catalogSlugSet = new Set(catalog.map(m => m.slug));

      // If the tenant has never explicitly picked modules, seed from their plan
      let selectedModules: string[] = row?.selected_modules ?? [];
      if (selectedModules.length === 0 && Array.isArray(row?.plan_modules) && row.plan_modules.length > 0) {
        selectedModules = planModulesToCatalogSlugs(row.plan_modules, catalogSlugSet);
        // Also include all free modules
        for (const f of freeModules) selectedModules.push(f);
        selectedModules = Array.from(new Set(selectedModules));
      }

      const monthlyAmount = catalog
        .filter(m => selectedModules.includes(m.slug) && !m.free)
        .reduce((s, m) => s + m.priceMonthly, 0);

      res.json({
        selectedModules,
        monthlyAmount:    row?.monthly_amount ?? monthlyAmount,
        planSlug:         row?.plan_slug      ?? null,
        status:           row?.status         ?? null,
        currentPeriodEnd: row?.current_period_end ?? null,
        cancelledAt:      row?.cancelled_at   ?? null,
        catalog,
        freeModules,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/billing/selected-modules — save module selection ────────────
  app.post("/api/billing/selected-modules", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { selectedModules } = req.body;
    if (!Array.isArray(selectedModules)) {
      return res.status(400).json({ message: "selectedModules must be an array of slugs" });
    }
    try {
      const catalog = await loadCatalogFromDB();
      const freeSet = new Set(catalog.filter(m => m.free).map(m => m.slug));
      const priceMap = new Map(catalog.map(m => [m.slug, m.priceMonthly]));

      const allFree = Array.from(freeSet);
      const merged  = Array.from(new Set([...allFree, ...selectedModules]));
      const monthly = merged
        .filter(s => !freeSet.has(s))
        .reduce((sum, s) => sum + (priceMap.get(s) ?? 0), 0);

      await db.execute(sql`
        UPDATE subscriptions
        SET selected_modules = ${JSON.stringify(merged)}::jsonb,
            monthly_amount   = ${monthly},
            updated_at       = NOW()
        WHERE tenant_id = ${tenantId}
      `);

      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (
          ${tenantId}, 'modules_updated', NULL, NULL, 'monthly', ${monthly}, 'INR',
          ${'Module selection updated — ' + merged.filter(s => !freeSet.has(s)).length + ' paid modules, ₹' + monthly + '/mo'},
          ${(req.user as any)?.username ?? 'tenant-admin'}
        )
      `);

      res.json({ success: true, selectedModules: merged, monthlyAmount: monthly });
    } catch (err: any) {
      console.error("[BILLING] selected-modules update error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ── GET /api/admin/module-catalog — super-admin: all modules (incl inactive)
  app.get("/api/admin/module-catalog", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.user as any)?.isSuperAdmin) return res.sendStatus(403);
    try {
      const rows = await db.execute(sql`
        SELECT slug, name, description, category, price_monthly, is_free, is_popular,
               dependencies, sort_order, is_active, updated_at
        FROM public.module_catalog
        ORDER BY sort_order, slug
      `);
      res.json(rows.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── PUT /api/admin/module-catalog/:slug — super-admin: update a module ────
  app.put("/api/admin/module-catalog/:slug", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.user as any)?.isSuperAdmin) return res.sendStatus(403);
    const { slug } = req.params;
    const { name, description, category, price_monthly, is_free, is_popular, is_active, sort_order } = req.body;
    try {
      await db.execute(sql`
        UPDATE public.module_catalog SET
          name          = ${name},
          description   = ${description},
          category      = ${category},
          price_monthly = ${Number(price_monthly)},
          is_free       = ${Boolean(is_free)},
          is_popular    = ${Boolean(is_popular)},
          is_active     = ${Boolean(is_active)},
          sort_order    = ${Number(sort_order)},
          updated_at    = NOW()
        WHERE slug = ${slug}
      `);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/billing/request-upgrade — manual upgrade (no Razorpay) ─────
  app.post("/api/billing/request-upgrade", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { plan } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    try {
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
