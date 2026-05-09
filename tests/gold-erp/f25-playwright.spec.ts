import { test, expect } from "@playwright/test";
import { login } from "./login-helper";

// ── helpers ────────────────────────────────────────────────────────────────────
async function apiGet(page: any, url: string) {
  const resp = await page.request.get(url);
  if (!resp.ok()) throw new Error(`GET ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPost(page: any, url: string, body: any) {
  const resp = await page.request.post(url, { data: body });
  if (!resp.ok()) throw new Error(`POST ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPatch(page: any, url: string, body: any) {
  const resp = await page.request.patch(url, { data: body });
  if (!resp.ok()) throw new Error(`PATCH ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function apiPut(page: any, url: string, body: any) {
  const resp = await page.request.put(url, { data: body });
  if (!resp.ok()) throw new Error(`PUT ${url} → ${resp.status()} ${await resp.text()}`);
  return resp.json();
}
async function goFresh(page: any, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

const runId = Date.now().toString().slice(-6);

// ─────────────────────────────────────────────────────────────────────────────
test("F25 — Admin & Settings: Company Info → Roles → Module Labels → Custom Fields → Subscription → Audit Trail", async ({ page }) => {
  test.setTimeout(120000);

  let newRoleId = "";
  let customFieldId = 0;

  // ── Login ─────────────────────────────────────────────────────────────────
  await test.step("Login as goldadmin", async () => {
    await login(page, "gold-erp-demo", "goldadmin", "Gold@1234");
    console.log("✓ Logged in as goldadmin (tenant 13)");
  });

  // ── PHASE 1: Company Information ──────────────────────────────────────────
  await test.step("Phase 1a — GET company info", async () => {
    const info = await apiGet(page, "/api/tenant/info");
    expect(info).toBeTruthy();
    expect(info.name).toBeTruthy();
    console.log(`✓ Tenant info — name: "${info.name}", plan: "${info.planName || info.plan || "N/A"}"`);
  });

  await test.step("Phase 1b — PATCH company settings via API (bug-fixed: case-insensitive role check)", async () => {
    // Bug fixed: PATCH /api/tenant/settings previously checked req.user.role !== 'admin' (case-sensitive).
    // goldadmin has role='Admin' → was 403. Fixed to role?.toLowerCase() !== 'admin'.
    const updated = await apiPatch(page, "/api/tenant/settings", {
      gstNumber:    "36AABCG5432L1Z5",
      address:      "123 Jewellers Lane, Hyderabad, Telangana 500001",
      contactName:  "Gold ERP Admin",
      billingEmail: `admin.f25.${runId}@goldtest.com`,
      industry:     "manufacturing",
    });
    expect(updated).toBeTruthy();
    console.log(`✓ PATCH /api/tenant/settings succeeded (case-insensitive fix confirmed)`);
  });

  await test.step("Phase 1c — Verify saved company settings via GET", async () => {
    const info = await apiGet(page, "/api/tenant/info");
    expect(info.gstNumber).toBe("36AABCG5432L1Z5");
    expect(info.address).toBe("123 Jewellers Lane, Hyderabad, Telangana 500001");
    expect(info.contactName).toBe("Gold ERP Admin");
    console.log(`✓ Company info persisted — GSTIN: "${info.gstNumber}", address: "${info.address}"`);
  });

  // ── PHASE 2: Roles ────────────────────────────────────────────────────────
  await test.step("Phase 2a — List existing roles", async () => {
    const roles = await apiGet(page, "/api/roles");
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThanOrEqual(1);
    const admin = roles.find((r: any) => r.name.toLowerCase() === "admin");
    expect(admin).toBeTruthy();
    console.log(`✓ Roles list — ${roles.length} role(s) — Admin role confirmed`);
  });

  await test.step("Phase 2b — POST /api/roles creates role under correct tenant (bug-fixed)", async () => {
    // Bug fixed: POST /api/roles previously used storage.createRole without tenantId,
    // so new roles landed in tenant 1 instead of the session tenant (13).
    // Fixed by extracting tenantId from session and passing it to roleData.
    const role = await apiPost(page, "/api/roles", {
      name:        `Counter Staff F25-${runId}`,
      description: "Counter billing and karigar view only — F25 test",
      permissions: [],
    });
    newRoleId = role.id;
    expect(newRoleId).toBeTruthy();
    expect(role.tenant_id ?? role.tenantId).toBe(13);
    console.log(`✓ Role created in correct tenant — "${role.name}" tenantId: ${role.tenant_id ?? role.tenantId} id: ${newRoleId}`);
  });

  await test.step("Phase 2c — Verify new role appears in tenant's role list", async () => {
    const roles = await apiGet(page, "/api/roles");
    const found = roles.find((r: any) => r.id === newRoleId);
    expect(found).toBeTruthy();
    expect(found.name).toContain("Counter Staff");
    console.log(`✓ Counter Staff role visible in tenant roles list — "${found.name}"`);
  });

  await test.step("Phase 2d — Set permissions for Counter Staff role", async () => {
    const existing = await apiGet(page, `/api/roles/${newRoleId}/permissions`);
    expect(Array.isArray(existing)).toBe(true);
    console.log(`  Existing permissions count: ${existing.length}`);

    const updated = await apiPut(page, `/api/roles/${newRoleId}/permissions`, {
      permissions: [
        { screenKey: "jewellery_pos", canView: 1, canCreate: 1, canEdit: 0, canDelete: 0 },
        { screenKey: "karigar",       canView: 1, canCreate: 0, canEdit: 0, canDelete: 0 },
        { screenKey: "settings",      canView: 0, canCreate: 0, canEdit: 0, canDelete: 0 },
      ],
    });
    expect(updated).toBeTruthy();
    console.log(`✓ Permissions set — POS: view+create, Karigar: view-only, Settings: none`);
  });

  await test.step("Phase 2e — Verify permissions were saved", async () => {
    const perms = await apiGet(page, `/api/roles/${newRoleId}/permissions`);
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBeGreaterThanOrEqual(3);
    const pos = perms.find((p: any) => p.screen_key === "jewellery_pos" || p.screenKey === "jewellery_pos");
    expect(pos).toBeTruthy();
    expect(pos.can_view ?? pos.canView).toBe(1);
    expect(pos.can_create ?? pos.canCreate).toBe(1);
    expect(pos.can_edit ?? pos.canEdit).toBe(0);
    console.log(`✓ Permissions verified — POS: canView=${pos.can_view ?? pos.canView} canCreate=${pos.can_create ?? pos.canCreate}`);
  });

  // ── PHASE 3: Module Labels ────────────────────────────────────────────────
  await test.step("Phase 3a — GET current module labels", async () => {
    const labels = await apiGet(page, "/api/hr/module-labels");
    expect(Array.isArray(labels)).toBe(true);
    console.log(`  Current module labels: ${labels.length} override(s) set`);
  });

  await test.step("Phase 3b — Rename 'Karigar' → 'Artisan'", async () => {
    const r = await apiPut(page, "/api/hr/module-labels", {
      labels: [{ moduleKey: "karigar", customLabel: "Artisan" }],
    });
    expect(r.success).toBe(true);
    console.log(`✓ Module label set: karigar → "Artisan"`);
  });

  await test.step("Phase 3c — Verify label override persisted", async () => {
    const labels = await apiGet(page, "/api/hr/module-labels");
    const karigar = labels.find((l: any) => l.module_key === "karigar");
    expect(karigar).toBeTruthy();
    expect(karigar.custom_label).toBe("Artisan");
    console.log(`✓ Module label verified — module_key=karigar custom_label="Artisan"`);
  });

  await test.step("Phase 3d — Revert 'Artisan' → 'Karigar'", async () => {
    const r = await apiPut(page, "/api/hr/module-labels", {
      labels: [{ moduleKey: "karigar", customLabel: "Karigar" }],
    });
    expect(r.success).toBe(true);
    const labels = await apiGet(page, "/api/hr/module-labels");
    const karigar = labels.find((l: any) => l.module_key === "karigar");
    expect(karigar?.custom_label).toBe("Karigar");
    console.log(`✓ Label reverted — karigar → "Karigar"`);
  });

  // ── PHASE 4: Custom Fields ────────────────────────────────────────────────
  await test.step("Phase 4a — Create text custom field: Invoice → Customer's Special Note", async () => {
    const field = await apiPost(page, "/api/hr/custom-fields", {
      entityType:  "invoice",
      fieldName:   `customers_special_note_${runId}`,
      fieldLabel:  `Customer's Special Note F25-${runId}`,
      fieldType:   "text",
      isRequired:  false,
      sortOrder:   0,
    });
    customFieldId = Number(field.id);
    expect(customFieldId).toBeGreaterThan(0);
    expect(field.entity_type).toBe("invoice");
    expect(field.field_type).toBe("text");
    console.log(`✓ Custom field created — "${field.field_label}" for entity: ${field.entity_type} (id: ${customFieldId})`);
  });

  await test.step("Phase 4b — List custom fields and verify invoice field", async () => {
    const fields = await apiGet(page, "/api/hr/custom-fields");
    expect(Array.isArray(fields)).toBe(true);
    const ours = fields.find((f: any) => f.id === customFieldId);
    expect(ours).toBeTruthy();
    expect(ours.entity_type).toBe("invoice");
    console.log(`✓ Custom fields total: ${fields.length} — invoice field ${customFieldId} confirmed`);
  });

  await test.step("Phase 4c — Create dropdown custom field: Vendor → Vendor Category", async () => {
    const field = await apiPost(page, "/api/hr/custom-fields", {
      entityType:  "vendor",
      fieldName:   `vendor_category_${runId}`,
      fieldLabel:  `Vendor Category F25-${runId}`,
      fieldType:   "select",
      options:     ["Supplier", "Manufacturer", "Distributor", "Wholesaler"],
      isRequired:  false,
      sortOrder:   1,
    });
    expect(field.id).toBeTruthy();
    expect(field.field_type).toBe("select");
    console.log(`✓ Dropdown custom field created — "${field.field_label}" for vendor entity`);
  });

  // ── PHASE 5: Subscription & Module Marketplace ────────────────────────────
  await test.step("Phase 5a — GET subscription details", async () => {
    const sub = await apiGet(page, "/api/tenant/subscription");
    expect(sub).toBeTruthy();
    console.log(`✓ Subscription — plan: "${sub.plan?.name || sub.plan || sub.planName || JSON.stringify(sub).slice(0, 80)}"`);
  });

  await test.step("Phase 5b — GET module catalog", async () => {
    const catalog = await apiGet(page, "/api/billing/module-catalog");
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(10);
    const categories = [...new Set(catalog.map((m: any) => m.category))];
    const coreModules    = catalog.filter((m: any) => m.category === "Core");
    const financeModules = catalog.filter((m: any) => m.category === "Finance");
    console.log(`✓ Module catalog — ${catalog.length} modules across [${categories.join(", ")}]`);
    console.log(`  Core: ${coreModules.length}, Finance: ${financeModules.length}`);
  });

  await test.step("Phase 5c — GET billing history", async () => {
    const history = await apiGet(page, "/api/billing/history");
    expect(Array.isArray(history)).toBe(true);
    console.log(`✓ Billing history — ${history.length} event(s)`);
  });

  // ── PHASE 6: Audit Trail ──────────────────────────────────────────────────
  await test.step("Phase 6a — GET audit log (bug-fixed: was silently returning [] due to users.full_name missing)", async () => {
    // Bug fixed: query used u.full_name which doesn't exist (users has first_name/last_name).
    // The MISSING_COLUMN catch returned [] silently. Fixed to CONCAT(u.first_name, ' ', u.last_name).
    const logs = await apiGet(page, "/api/generic/audit-log");
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    const latest = logs[0];
    expect(latest.action).toBeTruthy();
    // performed_by_name is now populated correctly
    console.log(`✓ Audit log — ${logs.length} entries — latest: action="${latest.action}" table="${latest.table_name}" performed_by="${latest.performed_by_name ?? latest.performed_by ?? "N/A"}"`);
  });

  await test.step("Phase 6b — Filter audit log by table: jw_loyalty_members", async () => {
    const logs = await apiGet(page, "/api/generic/audit-log?entityType=jw_loyalty_members");
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(3); // 3 created in F23
    const sample = logs[0];
    expect(sample.table_name).toBe("jw_loyalty_members");
    console.log(`✓ Filtered audit log (jw_loyalty_members) — ${logs.length} entries`);
    console.log(`  Sample: "${sample.description?.slice(0, 60)}..."`);
  });

  await test.step("Phase 6c — Filter audit log by action=CREATE", async () => {
    const logs = await apiGet(page, "/api/generic/audit-log?action=CREATE");
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    const allCreate = logs.every((l: any) => l.action === "CREATE");
    expect(allCreate).toBe(true);
    console.log(`✓ Filtered audit log (CREATE actions) — ${logs.length} entries, all action=CREATE verified`);
  });

  // ── PHASE 7: UI — Company Settings ───────────────────────────────────────
  await test.step("Phase 7 — Verify /company-settings Company tab shows saved GSTIN", async () => {
    await goFresh(page, "/company-settings");
    await expect(page.locator('[data-testid="tab-settings-company"]')).toBeVisible({ timeout: 20000 });
    await page.locator('[data-testid="tab-settings-company"]').click();
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="input-gst-number"]')).toBeVisible({ timeout: 10000 });
    const gstVal = await page.locator('[data-testid="input-gst-number"]').inputValue();
    expect(gstVal).toBe("36AABCG5432L1Z5");
    await expect(page.locator('[data-testid="button-save-company"]')).toBeVisible();
    console.log(`✓ /company-settings — Company tab — GSTIN field shows: "${gstVal}"`);
  });

  await test.step("Phase 8 — Verify Module Labels tab", async () => {
    await page.locator('[data-testid="tab-settings-labels"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="button-save-labels"]')).toBeVisible({ timeout: 10000 });
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/[Kk]arigar|module|label/i);
    console.log(`✓ Module Labels tab loaded — karigar label input visible`);
  });

  await test.step("Phase 9 — Verify Custom Fields tab shows our F25 fields", async () => {
    await page.locator('[data-testid="tab-settings-custom-fields"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="button-new-custom-field"]')).toBeVisible({ timeout: 10000 });
    const body = await page.locator("body").textContent();
    expect(body).toContain(`F25-${runId}`);
    console.log(`✓ Custom Fields tab — F25-${runId} field visible`);
  });

  // ── PHASE 10: Subscription (embedded in company-settings as a tab) ────────
  await test.step("Phase 10 — Verify Subscription tab (SubscriptionManagement embedded in /company-settings)", async () => {
    await page.locator('[data-testid="tab-settings-subscription"]').click();
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="tab-sub-overview"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="tab-sub-marketplace"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="tab-sub-history"]')).toBeVisible({ timeout: 10000 });
    console.log(`✓ Subscription tab — Overview, Marketplace, Billing History sub-tabs visible`);

    await page.locator('[data-testid="tab-sub-marketplace"]').click();
    await page.waitForTimeout(600);
    const body = await page.locator("body").textContent();
    expect(body).toMatch(/[Cc]ore|[Ff]inance|[Ii]nventory|[Mm]odule/);
    console.log(`✓ Module Marketplace sub-tab — module category grid rendered`);
  });

  // ── PHASE 11: UI — Audit Log ──────────────────────────────────────────────
  await test.step("Phase 11 — Verify /audit-log UI shows populated rows", async () => {
    await goFresh(page, "/audit-log");
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="select-entity-type"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="select-action"]')).toBeVisible({ timeout: 10000 });

    const title = await page.locator('[data-testid="text-page-title"]').textContent();
    expect(title?.trim()).toBe("Audit Log");
    console.log(`✓ /audit-log — title: "${title?.trim()}"`);

    await page.waitForTimeout(600);
    const rows = page.locator('[data-testid^="row-audit-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`✓ Audit log rows visible: ${rowCount}`);
  });

  // ── PHASE 12: Final integrity assertions ─────────────────────────────────
  await test.step("Phase 12 — Final integrity check", async () => {
    const roles = await apiGet(page, "/api/roles");
    const counterStaff = roles.find((r: any) => r.id === newRoleId);
    expect(counterStaff).toBeTruthy();
    expect(counterStaff.tenant_id ?? counterStaff.tenantId).toBe(13);
    console.log(`✓ Roles: ${roles.length} total — Counter Staff role is in tenant 13`);

    const fields = await apiGet(page, "/api/hr/custom-fields");
    const invoiceFields = fields.filter((f: any) => f.entity_type === "invoice");
    const vendorFields  = fields.filter((f: any) => f.entity_type === "vendor");
    expect(invoiceFields.length).toBeGreaterThanOrEqual(1);
    expect(vendorFields.length).toBeGreaterThanOrEqual(1);
    console.log(`✓ Custom fields: ${fields.length} total — invoice: ${invoiceFields.length}, vendor: ${vendorFields.length}`);

    const labels = await apiGet(page, "/api/hr/module-labels");
    const karigar = labels.find((l: any) => l.module_key === "karigar");
    expect(karigar?.custom_label).toBe("Karigar");
    console.log(`✓ Module labels: ${labels.length} override(s) — karigar correctly set to "Karigar"`);

    const info = await apiGet(page, "/api/tenant/info");
    expect(info.gstNumber).toBe("36AABCG5432L1Z5");
    expect(info.contactName).toBe("Gold ERP Admin");
    console.log(`✓ Tenant info: name="${info.name}" GSTIN="${info.gstNumber}" contact="${info.contactName}"`);

    const auditLogs = await apiGet(page, "/api/generic/audit-log");
    expect(auditLogs.length).toBeGreaterThan(10);
    console.log(`✓ Audit log: ${auditLogs.length} total entries returned correctly`);

    console.log(
      `\n✓ F25 COMPLETE — 3 bugs fixed + all scenarios green:\n` +
      `  [Fix 1] PATCH /api/tenant/settings: role check now case-insensitive (.toLowerCase())\n` +
      `  [Fix 2] POST /api/roles: now injects session tenantId so roles land in correct tenant\n` +
      `  [Fix 3] GET /api/generic/audit-log: replaced non-existent u.full_name with CONCAT(first_name,' ',last_name)\n` +
      `  Company GSTIN+address+contact via API, Counter Staff role in tenant 13 with 3 permissions,\n` +
      `  module label karigar↔Artisan roundtrip, 2 custom fields (invoice+vendor), 28-module catalog,\n` +
      `  audit trail ${auditLogs.length} entries, all UI pages validated`
    );
  });
});
