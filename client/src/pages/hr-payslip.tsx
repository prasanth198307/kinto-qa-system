import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

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

  const { data: ps, isLoading, error } = useQuery({
    queryKey: ["/api/hr/payslips", params.id],
    queryFn: () => fetch(`/api/hr/payslips/${params.id}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: company } = useQuery<any>({ queryKey: ["/api/settings"] });

  if (isLoading) return <div className="p-8 text-center">Loading payslip...</div>;
  if (error || !ps || ps.message) return <div className="p-8 text-center text-muted-foreground">Payslip not found</div>;

  const companyName = company?.companyName || "Your Company";

  return (
    <div className="min-h-screen bg-muted/30 p-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto">
        {/* Print Button */}
        <div className="flex justify-end mb-3 print:hidden">
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />Print Payslip
          </Button>
        </div>

        {/* Payslip */}
        <div className="bg-white text-black rounded-lg border shadow-sm print:shadow-none print:border-none payslip-print">
          {/* Header */}
          <div className="border-b p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">{companyName}</h1>
                {company?.address && <p className="text-sm text-gray-500 mt-0.5">{company.address}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-base font-semibold">PAYSLIP</h2>
                <p className="text-sm text-gray-500">{MONTHS[ps.month]} {ps.year}</p>
              </div>
            </div>
          </div>

          {/* Employee Info */}
          <div className="p-5 border-b grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div className="col-span-2 font-semibold text-base mb-1">{ps.first_name} {ps.last_name}</div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">Employee Code</span><span className="font-medium">{ps.emp_code}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">Designation</span><span className="font-medium">{ps.designation_name || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">Department</span><span className="font-medium">{ps.department_name || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">Bank Account</span><span className="font-medium">{ps.bank_account || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">PAN</span><span className="font-medium">{ps.pan || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">PF Number</span><span className="font-medium">{ps.pf_number || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">ESI Number</span><span className="font-medium">{ps.esi_number || "—"}</span></div>
            <div className="flex gap-2"><span className="text-gray-500 w-28">UAN</span><span className="font-medium">{ps.uan || "—"}</span></div>
          </div>

          {/* Attendance Summary */}
          <div className="p-5 border-b grid grid-cols-4 gap-3 text-sm text-center">
            {[
              { label: "Total Days", value: ps.days_in_month },
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
                    <tr><td className="py-1 text-gray-600">Basic Salary</td><td className="py-1 text-right font-medium">₹{fmt(ps.basic_salary)}</td></tr>
                    {Number(ps.gross_salary) > Number(ps.basic_salary) && (
                      <tr><td className="py-1 text-gray-600">OT & Allowances</td><td className="py-1 text-right font-medium">₹{fmt(Number(ps.gross_salary) - Number(ps.basic_salary))}</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold"><td className="pt-2">Gross Salary</td><td className="pt-2 text-right">₹{fmt(ps.gross_salary)}</td></tr>
                  </tfoot>
                </table>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="font-semibold text-sm mb-2 border-b pb-1">DEDUCTIONS</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Number(ps.pf_employee) > 0 && <tr><td className="py-1 text-gray-600">PF (Employee)</td><td className="py-1 text-right font-medium">₹{fmt(ps.pf_employee)}</td></tr>}
                    {Number(ps.esi_employee) > 0 && <tr><td className="py-1 text-gray-600">ESI (Employee)</td><td className="py-1 text-right font-medium">₹{fmt(ps.esi_employee)}</td></tr>}
                    {Number(ps.pt) > 0 && <tr><td className="py-1 text-gray-600">Professional Tax</td><td className="py-1 text-right font-medium">₹{fmt(ps.pt)}</td></tr>}
                    {Number(ps.tds) > 0 && <tr><td className="py-1 text-gray-600">TDS</td><td className="py-1 text-right font-medium">₹{fmt(ps.tds)}</td></tr>}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold"><td className="pt-2">Total Deductions</td><td className="pt-2 text-right">₹{fmt(ps.total_deductions)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Employer Contributions */}
          {(Number(ps.pf_employer) > 0 || Number(ps.esi_employer) > 0) && (
            <div className="px-5 py-3 border-b bg-gray-50 text-sm flex gap-6">
              <span className="text-gray-500">Employer PF Contribution: <span className="font-medium text-black">₹{fmt(ps.pf_employer)}</span></span>
              {Number(ps.esi_employer) > 0 && <span className="text-gray-500">Employer ESI: <span className="font-medium text-black">₹{fmt(ps.esi_employer)}</span></span>}
            </div>
          )}

          {/* Net Pay */}
          <div className="p-5">
            <div className="flex items-center justify-between">
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
        }
      `}</style>
    </div>
  );
}
