import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function toWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num === 0) return "Zero";
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  return convert(Math.round(num)) + " Rupees Only";
}

function fmt(n: any) { return Number(n || 0).toLocaleString("en-IN"); }

export default function HRPayslipPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: ps, isLoading, error } = useQuery({
    queryKey: ["/api/hr/payslips", params.id],
    queryFn: () => fetch(`/api/hr/payslips/${params.id}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: company } = useQuery<any>({ queryKey: ["/api/tenant/info"] });
  const { data: psSettings } = useQuery<any>({
    queryKey: ["/api/hr/payslip-settings"],
    queryFn: () => fetch("/api/hr/payslip-settings", { credentials: "include" }).then(r => r.json()),
  });

  const { data: leaveBalances = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/leave-balances", ps?.employee_id, ps?.year],
    queryFn: () =>
      fetch(`/api/hr/leave-balances?employeeId=${ps.employee_id}&year=${ps.year}`, { credentials: "include" })
        .then(r => r.json()),
    enabled: !!ps?.employee_id && !!ps?.year,
  });

  const sendWA = useMutation({
    mutationFn: () => apiRequest("POST", `/api/hr/payslips/${params.id}/send-whatsapp`, {}),
    onSuccess: () => toast({ title: "Payslip sent via WhatsApp" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openPayslipWindow = (forPrint = false) => {
    if (!ps) return;
    const fmtN = (n: any) => Number(n || 0).toLocaleString("en-IN");
    const companyName = company?.name || "—";
    const today = new Date().toLocaleDateString("en-IN");

    let comps: any[] = [];
    try { comps = ps.components ? (typeof ps.components === "string" ? JSON.parse(ps.components) : ps.components) : []; } catch { comps = []; }

    const showLegacy = comps.length === 0;
    const earnings = showLegacy
      ? [
          { name: "Basic Salary", amount: ps.basic_salary },
          ...(Number(ps.gross_salary) > Number(ps.basic_salary)
            ? [{ name: "OT & Allowances", amount: Number(ps.gross_salary) - Number(ps.basic_salary) }]
            : []),
        ]
      : comps.filter((c: any) => c.type === "earning");

    const deductions = showLegacy
      ? [
          ...(Number(ps.pf_employee) > 0 ? [{ name: "PF (Employee)", amount: ps.pf_employee }] : []),
          ...(Number(ps.esi_employee) > 0 ? [{ name: "ESI (Employee)", amount: ps.esi_employee }] : []),
          ...(Number(ps.pt) > 0 ? [{ name: "Professional Tax", amount: ps.pt }] : []),
          ...(Number(ps.tds) > 0 ? [{ name: "TDS", amount: ps.tds }] : []),
          ...(Number(ps.other_deductions) > 0 ? [{ name: "Loan/Advance Recovery", amount: ps.other_deductions }] : []),
        ]
      : comps.filter((c: any) => c.type === "deduction");

    const maxRows = Math.max(earnings.length, deductions.length);
    const pairedRows = Array.from({ length: maxRows }, (_, i) => {
      const e = earnings[i];
      const d = deductions[i];
      return `<tr>
        <td>${e ? e.name : ""}</td><td class="r">${e ? "&#8377;" + fmtN(e.amount) : ""}</td>
        <td>${d ? d.name : ""}</td><td class="r">${d ? '<span style="color:#c00">&#8377;' + fmtN(d.amount) + "</span>" : ""}</td>
      </tr>`;
    }).join("");

    const leaveRows = (leaveBalances as any[]).map((b: any) => {
      const bal = Number(b.balance || 0);
      return `<tr>
        <td>${b.leave_type_name || ""}</td>
        <td class="r">${Number(b.entitled || 0).toFixed(1)}</td>
        <td class="r">${Number(b.used || 0).toFixed(1)}</td>
        <td class="r" style="font-weight:bold;color:${bal > 0 ? "#166534" : "#c00"}">${bal.toFixed(1)}</td>
      </tr>`;
    }).join("");

    const employerRow = (psSettings?.show_employer_contributions !== false && (Number(ps.pf_employer) > 0 || Number(ps.esi_employer) > 0))
      ? `<p style="font-size:10px;color:#555;margin-top:4px">
          ${Number(ps.pf_employer) > 0 ? "Employer PF: <b>&#8377;" + fmtN(ps.pf_employer) + "</b>&nbsp;&nbsp;" : ""}
          ${Number(ps.esi_employer) > 0 ? "Employer ESI: <b>&#8377;" + fmtN(ps.esi_employer) + "</b>" : ""}
        </p>` : "";

    const signatoryHtml = psSettings?.signatory_name
      ? `<div style="text-align:right;margin-top:24px;font-size:11px">
          <div style="border-bottom:1px solid #aaa;width:120px;margin-left:auto;margin-bottom:4px"></div>
          <b>${psSettings.signatory_name}</b><br>
          ${psSettings.signatory_designation ? `<span style="color:#666">${psSettings.signatory_designation}</span>` : ""}
        </div>` : "";

    const footerNote = psSettings?.footer_note
      ? `<p style="font-size:10px;color:#888;margin-top:8px">${psSettings.footer_note}</p>` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslip ${ps.emp_code} ${MONTHS[ps.month]} ${ps.year}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#222}
  .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:12px}
  .co-name{font-size:16px;font-weight:bold;color:#1e40af}
  .co-sub{font-size:10px;color:#555;margin-top:2px}
  .slip-title{background:#1e40af;color:#fff;text-align:center;padding:4px 0;font-size:13px;font-weight:bold;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px}
  th{background:#e8edf8;text-align:left;font-size:11px}
  .r{text-align:right}
  .total{font-weight:bold;background:#f0f4ff}
  .netpay{background:#1e40af;color:#fff;font-weight:bold;text-align:center;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;margin-bottom:10px;font-size:11px}
  .lbl{color:#666}
  @media print{body{margin:8px}}
</style></head><body>
<div class="header">
  ${company?.logoUrl ? `<img src="${company.logoUrl}" style="height:40px;object-fit:contain" />` : ""}
  <div>
    <div class="co-name">${companyName}</div>
    ${company?.address ? `<div class="co-sub">${company.address}</div>` : ""}
    ${company?.gstNumber ? `<div class="co-sub">GSTIN: ${company.gstNumber}</div>` : ""}
  </div>
</div>
<div class="slip-title">SALARY SLIP — ${MONTHS[ps.month].toUpperCase()} ${ps.year}</div>
<div class="grid">
  <div><span class="lbl">Employee:</span> <b>${ps.first_name} ${ps.last_name}</b></div>
  <div><span class="lbl">Code:</span> ${ps.emp_code}</div>
  <div><span class="lbl">Department:</span> ${ps.department_name || "—"}</div>
  <div><span class="lbl">Designation:</span> ${ps.designation_name || "—"}</div>
  <div><span class="lbl">PAN:</span> ${ps.pan || "—"}</div>
  <div><span class="lbl">PF No:</span> ${ps.pf_number || "—"}</div>
  <div><span class="lbl">Days Worked:</span> ${Number(ps.days_worked || 0).toFixed(2)}/${ps.days_in_month || 26}</div>
  <div><span class="lbl">LOP Days:</span> ${Number(ps.lop_days || 0).toFixed(2)}</div>
  <div><span class="lbl">Bank A/c:</span> ${ps.bank_account || "—"}</div>
</div>
<table>
  <tr><th>Earnings</th><th class="r">Amount (&#8377;)</th><th>Deductions</th><th class="r">Amount (&#8377;)</th></tr>
  ${pairedRows}
  <tr class="total">
    <td>Gross Salary</td><td class="r">&#8377;${fmtN(ps.gross_salary)}</td>
    <td>Total Deductions</td><td class="r" style="color:#c00">&#8377;${fmtN(ps.total_deductions)}</td>
  </tr>
  <tr><td colspan="4" class="netpay">Net Pay: &#8377;${fmtN(ps.net_salary)} &nbsp;|&nbsp; ${toWords(Number(ps.net_salary))}</td></tr>
</table>
${employerRow}
${leaveRows ? `<table style="margin-top:10px">
  <tr><th colspan="4" style="background:#e8edf8;font-size:11px">Leave Balance Summary — ${ps.year}</th></tr>
  <tr><th>Leave Type</th><th class="r">Entitled</th><th class="r">Used</th><th class="r">Balance</th></tr>
  ${leaveRows}
</table>` : ""}
${signatoryHtml}
${footerNote}
<p style="font-size:10px;color:#888;text-align:center;margin-top:16px;border-top:1px solid #eee;padding-top:8px">
  This is a system-generated payslip. Not valid without company seal.&nbsp;&nbsp;Generated on ${today}
</p>
</body></html>`;

    const w = window.open("", "_blank", "width=860,height=1050");
    if (!w) { toast({ title: "Popup blocked", description: "Allow popups and try again", variant: "destructive" }); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    if (forPrint) setTimeout(() => w.print(), 500);
  };

  const downloadPDF = () => openPayslipWindow(false);

  if (isLoading) return <div className="p-8 text-center">Loading payslip...</div>;
  if (error || !ps || ps.message) return <div className="p-8 text-center text-muted-foreground">Payslip not found</div>;

  const companyName = company?.name || "Your Company";
  const logoUrl = company?.logoUrl;
  const showEmployerContrib = psSettings?.show_employer_contributions !== false;

  let components: any[] = [];
  try {
    components = ps.components
      ? (typeof ps.components === "string" ? JSON.parse(ps.components) : ps.components)
      : [];
  } catch { components = []; }

  const earnings = components.filter((c: any) => c.type === "earning");
  const deductionComponents = components.filter((c: any) => c.type === "deduction");

  const showLegacy = components.length === 0;
  const displayEarnings = showLegacy
    ? [
        { name: "Basic Salary", amount: ps.basic_salary },
        ...(Number(ps.gross_salary) > Number(ps.basic_salary)
          ? [{ name: "OT & Allowances", amount: Number(ps.gross_salary) - Number(ps.basic_salary) }]
          : []),
      ]
    : earnings;

  const displayDeductions = showLegacy
    ? [
        ...(Number(ps.pf_employee) > 0 ? [{ name: "PF (Employee)", amount: ps.pf_employee }] : []),
        ...(Number(ps.esi_employee) > 0 ? [{ name: "ESI (Employee)", amount: ps.esi_employee }] : []),
        ...(Number(ps.pt) > 0 ? [{ name: "Professional Tax", amount: ps.pt }] : []),
        ...(Number(ps.tds) > 0 ? [{ name: "TDS", amount: ps.tds }] : []),
        ...(Number(ps.other_deductions) > 0 ? [{ name: "Loan/Advance Recovery", amount: ps.other_deductions }] : []),
      ]
    : deductionComponents;

  return (
    <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <Button size="sm" variant="outline" onClick={() => sendWA.mutate()} disabled={sendWA.isPending}>
            <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
            {sendWA.isPending ? "Sending..." : "Send WhatsApp"}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} data-testid="btn-download-pdf">
            <Download className="h-4 w-4 mr-1" />Download PDF
          </Button>
          <Button size="sm" onClick={() => openPayslipWindow(true)}>
            <Printer className="h-4 w-4 mr-1" />Print
          </Button>
        </div>

        <div className="bg-white text-black rounded-lg border shadow-sm print:shadow-none print:border-none payslip-print">
          {/* Header */}
          <div className="border-b p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt="Company Logo" className="h-12 w-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div>
                  <h1 className="text-xl font-bold">{companyName}</h1>
                  {company?.address && <p className="text-sm text-gray-500 mt-0.5">{company.address}</p>}
                  {company?.gstNumber && <p className="text-xs text-gray-400 mt-0.5">GSTIN: {company.gstNumber}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <h2 className="text-base font-semibold tracking-wide">PAYSLIP</h2>
                <p className="text-sm text-gray-500">{MONTHS[ps.month]} {ps.year}</p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="p-5 border-b grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div className="col-span-2 font-semibold text-base mb-1">{ps.first_name} {ps.last_name}</div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">Employee Code</span><span className="font-medium">{ps.emp_code}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">Designation</span><span className="font-medium">{ps.designation_name || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">Department</span><span className="font-medium">{ps.department_name || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">Bank Account</span><span className="font-medium">{ps.bank_account || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">PAN</span><span className="font-medium">{ps.pan || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">PF Number</span><span className="font-medium">{ps.pf_number || "—"}</span></div>
            {ps.esi_number && <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">ESI Number</span><span className="font-medium">{ps.esi_number}</span></div>}
            {ps.uan && <div className="flex gap-2"><span className="text-gray-500 w-28 shrink-0">UAN</span><span className="font-medium">{ps.uan}</span></div>}
          </div>

          {/* Attendance Summary */}
          <div className="p-5 border-b grid grid-cols-4 gap-3 text-sm text-center">
            {[
              { label: "Working Days", value: ps.days_in_month },
              { label: "Days Worked", value: Number(ps.days_worked).toFixed(1) },
              { label: "LOP Days", value: ps.lop_days },
              { label: "OT Hours", value: Number(ps.ot_hours).toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border p-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-base">{value}</p>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions */}
          <div className="p-5 border-b">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm mb-2 border-b pb-1">EARNINGS</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {displayEarnings.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 text-gray-600">{c.name}</td>
                        <td className="py-1 text-right font-medium">₹{fmt(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="pt-2">Gross Salary</td>
                      <td className="pt-2 text-right">₹{fmt(ps.gross_salary)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2 border-b pb-1">DEDUCTIONS</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {displayDeductions.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 text-gray-600">{c.name}</td>
                        <td className="py-1 text-right font-medium">₹{fmt(c.amount)}</td>
                      </tr>
                    ))}
                    {displayDeductions.length === 0 && (
                      <tr><td colSpan={2} className="py-2 text-gray-400 text-xs">No deductions</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="pt-2">Total Deductions</td>
                      <td className="pt-2 text-right">₹{fmt(ps.total_deductions)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Employer Contributions */}
          {showEmployerContrib && (Number(ps.pf_employer) > 0 || Number(ps.esi_employer) > 0) && (
            <div className="px-5 py-3 border-b bg-gray-50 text-sm flex gap-6 flex-wrap">
              {Number(ps.pf_employer) > 0 && (
                <span className="text-gray-500">Employer PF: <span className="font-medium text-black">₹{fmt(ps.pf_employer)}</span></span>
              )}
              {Number(ps.esi_employer) > 0 && (
                <span className="text-gray-500">Employer ESI: <span className="font-medium text-black">₹{fmt(ps.esi_employer)}</span></span>
              )}
            </div>
          )}

          {/* Net Pay */}
          <div className="p-5 border-b">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Net Pay (In Words)</p>
                <p className="font-medium capitalize">{toWords(Number(ps.net_salary))}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Net Pay</p>
                <p className="text-2xl font-bold">₹{fmt(ps.net_salary)}</p>
              </div>
            </div>
          </div>

          {/* Leave Balance Summary */}
          {leaveBalances.length > 0 && (
            <div className="p-5 border-b">
              <h3 className="font-semibold text-sm mb-2 border-b pb-1">LEAVE BALANCE SUMMARY — {ps.year}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {leaveBalances.map((b: any) => (
                  <div key={b.id} className="rounded border p-2 text-sm text-center">
                    <p className="text-xs text-gray-500">{b.leave_type_name}</p>
                    <p className="text-xs text-gray-400 mb-1">({b.code})</p>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Entitled</span><span className="font-medium text-black">{Number(b.entitled || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Used</span><span className="font-medium text-black">{Number(b.used || 0).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold mt-1 border-t pt-1">
                      <span>Balance</span>
                      <span className={Number(b.balance) > 0 ? "text-green-700" : "text-red-600"}>
                        {Number(b.balance || 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatory */}
          {(psSettings?.signatory_name || psSettings?.footer_note) && (
            <div className="px-5 py-4 flex justify-between items-end text-sm">
              <div>
                {psSettings?.footer_note && (
                  <p className="text-gray-500 text-xs">{psSettings.footer_note}</p>
                )}
              </div>
              {psSettings?.signatory_name && (
                <div className="text-right">
                  <div className="h-8 border-b border-gray-300 mb-1 w-32 ml-auto" />
                  <p className="font-medium">{psSettings.signatory_name}</p>
                  {psSettings?.signatory_designation && (
                    <p className="text-gray-500 text-xs">{psSettings.signatory_designation}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t px-5 py-3 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
            <span>This is a system generated payslip and does not require a signature.</span>
            <span>{MONTHS[ps.month]} {ps.year}</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .payslip-print { max-width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
