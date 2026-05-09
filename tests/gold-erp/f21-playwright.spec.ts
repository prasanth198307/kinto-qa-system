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
const today = new Date().toISOString().slice(0, 10);
const lwd   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); // LWD = today + 30 days

// ─────────────────────────────────────────────────────────────────────────────
test("F21 — HRMS Exit Process: Resignation → Checklist → F&F → Letter → Exit Interview", async ({ page }) => {
  test.setTimeout(120000);

  let employeeId = 0;
  let checklistId = 0;
  let fnfId = 0;
  let letterId = 0;
  let ticketId = 0;

  // ── Login ─────────────────────────────────────────────────────────────────

  await test.step("Login as goldadmin", async () => {
    await login(page, "gold-erp-demo", "goldadmin", "Gold@1234");
    console.log("✓ Logged in as goldadmin (tenant 13)");
  });

  // ── PHASE 1: Create Test Employee ─────────────────────────────────────────

  await test.step("Phase 1 — Create test employee Rajesh Kumar", async () => {
    const joinDate = new Date(Date.now() - 365 * 2 * 86400000).toISOString().slice(0, 10); // 2 years ago
    const emp = await apiPost(page, "/api/hr/employees", {
      empCode:    `F21-${runId}`,
      firstName:  "Rajesh",
      lastName:   `Kumar F21${runId}`,
      gender:     "male",
      basicSalary: 20000,
      ctc:        25000,
      joinDate,
      phone:      `98765${runId}`,
      status:     "active",
      employeeType: "permanent",
      pfEnabled:  true,
      esiEnabled: true,
    });
    employeeId = Number(emp.id);
    expect(employeeId).toBeGreaterThan(0);
    expect(emp.first_name).toBe("Rajesh");
    console.log(`✓ Employee created — id: ${employeeId}, empCode: F21-${runId}`);
  });

  // ── PHASE 2: Record Resignation ───────────────────────────────────────────

  await test.step("Phase 2 — Record resignation via employee update", async () => {
    const joinDate = new Date(Date.now() - 365 * 2 * 86400000).toISOString().slice(0, 10);
    const updated = await apiPut(page, `/api/hr/employees/${employeeId}`, {
      empCode:         `F21-${runId}`,
      firstName:       "Rajesh",
      lastName:        `Kumar F21${runId}`,
      gender:          "male",
      basicSalary:     20000,
      ctc:             25000,
      joinDate,
      phone:           `98765${runId}`,
      employeeType:    "permanent",
      pfEnabled:       true,
      esiEnabled:      true,
      taxRegime:       "new",
      resignationDate: today,
      exitDate:        lwd,
      exitType:        "resignation",
      exitReason:      "Personal reasons — relocating to hometown",
      status:          "notice_period",
    });
    expect(updated.resignation_date).toBeTruthy();
    expect(updated.exit_type).toBe("resignation");
    expect(updated.status).toBe("notice_period");
    console.log(`✓ Resignation recorded — exit date: ${updated.exit_date}, status: ${updated.status}`);
  });

  // ── PHASE 3: Create Exit Checklist ────────────────────────────────────────

  await test.step("Phase 3 — Create exit checklist via API", async () => {
    const checklist = await apiPost(page, "/api/hr/onboarding", {
      employee_name: `Rajesh Kumar F21${runId}`,
      employee_id:   employeeId,
      department:    "Operations",
      designation:   "Senior Associate",
      joining_date:  today,
      status:        "in_progress",
      notes:         "Exit checklist for Rajesh Kumar resignation",
      checklist: [
        { task: "Company laptop returned",            done: true },
        { task: "ID Card surrendered",                done: true },
        { task: "Email access revoked",               done: true },
        { task: "Gold issued verified as returned",   done: true },
        { task: "Locker keys returned",               done: true },
        { task: "Knowledge transfer completed",       done: false },
      ],
    });
    checklistId = Number(checklist.id);
    expect(checklistId).toBeGreaterThan(0);
    console.log(`✓ Exit checklist created — id: ${checklistId}`);

    // Mark all tasks done and status completed
    const done = await apiPut(page, `/api/hr/onboarding/${checklistId}`, {
      employee_name: `Rajesh Kumar F21${runId}`,
      employee_id:   employeeId,
      department:    "Operations",
      designation:   "Senior Associate",
      joining_date:  today,
      status:        "completed",
      notes:         "All exit checklist items verified",
      checklist: [
        { task: "Company laptop returned",            done: true },
        { task: "ID Card surrendered",                done: true },
        { task: "Email access revoked",               done: true },
        { task: "Gold issued verified as returned",   done: true },
        { task: "Locker keys returned",               done: true },
        { task: "Knowledge transfer completed",       done: true },
      ],
    });
    expect(done.status).toBe("completed");
    console.log(`✓ Exit checklist completed — all 6 items done`);
  });

  // ── PHASE 4: Calculate F&F ────────────────────────────────────────────────

  await test.step("Phase 4 — Calculate Full & Final settlement", async () => {
    const calc = await apiPost(page, "/api/hr/fnf/calculate", {
      employeeId,
      settlementDate: today,
    });
    expect(calc.employeeId).toBe(employeeId);
    expect(calc.grossSettlement).toBeGreaterThanOrEqual(0);
    console.log(
      `✓ F&F calculated — pending salary: ₹${calc.pendingSalary}, ` +
      `EL encashment: ₹${calc.elEncashmentAmount}, gratuity: ₹${calc.gratuityAmount}, ` +
      `gross: ₹${calc.grossSettlement}`
    );

    // ── PHASE 5: Create F&F Settlement Record ──────────────────────────────
    const fnf = await apiPost(page, "/api/hr/fnf", {
      employeeId,
      settlementDate:    today,
      lastWorkingDate:   lwd,
      noticePeriodDays:  30,
      noticeServedDays:  30,
      pendingSalaryDays: calc.pendingSalaryDays,
      pendingSalary:     calc.pendingSalary,
      elEncashmentDays:  calc.elEncashmentDays,
      elEncashmentAmount: calc.elEncashmentAmount,
      gratuityAmount:    calc.gratuityAmount,
      noticeRecovery:    0,
      noticePay:         0,
      bonusArrears:      0,
      otherAdditions:    0,
      otherDeductions:   0,
      grossSettlement:   calc.grossSettlement,
      tdsOnSettlement:   0,
      netSettlement:     calc.netSettlement,
      status:            "draft",
      notes:             `F21 test exit settlement for employee ${employeeId}`,
    });
    fnfId = Number(fnf.id);
    expect(fnfId).toBeGreaterThan(0);
    console.log(`✓ F&F settlement created — id: ${fnfId}, net: ₹${fnf.net_settlement}`);

    // ── PHASE 6: Finalize F&F ──────────────────────────────────────────────
    const finalized = await apiPut(page, `/api/hr/fnf/${fnfId}/finalize`, {});
    expect(finalized.success).toBe(true);
    console.log(`✓ F&F settlement finalized`);
  });

  // ── PHASE 7: Generate Experience Letter ───────────────────────────────────

  await test.step("Phase 7 — Generate experience letter (draft)", async () => {
    const letter = await apiPost(page, "/api/hr/letters", {
      employee_name: `Rajesh Kumar F21${runId}`,
      employee_id:   employeeId,
      letter_type:   "experience",
      subject:       `Experience Letter — Rajesh Kumar F21${runId}`,
      content:       `This is to certify that Rajesh Kumar (F21-${runId}) has been employed with us ` +
                     `as Senior Associate in the Operations department from ${new Date(Date.now() - 365*2*86400000).toISOString().slice(0,10)} ` +
                     `to ${lwd}. During this tenure, he has demonstrated dedication and professionalism. ` +
                     `We wish him the very best in his future endeavours.`,
      issued_date:   today,
      status:        "draft",
    });
    letterId = Number(letter.id);
    expect(letterId).toBeGreaterThan(0);
    expect(letter.letter_type).toBe("experience");
    console.log(`✓ Experience letter created — id: ${letterId}`);
  });

  // ── PHASE 8: Issue the Letter ─────────────────────────────────────────────

  await test.step("Phase 8 — Issue experience letter", async () => {
    const issued = await apiPut(page, `/api/hr/letters/${letterId}`, {
      employee_name: `Rajesh Kumar F21${runId}`,
      letter_type:   "experience",
      subject:       `Experience Letter — Rajesh Kumar F21${runId}`,
      content:       `This is to certify that Rajesh Kumar (F21-${runId}) has served as Senior Associate.`,
      issued_date:   today,
      status:        "issued",
    });
    expect(issued.status).toBe("issued");
    console.log(`✓ Experience letter issued — status: ${issued.status}`);
  });

  // ── PHASE 9: Exit Interview Support Ticket ────────────────────────────────

  await test.step("Phase 9 — Create exit interview support ticket", async () => {
    const ticket = await apiPost(page, "/api/hr/support-tickets", {
      employee_name: `Rajesh Kumar F21${runId}`,
      employee_id:   employeeId,
      subject:       `Exit Interview — Rajesh Kumar F21${runId}`,
      description:   "Work environment good, growth opportunities limited. Leaving for personal reasons.",
      category:      "general",
      priority:      "medium",
      assigned_to:   "HR Manager",
    });
    ticketId = Number(ticket.id);
    expect(ticketId).toBeGreaterThan(0);
    expect(ticket.status).toBe("open");
    console.log(`✓ Exit interview ticket created — id: ${ticketId}, no: ${ticket.ticket_no}`);

    // ── PHASE 10: Resolve exit interview ──────────────────────────────────
    const resolved = await apiPut(page, `/api/hr/support-tickets/${ticketId}`, {
      employee_name: `Rajesh Kumar F21${runId}`,
      subject:       `Exit Interview — Rajesh Kumar F21${runId}`,
      description:   "Work environment good, growth opportunities limited.",
      category:      "general",
      priority:      "medium",
      status:        "resolved",
      assigned_to:   "HR Manager",
      resolution:    "Exit interview completed. Feedback documented. Relieving formalities done.",
    });
    expect(resolved.status).toBe("resolved");
    console.log(`✓ Exit interview ticket resolved`);
  });

  // ── PHASE 11: Mark Employee as Inactive/Separated ─────────────────────────

  await test.step("Phase 11 — Mark employee as inactive (separated)", async () => {
    const joinDate = new Date(Date.now() - 365 * 2 * 86400000).toISOString().slice(0, 10);
    const separated = await apiPut(page, `/api/hr/employees/${employeeId}`, {
      empCode:         `F21-${runId}`,
      firstName:       "Rajesh",
      lastName:        `Kumar F21${runId}`,
      gender:          "male",
      basicSalary:     20000,
      ctc:             25000,
      joinDate,
      phone:           `98765${runId}`,
      employeeType:    "permanent",
      pfEnabled:       true,
      esiEnabled:      true,
      taxRegime:       "new",
      resignationDate: today,
      exitDate:        lwd,
      exitType:        "resignation",
      exitReason:      "Personal reasons — relocating to hometown",
      status:          "inactive",
    });
    expect(separated.status).toBe("inactive");
    console.log(`✓ Employee marked inactive (separated) — status: ${separated.status}`);
  });

  // ── PHASE 12: UI Verification ─────────────────────────────────────────────

  await test.step("Phase 12 — Verify exit checklist in UI", async () => {
    await goFresh(page, "/hr/onboarding");
    await expect(page.locator(`[data-testid="card-onboard-${checklistId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Exit checklist visible in UI — card-onboard-${checklistId}`);
  });

  await test.step("Phase 12b — Verify experience letter in UI", async () => {
    await goFresh(page, "/hr/letters");
    await expect(page.locator(`[data-testid="row-letter-${letterId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Experience letter visible in UI — row-letter-${letterId}`);
  });

  await test.step("Phase 12c — Verify exit interview ticket in UI", async () => {
    await goFresh(page, "/hr/support-desk");
    await expect(page.locator(`[data-testid="row-ticket-${ticketId}"]`)).toBeVisible({ timeout: 20000 });
    console.log(`✓ Exit interview ticket visible in UI — row-ticket-${ticketId}`);
  });

  // ── PHASE 13: Final Count Verification ───────────────────────────────────

  await test.step("Phase 13 — Final count verification", async () => {
    // Letters count
    const letters = await apiGet(page, "/api/hr/letters");
    expect(Array.isArray(letters)).toBe(true);
    const myLetter = letters.find((l: any) => Number(l.id) === letterId);
    expect(myLetter?.status).toBe("issued");
    console.log(`✓ HR letters count: ${letters.length}, letter ${letterId} status=issued`);

    // Support tickets count
    const tickets = await apiGet(page, "/api/hr/support-tickets");
    expect(Array.isArray(tickets)).toBe(true);
    const myTicket = tickets.find((t: any) => Number(t.id) === ticketId);
    expect(myTicket?.status).toBe("resolved");
    console.log(`✓ Support tickets count: ${tickets.length}, ticket ${ticketId} status=resolved`);

    // Onboarding checklists count
    const checklists = await apiGet(page, "/api/hr/onboarding");
    expect(Array.isArray(checklists)).toBe(true);
    const myChecklist = checklists.find((c: any) => Number(c.id) === checklistId);
    expect(myChecklist?.status).toBe("completed");
    console.log(`✓ Onboarding checklists count: ${checklists.length}, checklist ${checklistId} status=completed`);

    // FNF settlements
    const fnfList = await apiGet(page, "/api/hr/fnf");
    expect(Array.isArray(fnfList)).toBe(true);
    const myFnf = fnfList.find((f: any) => Number(f.id) === fnfId);
    expect(myFnf?.status).toBe("finalized");
    console.log(`✓ F&F settlements count: ${fnfList.length}, fnf ${fnfId} status=finalized`);

    // Employee status
    const emp = await apiGet(page, `/api/hr/employees/${employeeId}`);
    expect(emp.status).toBe("inactive");
    expect(emp.exit_type).toBe("resignation");
    console.log(`✓ Employee ${employeeId} status=inactive, exit_type=resignation confirmed`);

    console.log(
      "✓ F21 complete — Employee created, Resignation recorded, Exit checklist completed, " +
      "F&F calculated & finalized, Experience letter issued, Exit interview resolved, " +
      "Employee marked inactive — all verified via API & UI"
    );
  });
});
