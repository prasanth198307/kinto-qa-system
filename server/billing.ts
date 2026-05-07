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

// ─── Platform settings helpers ────────────────────────────────────────────────
// Keys are stored in platform_settings table (super-admin editable).
// Falls back to environment variables so existing .env configs still work.

async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    const rows = await db.execute(sql`SELECT value FROM platform_settings WHERE key = ${key} LIMIT 1`);
    const row = (rows.rows as any[])[0];
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function getRazorpayKeys(): Promise<{ keyId: string; keySecret: string } | null> {
  // DB-first, env-fallback
  const dbKeyId     = await getPlatformSetting("razorpay_key_id");
  const dbKeySecret = await getPlatformSetting("razorpay_key_secret");
  const keyId       = dbKeyId     || process.env.RAZORPAY_KEY_ID;
  const keySecret   = dbKeySecret || process.env.RAZORPAY_KEY_SECRET;
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
    const keys = await getRazorpayKeys();
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

    const keys = await getRazorpayKeys();
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

    const keys = await getRazorpayKeys();
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
    const keys = await getRazorpayKeys();
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
          SELECT
            s.selected_modules,
            s.monthly_amount,
            COALESCE(s.plan_slug, t.plan)  AS plan_slug,
            s.status,
            s.current_period_end,
            s.cancelled_at,
            sp.modules                     AS plan_modules
          FROM tenants t
          LEFT JOIN subscriptions s        ON s.tenant_id = t.id
          LEFT JOIN subscription_plans sp  ON sp.slug = COALESCE(s.plan_slug, t.plan)
          WHERE t.id = ${tenantId}
          LIMIT 1
        `),
        loadCatalogFromDB(),
      ]);
      const row = (subRows.rows as any[])[0];
      const freeModules   = catalog.filter(m => m.free).map(m => m.slug);
      const catalogSlugSet = new Set(catalog.map(m => m.slug));

      // Resolve plan-included modules (mapped to catalog slugs)
      const rawPlanMods: string[] = Array.isArray(row?.plan_modules) ? row.plan_modules : [];
      const planModules: string[] = planModulesToCatalogSlugs(rawPlanMods, catalogSlugSet);

      // Seed from plan when tenant has never explicitly chosen modules
      let selectedModules: string[] = Array.isArray(row?.selected_modules) ? row.selected_modules : [];
      if (selectedModules.length === 0) {
        selectedModules = [...planModules];
        // Always include free modules
        for (const f of freeModules) if (!selectedModules.includes(f)) selectedModules.push(f);
        selectedModules = Array.from(new Set(selectedModules));
      }

      const planModuleSet = new Set(planModules);
      const computedMonthly = catalog
        .filter(m => selectedModules.includes(m.slug) && !m.free && !planModuleSet.has(m.slug))
        .reduce((s, m) => s + m.priceMonthly, 0);

      res.json({
        selectedModules,
        planModules,
        monthlyAmount:    row?.monthly_amount ?? computedMonthly,
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

  // ── GET /api/admin/tenants/:id/modules — super-admin: get tenant module selection ──
  app.get("/api/admin/tenants/:id/modules", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.user as any)?.isSuperAdmin) return res.sendStatus(403);
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return res.status(400).json({ message: "Invalid tenant id" });
    try {
      const [subRows, catalog] = await Promise.all([
        db.execute(sql`
          SELECT s.selected_modules, s.monthly_amount,
                 COALESCE(s.plan_slug, t.plan) AS plan_slug,
                 s.status, sp.modules AS plan_modules
          FROM tenants t
          LEFT JOIN subscriptions s       ON s.tenant_id = t.id
          LEFT JOIN subscription_plans sp ON sp.slug = COALESCE(s.plan_slug, t.plan)
          WHERE t.id = ${tenantId}
          LIMIT 1
        `),
        loadCatalogFromDB(),
      ]);
      const row = (subRows.rows as any[])[0];
      const freeModules    = catalog.filter(m => m.free).map(m => m.slug);
      const catalogSlugSet = new Set(catalog.map(m => m.slug));
      const rawPlanMods: string[] = Array.isArray(row?.plan_modules) ? row.plan_modules : [];
      const planModules: string[] = planModulesToCatalogSlugs(rawPlanMods, catalogSlugSet);
      let selectedModules: string[] = Array.isArray(row?.selected_modules) ? row.selected_modules : [];
      if (selectedModules.length === 0) {
        selectedModules = [...planModules];
        for (const f of freeModules) if (!selectedModules.includes(f)) selectedModules.push(f);
        selectedModules = Array.from(new Set(selectedModules));
      }
      res.json({
        selectedModules,
        planModules,
        monthlyAmount: row?.monthly_amount ?? 0,
        planSlug:      row?.plan_slug ?? null,
        catalog,
        freeModules,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/admin/tenants/:id/modules — super-admin: update tenant module selection ──
  app.post("/api/admin/tenants/:id/modules", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!(req.user as any)?.isSuperAdmin) return res.sendStatus(403);
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return res.status(400).json({ message: "Invalid tenant id" });
    const { selectedModules } = req.body;
    if (!Array.isArray(selectedModules)) {
      return res.status(400).json({ message: "selectedModules must be an array of slugs" });
    }
    try {
      const catalog  = await loadCatalogFromDB();
      const freeSet  = new Set(catalog.filter(m => m.free).map(m => m.slug));
      const priceMap = new Map(catalog.map(m => [m.slug, m.priceMonthly]));
      const allFree  = Array.from(freeSet);
      const merged   = Array.from(new Set([...allFree, ...selectedModules]));
      const monthly  = merged.filter(s => !freeSet.has(s)).reduce((sum, s) => sum + (priceMap.get(s) ?? 0), 0);
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
          ${'Super-admin updated modules — ' + merged.filter(s => !freeSet.has(s)).length + ' paid modules, ₹' + monthly + '/mo'},
          ${(req.user as any)?.username ?? 'super-admin'}
        )
      `);
      res.json({ success: true, selectedModules: merged, monthlyAmount: monthly });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── GET /api/admin/tenants/:id/subscription-invoice — generate invoice data ─
  app.get("/api/admin/tenants/:id/subscription-invoice", async (req: any, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isSuperAdmin) return res.sendStatus(403);
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) return res.status(400).json({ message: "Invalid tenant id" });
    try {
      const [tenantRows, subRows, catalog] = await Promise.all([
        db.execute(sql`
          SELECT t.id, t.name, t.slug, t.gst_number, t.address, t.billing_email,
                 t.contact_name, t.contact_phone,
                 sp.name AS plan_name, sp.slug AS plan_slug,
                 sp.price_monthly AS plan_price_paise,
                 s.billing_cycle, s.status,
                 s.current_period_start, s.current_period_end,
                 s.selected_modules, s.monthly_amount
          FROM tenants t
          LEFT JOIN subscriptions s       ON s.tenant_id = t.id
          LEFT JOIN subscription_plans sp ON sp.slug = COALESCE(s.plan_slug, t.plan)
          WHERE t.id = ${tenantId}
          LIMIT 1
        `),
        db.execute(sql`
          SELECT COUNT(*) AS invoice_seq FROM billing_events WHERE tenant_id = ${tenantId}
        `),
        loadCatalogFromDB(),
      ]);

      const t = (tenantRows.rows as any[])[0];
      if (!t) return res.status(404).json({ message: "Tenant not found" });

      const seq         = Number((subRows.rows as any[])[0]?.invoice_seq ?? 1);
      const now         = new Date();
      const yyyymm      = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const invoiceNo   = `INV-${yyyymm}-${String(tenantId).padStart(4, "0")}-${seq}`;

      // Plan base price (paise → rupees)
      const planPriceRupees = Math.round(Number(t.plan_price_paise ?? 0) / 100);

      // Add-on modules: selected - free - plan-locked
      const freeSet     = new Set(catalog.filter(m => m.free).map(m => m.slug));
      const catalogSet  = new Set(catalog.map(m => m.slug));
      const planRows2   = await db.execute(sql`
        SELECT modules FROM subscription_plans WHERE slug = ${t.plan_slug} LIMIT 1
      `);
      const rawPlanMods: string[] = Array.isArray((planRows2.rows as any[])[0]?.modules)
        ? (planRows2.rows as any[])[0].modules : [];
      const planModSet = new Set(planModulesToCatalogSlugs(rawPlanMods, catalogSet));

      const selectedMods: string[] = Array.isArray(t.selected_modules) ? t.selected_modules : [];
      const addonItems = catalog.filter(m =>
        selectedMods.includes(m.slug) && !freeSet.has(m.slug) && !planModSet.has(m.slug)
      );

      const addonTotal  = addonItems.reduce((s, m) => s + m.priceMonthly, 0);
      const subtotal    = planPriceRupees + addonTotal;
      const gstRate     = 18;
      const gstAmount   = Math.round(subtotal * gstRate / 100);
      const grandTotal  = subtotal + gstAmount;

      res.json({
        invoiceNo,
        invoiceDate:  now.toISOString(),
        periodStart:  t.current_period_start,
        periodEnd:    t.current_period_end,
        tenant: {
          id:      t.id,
          name:    t.name,
          slug:    t.slug,
          gst:     t.gst_number,
          address: t.address,
          email:   t.billing_email,
          contact: t.contact_name,
          phone:   t.contact_phone,
        },
        plan: {
          name:         t.plan_name ?? t.plan_slug,
          slug:         t.plan_slug,
          billingCycle: t.billing_cycle,
          priceRupees:  planPriceRupees,
        },
        addonModules: addonItems.map(m => ({
          slug:        m.slug,
          name:        m.name,
          priceRupees: m.priceMonthly,
        })),
        subtotal,
        gstRate,
        gstAmount,
        grandTotal,
        currency: "INR",
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── GET /api/admin/platform-settings — super-admin: read platform config ──
  app.get("/api/admin/platform-settings", async (req: any, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isSuperAdmin) {
      return res.sendStatus(403);
    }
    try {
      const rows = await db.execute(sql`SELECT key, value, updated_at FROM platform_settings ORDER BY key`);
      // Mask secret values before returning
      const settings: Record<string, any> = {};
      for (const r of rows.rows as any[]) {
        if (r.key === "razorpay_key_secret" && r.value) {
          settings[r.key] = r.value.substring(0, 8) + "••••••••••••••••";
        } else {
          settings[r.key] = r.value;
        }
      }
      // Also indicate if keys are from env (not DB)
      const dbKeyId     = settings["razorpay_key_id"] ?? null;
      const dbKeySecret = settings["razorpay_key_secret"] ?? null;
      res.json({
        settings,
        source: {
          razorpay_key_id:     dbKeyId     ? "db"  : (process.env.RAZORPAY_KEY_ID     ? "env" : "none"),
          razorpay_key_secret: dbKeySecret ? "db"  : (process.env.RAZORPAY_KEY_SECRET ? "env" : "none"),
        },
        envKeyIdSet:     !!process.env.RAZORPAY_KEY_ID,
        envKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── PUT /api/admin/platform-settings — super-admin: save platform config ─
  app.put("/api/admin/platform-settings", async (req: any, res) => {
    if (!req.isAuthenticated() || !(req.user as any)?.isSuperAdmin) {
      return res.sendStatus(403);
    }
    try {
      const updates: Record<string, string> = req.body ?? {};
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value !== "string") continue;
        // If value is masked (contains ••••), skip — user didn't change the secret
        if (value.includes("••••")) continue;
        if (value.trim() === "") {
          // Empty = delete from DB (fall back to env)
          await db.execute(sql`DELETE FROM platform_settings WHERE key = ${key}`);
        } else {
          await db.execute(sql`
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES (${key}, ${value.trim()}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
          `);
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/billing/request-upgrade — DB-driven plan change request ────
  app.post("/api/billing/request-upgrade", async (req: any, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const tenantId: number = (req.session as any).tenantId;
    const { plan } = req.body;

    try {
      // Look up plan from DB (not hardcoded)
      const planRows = await db.execute(sql`
        SELECT id, name, slug, price_monthly FROM subscription_plans
        WHERE slug = ${plan} AND is_active = true LIMIT 1
      `);
      const planRow = (planRows.rows as any[])[0];
      if (!planRow) {
        return res.status(400).json({ message: "Invalid or inactive plan" });
      }

      const currentPlan = (req.session as any).tenantPlan ?? 'trial';
      await db.execute(sql`
        INSERT INTO billing_events (tenant_id, event_type, from_plan, to_plan, billing_cycle, amount, currency, notes, created_by)
        VALUES (
          ${tenantId}, 'upgrade_requested',
          ${currentPlan},
          ${plan}, 'monthly',
          ${planRow.price_monthly ?? 0}, 'INR',
          ${'Plan change request — awaiting admin approval'},
          ${(req.user as any)?.username ?? 'tenant-admin'}
        )
      `);
      res.json({ message: `Plan change request to ${planRow.name} submitted. Our team will contact you within 24 hours.` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
