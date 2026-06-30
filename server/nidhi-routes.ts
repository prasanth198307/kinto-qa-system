import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function getTenantId(req: any): number {
  return req.session?.tenantId ?? req.user?.tenantId;
}

function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Interest Rates ───────────────────────────────────────────────────────────

router.get("/interest-rates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM nidhi_interest_rates WHERE tenant_id=${tid} AND is_active=1 ORDER BY rate_type, deposit_type, loan_type`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/interest-rates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { rate_type, deposit_type, loan_type, min_tenure_months, max_tenure_months, interest_rate, senior_citizen_rate, effective_from, effective_to } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nidhi_interest_rates (tenant_id, rate_type, deposit_type, loan_type, min_tenure_months, max_tenure_months, interest_rate, senior_citizen_rate, effective_from, effective_to, is_active)
      VALUES (${tid}, ${rate_type}, ${deposit_type||null}, ${loan_type||null}, ${min_tenure_months||null}, ${max_tenure_months||null}, ${interest_rate}, ${senior_citizen_rate||null}, ${effective_from||null}, ${effective_to||null}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/interest-rates/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { interest_rate, senior_citizen_rate, effective_from, effective_to, is_active } = req.body;
    await db.execute(sql`
      UPDATE nidhi_interest_rates SET interest_rate=${interest_rate}, senior_citizen_rate=${senior_citizen_rate||null},
      effective_from=${effective_from||null}, effective_to=${effective_to||null}, is_active=${is_active??1}
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Members ──────────────────────────────────────────────────────────────────

router.get("/members", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { search, status, kyc_status } = req.query;
    let q = `SELECT * FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1`;
    if (search) q += ` AND (name ILIKE '%${String(search).replace(/'/g,"''")}%' OR member_number ILIKE '%${String(search).replace(/'/g,"''")}%' OR phone ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    if (status) q += ` AND status='${String(status).replace(/'/g,"''")}'`;
    if (kyc_status) q += ` AND kyc_status='${String(kyc_status).replace(/'/g,"''")}'`;
    q += ` ORDER BY created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/members/stats", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE record_status=1) as total_members,
        COUNT(*) FILTER (WHERE status='active' AND record_status=1) as active_members,
        COUNT(*) FILTER (WHERE kyc_status='pending' AND record_status=1) as kyc_pending,
        SUM(total_share_amount) FILTER (WHERE record_status=1) as total_share_capital,
        COUNT(*) FILTER (WHERE is_senior_citizen=1 AND record_status=1) as senior_citizens
      FROM nidhi_members WHERE tenant_id=${tid}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/members/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const [member, loans, deposits, collections] = await Promise.all([
      db.execute(sql`SELECT * FROM nidhi_members WHERE id=${req.params.id} AND tenant_id=${tid}`),
      db.execute(sql`SELECT * FROM nidhi_loans WHERE member_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY created_at DESC`),
      db.execute(sql`SELECT * FROM nidhi_deposits WHERE member_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY created_at DESC`),
      db.execute(sql`SELECT * FROM nidhi_daily_collection WHERE member_id=${req.params.id} AND tenant_id=${tid} AND record_status=1 ORDER BY collection_date DESC LIMIT 20`)
    ]);
    if (!member.rows[0]) return res.status(404).json({ message: "Member not found" });
    res.json({ ...member.rows[0], loans: loans.rows, deposits: deposits.rows, recent_collections: collections.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/members", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = genId();
    const {
      member_number, name, father_name, date_of_birth, gender, phone, alternate_phone, email,
      address, city, state, pincode, aadhar_number, pan_number, nominee_name, nominee_relation,
      nominee_dob, membership_date, shares_held, share_value, introduced_by
    } = req.body;
    const total_share_amount = (Number(shares_held)||0) * (Number(share_value)||0);
    const r = await db.execute(sql`
      INSERT INTO nidhi_members (id, tenant_id, member_number, name, father_name, date_of_birth, gender, phone, alternate_phone, email,
        address, city, state, pincode, aadhar_number, pan_number, nominee_name, nominee_relation, nominee_dob,
        membership_date, shares_held, share_value, total_share_amount, is_senior_citizen, status, kyc_status, introduced_by, record_status)
      VALUES (${id}, ${tid}, ${member_number}, ${name}, ${father_name||null}, ${date_of_birth||null}, ${gender||null},
        ${phone}, ${alternate_phone||null}, ${email||null}, ${address||null}, ${city||null}, ${state||null}, ${pincode||null},
        ${aadhar_number||null}, ${pan_number||null}, ${nominee_name||null}, ${nominee_relation||null}, ${nominee_dob||null},
        ${membership_date||new Date().toISOString().slice(0,10)}, ${shares_held||0}, ${share_value||0}, ${total_share_amount}, 0,
        'active', 'pending', ${introduced_by||null}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/members/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const {
      name, father_name, phone, alternate_phone, email, address, city, state, pincode,
      aadhar_number, pan_number, nominee_name, nominee_relation, nominee_dob,
      shares_held, share_value, status, kyc_status, introduced_by, is_senior_citizen
    } = req.body;
    const total_share_amount = (Number(shares_held)||0) * (Number(share_value)||0);
    await db.execute(sql`
      UPDATE nidhi_members SET name=${name}, father_name=${father_name||null}, phone=${phone},
      alternate_phone=${alternate_phone||null}, email=${email||null}, address=${address||null},
      city=${city||null}, state=${state||null}, pincode=${pincode||null},
      aadhar_number=${aadhar_number||null}, pan_number=${pan_number||null},
      nominee_name=${nominee_name||null}, nominee_relation=${nominee_relation||null}, nominee_dob=${nominee_dob||null},
      shares_held=${shares_held||0}, share_value=${share_value||0}, total_share_amount=${total_share_amount},
      status=${status||'active'}, kyc_status=${kyc_status||'pending'},
      introduced_by=${introduced_by||null}, is_senior_citizen=${is_senior_citizen?1:0}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/members/:id/kyc", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { kyc_status } = req.body;
    await db.execute(sql`UPDATE nidhi_members SET kyc_status=${kyc_status}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Shares ────────────────────────────────────────────────────────────────────

router.get("/shares", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT m.id, m.member_number, m.name, m.phone, m.shares_held, m.share_value, m.total_share_amount, m.membership_date
      FROM nidhi_members m
      WHERE m.tenant_id=${tid} AND m.record_status=1 AND m.shares_held > 0
      ORDER BY m.total_share_amount DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/shares/issue", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { member_id, shares_to_add, share_value } = req.body;
    const r = await db.execute(sql`
      UPDATE nidhi_members
      SET shares_held = shares_held + ${shares_to_add},
          share_value = ${share_value},
          total_share_amount = (shares_held + ${shares_to_add}) * ${share_value},
          updated_at = NOW()
      WHERE id=${member_id} AND tenant_id=${tid}
      RETURNING *`);
    // log share transaction
    await db.execute(sql`
      INSERT INTO nidhi_share_transactions (id, tenant_id, member_id, transaction_type, shares_count, share_value, total_amount, transaction_date)
      VALUES (${genId()}, ${tid}, ${member_id}, 'issue', ${shares_to_add}, ${share_value}, ${Number(shares_to_add)*Number(share_value)}, NOW())`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Deposits (FD / RD / Savings) ─────────────────────────────────────────────

router.get("/deposits", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { deposit_type, status, member_id } = req.query;
    let q = `SELECT d.*, m.name as member_name, m.member_number, m.phone
             FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id
             WHERE d.tenant_id=${tid} AND d.record_status=1`;
    if (deposit_type) q += ` AND d.deposit_type='${String(deposit_type).replace(/'/g,"''")}'`;
    if (status) q += ` AND d.status='${String(status).replace(/'/g,"''")}'`;
    if (member_id) q += ` AND d.member_id='${String(member_id).replace(/'/g,"''")}'`;
    q += ` ORDER BY d.created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deposits/maturing-soon", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const days = Number(req.query.days) || 30;
    const r = await db.execute(sql`
      SELECT d.*, m.name as member_name, m.member_number, m.phone
      FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id
      WHERE d.tenant_id=${tid} AND d.record_status=1 AND d.status='active'
        AND d.maturity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${days}
      ORDER BY d.maturity_date ASC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deposits/stats", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        deposit_type,
        COUNT(*) as count,
        SUM(principal_amount) as total_principal,
        SUM(maturity_amount) as total_maturity,
        SUM(accrued_interest) as total_accrued_interest
      FROM nidhi_deposits
      WHERE tenant_id=${tid} AND record_status=1 AND status='active'
      GROUP BY deposit_type`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = genId();
    const {
      account_number, member_id, deposit_type, principal_amount, interest_rate,
      tenure_months, maturity_date, maturity_amount, interest_payout, monthly_installment,
      opening_date, nominee_name, auto_renew, notes
    } = req.body;
    const member = await db.execute(sql`SELECT is_senior_citizen FROM nidhi_members WHERE id=${member_id} AND tenant_id=${tid}`);
    const is_senior = member.rows[0]?.is_senior_citizen || 0;
    const r = await db.execute(sql`
      INSERT INTO nidhi_deposits (id, tenant_id, account_number, member_id, deposit_type, principal_amount, interest_rate,
        tenure_months, maturity_date, maturity_amount, interest_payout, monthly_installment, opening_date,
        current_balance, accrued_interest, status, nominee_name, auto_renew, is_senior_citizen_rate, notes, record_status)
      VALUES (${id}, ${tid}, ${account_number}, ${member_id}, ${deposit_type}, ${principal_amount}, ${interest_rate},
        ${tenure_months||null}, ${maturity_date||null}, ${maturity_amount||null}, ${interest_payout||'on_maturity'},
        ${monthly_installment||0}, ${opening_date||new Date().toISOString().slice(0,10)},
        ${principal_amount}, 0, 'active', ${nominee_name||null}, ${auto_renew?1:0}, ${is_senior}, ${notes||null}, 1)
      RETURNING *`);
    // Log deposit transaction
    await db.execute(sql`
      INSERT INTO nidhi_deposit_transactions (id, tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, transaction_date, narration, record_status)
      VALUES (${genId()}, ${tid}, ${id}, ${member_id}, 'opening', ${principal_amount}, ${principal_amount}, ${opening_date||new Date().toISOString().slice(0,10)}, 'Deposit opened', 1)`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/collect-installment", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { amount, payment_mode, reference_number, collection_date } = req.body;
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!dep.rows[0]) return res.status(404).json({ message: "Deposit not found" });
    const d = dep.rows[0] as any;
    const newBalance = Number(d.current_balance) + Number(amount);
    await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBalance}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    const txId = genId();
    await db.execute(sql`
      INSERT INTO nidhi_deposit_transactions (id, tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, transaction_date, payment_mode, reference_number, narration, record_status)
      VALUES (${txId}, ${tid}, ${req.params.id}, ${d.member_id}, 'installment', ${amount}, ${newBalance}, ${collection_date||new Date().toISOString().slice(0,10)}, ${payment_mode||'cash'}, ${reference_number||null}, 'RD installment', 1)`);
    res.json({ success: true, new_balance: newBalance });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/close", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { closure_type, payment_mode, reference_number, premature_penalty_rate } = req.body;
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!dep.rows[0]) return res.status(404).json({ message: "Deposit not found" });
    const closeDate = new Date().toISOString().slice(0,10);
    const isPremature = closure_type === 'premature';
    await db.execute(sql`
      UPDATE nidhi_deposits SET status=${isPremature?'premature_closed':'closed'},
      premature_closure_date=${isPremature?closeDate:null},
      premature_penalty_rate=${isPremature?(premature_penalty_rate||1):null},
      updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`
      INSERT INTO nidhi_deposit_transactions (id, tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, transaction_date, payment_mode, reference_number, narration, record_status)
      SELECT ${genId()}, tenant_id, id, member_id, ${isPremature?'premature_closure':'maturity_payment'}, current_balance, 0, ${closeDate}, ${payment_mode||'cash'}, ${reference_number||null}, ${isPremature?'Premature closure':'Maturity payment'}, 1
      FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Loans ─────────────────────────────────────────────────────────────────────

router.get("/loans", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { loan_type, status, search } = req.query;
    let q = `SELECT l.*, m.name as member_name, m.member_number, m.phone
             FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
             WHERE l.tenant_id=${tid} AND l.record_status=1`;
    if (loan_type) q += ` AND l.loan_type='${String(loan_type).replace(/'/g,"''")}'`;
    if (status) q += ` AND l.status='${String(status).replace(/'/g,"''")}'`;
    if (search) q += ` AND (m.name ILIKE '%${String(search).replace(/'/g,"''")}%' OR l.loan_number ILIKE '%${String(search).replace(/'/g,"''")}%')`;
    q += ` ORDER BY l.created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/npa", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT l.*, m.name as member_name, m.member_number, m.phone
      FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.tenant_id=${tid} AND l.record_status=1 AND (l.status='npa' OR l.overdue_days > 90)
      ORDER BY l.overdue_days DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/overdues", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT l.*, m.name as member_name, m.member_number, m.phone,
        CURRENT_DATE - l.next_emi_date as days_overdue
      FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.tenant_id=${tid} AND l.record_status=1 AND l.status='active'
        AND l.next_emi_date < CURRENT_DATE
      ORDER BY days_overdue DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/stats", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status='active') as active_loans,
        COUNT(*) FILTER (WHERE status='npa') as npa_loans,
        COUNT(*) FILTER (WHERE status='closed') as closed_loans,
        SUM(outstanding_principal) FILTER (WHERE status='active') as total_outstanding,
        SUM(outstanding_interest) FILTER (WHERE status='active') as total_outstanding_interest,
        SUM(penalty_accumulated) FILTER (WHERE status='active') as total_penalty
      FROM nidhi_loans WHERE tenant_id=${tid} AND record_status=1`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/:id", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const [loan, transactions] = await Promise.all([
      db.execute(sql`
        SELECT l.*, m.name as member_name, m.member_number, m.phone, m.address
        FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
        WHERE l.id=${req.params.id} AND l.tenant_id=${tid}`),
      db.execute(sql`
        SELECT * FROM nidhi_loan_transactions
        WHERE loan_id=${req.params.id} AND tenant_id=${tid} AND record_status=1
        ORDER BY created_at DESC`)
    ]);
    if (!loan.rows[0]) return res.status(404).json({ message: "Loan not found" });
    res.json({ ...loan.rows[0], transactions: transactions.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const id = genId();
    const {
      loan_number, member_id, loan_type, principal_amount, interest_rate, tenure_months,
      emi_amount, disbursement_date, first_emi_date, maturity_date, security_type,
      security_description, security_value, gold_weight_grams, gold_purity, gold_rate_per_gram,
      linked_fd_id, approved_by, notes
    } = req.body;
    const total_emis = Number(tenure_months) || 0;
    const r = await db.execute(sql`
      INSERT INTO nidhi_loans (id, tenant_id, loan_number, member_id, loan_type, principal_amount, interest_rate,
        tenure_months, emi_amount, disbursement_date, first_emi_date, maturity_date, security_type,
        security_description, security_value, gold_weight_grams, gold_purity, gold_rate_per_gram,
        linked_fd_id, outstanding_principal, outstanding_interest, total_emis, emis_paid, emis_pending,
        next_emi_date, overdue_days, penalty_accumulated, status, approved_by, notes, record_status)
      VALUES (${id}, ${tid}, ${loan_number}, ${member_id}, ${loan_type}, ${principal_amount}, ${interest_rate},
        ${tenure_months}, ${emi_amount||0}, ${disbursement_date||null}, ${first_emi_date||null}, ${maturity_date||null},
        ${security_type||null}, ${security_description||null}, ${security_value||null},
        ${gold_weight_grams||null}, ${gold_purity||null}, ${gold_rate_per_gram||null},
        ${linked_fd_id||null}, ${principal_amount}, 0, ${total_emis}, 0, ${total_emis},
        ${first_emi_date||null}, 0, 0, 'active', ${approved_by||null}, ${notes||null}, 1)
      RETURNING *`);
    // Disbursement transaction
    await db.execute(sql`
      INSERT INTO nidhi_loan_transactions (id, tenant_id, loan_id, member_id, transaction_type, emi_number, principal_component, interest_component, penalty_amount, total_amount, payment_date, narration, outstanding_after, record_status)
      VALUES (${genId()}, ${tid}, ${id}, ${member_id}, 'disbursement', 0, ${principal_amount}, 0, 0, ${principal_amount}, ${disbursement_date||new Date().toISOString().slice(0,10)}, 'Loan disbursed', ${principal_amount}, 1)`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans/:id/collect-emi", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { emi_number, principal_component, interest_component, penalty_amount, payment_mode, reference_number, payment_date, collected_by } = req.body;
    const loan = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${tid}`);
    if (!loan.rows[0]) return res.status(404).json({ message: "Loan not found" });
    const l = loan.rows[0] as any;
    const total = Number(principal_component) + Number(interest_component) + Number(penalty_amount||0);
    const newOutstanding = Number(l.outstanding_principal) - Number(principal_component);
    const emisPaid = Number(l.emis_paid) + 1;
    const emisPending = Number(l.total_emis) - emisPaid;
    const nextEmi = l.first_emi_date ? (() => {
      const d = new Date(l.first_emi_date);
      d.setMonth(d.getMonth() + emisPaid);
      return d.toISOString().slice(0,10);
    })() : null;
    const newStatus = newOutstanding <= 0 ? 'closed' : 'active';
    await db.execute(sql`
      UPDATE nidhi_loans SET outstanding_principal=${Math.max(0,newOutstanding)},
      outstanding_interest=${Math.max(0,Number(l.outstanding_interest)-Number(interest_component))},
      emis_paid=${emisPaid}, emis_pending=${emisPending}, next_emi_date=${nextEmi},
      last_emi_date=${payment_date||new Date().toISOString().slice(0,10)},
      overdue_days=0, penalty_accumulated=0, status=${newStatus}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    await db.execute(sql`
      INSERT INTO nidhi_loan_transactions (id, tenant_id, loan_id, member_id, transaction_type, emi_number, principal_component, interest_component, penalty_amount, total_amount, payment_date, payment_mode, reference_number, outstanding_after, collected_by, narration, record_status)
      VALUES (${genId()}, ${tid}, ${req.params.id}, ${l.member_id}, 'emi_payment', ${emi_number}, ${principal_component}, ${interest_component}, ${penalty_amount||0}, ${total}, ${payment_date||new Date().toISOString().slice(0,10)}, ${payment_mode||'cash'}, ${reference_number||null}, ${Math.max(0,newOutstanding)}, ${collected_by||null}, 'EMI collected', 1)`);
    res.json({ success: true, outstanding_after: Math.max(0, newOutstanding), status: newStatus });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/loans/:id/mark-npa", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { npa_reason } = req.body;
    await db.execute(sql`
      UPDATE nidhi_loans SET status='npa', npa_date=CURRENT_DATE, npa_reason=${npa_reason||null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${tid}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Daily Collection (Pigmy / Field Agent) ────────────────────────────────────

router.get("/daily-collection", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { date, agent_name } = req.query;
    let q = `SELECT dc.*, m.name as member_name, m.member_number
             FROM nidhi_daily_collection dc JOIN nidhi_members m ON m.id=dc.member_id
             WHERE dc.tenant_id=${tid} AND dc.record_status=1`;
    if (date) q += ` AND dc.collection_date='${String(date).replace(/'/g,"''")}'`;
    if (agent_name) q += ` AND dc.agent_name='${String(agent_name).replace(/'/g,"''")}'`;
    q += ` ORDER BY dc.created_at DESC`;
    const r = await db.execute(sql.raw(q));
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/daily-collection/summary", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { date } = req.query;
    const targetDate = String(date || new Date().toISOString().slice(0,10));
    const r = await db.execute(sql`
      SELECT agent_name, collection_type,
        COUNT(*) as count, SUM(amount) as total_amount
      FROM nidhi_daily_collection
      WHERE tenant_id=${tid} AND record_status=1 AND collection_date=${targetDate}
      GROUP BY agent_name, collection_type
      ORDER BY agent_name`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/daily-collection", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { collection_date, agent_name, member_id, deposit_id, loan_id, collection_type, amount, payment_mode, notes } = req.body;
    const receipt_number = `RCP${Date.now()}`;
    const r = await db.execute(sql`
      INSERT INTO nidhi_daily_collection (id, tenant_id, collection_date, agent_name, member_id, deposit_id, loan_id, collection_type, amount, payment_mode, receipt_number, notes, record_status)
      VALUES (${genId()}, ${tid}, ${collection_date||new Date().toISOString().slice(0,10)}, ${agent_name||null}, ${member_id}, ${deposit_id||null}, ${loan_id||null}, ${collection_type}, ${amount}, ${payment_mode||'cash'}, ${receipt_number}, ${notes||null}, 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Gold Rates ────────────────────────────────────────────────────────────────

router.get("/gold-rates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM nidhi_gold_rates WHERE tenant_id=${tid} ORDER BY rate_date DESC LIMIT 30`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/gold-rates", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { rate_date, rate_22k, rate_24k, rate_18k } = req.body;
    const r = await db.execute(sql`
      INSERT INTO nidhi_gold_rates (tenant_id, rate_date, rate_22k, rate_24k, rate_18k)
      VALUES (${tid}, ${rate_date||new Date().toISOString().slice(0,10)}, ${rate_22k||null}, ${rate_24k||null}, ${rate_18k||null})
      ON CONFLICT DO NOTHING
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Compliance — NDH Reports & NOF Ratio ─────────────────────────────────────

router.get("/compliance", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const r = await db.execute(sql`SELECT * FROM nidhi_compliance_reports WHERE tenant_id=${tid} AND record_status=1 ORDER BY generated_at DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/compliance/nof-ratio", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    // NOF = Share Capital + Reserves - Accumulated Losses (simplified: total share capital as proxy)
    const [shares, deposits, loans] = await Promise.all([
      db.execute(sql`SELECT SUM(total_share_amount) as share_capital FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT SUM(current_balance) as total_deposits FROM nidhi_deposits WHERE tenant_id=${tid} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT SUM(outstanding_principal) as total_loans FROM nidhi_loans WHERE tenant_id=${tid} AND record_status=1 AND status='active'`)
    ]);
    const nof = Number((shares.rows[0] as any)?.share_capital || 0);
    const totalDeposits = Number((deposits.rows[0] as any)?.total_deposits || 0);
    const totalLoans = Number((loans.rows[0] as any)?.total_loans || 0);
    const ratio = nof > 0 ? totalDeposits / nof : 0;
    res.json({
      net_owned_funds: nof,
      total_deposits: totalDeposits,
      total_loans: totalLoans,
      deposit_to_nof_ratio: ratio,
      compliant: ratio <= 20, // NDH rules: deposits ≤ 20x NOF
      max_allowed_deposits: nof * 20,
      headroom: Math.max(0, nof * 20 - totalDeposits)
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/compliance/generate-report", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { report_type, period_from, period_to, financial_year } = req.body;
    const [shares, deposits, loans] = await Promise.all([
      db.execute(sql`SELECT SUM(total_share_amount) as nof, COUNT(*) as members FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT SUM(current_balance) as total FROM nidhi_deposits WHERE tenant_id=${tid} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT SUM(outstanding_principal) as total FROM nidhi_loans WHERE tenant_id=${tid} AND record_status=1 AND status='active'`)
    ]);
    const nof = Number((shares.rows[0] as any)?.nof || 0);
    const totalDeposits = Number((deposits.rows[0] as any)?.total || 0);
    const totalLoans = Number((loans.rows[0] as any)?.total || 0);
    const ratio = nof > 0 ? totalDeposits / nof : 0;
    const r = await db.execute(sql`
      INSERT INTO nidhi_compliance_reports (tenant_id, report_type, period_from, period_to, financial_year,
        total_members, net_owned_funds, total_deposits, total_loans, unencumbered_deposits,
        deposit_to_nof_ratio, is_compliant, generated_at, record_status)
      VALUES (${tid}, ${report_type||'NDH-1'}, ${period_from||null}, ${period_to||null}, ${financial_year||null},
        ${Number((shares.rows[0] as any)?.members||0)}, ${nof}, ${totalDeposits}, ${totalLoans}, ${totalDeposits},
        ${ratio}, ${ratio<=20?1:0}, NOW(), 1)
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── MIS / Dashboard ───────────────────────────────────────────────────────────

router.get("/mis", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const [memberStats, depositStats, loanStats, collectionToday, nofData] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active,
          COUNT(*) FILTER (WHERE kyc_status='pending') as kyc_pending,
          SUM(total_share_amount) as share_capital
        FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1`),
      db.execute(sql`
        SELECT deposit_type, COUNT(*) as count, SUM(current_balance) as aum
        FROM nidhi_deposits WHERE tenant_id=${tid} AND record_status=1 AND status='active' GROUP BY deposit_type`),
      db.execute(sql`
        SELECT COUNT(*) as active_loans, COUNT(*) FILTER (WHERE status='npa') as npa_loans,
          SUM(outstanding_principal) FILTER (WHERE status='active') as loan_book,
          SUM(outstanding_principal) FILTER (WHERE status='npa') as npa_book
        FROM nidhi_loans WHERE tenant_id=${tid} AND record_status=1`),
      db.execute(sql`
        SELECT SUM(amount) as total_collection, COUNT(*) as transactions
        FROM nidhi_daily_collection WHERE tenant_id=${tid} AND record_status=1 AND collection_date=CURRENT_DATE`),
      db.execute(sql`
        SELECT SUM(total_share_amount) as nof FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1 AND status='active'`)
    ]);
    const nof = Number((nofData.rows[0] as any)?.nof || 0);
    const totalDeposits = (depositStats.rows as any[]).reduce((s,r) => s + Number(r.aum||0), 0);
    res.json({
      members: memberStats.rows[0],
      deposits: depositStats.rows,
      loans: loanStats.rows[0],
      collection_today: collectionToday.rows[0],
      nof_ratio: {
        nof,
        total_deposits: totalDeposits,
        ratio: nof > 0 ? totalDeposits / nof : 0,
        compliant: nof > 0 && totalDeposits / nof <= 20
      }
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get("/reports/:type", auth, async (req: any, res: any) => {
  try {
    const tid = getTenantId(req);
    const { from, to, financial_year } = req.query;
    const type = req.params.type;
    let data: any[] = [];

    if (type === 'member-register') {
      const r = await db.execute(sql`
        SELECT member_number, name, father_name, date_of_birth, gender, phone, address, city, membership_date, shares_held, total_share_amount, status, kyc_status
        FROM nidhi_members WHERE tenant_id=${tid} AND record_status=1 ORDER BY member_number`);
      data = r.rows as any[];
    } else if (type === 'deposit-register') {
      const r = await db.execute(sql`
        SELECT d.account_number, m.member_number, m.name, m.phone, d.deposit_type, d.principal_amount, d.interest_rate, d.tenure_months, d.opening_date, d.maturity_date, d.maturity_amount, d.current_balance, d.status
        FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id
        WHERE d.tenant_id=${tid} AND d.record_status=1 ORDER BY d.opening_date`);
      data = r.rows as any[];
    } else if (type === 'loan-register') {
      const r = await db.execute(sql`
        SELECT l.loan_number, m.member_number, m.name, m.phone, l.loan_type, l.principal_amount, l.interest_rate, l.tenure_months, l.disbursement_date, l.emi_amount, l.outstanding_principal, l.emis_paid, l.emis_pending, l.next_emi_date, l.status, l.overdue_days
        FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
        WHERE l.tenant_id=${tid} AND l.record_status=1 ORDER BY l.disbursement_date`);
      data = r.rows as any[];
    } else if (type === 'collection-report') {
      const r = await db.execute(sql`
        SELECT dc.collection_date, dc.agent_name, m.member_number, m.name, dc.collection_type, dc.amount, dc.payment_mode, dc.receipt_number
        FROM nidhi_daily_collection dc JOIN nidhi_members m ON m.id=dc.member_id
        WHERE dc.tenant_id=${tid} AND dc.record_status=1
          AND dc.collection_date BETWEEN ${from||new Date().toISOString().slice(0,10)} AND ${to||new Date().toISOString().slice(0,10)}
        ORDER BY dc.collection_date, dc.agent_name`);
      data = r.rows as any[];
    } else if (type === 'npa-report') {
      const r = await db.execute(sql`
        SELECT l.loan_number, m.member_number, m.name, m.phone, l.loan_type, l.principal_amount, l.outstanding_principal, l.overdue_days, l.npa_date, l.npa_reason
        FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
        WHERE l.tenant_id=${tid} AND l.record_status=1 AND (l.status='npa' OR l.overdue_days > 90)
        ORDER BY l.overdue_days DESC`);
      data = r.rows as any[];
    } else if (type === 'maturing-deposits') {
      const days = 30;
      const r = await db.execute(sql`
        SELECT d.account_number, m.member_number, m.name, m.phone, d.deposit_type, d.principal_amount, d.maturity_amount, d.maturity_date, d.auto_renew
        FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id
        WHERE d.tenant_id=${tid} AND d.record_status=1 AND d.status='active'
          AND d.maturity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${days}
        ORDER BY d.maturity_date`);
      data = r.rows as any[];
    }

    res.json({ report_type: type, from, to, count: data.length, data });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
