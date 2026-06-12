// Shared payslip HTML template generator
// Used by hr-payslip.tsx (admin) and ess-portal.tsx (employee)

const MONTHS_A = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

function fmtN(n: any) { return Number(n || 0).toLocaleString("en-IN"); }

function toWordsInner(num: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (num === 0) return "Zero";
  const c = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
    if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " "+c(n%100) : "");
    if (n < 100000) return c(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " "+c(n%1000) : "");
    if (n < 10000000) return c(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " "+c(n%100000) : "");
    return c(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " "+c(n%10000000) : "");
  };
  return c(Math.round(num)) + " Rupees Only";
}

export const TEMPLATE_STYLES = [
  { key: "classic",   label: "Classic",   accent: "#1e40af", desc: "Blue corporate"  },
  { key: "minimal",   label: "Minimal",   accent: "#374151", desc: "Clean & simple"  },
  { key: "corporate", label: "Corporate", accent: "#1f2937", desc: "Dark charcoal"   },
  { key: "saffron",   label: "Saffron",   accent: "#b45309", desc: "Warm Indian"     },
  { key: "teal",      label: "Teal",      accent: "#0f766e", desc: "Modern teal"     },
] as const;

type TKey = typeof TEMPLATE_STYLES[number]["key"];

interface Theme {
  primary: string; coNameColor: string;
  hdrBg: string; hdrText: string; hdrBorder: string; hdrPad: string;
  thBg: string; thColor: string; totalBg: string;
  titleBg: string; titleText: string; lblColor: string;
}

const THEMES: Record<TKey, Theme> = {
  classic:   { primary:"#1e40af", coNameColor:"#1e40af", hdrBg:"transparent", hdrText:"#222",    hdrBorder:"2px solid #1e40af", hdrPad:"0 0 10px 0", thBg:"#e8edf8", thColor:"#222",    totalBg:"#f0f4ff", titleBg:"#1e40af", titleText:"#fff",    lblColor:"#666"    },
  minimal:   { primary:"#374151", coNameColor:"#111827", hdrBg:"transparent", hdrText:"#222",    hdrBorder:"1px solid #d1d5db", hdrPad:"0 0 10px 0", thBg:"#f3f4f6", thColor:"#374151", totalBg:"#f9fafb", titleBg:"#f3f4f6", titleText:"#374151", lblColor:"#6b7280" },
  corporate: { primary:"#1f2937", coNameColor:"#f9fafb", hdrBg:"#1f2937",    hdrText:"#f9fafb", hdrBorder:"none",              hdrPad:"14px",        thBg:"#374151", thColor:"#e5e7eb", totalBg:"#f1f5f9", titleBg:"#1f2937", titleText:"#fff",    lblColor:"#9ca3af" },
  saffron:   { primary:"#b45309", coNameColor:"#b45309", hdrBg:"transparent", hdrText:"#222",    hdrBorder:"2px solid #b45309", hdrPad:"0 0 10px 0", thBg:"#fef3c7", thColor:"#78350f", totalBg:"#fffbeb", titleBg:"#b45309", titleText:"#fff",    lblColor:"#92400e" },
  teal:      { primary:"#0f766e", coNameColor:"#0f766e", hdrBg:"transparent", hdrText:"#222",    hdrBorder:"2px solid #0f766e", hdrPad:"0 0 10px 0", thBg:"#ccfbf1", thColor:"#134e4a", totalBg:"#f0fdfa", titleBg:"#0f766e", titleText:"#fff",    lblColor:"#0f766e" },
};

