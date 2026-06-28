import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";

const router = Router();
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated?.() && !req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};
const tid = (req: any) => String(req.tenantId || req.user?.tenantId || 1);

// ── Helper: EMI calculation (reducing balance) ────────────────────────────────
function calcEMI(principal: number, ratePerAnnum: number, tenureMonths: number): number {
  const r = ratePerAnnum / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  return Math.round((principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1) * 100) / 100;
}

function calcMaturityAmount(principal: number, ratePerAnnum: number, tenureMonths: number): number {
  return Math.round(principal * Math.pow(1 + (ratePerAnnum / 400), tenureMonths / 3) * 100) / 100;
}

// ── Members ───────────────────────────────────────────────────────────────────
router.get("/members", requireAuth, async (req: any, res) => {
  try {
    const { search, status, kyc_status } = req.query as any;
    let q = `SELECT * FROM nidhi_members WHERE tenant_id=${tid(req)} AND record_status=1`;
    if (search) q += ` AND (name ILIKE '%${search}%' OR member_number ILIKE '%${search}%' OR phone ILIKE '%${search}%')`;
    if (status) q += ` AND status='${status}'`;
    if (kyc_status) q += ` AND kyc_status='${kyc_status}'`;
    q += ` ORDER BY created_at DESC`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/members/:id", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM nidhi_members WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/members", requireAuth, async (req: any, res) => {
  try {
    const { name, father_name, date_of_birth, gender, phone, alternate_phone, email, address, city, state, pincode,
            aadhar_number, pan_number, photo_url, nominee_name, nominee_relation, membership_date, shares_held, share_value } = req.body;
    // Auto-generate member number
    const cnt = await db.execute(sql`SELECT COUNT(*) as c FROM nidhi_members WHERE tenant_id=${tid(req)}`);
    const num = String(Number((cnt.rows[0] as any).c || 0) + 1).padStart(5, '0');
    const member_number = `MEM-${num}`;
    const sv = Number(share_value || 10);
    const sh = Number(shares_held || 1);
    const rows = await db.execute(sql`
      INSERT INTO nidhi_members (tenant_id, member_number, name, father_name, date_of_birth, gender, phone, alternate_phone,
        email, address, city, state, pincode, aadhar_number, pan_number, photo_url, nominee_name, nominee_relation,
        membership_date, shares_held, share_value, total_share_amount)
      VALUES (${tid(req)}, ${member_number}, ${name}, ${father_name||null}, ${date_of_birth||null}, ${gender||null},
        ${phone||null}, ${alternate_phone||null}, ${email||null}, ${address||null}, ${city||null}, ${state||null},
        ${pincode||null}, ${aadhar_number||null}, ${pan_number||null}, ${photo_url||null}, ${nominee_name||null},
        ${nominee_relation||null}, ${membership_date||null}, ${sh}, ${sv}, ${sh * sv})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/members/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, father_name, date_of_birth, gender, phone, alternate_phone, email, address, city, state, pincode,
            aadhar_number, pan_number, photo_url, nominee_name, nominee_relation, status, kyc_status } = req.body;
    const rows = await db.execute(sql`
      UPDATE nidhi_members SET name=${name}, father_name=${father_name||null}, date_of_birth=${date_of_birth||null},
        gender=${gender||null}, phone=${phone||null}, alternate_phone=${alternate_phone||null}, email=${email||null},
        address=${address||null}, city=${city||null}, state=${state||null}, pincode=${pincode||null},
        aadhar_number=${aadhar_number||null}, pan_number=${pan_number||null}, photo_url=${photo_url||null},
        nominee_name=${nominee_name||null}, nominee_relation=${nominee_relation||null},
        status=${status||'active'}, kyc_status=${kyc_status||'pending'}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/members/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`UPDATE nidhi_members SET record_status=0 WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Share allotment
router.post("/members/:id/shares", requireAuth, async (req: any, res) => {
  try {
    const { shares_count, share_value, payment_mode, certificate_number, narration } = req.body;
    const sv = Number(share_value || 10);
    const sc = Number(shares_count || 0);
    await db.execute(sql`
      INSERT INTO nidhi_share_transactions (tenant_id, member_id, transaction_type, shares_count, share_value, total_amount, certificate_number, payment_mode, narration)
      VALUES (${tid(req)}, ${req.params.id}, 'allotment', ${sc}, ${sv}, ${sc * sv}, ${certificate_number||null}, ${payment_mode||'cash'}, ${narration||null})`);
    const rows = await db.execute(sql`
      UPDATE nidhi_members SET shares_held=shares_held+${sc}, total_share_amount=total_share_amount+${sc * sv}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Deposits ──────────────────────────────────────────────────────────────────
router.get("/deposits", requireAuth, async (req: any, res) => {
  try {
    const { deposit_type, status, member_id } = req.query as any;
    let q = `SELECT d.*, m.name as member_name, m.phone as member_phone, m.member_number
             FROM nidhi_deposits d LEFT JOIN nidhi_members m ON m.id=d.member_id
             WHERE d.tenant_id=${tid(req)} AND d.record_status=1`;
    if (deposit_type) q += ` AND d.deposit_type='${deposit_type}'`;
    if (status) q += ` AND d.status='${status}'`;
    if (member_id) q += ` AND d.member_id='${member_id}'`;
    q += ` ORDER BY d.created_at DESC`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/deposits/:id", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT d.*, m.name as member_name, m.phone as member_phone, m.member_number
      FROM nidhi_deposits d LEFT JOIN nidhi_members m ON m.id=d.member_id
      WHERE d.id=${req.params.id} AND d.tenant_id=${tid(req)}`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/deposits/:id/transactions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM nidhi_deposit_transactions WHERE deposit_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY transaction_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/deposits", requireAuth, async (req: any, res) => {
  try {
    const { member_id, deposit_type, principal_amount, interest_rate, tenure_months, interest_payout, opening_date, nominee_name, auto_renew, notes } = req.body;
    // Auto-generate account number
    const cnt = await db.execute(sql`SELECT COUNT(*) as c FROM nidhi_deposits WHERE tenant_id=${tid(req)}`);
    const num = String(Number((cnt.rows[0] as any).c || 0) + 1).padStart(6, '0');
    const prefix = deposit_type === 'savings' ? 'SAV' : deposit_type === 'fd' ? 'FD' : deposit_type === 'rd' ? 'RD' : 'DEP';
    const account_number = `${prefix}-${num}`;
    const p = Number(principal_amount || 0);
    const r = Number(interest_rate || 0);
    const t = Number(tenure_months || 0);
    const od = opening_date || new Date().toISOString().slice(0, 10);
    // Maturity date
    const matDate = new Date(od);
    matDate.setMonth(matDate.getMonth() + t);
    const maturity_date = t > 0 ? matDate.toISOString().slice(0, 10) : null;
    // Maturity amount (compound quarterly for FD)
    const maturity_amount = deposit_type === 'fd' && t > 0 ? calcMaturityAmount(p, r, t) : null;
    const rows = await db.execute(sql`
      INSERT INTO nidhi_deposits (tenant_id, account_number, member_id, deposit_type, principal_amount, interest_rate,
        tenure_months, maturity_date, maturity_amount, interest_payout, opening_date, nominee_name, auto_renew, notes)
      VALUES (${tid(req)}, ${account_number}, ${member_id}, ${deposit_type}, ${p}, ${r}, ${t||null},
        ${maturity_date}, ${maturity_amount}, ${interest_payout||'on_maturity'}, ${od}, ${nominee_name||null},
        ${auto_renew?1:0}, ${notes||null})
      RETURNING *`);
    // Record opening transaction
    await db.execute(sql`
      INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, transaction_date, narration)
      VALUES (${tid(req)}, ${rows.rows[0].id}, ${member_id}, 'credit', ${p}, ${p}, ${od}, 'Account Opening')`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Deposit transaction (credit/withdrawal/closure)
router.post("/deposits/:id/transaction", requireAuth, async (req: any, res) => {
  try {
    const { transaction_type, amount, interest_amount, payment_mode, reference_number, narration } = req.body;
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const d = dep.rows[0] as any;
    if (!d) return res.status(404).json({ error: "Deposit not found" });
    const amt = Number(amount || 0);
    // For savings: track running balance; for FD/RD: fixed
    const newBalance = Number(d.principal_amount) + (transaction_type === 'credit' ? amt : -amt);
    await db.execute(sql`
      INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, interest_amount, balance_after, transaction_date, payment_mode, reference_number, narration)
      VALUES (${tid(req)}, ${req.params.id}, ${d.member_id}, ${transaction_type}, ${amt}, ${interest_amount||0}, ${newBalance}, CURRENT_DATE, ${payment_mode||'cash'}, ${reference_number||null}, ${narration||null})`);
    // Update status on closure
    if (transaction_type === 'closure' || transaction_type === 'premature_closure') {
      await db.execute(sql`UPDATE nidhi_deposits SET status=${transaction_type === 'closure' ? 'closed' : 'premature_closed'}, updated_at=NOW() WHERE id=${req.params.id}`);
    }
    res.json({ success: true, balance_after: newBalance });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Maturity deposits due
router.get("/deposits/due/maturity", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT d.*, m.name as member_name, m.phone as member_phone
      FROM nidhi_deposits d LEFT JOIN nidhi_members m ON m.id=d.member_id
      WHERE d.tenant_id=${tid(req)} AND d.status='active' AND d.maturity_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY d.maturity_date ASC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Interest Rates ────────────────────────────────────────────────────────────
router.get("/interest-rates", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM nidhi_interest_rates WHERE tenant_id=${tid(req)} ORDER BY deposit_type, min_tenure_months`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/interest-rates", requireAuth, async (req: any, res) => {
  try {
    const { deposit_type, min_tenure_months, max_tenure_months, interest_rate, effective_from } = req.body;
    const rows = await db.execute(sql`
      INSERT INTO nidhi_interest_rates (tenant_id, deposit_type, min_tenure_months, max_tenure_months, interest_rate, effective_from)
      VALUES (${tid(req)}, ${deposit_type}, ${min_tenure_months||0}, ${max_tenure_months||null}, ${interest_rate}, ${effective_from||null})
      RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put("/interest-rates/:id", requireAuth, async (req: any, res) => {
  try {
    const { deposit_type, min_tenure_months, max_tenure_months, interest_rate, effective_from, is_active } = req.body;
    const rows = await db.execute(sql`
      UPDATE nidhi_interest_rates SET deposit_type=${deposit_type}, min_tenure_months=${min_tenure_months||0},
        max_tenure_months=${max_tenure_months||null}, interest_rate=${interest_rate}, effective_from=${effective_from||null},
        is_active=${is_active??1}
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/interest-rates/:id", requireAuth, async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM nidhi_interest_rates WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Loans ─────────────────────────────────────────────────────────────────────
router.get("/loans", requireAuth, async (req: any, res) => {
  try {
    const { loan_type, status, member_id } = req.query as any;
    let q = `SELECT l.*, m.name as member_name, m.phone as member_phone, m.member_number
             FROM nidhi_loans l LEFT JOIN nidhi_members m ON m.id=l.member_id
             WHERE l.tenant_id=${tid(req)} AND l.record_status=1`;
    if (loan_type) q += ` AND l.loan_type='${loan_type}'`;
    if (status) q += ` AND l.status='${status}'`;
    if (member_id) q += ` AND l.member_id='${member_id}'`;
    q += ` ORDER BY l.created_at DESC`;
    const rows = await db.execute(sql.raw(q));
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loans/:id", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT l.*, m.name as member_name, m.phone as member_phone, m.member_number
      FROM nidhi_loans l LEFT JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.id=${req.params.id} AND l.tenant_id=${tid(req)}`);
    res.json(rows.rows[0] || null);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/loans/:id/transactions", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM nidhi_loan_transactions WHERE loan_id=${req.params.id} AND tenant_id=${tid(req)} ORDER BY payment_date DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// EMI schedule generation
router.get("/loans/:id/emi-schedule", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const loan = rows.rows[0] as any;
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    const p = Number(loan.principal_amount);
    const r = Number(loan.interest_rate) / 12 / 100;
    const n = Number(loan.tenure_months);
    const emi = Number(loan.emi_amount);
    let balance = p;
    const schedule = [];
    const startDate = new Date(loan.first_emi_date || loan.disbursement_date);
    for (let i = 1; i <= n; i++) {
      const interest = Math.round(balance * r * 100) / 100;
      const principal = Math.min(Math.round((emi - interest) * 100) / 100, balance);
      balance = Math.round((balance - principal) * 100) / 100;
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + (i - 1));
      schedule.push({ emi_number: i, due_date: dueDate.toISOString().slice(0, 10), principal, interest, emi_amount: emi, balance_after: balance < 0 ? 0 : balance });
    }
    res.json(schedule);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/loans", requireAuth, async (req: any, res) => {
  try {
    const { member_id, loan_type, principal_amount, interest_rate, tenure_months, disbursement_date,
            first_emi_date, security_type, security_description, security_value, notes, approved_by } = req.body;
    const cnt = await db.execute(sql`SELECT COUNT(*) as c FROM nidhi_loans WHERE tenant_id=${tid(req)}`);
    const num = String(Number((cnt.rows[0] as any).c || 0) + 1).padStart(6, '0');
    const prefix = loan_type === 'gold_loan' ? 'GL' : loan_type === 'fd_loan' ? 'FDL' : 'LN';
    const loan_number = `${prefix}-${num}`;
    const p = Number(principal_amount);
    const r = Number(interest_rate);
    const t = Number(tenure_months);
    const emi_amount = calcEMI(p, r, t);
    const dd = disbursement_date || new Date().toISOString().slice(0, 10);
    const matDate = new Date(dd);
    matDate.setMonth(matDate.getMonth() + t);
    const rows = await db.execute(sql`
      INSERT INTO nidhi_loans (tenant_id, loan_number, member_id, loan_type, principal_amount, interest_rate, tenure_months,
        emi_amount, disbursement_date, first_emi_date, maturity_date, security_type, security_description, security_value,
        outstanding_principal, total_emis, emis_pending, notes, approved_by)
      VALUES (${tid(req)}, ${loan_number}, ${member_id}, ${loan_type}, ${p}, ${r}, ${t}, ${emi_amount}, ${dd},
        ${first_emi_date||null}, ${matDate.toISOString().slice(0,10)}, ${security_type||null}, ${security_description||null},
        ${security_value||null}, ${p}, ${t}, ${t}, ${notes||null}, ${approved_by||null})
      RETURNING *`);
    // Record disbursement transaction
    await db.execute(sql`
      INSERT INTO nidhi_loan_transactions (tenant_id, loan_id, member_id, transaction_type, total_amount, principal_component, payment_date, outstanding_after, narration)
      VALUES (${tid(req)}, ${rows.rows[0].id}, ${member_id}, 'disbursement', ${p}, ${p}, ${dd}, ${p}, 'Loan Disbursement')`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Collect EMI
router.post("/loans/:id/collect-emi", requireAuth, async (req: any, res) => {
  try {
    const { emi_number, principal_component, interest_component, penalty_amount, payment_mode, reference_number, narration } = req.body;
    const loanRows = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    const loan = loanRows.rows[0] as any;
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    const pc = Number(principal_component || 0);
    const ic = Number(interest_component || 0);
    const pen = Number(penalty_amount || 0);
    const total = pc + ic + pen;
    const outstanding = Math.max(0, Number(loan.outstanding_principal) - pc);
    await db.execute(sql`
      INSERT INTO nidhi_loan_transactions (tenant_id, loan_id, member_id, transaction_type, emi_number, principal_component, interest_component, penalty_amount, total_amount, payment_mode, reference_number, outstanding_after, narration)
      VALUES (${tid(req)}, ${req.params.id}, ${loan.member_id}, 'emi', ${emi_number||null}, ${pc}, ${ic}, ${pen}, ${total}, ${payment_mode||'cash'}, ${reference_number||null}, ${outstanding}, ${narration||'EMI Collection'})`);
    const newEmis = Number(loan.emis_paid) + 1;
    const newStatus = outstanding <= 0 ? 'closed' : loan.status;
    await db.execute(sql`
      UPDATE nidhi_loans SET outstanding_principal=${outstanding}, emis_paid=${newEmis},
        emis_pending=total_emis-${newEmis}, status=${newStatus}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)}`);
    res.json({ success: true, outstanding_after: outstanding, new_status: newStatus });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Mark NPA
router.put("/loans/:id/mark-npa", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      UPDATE nidhi_loans SET status='npa', npa_date=CURRENT_DATE, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid(req)} RETURNING *`);
    res.json(rows.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Overdue loans
router.get("/loans/due/overdue", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT l.*, m.name as member_name, m.phone as member_phone,
        COALESCE((SELECT MAX(lt.payment_date) FROM nidhi_loan_transactions lt WHERE lt.loan_id=l.id AND lt.transaction_type='emi'), l.disbursement_date) as last_emi_date
      FROM nidhi_loans l LEFT JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.tenant_id=${tid(req)} AND l.status='active' AND l.record_status=1
        AND l.emis_pending > 0
        AND COALESCE((SELECT MAX(lt.payment_date) FROM nidhi_loan_transactions lt WHERE lt.loan_id=l.id AND lt.transaction_type='emi'), l.first_emi_date) < CURRENT_DATE - INTERVAL '30 days'
      ORDER BY l.outstanding_principal DESC`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard Stats ───────────────────────────────────────────────────────────
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const [members, deposits, loans, npa, shareCapital] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE kyc_status='pending') as kyc_pending FROM nidhi_members WHERE tenant_id=${tid(req)} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as total_accounts, COALESCE(SUM(principal_amount),0) as total_deposits, COUNT(*) FILTER (WHERE deposit_type='fd') as fd_count, COALESCE(SUM(principal_amount) FILTER (WHERE deposit_type='fd'),0) as fd_amount, COUNT(*) FILTER (WHERE maturity_date<=CURRENT_DATE AND status='active') as matured_today FROM nidhi_deposits WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as total_loans, COALESCE(SUM(outstanding_principal),0) as total_outstanding, COALESCE(SUM(emi_amount),0) as total_emi_per_month FROM nidhi_loans WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as npa_count, COALESCE(SUM(outstanding_principal),0) as npa_amount FROM nidhi_loans WHERE tenant_id=${tid(req)} AND status='npa' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(total_share_amount),0) as total_share_capital FROM nidhi_members WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
    ]);
    const m = members.rows[0] as any;
    const d = deposits.rows[0] as any;
    const l = loans.rows[0] as any;
    const n = npa.rows[0] as any;
    const s = shareCapital.rows[0] as any;
    const totalDeposits = Number(d.total_deposits || 0);
    const netOwnedFunds = Number(s.total_share_capital || 0);
    const ratio = netOwnedFunds > 0 ? (totalDeposits / netOwnedFunds) : 0;
    const isCompliant = ratio <= 20; // Nidhi rule: deposits ≤ 20x NOF
    res.json({
      totalMembers: Number(m.total || 0),
      activeMembers: Number(m.active || 0),
      kycPending: Number(m.kyc_pending || 0),
      totalDepositAccounts: Number(d.total_accounts || 0),
      totalDeposits,
      fdCount: Number(d.fd_count || 0),
      fdAmount: Number(d.fd_amount || 0),
      maturedToday: Number(d.matured_today || 0),
      totalLoans: Number(l.total_loans || 0),
      totalOutstanding: Number(l.total_outstanding || 0),
      totalEmiPerMonth: Number(l.total_emi_per_month || 0),
      npaCount: Number(n.npa_count || 0),
      npaAmount: Number(n.npa_amount || 0),
      netOwnedFunds,
      depositToNofRatio: Math.round(ratio * 100) / 100,
      isCompliant,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Compliance Reports ────────────────────────────────────────────────────────
router.get("/compliance", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM nidhi_compliance_reports WHERE tenant_id=${tid(req)} ORDER BY generated_at DESC LIMIT 20`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/compliance/generate", requireAuth, async (req: any, res) => {
  try {
    const { report_type, period_from, period_to, financial_year } = req.body;
    const [members, deposits, loans, shareCapital] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as c FROM nidhi_members WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(principal_amount),0) as total FROM nidhi_deposits WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(outstanding_principal),0) as total FROM nidhi_loans WHERE tenant_id=${tid(req)} AND status IN ('active','npa') AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(total_share_amount),0) as total FROM nidhi_members WHERE tenant_id=${tid(req)} AND status='active' AND record_status=1`),
    ]);
    const totalMembers = Number((members.rows[0] as any).c || 0);
    const totalDeposits = Number((deposits.rows[0] as any).total || 0);
    const totalLoans = Number((loans.rows[0] as any).total || 0);
    const nof = Number((shareCapital.rows[0] as any).total || 0);
    const unencumbered = totalDeposits * 0.10; // 10% liquid assets requirement
    const ratio = nof > 0 ? totalDeposits / nof : 0;
    const isCompliant = ratio <= 20 && totalLoans <= totalDeposits * 0.80;
    const report = await db.execute(sql`
      INSERT INTO nidhi_compliance_reports (tenant_id, report_type, period_from, period_to, financial_year, total_members,
        net_owned_funds, total_deposits, total_loans, unencumbered_deposits, deposit_to_nof_ratio, is_compliant, generated_by)
      VALUES (${tid(req)}, ${report_type}, ${period_from||null}, ${period_to||null}, ${financial_year||null}, ${totalMembers},
        ${nof}, ${totalDeposits}, ${totalLoans}, ${unencumbered}, ${Math.round(ratio*100)/100}, ${isCompliant?1:0}, 'system')
      RETURNING *`);
    res.json({ ...report.rows[0], computed: { totalMembers, totalDeposits, totalLoans, nof, ratio, isCompliant } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Transactions ledger ───────────────────────────────────────────────────────
router.get("/transactions", requireAuth, async (req: any, res) => {
  try {
    const { from_date, to_date } = req.query as any;
    const fd = from_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const td = to_date || new Date().toISOString().slice(0,10);
    const deposits = await db.execute(sql`
      SELECT dt.*, d.account_number, d.deposit_type, m.name as member_name, 'deposit' as ledger_type
      FROM nidhi_deposit_transactions dt
      JOIN nidhi_deposits d ON d.id=dt.deposit_id
      LEFT JOIN nidhi_members m ON m.id=dt.member_id
      WHERE dt.tenant_id=${tid(req)} AND dt.transaction_date BETWEEN ${fd} AND ${td} AND dt.record_status=1`);
    const loans = await db.execute(sql`
      SELECT lt.*, l.loan_number, l.loan_type, m.name as member_name, 'loan' as ledger_type
      FROM nidhi_loan_transactions lt
      JOIN nidhi_loans l ON l.id=lt.loan_id
      LEFT JOIN nidhi_members m ON m.id=lt.member_id
      WHERE lt.tenant_id=${tid(req)} AND lt.payment_date BETWEEN ${fd} AND ${td} AND lt.record_status=1`);
    const all = [...deposits.rows, ...loans.rows].sort((a: any, b: any) => {
      const da = a.transaction_date || a.payment_date;
      const db2 = b.transaction_date || b.payment_date;
      return new Date(db2).getTime() - new Date(da).getTime();
    });
    res.json(all);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
