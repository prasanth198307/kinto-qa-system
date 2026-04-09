import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle } from "lucide-react";
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

  const sendWA = useMutation({
    mutationFn: () => apiRequest("POST", `/api/hr/payslips/${params.id}/send-whatsapp`, {}),
    onSuccess: () => toast({ title: "Payslip sent via WhatsApp" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8 text-center">Loading payslip...</div>;
  if (error || !ps || ps.message) return <div className="p-8 text-center text-muted-foreground">Payslip not found</div>;

  const companyName = company?.name || "Your Company";
  const logoUrl = company?.logoUrl;

  // Parse components from JSONB — fallback to legacy columns
  let components: any[] = [];
  try {
    components = ps.components
      ? (typeof ps.components === "string" ? JSON.parse(ps.components) : ps.components)
      : [];
  } catch { components = []; }

  const earnings = components.filter((c: any) => c.type === "earning");
  const deductionComponents = components.filter((c: any) => c.type === "deduction");

  // If no components stored, build from legacy columns
  const showLegacy = components.length === 0;
  const legacyEarnings = showLegacy
    ? [
        { name: "Basic Salary", amount: ps.basic_salary },
        ...(Number(ps.gross_salary) > Number(ps.basic_salary)
          ? [{ name: "OT & Allowances", amount: Number(ps.gross_salary) - Number(ps.basic_salary) }]
          : []),
      ]
    : earnings;

  const legacyDeductions = showLegacy
    ? [
        ...(Number(ps.pf_employee) > 0 ? [{ name: "PF (Employee)", amount: ps.pf_employee }] : []),
        ...(Number(ps.esi_employee) > 0 ? [{ name: "ESI (Employee)", amount: ps.esi_employee }] : []),
        ...(Number(ps.pt) > 0 ? [{ name: "Professional Tax", amount: ps.pt }] : []),
        ...(Number(ps.tds) > 0 ? [{ name: "TDS", amount: ps.tds }] : []),
      ]
    : deductionComponents;

  return (
    <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <Button size="sm" variant="outline" onClick={() => sendWA.mutate()} disabled={sendWA.isPending}>
            <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
            {sendWA.isPending ? "Sending..." : "Send WhatsApp"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print Payslip
          </Button>
        </div>

        {/* Payslip */}
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
              {/* Earnings */}
              <div>
                <h3 className="font-semibold text-sm mb-2 border-b pb-1">EARNINGS</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {legacyEarnings.map((c: any, i: number) => (
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

              {/* Deductions */}
              <div>
                <h3 className="font-semibold text-sm mb-2 border-b pb-1">DEDUCTIONS</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {legacyDeductions.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1 text-gray-600">{c.name}</td>
                        <td className="py-1 text-right font-medium">₹{fmt(c.amount)}</td>
                      </tr>
                    ))}
                    {legacyDeductions.length === 0 && (
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
          {(Number(ps.pf_employer) > 0 || Number(ps.esi_employer) > 0) && (
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
          <div className="p-5">
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