export function buildPayslipHtml(
  ps: any,
  settings: any,
  leaveBalances: any[] = [],
  logoOverride?: string | null,
  isSample = false,
): string {
  const key = (settings?.template_style || "classic") as TKey;
  const th  = THEMES[key] ?? THEMES.classic;

  const coName    = settings?.company_name || ps?.tenant_name || "—";
  const coAddr    = [settings?.company_address, settings?.company_city, settings?.company_state, settings?.company_pin].filter(Boolean).join(", ");
  const coContact = [settings?.company_phone ? `Ph: ${settings.company_phone}` : "", settings?.company_email || ""].filter(Boolean).join(" | ");
  const coReg     = [settings?.company_gstin ? `GSTIN: ${settings.company_gstin}` : "", settings?.company_cin ? `CIN: ${settings.company_cin}` : ""].filter(Boolean).join(" | ");

  // Logo: prefer explicit override (blob URL in preview), then server path, then tenant logoUrl
  const rawLogo = logoOverride ?? (settings?.logo_path ? `/${settings.logo_path}` : null) ?? settings?.logo_url ?? null;
  const logoHtml = rawLogo ? `<img src="${rawLogo}" style="height:44px;object-fit:contain;flex-shrink:0;margin-right:12px" />` : "";

  const monthName = MONTHS_A[ps?.month] || "";
  const today     = new Date().toLocaleDateString("en-IN");
  const badge     = isSample ? ` <span style="font-size:10px;background:rgba(255,255,255,0.25);border-radius:3px;padding:1px 6px">SAMPLE</span>` : "";

  let comps: any[] = [];
  try { comps = ps.components ? (typeof ps.components === "string" ? JSON.parse(ps.components) : ps.components) : []; } catch { comps = []; }

  const legacy = comps.length === 0;
  const earnings = legacy ? [
    { name: "Basic Salary",     amount: ps.basic_salary },
    ...(Number(ps.gross_salary) > Number(ps.basic_salary)
      ? [{ name: "OT & Allowances", amount: Number(ps.gross_salary) - Number(ps.basic_salary) }] : []),
  ] : comps.filter((c: any) => c.type === "earning");

  const deductions = legacy ? [
    ...(Number(ps.pf_employee)      > 0 ? [{ name: "PF (Employee)",    amount: ps.pf_employee }]      : []),
    ...(Number(ps.esi_employee)     > 0 ? [{ name: "ESI (Employee)",   amount: ps.esi_employee }]     : []),
    ...(Number(ps.pt)               > 0 ? [{ name: "Professional Tax", amount: ps.pt }]               : []),
    ...(Number(ps.tds)              > 0 ? [{ name: "TDS",              amount: ps.tds }]              : []),
    ...(Number(ps.other_deductions) > 0 ? [{ name: "Loan/Advance",     amount: ps.other_deductions }] : []),
  ] : comps.filter((c: any) => c.type === "deduction");

  const maxR = Math.max(earnings.length, deductions.length, 1);
  const rows = Array.from({ length: maxR }, (_, i) => {
    const e = earnings[i], d = deductions[i];
    return `<tr>
      <td>${e ? e.name : ""}</td>
      <td class="r">${e ? "&#8377;" + fmtN(e.amount) : ""}</td>
      <td>${d ? d.name : ""}</td>
      <td class="r">${d ? `<span style="color:#c00">&#8377;${fmtN(d.amount)}</span>` : ""}</td>
    </tr>`;
  }).join("");

  const leaveRows = leaveBalances.map((b: any) => {
    const bal = Number(b.balance ?? 0);
    return `<tr>
      <td>${b.leave_type_name || b.type_code || ""}</td>
      <td class="r">${Number(b.entitled ?? 0).toFixed(1)}</td>
      <td class="r">${Number(b.used ?? 0).toFixed(1)}</td>
      <td class="r" style="font-weight:bold;color:${bal > 0 ? "#166534" : "#c00"}">${bal.toFixed(1)}</td>
    </tr>`;
  }).join("");

  const showEmp = settings?.show_employer_contributions !== false;
  const empHtml = (showEmp && (Number(ps.pf_employer) > 0 || Number(ps.esi_employer) > 0))
    ? `<p style="font-size:10px;color:#555;margin:4px 0">
        ${Number(ps.pf_employer)  > 0 ? "Employer PF: <b>&#8377;" + fmtN(ps.pf_employer)  + "</b>&nbsp;&nbsp;" : ""}
        ${Number(ps.esi_employer) > 0 ? "Employer ESI: <b>&#8377;" + fmtN(ps.esi_employer) + "</b>" : ""}
      </p>` : "";

  const sigHtml = settings?.signatory_name
    ? `<div style="text-align:right;margin-top:24px;font-size:11px">
        <div style="border-bottom:1px solid #aaa;width:120px;margin-left:auto;margin-bottom:4px"></div>
        <b>${settings.signatory_name}</b><br>
        ${settings.signatory_designation ? `<span style="color:#666">${settings.signatory_designation}</span><br>` : ""}
        Authorised Signatory
      </div>` : "";

  const footerNote = settings?.footer_note || "This is a system-generated payslip. Not valid without company seal.";
  const bankAcc    = ps.bank_account || ps.bank_account_number || "—";
  const netWords   = toWordsInner(Math.round(Number(ps.net_salary || 0)));

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslip ${ps.emp_code || ""} ${monthName} ${ps.year || ""}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#222;background:#fff}
  .hdr{display:flex;align-items:center;background:${th.hdrBg};color:${th.hdrText};padding:${th.hdrPad};border-bottom:${th.hdrBorder};margin-bottom:12px}
  .co-name{font-size:15px;font-weight:bold;color:${th.coNameColor}}
  .co-sub{font-size:10px;color:${key==="corporate"?"#9ca3af":"#555"};margin-top:2px}
  .title{background:${th.titleBg};color:${th.titleText};text-align:center;padding:5px 0;font-size:13px;font-weight:bold;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}
  th{background:${th.thBg};color:${th.thColor};text-align:left}
  .r{text-align:right}
  .total{font-weight:bold;background:${th.totalBg}}
  .netpay{background:${th.primary};color:#fff;font-weight:bold;text-align:center;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;margin-bottom:10px;font-size:11px}
  .lbl{color:${th.lblColor}}
  @media print{body{margin:8px}}
</style></head><body>
<div class="hdr">
  ${logoHtml}
  <div>
    <div class="co-name">${coName}</div>
    ${coAddr    ? `<div class="co-sub">${coAddr}</div>`    : ""}
    ${coContact ? `<div class="co-sub">${coContact}</div>` : ""}
    ${coReg     ? `<div class="co-sub">${coReg}</div>`     : ""}
  </div>
</div>
<div class="title">SALARY SLIP — ${monthName.toUpperCase()} ${ps.year || ""}${badge}</div>
<div class="grid">
  <div><span class="lbl">Employee:</span> <b>${ps.first_name || ""} ${ps.last_name || ""}</b></div>
  <div><span class="lbl">Code:</span> ${ps.emp_code || "—"}</div>
  <div><span class="lbl">Department:</span> ${ps.department_name || "—"}</div>
  <div><span class="lbl">Designation:</span> ${ps.designation_name || "—"}</div>
  <div><span class="lbl">PAN:</span> ${ps.pan || "—"}</div>
  <div><span class="lbl">PF No:</span> ${ps.pf_number || "—"}</div>
  <div><span class="lbl">Days Worked:</span> ${Number(ps.days_worked||0).toFixed(2)}/${ps.days_in_month||ps.working_days||26}</div>
  <div><span class="lbl">LOP Days:</span> ${Number(ps.lop_days||0).toFixed(2)}</div>
  <div><span class="lbl">Bank A/c:</span> ${bankAcc}</div>
</div>
<table>
  <tr><th>Earnings</th><th class="r">Amount (&#8377;)</th><th>Deductions</th><th class="r">Amount (&#8377;)</th></tr>
  ${rows}
  <tr class="total">
    <td>Gross Salary</td><td class="r">&#8377;${fmtN(ps.gross_salary)}</td>
    <td>Total Deductions</td><td class="r" style="color:#c00">&#8377;${fmtN(ps.total_deductions)}</td>
  </tr>
  <tr><td colspan="4" class="netpay">Net Pay: &#8377;${fmtN(ps.net_salary)} &nbsp;|&nbsp; ${netWords}</td></tr>
</table>
${empHtml}
${leaveRows ? `<table style="margin-top:8px">
  <tr><th colspan="4">Leave Balance Summary — ${ps.year||""}</th></tr>
  <tr><th>Leave Type</th><th class="r">Entitled</th><th class="r">Used</th><th class="r">Balance</th></tr>
  ${leaveRows}
</table>` : ""}
${sigHtml}
<p style="font-size:10px;color:#888;text-align:center;margin-top:12px;border-top:1px solid #eee;padding-top:8px">${footerNote}<br>Generated on ${today}</p>
</body></html>`;
}

// Sample payslip data for Template Builder preview
export const SAMPLE_PS = {
  first_name:"Ramesh", last_name:"Kumar", emp_code:"EMP-001",
  department_name:"Production", designation_name:"Senior Engineer",
  pan:"ABCDE1234F", pf_number:"TSHY12345678",
  days_worked:26, lop_days:0, days_in_month:26, working_days:26,
  bank_account:"SBI — 1234 5678 9012",
  gross_salary:46700, total_deductions:4250, net_salary:42450,
  pf_employer:3000, esi_employer:1991, pf_employee:3000, esi_employee:1050, pt:200, tds:0, other_deductions:0,
  components:[
    { type:"earning",   name:"Basic Salary",       amount:25000 },
    { type:"earning",   name:"HRA",                amount:10000 },
    { type:"earning",   name:"Special Allowance",  amount: 8500 },
    { type:"earning",   name:"Travel Allowance",   amount: 3200 },
    { type:"deduction", name:"PF (Employee)",      amount: 3000 },
    { type:"deduction", name:"ESI (Employee)",     amount: 1050 },
    { type:"deduction", name:"Professional Tax",   amount:  200 },
  ],
  month: new Date().getMonth() + 1,
  year:  new Date().getFullYear(),
};

export const SAMPLE_LEAVES = [
  { leave_type_name:"Casual Leave (CL)",    entitled:12, used:2,  balance:10 },
  { leave_type_name:"Sick Leave (SL)",      entitled:12, used:0,  balance:12 },
  { leave_type_name:"Earned Leave (EL)",    entitled:15, used:3,  balance:12 },
  { leave_type_name:"Loss of Pay (LOP)",    entitled: 0, used:0,  balance: 0 },
];
