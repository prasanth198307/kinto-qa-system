import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

function tid(req: any): number { return req.session?.tenantId ?? req.user?.tenantId ?? 1; }
function auth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// EMI calculation (reducing balance)
function calcEMI(principal: number, ratePerAnnum: number, months: number): number {
  const r = ratePerAnnum / 12 / 100;
  if (r === 0) return Math.round(principal / months * 100) / 100;
  return Math.round((principal * r * Math.pow(1+r, months)) / (Math.pow(1+r, months) - 1) * 100) / 100;
}

// Compound interest (quarterly) for FD
function calcMaturity(principal: number, rate: number, months: number): number {
  return Math.round(principal * Math.pow(1 + rate/400, months/3) * 100) / 100;
}

// Generate EMI schedule
function genSchedule(principal: number, rate: number, months: number, emi: number, startDate: string) {
  const r = rate / 12 / 100;
  const schedule = [];
  let balance = principal;
  const d = new Date(startDate);
  for (let i = 1; i <= months; i++) {
    const interest = Math.round(balance * r * 100) / 100;
    const principalComp = Math.round((emi - interest) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principalComp) * 100) / 100);
    const dueDate = new Date(d);
    dueDate.setMonth(d.getMonth() + i - 1);
    schedule.push({ emi_number: i, due_date: dueDate.toISOString().slice(0,10), principal: principalComp, interest, emi_amount: emi, balance_after: balance });
  }
  return schedule;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [members, deposits, loans, npa, newThisMonth, shares] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total, SUM(CASE WHEN kyc_status='pending' THEN 1 ELSE 0 END) as kyc_pending FROM nidhi_members WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT COUNT(*) as total_accounts, COALESCE(SUM(current_balance),0) as total_balance, COALESCE(SUM(principal_amount),0) as total_principal FROM nidhi_deposits WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as total, COALESCE(SUM(outstanding_principal),0) as outstanding FROM nidhi_loans WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT COUNT(*) as npa_count, COALESCE(SUM(outstanding_principal),0) as npa_amount FROM nidhi_loans WHERE tenant_id=${t} AND record_status=1 AND status='npa'`),
      db.execute(sql`SELECT COUNT(*) as new_count FROM nidhi_members WHERE tenant_id=${t} AND record_status=1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
      db.execute(sql`SELECT COALESCE(SUM(total_share_amount),0) as total_share_capital FROM nidhi_members WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
    ]);

    const m = members.rows[0] as any;
    const d = deposits.rows[0] as any;
    const l = loans.rows[0] as any;
    const n = npa.rows[0] as any;
    const sh = shares.rows[0] as any;

    const totalDeposits = Number(d.total_balance);
    const netOwnedFunds = Number(sh.total_share_capital);
    const ratio = netOwnedFunds > 0 ? totalDeposits / netOwnedFunds : 0;

    // EMIs due today
    const emisDue = await db.execute(sql`SELECT COUNT(*) as count FROM nidhi_loans WHERE tenant_id=${t} AND record_status=1 AND status='active' AND next_emi_date <= CURRENT_DATE`);

    res.json({
      totalMembers: Number(m.total), kycPending: Number(m.kyc_pending),
      totalDepositAccounts: Number(d.total_accounts), totalDeposits, totalPrincipal: Number(d.total_principal),
      totalLoans: Number(l.total), totalOutstanding: Number(l.outstanding),
      npaCount: Number(n.npa_count), npaAmount: Number(n.npa_amount),
      newMembersThisMonth: Number((newThisMonth.rows[0] as any).new_count),
      emisDueToday: Number((emisDue.rows[0] as any).count),
      netOwnedFunds, depositToNofRatio: Math.round(ratio * 100) / 100,
      isCompliant: ratio <= 20,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Members ───────────────────────────────────────────────────────────────────
router.get("/members", auth, async (req: any, res) => {
  const t = tid(req);
  const { search } = req.query;
  try {
    const rows = await db.execute(sql`SELECT m.*,
      (SELECT COUNT(*) FROM nidhi_deposits WHERE member_id=m.id AND status='active') as active_deposits,
      (SELECT COUNT(*) FROM nidhi_loans WHERE member_id=m.id AND status IN ('active','npa')) as active_loans,
      (SELECT COALESCE(SUM(current_balance),0) FROM nidhi_deposits WHERE member_id=m.id AND status='active') as total_deposit_balance,
      (SELECT COALESCE(SUM(outstanding_principal),0) FROM nidhi_loans WHERE member_id=m.id AND status='active') as total_loan_outstanding
      FROM nidhi_members m WHERE m.tenant_id=${t} AND m.record_status=1
      ${search ? sql`AND (m.name ILIKE ${'%'+search+'%'} OR m.phone ILIKE ${'%'+search+'%'} OR m.member_number ILIKE ${'%'+search+'%'})` : sql``}
      ORDER BY m.created_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/members", auth, async (req: any, res) => {
  const t = tid(req);
  const body = req.body;
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as cnt FROM nidhi_members WHERE tenant_id=${t}`);
    const memberNum = `MEM-${String(Number((count.rows[0] as any).cnt) + 1).padStart(5,'0')}`;
    const r = await db.execute(sql`INSERT INTO nidhi_members
      (tenant_id, member_number, name, father_name, date_of_birth, gender, phone, alternate_phone, email,
       address, city, state, pincode, aadhar_number, pan_number, nominee_name, nominee_relation, nominee_dob,
       membership_date, shares_held, share_value, total_share_amount, is_senior_citizen, status, kyc_status, introduced_by)
      VALUES (${t}, ${memberNum}, ${body.name}, ${body.father_name||null}, ${body.date_of_birth||null}, ${body.gender||null},
        ${body.phone||null}, ${body.alternate_phone||null}, ${body.email||null}, ${body.address||null},
        ${body.city||null}, ${body.state||'Andhra Pradesh'}, ${body.pincode||null}, ${body.aadhar_number||null},
        ${body.pan_number||null}, ${body.nominee_name||null}, ${body.nominee_relation||null}, ${body.nominee_dob||null},
        ${body.membership_date||new Date().toISOString().slice(0,10)}, ${body.shares_held||1}, ${body.share_value||10},
        ${(body.shares_held||1)*(body.share_value||10)}, ${body.is_senior_citizen||0}, 'active', ${body.kyc_status||'pending'}, ${body.introduced_by||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/members/:id", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [member, deposits, loans, shares] = await Promise.all([
      db.execute(sql`SELECT * FROM nidhi_members WHERE id=${req.params.id} AND tenant_id=${t}`),
      db.execute(sql`SELECT * FROM nidhi_deposits WHERE member_id=${req.params.id} AND tenant_id=${t} AND record_status=1 ORDER BY created_at DESC`),
      db.execute(sql`SELECT * FROM nidhi_loans WHERE member_id=${req.params.id} AND tenant_id=${t} AND record_status=1 ORDER BY created_at DESC`),
      db.execute(sql`SELECT * FROM nidhi_share_transactions WHERE member_id=${req.params.id} AND tenant_id=${t} AND record_status=1 ORDER BY created_at DESC`),
    ]);
    res.json({ member: member.rows[0], deposits: deposits.rows, loans: loans.rows, shareTransactions: shares.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/members/:id", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const r = await db.execute(sql`UPDATE nidhi_members SET
      name=${b.name||null}, father_name=${b.father_name||null}, date_of_birth=${b.date_of_birth||null},
      gender=${b.gender||null}, phone=${b.phone||null}, alternate_phone=${b.alternate_phone||null},
      email=${b.email||null}, address=${b.address||null}, city=${b.city||null}, state=${b.state||null},
      pincode=${b.pincode||null}, aadhar_number=${b.aadhar_number||null}, pan_number=${b.pan_number||null},
      nominee_name=${b.nominee_name||null}, nominee_relation=${b.nominee_relation||null},
      kyc_status=${b.kyc_status||null}, status=${b.status||null}, updated_at=NOW()
      WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/members/:id/statement", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [dtxns, ltxns, stxns] = await Promise.all([
      db.execute(sql`SELECT dt.*, d.account_number, d.deposit_type FROM nidhi_deposit_transactions dt
        JOIN nidhi_deposits d ON d.id=dt.deposit_id WHERE dt.tenant_id=${t} AND d.member_id=${req.params.id} ORDER BY dt.created_at DESC`),
      db.execute(sql`SELECT lt.*, l.loan_number, l.loan_type FROM nidhi_loan_transactions lt
        JOIN nidhi_loans l ON l.id=lt.loan_id WHERE lt.tenant_id=${t} AND l.member_id=${req.params.id} ORDER BY lt.created_at DESC`),
      db.execute(sql`SELECT * FROM nidhi_share_transactions WHERE tenant_id=${t} AND member_id=${req.params.id} ORDER BY created_at DESC`),
    ]);
    res.json({ depositTransactions: dtxns.rows, loanTransactions: ltxns.rows, shareTransactions: stxns.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Shares ────────────────────────────────────────────────────────────────────
router.post("/shares/allot", auth, async (req: any, res) => {
  const t = tid(req);
  const { member_id, shares_count, share_value, certificate_number, payment_mode, narration } = req.body;
  try {
    const total = Number(shares_count) * Number(share_value || 10);
    const r = await db.execute(sql`INSERT INTO nidhi_share_transactions (tenant_id, member_id, transaction_type, shares_count, share_value, total_amount, certificate_number, payment_mode, narration)
      VALUES (${t}, ${member_id}, 'allotment', ${shares_count}, ${share_value||10}, ${total}, ${certificate_number||null}, ${payment_mode||'cash'}, ${narration||null}) RETURNING *`);
    await db.execute(sql`UPDATE nidhi_members SET shares_held = shares_held + ${shares_count}, total_share_amount = total_share_amount + ${total}, updated_at=NOW() WHERE id=${member_id} AND tenant_id=${t}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/shares/surrender", auth, async (req: any, res) => {
  const t = tid(req);
  const { member_id, shares_count, share_value, narration } = req.body;
  try {
    const total = Number(shares_count) * Number(share_value || 10);
    const r = await db.execute(sql`INSERT INTO nidhi_share_transactions (tenant_id, member_id, transaction_type, shares_count, share_value, total_amount, narration)
      VALUES (${t}, ${member_id}, 'surrender', ${shares_count}, ${share_value||10}, ${total}, ${narration||null}) RETURNING *`);
    await db.execute(sql`UPDATE nidhi_members SET shares_held = GREATEST(0, shares_held - ${shares_count}), total_share_amount = GREATEST(0, total_share_amount - ${total}), updated_at=NOW() WHERE id=${member_id} AND tenant_id=${t}`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/shares/transactions", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT st.*, m.name as member_name, m.member_number FROM nidhi_share_transactions st
      JOIN nidhi_members m ON m.id=st.member_id WHERE st.tenant_id=${t} AND st.record_status=1 ORDER BY st.created_at DESC LIMIT 200`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/dividend/calculate", auth, async (req: any, res) => {
  const t = tid(req);
  const { rate } = req.query; // dividend rate %
  try {
    const members = await db.execute(sql`SELECT id, name, member_number, shares_held, share_value, total_share_amount FROM nidhi_members WHERE tenant_id=${t} AND status='active' AND record_status=1`);
    const dividendRate = Number(rate || 10) / 100;
    const result = (members.rows as any[]).map(m => ({
      ...m,
      dividend_amount: Math.round(Number(m.total_share_amount) * dividendRate * 100) / 100,
    }));
    res.json({ rate: rate || 10, members: result, totalDividend: result.reduce((s, m) => s + m.dividend_amount, 0) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Deposits ──────────────────────────────────────────────────────────────────
router.get("/deposits", auth, async (req: any, res) => {
  const t = tid(req);
  const { deposit_type, status, member_id } = req.query;
  try {
    const rows = await db.execute(sql`SELECT d.*, m.name as member_name, m.member_number, m.phone as member_phone
      FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id
      WHERE d.tenant_id=${t} AND d.record_status=1
      ${deposit_type ? sql`AND d.deposit_type=${deposit_type}` : sql``}
      ${status ? sql`AND d.status=${status}` : sql``}
      ${member_id ? sql`AND d.member_id=${member_id}` : sql``}
      ORDER BY d.created_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    // Auto account number
    const prefix = b.deposit_type === 'savings' ? 'SAV' : b.deposit_type === 'fd' ? 'FD' : b.deposit_type === 'rd' ? 'RD' : b.deposit_type === 'mis' ? 'MIS' : 'PIG';
    const count = await db.execute(sql`SELECT COUNT(*) as cnt FROM nidhi_deposits WHERE tenant_id=${t} AND deposit_type=${b.deposit_type}`);
    const accNum = `${prefix}-${String(Number((count.rows[0] as any).cnt) + 1).padStart(6,'0')}`;

    // Calculate maturity
    const principal = Number(b.principal_amount);
    const rate = Number(b.interest_rate);
    const months = Number(b.tenure_months || 0);
    const openDate = b.opening_date || new Date().toISOString().slice(0,10);
    const maturityDate = months > 0 ? new Date(new Date(openDate).setMonth(new Date(openDate).getMonth() + months)).toISOString().slice(0,10) : null;
    let maturityAmount = null;
    if (b.deposit_type === 'fd') maturityAmount = calcMaturity(principal, rate, months);
    else if (b.deposit_type === 'rd') {
      const monthly = Number(b.monthly_installment || 0);
      const n = months;
      const r = rate / 12 / 100;
      maturityAmount = Math.round(monthly * ((Math.pow(1+r, n) - 1) / r) * (1+r) * 100) / 100;
    } else if (b.deposit_type === 'mis') maturityAmount = principal;

    const r = await db.execute(sql`INSERT INTO nidhi_deposits
      (tenant_id, account_number, member_id, deposit_type, principal_amount, interest_rate, tenure_months, maturity_date, maturity_amount, interest_payout, monthly_installment, opening_date, current_balance, nominee_name, auto_renew, is_senior_citizen_rate, premature_penalty_rate, notes)
      VALUES (${t}, ${accNum}, ${b.member_id}, ${b.deposit_type}, ${principal}, ${rate}, ${months||null}, ${maturityDate}, ${maturityAmount}, ${b.interest_payout||'on_maturity'}, ${b.monthly_installment||0}, ${openDate}, ${b.deposit_type==='savings'?principal:0}, ${b.nominee_name||null}, ${b.auto_renew||0}, ${b.is_senior_citizen_rate||0}, ${b.premature_penalty_rate||1}, ${b.notes||null})
      RETURNING *`);

    // Auto opening transaction
    if (principal > 0) {
      await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, payment_mode, narration)
        VALUES (${t}, ${(r.rows[0] as any).id}, ${b.member_id}, 'opening', ${principal}, ${b.deposit_type==='savings'?principal:0}, ${b.payment_mode||'cash'}, 'Account opening')`);
    }

    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deposits/:id", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [dep, txns] = await Promise.all([
      db.execute(sql`SELECT d.*, m.name as member_name, m.member_number, m.phone as member_phone FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id WHERE d.id=${req.params.id} AND d.tenant_id=${t}`),
      db.execute(sql`SELECT * FROM nidhi_deposit_transactions WHERE deposit_id=${req.params.id} AND tenant_id=${t} AND record_status=1 ORDER BY created_at`),
    ]);
    res.json({ deposit: dep.rows[0], transactions: txns.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/credit", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount, payment_mode, reference_number, narration } = req.body;
  try {
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!dep.rows.length) return res.status(404).json({ message: "Not found" });
    const d = dep.rows[0] as any;
    const newBalance = Number(d.current_balance) + Number(amount);
    await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBalance}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    const r = await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, payment_mode, reference_number, narration)
      VALUES (${t}, ${req.params.id}, ${d.member_id}, 'credit', ${amount}, ${newBalance}, ${payment_mode||'cash'}, ${reference_number||null}, ${narration||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/withdraw", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount, payment_mode, reference_number } = req.body;
  try {
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!dep.rows.length) return res.status(404).json({ message: "Not found" });
    const d = dep.rows[0] as any;
    if (Number(amount) > Number(d.current_balance)) return res.status(400).json({ message: "Insufficient balance" });
    const newBalance = Number(d.current_balance) - Number(amount);
    await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBalance}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    const r = await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, payment_mode, reference_number)
      VALUES (${t}, ${req.params.id}, ${d.member_id}, 'withdrawal', ${amount}, ${newBalance}, ${payment_mode||'cash'}, ${reference_number||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/close", auth, async (req: any, res) => {
  const t = tid(req);
  const { closure_type, payment_mode } = req.body;
  try {
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!dep.rows.length) return res.status(404).json({ message: "Not found" });
    const d = dep.rows[0] as any;
    const isPremature = new Date() < new Date(d.maturity_date);
    let payoutAmount = Number(d.maturity_amount || d.current_balance || d.principal_amount);
    let penalty = 0;
    if (isPremature && closure_type !== 'maturity') {
      penalty = Math.round(payoutAmount * (Number(d.premature_penalty_rate) / 100) * 100) / 100;
      payoutAmount = payoutAmount - penalty;
    }
    const status = isPremature ? 'premature_closed' : 'closed';
    await db.execute(sql`UPDATE nidhi_deposits SET status=${status}, current_balance=0, premature_closure_date=${isPremature?new Date().toISOString().slice(0,10):null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, penalty_amount, balance_after, payment_mode, narration)
      VALUES (${t}, ${req.params.id}, ${d.member_id}, ${status}, ${payoutAmount}, ${penalty}, 0, ${payment_mode||'cash'}, ${isPremature?'Premature closure':'Maturity closure'})`);
    res.json({ success: true, status, payoutAmount, penalty });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/rd-installment", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount, payment_mode, reference_number, collected_by } = req.body;
  try {
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${t} AND deposit_type='rd'`);
    if (!dep.rows.length) return res.status(404).json({ message: "Not found" });
    const d = dep.rows[0] as any;
    const newBalance = Number(d.current_balance) + Number(amount);
    await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBalance}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    const r = await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, payment_mode, reference_number, collected_by, narration)
      VALUES (${t}, ${req.params.id}, ${d.member_id}, 'rd_installment', ${amount}, ${newBalance}, ${payment_mode||'cash'}, ${reference_number||null}, ${collected_by||null}, 'RD Monthly installment') RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/deposits/:id/interest", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const dep = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!dep.rows.length) return res.status(404).json({ message: "Not found" });
    const d = dep.rows[0] as any;
    const monthlyRate = Number(d.interest_rate) / 12 / 100;
    const interestAmount = Math.round(Number(d.principal_amount) * monthlyRate * 100) / 100;
    const newBalance = Number(d.current_balance) + interestAmount;
    await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBalance}, accrued_interest=accrued_interest+${interestAmount}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    const r = await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, interest_amount, balance_after, narration)
      VALUES (${t}, ${req.params.id}, ${d.member_id}, 'interest_credit', ${interestAmount}, ${interestAmount}, ${newBalance}, 'Monthly interest credit') RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deposits/maturing", auth, async (req: any, res) => {
  const t = tid(req);
  const days = Number(req.query.days || 30);
  try {
    const r = await db.execute(sql`SELECT d.*, m.name as member_name, m.phone as member_phone, m.member_number FROM nidhi_deposits d
      JOIN nidhi_members m ON m.id=d.member_id WHERE d.tenant_id=${t} AND d.record_status=1
      AND d.status='active' AND d.maturity_date IS NOT NULL
      AND d.maturity_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ${days} * INTERVAL '1 day'
      ORDER BY d.maturity_date`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/deposits/interest-accrual", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT deposit_type, COUNT(*) as count, COALESCE(SUM(principal_amount),0) as total_principal, COALESCE(SUM(accrued_interest),0) as total_accrued
      FROM nidhi_deposits WHERE tenant_id=${t} AND record_status=1 AND status='active'
      GROUP BY deposit_type`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Daily Collection ──────────────────────────────────────────────────────────
router.post("/daily-collection", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO nidhi_daily_collection (tenant_id, collection_date, agent_name, member_id, deposit_id, loan_id, collection_type, amount, payment_mode, receipt_number, notes)
      VALUES (${t}, ${b.collection_date||new Date().toISOString().slice(0,10)}, ${b.agent_name||null}, ${b.member_id||null}, ${b.deposit_id||null}, ${b.loan_id||null}, ${b.collection_type}, ${b.amount}, ${b.payment_mode||'cash'}, ${b.receipt_number||null}, ${b.notes||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/daily-collection", auth, async (req: any, res) => {
  const t = tid(req);
  const { date, agent_name } = req.query;
  try {
    const r = await db.execute(sql`SELECT dc.*, m.name as member_name, m.member_number FROM nidhi_daily_collection dc
      LEFT JOIN nidhi_members m ON m.id=dc.member_id::varchar WHERE dc.tenant_id=${t} AND dc.record_status=1
      ${date ? sql`AND dc.collection_date=${date}` : sql``}
      ${agent_name ? sql`AND dc.agent_name ILIKE ${'%'+agent_name+'%'}` : sql``}
      ORDER BY dc.created_at DESC LIMIT 200`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Loans ─────────────────────────────────────────────────────────────────────
router.get("/loans", auth, async (req: any, res) => {
  const t = tid(req);
  const { loan_type, status, member_id } = req.query;
  try {
    const rows = await db.execute(sql`SELECT l.*, m.name as member_name, m.member_number, m.phone as member_phone
      FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.tenant_id=${t} AND l.record_status=1
      ${loan_type ? sql`AND l.loan_type=${loan_type}` : sql``}
      ${status ? sql`AND l.status=${status}` : sql``}
      ${member_id ? sql`AND l.member_id=${member_id}` : sql``}
      ORDER BY l.created_at DESC LIMIT 200`);
    res.json(rows.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as cnt FROM nidhi_loans WHERE tenant_id=${t}`);
    const loanNum = `GL-${String(Number((count.rows[0] as any).cnt) + 1).padStart(6,'0')}`;
    const principal = Number(b.principal_amount);
    const rate = Number(b.interest_rate);
    const months = Number(b.tenure_months);
    const emi = calcEMI(principal, rate, months);
    const disbDate = b.disbursement_date || new Date().toISOString().slice(0,10);
    const firstEmiDate = b.first_emi_date || new Date(new Date(disbDate).setMonth(new Date(disbDate).getMonth()+1)).toISOString().slice(0,10);
    const maturityDate = new Date(new Date(firstEmiDate).setMonth(new Date(firstEmiDate).getMonth()+months-1)).toISOString().slice(0,10);

    // Gold loan validation
    if (b.loan_type === 'gold_loan' && b.gold_weight_grams && b.gold_rate_per_gram) {
      const purityFactor = b.gold_purity === '24K' ? 1 : b.gold_purity === '22K' ? 0.916 : b.gold_purity === '18K' ? 0.75 : 0.916;
      const eligible = Number(b.gold_weight_grams) * purityFactor * Number(b.gold_rate_per_gram) * 0.75;
      if (principal > eligible) return res.status(400).json({ message: `Loan exceeds eligible amount ₹${Math.round(eligible)}` });
    }

    // FD loan validation
    if (b.loan_type === 'fd_loan' && b.linked_fd_id) {
      const fd = await db.execute(sql`SELECT principal_amount FROM nidhi_deposits WHERE id=${b.linked_fd_id} AND tenant_id=${t}`);
      if (fd.rows.length) {
        const eligible = Number((fd.rows[0] as any).principal_amount) * 0.80;
        if (principal > eligible) return res.status(400).json({ message: `FD loan exceeds 80% of FD principal ₹${Math.round(eligible)}` });
      }
    }

    const r = await db.execute(sql`INSERT INTO nidhi_loans
      (tenant_id, loan_number, member_id, loan_type, principal_amount, interest_rate, tenure_months, emi_amount,
       disbursement_date, first_emi_date, maturity_date, next_emi_date, total_emis, emis_pending, outstanding_principal,
       security_type, security_description, security_value, gold_weight_grams, gold_purity, gold_rate_per_gram, linked_fd_id, notes, approved_by)
      VALUES (${t}, ${loanNum}, ${b.member_id}, ${b.loan_type}, ${principal}, ${rate}, ${months}, ${emi},
        ${disbDate}, ${firstEmiDate}, ${maturityDate}, ${firstEmiDate}, ${months}, ${months}, ${principal},
        ${b.security_type||null}, ${b.security_description||null}, ${b.security_value||null},
        ${b.gold_weight_grams||null}, ${b.gold_purity||null}, ${b.gold_rate_per_gram||null},
        ${b.linked_fd_id||null}, ${b.notes||null}, ${b.approved_by||null})
      RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/:id", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [loan, txns] = await Promise.all([
      db.execute(sql`SELECT l.*, m.name as member_name, m.member_number, m.phone as member_phone FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id WHERE l.id=${req.params.id} AND l.tenant_id=${t}`),
      db.execute(sql`SELECT * FROM nidhi_loan_transactions WHERE loan_id=${req.params.id} AND tenant_id=${t} AND record_status=1 ORDER BY created_at`),
    ]);
    res.json({ loan: loan.rows[0], transactions: txns.rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/loans/:id", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const r = await db.execute(sql`UPDATE nidhi_loans SET notes=${b.notes||null}, security_description=${b.security_description||null}, approved_by=${b.approved_by||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/loans/:id/emi-schedule", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const loan = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!loan.rows.length) return res.status(404).json({ message: "Not found" });
    const l = loan.rows[0] as any;
    const schedule = genSchedule(Number(l.outstanding_principal), Number(l.interest_rate), Number(l.total_emis) - Number(l.emis_paid), Number(l.emi_amount), l.next_emi_date || l.first_emi_date);
    res.json(schedule);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans/:id/collect-emi", auth, async (req: any, res) => {
  const t = tid(req);
  const { principal_component, interest_component, penalty_amount, payment_mode, reference_number, collected_by } = req.body;
  try {
    const loan = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!loan.rows.length) return res.status(404).json({ message: "Not found" });
    const l = loan.rows[0] as any;
    const principal = Number(principal_component || 0);
    const interest = Number(interest_component || 0);
    const penalty = Number(penalty_amount || 0);
    const total = principal + interest + penalty;
    const newOutstanding = Math.max(0, Number(l.outstanding_principal) - principal);
    const newPaid = Number(l.emis_paid) + 1;
    const newPending = Number(l.total_emis) - newPaid;
    const isLastEmi = newPending <= 0 || newOutstanding <= 1;
    const nextEmiDate = isLastEmi ? null : new Date(new Date(l.next_emi_date || new Date()).setMonth(new Date(l.next_emi_date || new Date()).getMonth()+1)).toISOString().slice(0,10);

    await db.execute(sql`UPDATE nidhi_loans SET outstanding_principal=${newOutstanding}, emis_paid=${newPaid}, emis_pending=${Math.max(0,newPending)}, last_emi_date=CURRENT_DATE, next_emi_date=${nextEmiDate}, status=${isLastEmi?'closed':l.status}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);

    const r = await db.execute(sql`INSERT INTO nidhi_loan_transactions (tenant_id, loan_id, member_id, transaction_type, emi_number, principal_component, interest_component, penalty_amount, total_amount, outstanding_after, payment_mode, reference_number, collected_by)
      VALUES (${t}, ${req.params.id}, ${l.member_id}, 'emi', ${newPaid}, ${principal}, ${interest}, ${penalty}, ${total}, ${newOutstanding}, ${payment_mode||'cash'}, ${reference_number||null}, ${collected_by||null}) RETURNING *`);

    res.json({ ...r.rows[0], outstanding_after: newOutstanding, loan_status: isLastEmi ? 'closed' : l.status });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans/:id/prepayment", auth, async (req: any, res) => {
  const t = tid(req);
  const { amount, payment_mode, is_full_closure, foreclosure_charges } = req.body;
  try {
    const loan = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!loan.rows.length) return res.status(404).json({ message: "Not found" });
    const l = loan.rows[0] as any;
    const prepayAmt = Number(amount);
    const charges = Number(foreclosure_charges || 0);
    const newOutstanding = Math.max(0, Number(l.outstanding_principal) - prepayAmt + charges);
    const isClosed = is_full_closure || newOutstanding <= 1;

    await db.execute(sql`UPDATE nidhi_loans SET outstanding_principal=${newOutstanding}, status=${isClosed?'closed':l.status}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t}`);
    await db.execute(sql`INSERT INTO nidhi_loan_transactions (tenant_id, loan_id, member_id, transaction_type, principal_component, penalty_amount, total_amount, outstanding_after, payment_mode, narration)
      VALUES (${t}, ${req.params.id}, ${l.member_id}, ${isClosed?'closure':'prepayment'}, ${prepayAmt}, ${charges}, ${prepayAmt+charges}, ${newOutstanding}, ${payment_mode||'cash'}, ${isClosed?'Full foreclosure':'Partial prepayment'})`);

    res.json({ success: true, outstanding_after: newOutstanding, status: isClosed ? 'closed' : l.status });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/loans/:id/mark-npa", auth, async (req: any, res) => {
  const t = tid(req);
  const { reason } = req.body;
  try {
    const r = await db.execute(sql`UPDATE nidhi_loans SET status='npa', npa_date=CURRENT_DATE, npa_reason=${reason||null}, updated_at=NOW() WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/loans/:id/disburse", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const loan = await db.execute(sql`SELECT * FROM nidhi_loans WHERE id=${req.params.id} AND tenant_id=${t}`);
    if (!loan.rows.length) return res.status(404).json({ message: "Not found" });
    const l = loan.rows[0] as any;
    // Credit member savings account
    const savings = await db.execute(sql`SELECT * FROM nidhi_deposits WHERE member_id=${l.member_id} AND deposit_type='savings' AND tenant_id=${t} AND status='active' LIMIT 1`);
    if (savings.rows.length) {
      const s = savings.rows[0] as any;
      const newBal = Number(s.current_balance) + Number(l.principal_amount);
      await db.execute(sql`UPDATE nidhi_deposits SET current_balance=${newBal} WHERE id=${s.id} AND tenant_id=${t}`);
      await db.execute(sql`INSERT INTO nidhi_deposit_transactions (tenant_id, deposit_id, member_id, transaction_type, amount, balance_after, narration)
        VALUES (${t}, ${s.id}, ${l.member_id}, 'credit', ${l.principal_amount}, ${newBal}, ${'Loan disbursement: ' + l.loan_number})`);
    }
    res.json({ success: true, disbursed: l.principal_amount });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Gold Rates ────────────────────────────────────────────────────────────────
router.get("/gold-rates", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM nidhi_gold_rates WHERE tenant_id=${t} ORDER BY rate_date DESC LIMIT 30`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/gold-rates", auth, async (req: any, res) => {
  const t = tid(req);
  const { rate_22k, rate_24k, rate_18k, rate_date } = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO nidhi_gold_rates (tenant_id, rate_22k, rate_24k, rate_18k, rate_date)
      VALUES (${t}, ${rate_22k||null}, ${rate_24k||null}, ${rate_18k||null}, ${rate_date||new Date().toISOString().slice(0,10)}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Interest Rates ────────────────────────────────────────────────────────────
router.get("/interest-rates", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM nidhi_interest_rates WHERE tenant_id=${t} AND is_active=1 ORDER BY rate_type, deposit_type, min_tenure_months`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/interest-rates", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const r = await db.execute(sql`INSERT INTO nidhi_interest_rates (tenant_id, rate_type, deposit_type, loan_type, min_tenure_months, max_tenure_months, interest_rate, senior_citizen_rate, effective_from)
      VALUES (${t}, ${b.rate_type}, ${b.deposit_type||null}, ${b.loan_type||null}, ${b.min_tenure_months||0}, ${b.max_tenure_months||null}, ${b.interest_rate}, ${b.senior_citizen_rate||null}, ${b.effective_from||new Date().toISOString().slice(0,10)}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put("/interest-rates/:id", auth, async (req: any, res) => {
  const t = tid(req);
  const b = req.body;
  try {
    const r = await db.execute(sql`UPDATE nidhi_interest_rates SET interest_rate=${b.interest_rate}, senior_citizen_rate=${b.senior_citizen_rate||null}, effective_from=${b.effective_from||null}, is_active=${b.is_active??1} WHERE id=${req.params.id} AND tenant_id=${t} RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.delete("/interest-rates/:id", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    await db.execute(sql`UPDATE nidhi_interest_rates SET is_active=0 WHERE id=${req.params.id} AND tenant_id=${t}`);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Compliance ────────────────────────────────────────────────────────────────
router.get("/compliance/nof-ratio", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [totalDep, shareCapital, loans] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(current_balance),0) as total FROM nidhi_deposits WHERE tenant_id=${t} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(total_share_amount),0) as total FROM nidhi_members WHERE tenant_id=${t} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(outstanding_principal),0) as total FROM nidhi_loans WHERE tenant_id=${t} AND status='active' AND record_status=1`),
    ]);
    const deposits = Number((totalDep.rows[0] as any).total);
    const nof = Number((shareCapital.rows[0] as any).total);
    const ratio = nof > 0 ? deposits / nof : 0;
    res.json({ netOwnedFunds: nof, totalDeposits: deposits, totalLoans: Number((loans.rows[0] as any).total), ratio: Math.round(ratio*100)/100, isCompliant: ratio <= 20, maxAllowedRatio: 20 });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/compliance/unencumbered-check", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const [total, fd] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(current_balance),0) as total FROM nidhi_deposits WHERE tenant_id=${t} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(current_balance),0) as total FROM nidhi_deposits WHERE tenant_id=${t} AND deposit_type IN ('fd','rd') AND status='active' AND record_status=1`),
    ]);
    const totalDep = Number((total.rows[0] as any).total);
    const fdDep = Number((fd.rows[0] as any).total);
    const pct = totalDep > 0 ? (fdDep / totalDep) * 100 : 0;
    res.json({ totalDeposits: totalDep, termDeposits: fdDep, percentage: Math.round(pct*100)/100, isCompliant: pct >= 10, requiredPercentage: 10 });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/compliance/ndh1", auth, async (req: any, res) => {
  const t = tid(req);
  const { financial_year, period_from, period_to } = req.body;
  try {
    const [members, deposits, loans, shareCapital] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total FROM nidhi_members WHERE tenant_id=${t} AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(current_balance),0) as total FROM nidhi_deposits WHERE tenant_id=${t} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(outstanding_principal),0) as total FROM nidhi_loans WHERE tenant_id=${t} AND status='active' AND record_status=1`),
      db.execute(sql`SELECT COALESCE(SUM(total_share_amount),0) as total FROM nidhi_members WHERE tenant_id=${t} AND status='active' AND record_status=1`),
    ]);
    const nof = Number((shareCapital.rows[0] as any).total);
    const totalDep = Number((deposits.rows[0] as any).total);
    const ratio = nof > 0 ? totalDep / nof : 0;

    const r = await db.execute(sql`INSERT INTO nidhi_compliance_reports (tenant_id, report_type, period_from, period_to, financial_year, total_members, net_owned_funds, total_deposits, total_loans, deposit_to_nof_ratio, is_compliant, generated_by)
      VALUES (${t}, 'NDH-1', ${period_from||null}, ${period_to||null}, ${financial_year||null}, ${Number((members.rows[0] as any).total)}, ${nof}, ${totalDep}, ${Number((loans.rows[0] as any).total)}, ${Math.round(ratio*100)/100}, ${ratio<=20?1:0}, ${req.user?.username||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post("/compliance/ndh3", auth, async (req: any, res) => {
  const t = tid(req);
  const { financial_year, period_from, period_to } = req.body;
  try {
    const [members, deposits, loans] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total FROM nidhi_members WHERE tenant_id=${t} AND record_status=1 ${period_from?sql`AND created_at >= ${period_from}`:sql``} ${period_to?sql`AND created_at <= ${period_to}`:sql``}`),
      db.execute(sql`SELECT COALESCE(SUM(current_balance),0) as total FROM nidhi_deposits WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
      db.execute(sql`SELECT COALESCE(SUM(outstanding_principal),0) as total FROM nidhi_loans WHERE tenant_id=${t} AND record_status=1 AND status='active'`),
    ]);
    const r = await db.execute(sql`INSERT INTO nidhi_compliance_reports (tenant_id, report_type, period_from, period_to, financial_year, total_members, total_deposits, total_loans, generated_by)
      VALUES (${t}, 'NDH-3', ${period_from||null}, ${period_to||null}, ${financial_year||null}, ${Number((members.rows[0] as any).total)}, ${Number((deposits.rows[0] as any).total)}, ${Number((loans.rows[0] as any).total)}, ${req.user?.username||null}) RETURNING *`);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/compliance/reports", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT * FROM nidhi_compliance_reports WHERE tenant_id=${t} AND record_status=1 ORDER BY generated_at DESC LIMIT 50`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports/pending-emis", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT l.*, m.name as member_name, m.phone as member_phone, m.member_number,
      CASE WHEN l.next_emi_date < CURRENT_DATE THEN CURRENT_DATE - l.next_emi_date ELSE 0 END as days_overdue
      FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id
      WHERE l.tenant_id=${t} AND l.record_status=1 AND l.status='active'
      AND l.next_emi_date <= CURRENT_DATE ORDER BY days_overdue DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/reports/npa-list", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT l.*, m.name as member_name, m.phone as member_phone, m.member_number FROM nidhi_loans l JOIN nidhi_members m ON m.id=l.member_id WHERE l.tenant_id=${t} AND l.record_status=1 AND l.status='npa' ORDER BY l.npa_date`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/reports/deposit-maturity", auth, async (req: any, res) => {
  const t = tid(req);
  const { from_date, to_date } = req.query;
  try {
    const r = await db.execute(sql`SELECT d.*, m.name as member_name, m.phone as member_phone, m.member_number FROM nidhi_deposits d JOIN nidhi_members m ON m.id=d.member_id WHERE d.tenant_id=${t} AND d.record_status=1 AND d.status='active' AND d.maturity_date IS NOT NULL
      ${from_date ? sql`AND d.maturity_date >= ${from_date}` : sql``}
      ${to_date ? sql`AND d.maturity_date <= ${to_date}` : sql``}
      ORDER BY d.maturity_date`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/reports/member-wise", auth, async (req: any, res) => {
  const t = tid(req);
  try {
    const r = await db.execute(sql`SELECT m.id, m.member_number, m.name, m.phone, m.shares_held, m.total_share_amount, m.status,
      COALESCE(d.deposit_count,0) as deposit_count, COALESCE(d.total_deposits,0) as total_deposits,
      COALESCE(l.loan_count,0) as loan_count, COALESCE(l.total_outstanding,0) as total_outstanding
      FROM nidhi_members m
      LEFT JOIN (SELECT member_id, COUNT(*) as deposit_count, SUM(current_balance) as total_deposits FROM nidhi_deposits WHERE status='active' AND record_status=1 GROUP BY member_id) d ON d.member_id=m.id
      LEFT JOIN (SELECT member_id, COUNT(*) as loan_count, SUM(outstanding_principal) as total_outstanding FROM nidhi_loans WHERE status='active' AND record_status=1 GROUP BY member_id) l ON l.member_id=m.id
      WHERE m.tenant_id=${t} AND m.record_status=1 ORDER BY m.name`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get("/reports/daily-collection", auth, async (req: any, res) => {
  const t = tid(req);
  const { from_date, to_date, agent_name } = req.query;
  try {
    const r = await db.execute(sql`SELECT dc.*, m.name as member_name, m.member_number FROM nidhi_daily_collection dc LEFT JOIN nidhi_members m ON m.id::text=dc.member_id WHERE dc.tenant_id=${t} AND dc.record_status=1
      ${from_date ? sql`AND dc.collection_date >= ${from_date}` : sql``}
      ${to_date ? sql`AND dc.collection_date <= ${to_date}` : sql``}
      ${agent_name ? sql`AND dc.agent_name ILIKE ${'%'+agent_name+'%'}` : sql``}
      ORDER BY dc.collection_date DESC, dc.created_at DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
