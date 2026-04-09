import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Printer, Search, IndianRupee, Shield } from "lucide-react";

const FISCAL_YEARS = ["2024-25", "2023-24", "2025-26"];
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN");
const fmtRs = (n: any) => `₹${fmt(n)}`;

function calcHraExemption(basic: number, rentPM: number, cityType: string) {
  if (!rentPM) return 0;
  const rentAnnual = rentPM * 12;
  const hraReceived = basic * 12 * (cityType === "metro" ? 0.5 : 0.4);
  const excess = Math.max(0, rentAnnual - basic * 12 * 0.1);
  return Math.min(hraReceived, excess, rentAnnual);
}

function calcTax(income: number, regime: string) {
  if (income <= 0) return 0;
  if (regime === "new") {
    const slabs = [[300000, 0], [400000, 0.05], [300000, 0.10], [300000, 0.15], [300000, 0.20], [Infinity, 0.30]];
    let tax = 0, rem = income - 300000;
    for (const [size, rate] of slabs) {
      if (rem <= 0) break;
      const chunk = Math.min(rem, size as number);
      tax += chunk * (rate as number);
      rem -= chunk;
    }
    if (income <= 700000) return 0;
    const cess = tax * 0.04;
    return Math.round(tax + cess);
  } else {
    const slabs = [[250000, 0], [250000, 0.05], [500000, 0.20], [Infinity, 0.30]];
    let tax = 0, rem = income - 250000;
    for (const [size, rate] of slabs) {
      if (rem <= 0) break;
      const chunk = Math.min(rem, size as number);
      tax += chunk * (rate as number);
      rem -= chunk;
    }
    if (income <= 500000) return 0;
    const cess = tax * 0.04;
    return Math.round(tax + cess);
  }
}

// ── TDS Declaration Form ───────────────────────────────────────────────────────
function DeclarationForm({ employees, employee, fiscalYear, existing, onSave, onCancel }: any) {
  const { toast } = useToast();
  const emp = employees.find((e: any) => String(e.id) === String(employee)) || {};
  const [form, setForm] = useState({
    employeeId: employee || "",
    fiscalYear: fiscalYear || "2024-25",
    regime: existing?.regime || emp.tax_regime || "new",
    licPremium: existing?.lic_premium || "0",
    ppf: existing?.ppf || "0",
    elss: existing?.elss || "0",
    nsc: existing?.nsc || "0",
    homeLoanPrincipal: existing?.home_loan_principal || "0",
    fdTaxSaving: existing?.fd_tax_saving || "0",
    other80c: existing?.other_80c || "0",
    sec80dSelf: existing?.sec_80d_self || "0",
    sec80dParents: existing?.sec_80d_parents || "0",
    parentsSeniorCitizen: existing?.parents_senior_citizen || false,
    rentPerMonth: existing?.rent_per_month || "0",
    cityType: existing?.city_type || "non_metro",
    homeLoanInterest: existing?.home_loan_interest || "0",
    eduLoanInterest: existing?.edu_loan_interest || "0",
    nps80ccd: existing?.nps_80ccd || "0",
    sec80g: existing?.sec_80g || "0",
    sec80tta: existing?.sec_80tta || "0",
    otherDeductions: existing?.other_deductions || "0",
    notes: existing?.notes || "",
  });

  const total80c = Math.min(150000,
    Number(form.licPremium) + Number(form.ppf) + Number(form.elss) + Number(form.nsc) +
    Number(form.homeLoanPrincipal) + Number(form.fdTaxSaving) + Number(form.other80c)
  );
  const empBasic = Number(emp.basic_salary || 0);
  const hraExemption = calcHraExemption(empBasic, Number(form.rentPerMonth), form.cityType);
  const max80d = Number(form.sec80dSelf || 0) + (form.parentsSeniorCitizen ? Math.min(Number(form.sec80dParents || 0), 50000) : Math.min(Number(form.sec80dParents || 0), 25000));
  const stdDed = form.regime === "new" ? 75000 : 50000;
  const totalDeductions = stdDed + total80c + max80d + hraExemption +
    Math.min(Number(form.homeLoanInterest || 0), 200000) + Number(form.eduLoanInterest || 0) +
    Math.min(Number(form.nps80ccd || 0), 50000) + Number(form.sec80g || 0) + Number(form.sec80tta || 0) + Number(form.otherDeductions || 0);
  const annualGross = empBasic * 12 * 2.5;
  const taxableIncome = Math.max(0, annualGross - totalDeductions);
  const annualTax = calcTax(taxableIncome, form.regime);
  const monthlyTDS = Math.round(annualTax / 12);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k: string) => (v: any) => setForm(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/tds-declarations", { ...form, employeeId: form.employeeId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/tds-declarations"] }); toast({ title: "Declaration saved" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const numCls = "h-9 text-right";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Employee</Label>
          <Select value={form.employeeId} onValueChange={s("employeeId")}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Financial Year</Label>
          <Select value={form.fiscalYear} onValueChange={s("fiscalYear")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{FISCAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tax Regime</Label>
          <Select value={form.regime} onValueChange={s("regime")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New Regime (Default)</SelectItem>
              <SelectItem value="old">Old Regime</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="80c">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="80c">Section 80C</TabsTrigger>
          <TabsTrigger value="80d">Section 80D</TabsTrigger>
          <TabsTrigger value="hra">HRA Exemption</TabsTrigger>
          <TabsTrigger value="other">Other Deductions</TabsTrigger>
          <TabsTrigger value="summary">Tax Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="80c" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">Max ₹1,50,000 under Section 80C. Total declared: <span className="font-semibold text-foreground">{fmtRs(Number(form.licPremium)+Number(form.ppf)+Number(form.elss)+Number(form.nsc)+Number(form.homeLoanPrincipal)+Number(form.fdTaxSaving)+Number(form.other80c))}</span> → Eligible: <span className="font-semibold text-foreground">{fmtRs(total80c)}</span></p>
          <div className="grid grid-cols-2 gap-3">
            {[["licPremium","LIC Premium"], ["ppf","PPF Contribution"], ["elss","ELSS / Mutual Funds"], ["nsc","NSC (National Savings Certificate)"], ["homeLoanPrincipal","Home Loan Principal (80C)"], ["fdTaxSaving","Tax-Saving FD (5 yr)"], ["other80c","Others under 80C"]].map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Input className={numCls} type="number" min="0" value={(form as any)[k]} onChange={f(k)} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="80d" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">Medical insurance premium deduction. Self & family: up to ₹25,000. Parents: up to ₹25,000 (₹50,000 if senior citizens).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Self & Family Medical Insurance Premium</Label>
              <Input className={numCls} type="number" min="0" value={form.sec80dSelf} onChange={f("sec80dSelf")} />
            </div>
            <div className="space-y-1.5">
              <Label>Parents Medical Insurance Premium</Label>
              <Input className={numCls} type="number" min="0" value={form.sec80dParents} onChange={f("sec80dParents")} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="seniorParent" checked={form.parentsSeniorCitizen} onCheckedChange={v => setForm(p => ({ ...p, parentsSeniorCitizen: !!v }))} />
            <Label htmlFor="seniorParent" className="text-sm">Parents are Senior Citizens (increases limit to ₹50,000)</Label>
          </div>
        </TabsContent>

        <TabsContent value="hra" className="space-y-3 mt-4">
          <p className="text-xs text-muted-foreground">HRA exemption is calculated as: minimum of (HRA received, Actual rent − 10% of basic, 50%/40% of basic for metro/non-metro).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monthly Rent Paid (₹)</Label>
              <Input className={numCls} type="number" min="0" value={form.rentPerMonth} onChange={f("rentPerMonth")} />
            </div>
            <div className="space-y-1.5">
              <Label>City Type</Label>
              <Select value={form.cityType} onValueChange={s("cityType")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="metro">Metro (Mumbai, Delhi, Kolkata, Chennai)</SelectItem>
                  <SelectItem value="non_metro">Non-Metro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {Number(form.rentPerMonth) > 0 && (
            <div className="p-3 rounded-md bg-muted text-sm space-y-1">
              <p>Employee Basic Salary: <span className="font-medium">{fmtRs(empBasic)}/month</span></p>
              <p>HRA Exemption Estimate: <span className="font-semibold text-foreground">{fmtRs(hraExemption)}/year</span></p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["homeLoanInterest", "Home Loan Interest (Sec 24) — Max ₹2,00,000"],
              ["eduLoanInterest", "Education Loan Interest (Sec 80E) — No limit"],
              ["nps80ccd", "NPS Contribution (Sec 80CCD 1B) — Max ₹50,000"],
              ["sec80g", "Donations (Sec 80G)"],
              ["sec80tta", "Savings Bank Interest (Sec 80TTA) — Max ₹10,000"],
              ["otherDeductions", "Other Deductions"],
            ].map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Input className={numCls} type="number" min="0" value={(form as any)[k]} onChange={f(k)} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <Card><CardContent className="pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estimated Tax Computation ({form.fiscalYear})</p>
            {[
              ["Estimated Annual Gross", fmtRs(Math.round(annualGross))],
              ["Standard Deduction", `(${fmtRs(stdDed)})`],
              ["Section 80C (capped at ₹1.5L)", `(${fmtRs(total80c)})`],
              ["Section 80D", `(${fmtRs(max80d)})`],
              ["HRA Exemption", `(${fmtRs(Math.round(hraExemption))})`],
              ["Home Loan Interest", `(${fmtRs(Math.min(Number(form.homeLoanInterest || 0), 200000))})`],
              ["Other Deductions", `(${fmtRs(Number(form.eduLoanInterest || 0) + Math.min(Number(form.nps80ccd || 0), 50000) + Number(form.sec80g || 0))})`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 font-semibold">
              <span>Estimated Taxable Income</span>
              <span>{fmtRs(Math.round(taxableIncome))}</span>
            </div>
            <div className="flex justify-between text-sm py-2 font-semibold text-primary">
              <span>Estimated Annual Tax (incl. 4% cess)</span>
              <span>{fmtRs(annualTax)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 font-semibold">
              <span>Monthly TDS Deduction</span>
              <span>{fmtRs(monthlyTDS)}</span>
            </div>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground mt-2">* This is an estimate based on declared investments. Actual TDS may vary based on payroll processing.</p>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.employeeId}>
          {saveMutation.isPending ? "Saving..." : "Save Declaration"}
        </Button>
      </div>
    </div>
  );
}

// ── Form 16 View ───────────────────────────────────────────────────────────────
function Form16View({ employeeId, fiscalYear }: { employeeId: number; fiscalYear: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/hr/form16", employeeId, fiscalYear],
    queryFn: async () => {
      const r = await fetch(`/api/hr/form16/${employeeId}/${fiscalYear}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!employeeId && !!fiscalYear,
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading Form 16 data...</div>;
  if (!data?.employee) return <div className="text-center py-8 text-muted-foreground">No data found</div>;

  const emp = data.employee;
  const payslips = data.payslips || [];
  const totalGross = payslips.reduce((s: number, p: any) => s + Number(p.gross_salary || 0), 0);
  const totalPF = payslips.reduce((s: number, p: any) => s + Number(p.pf_employee || 0), 0);
  const totalPT = payslips.reduce((s: number, p: any) => s + Number(p.pt || 0), 0);
  const totalTDS = payslips.reduce((s: number, p: any) => s + Number(p.tds || 0), 0);
  const decl = data.declaration;
  const stdDed = emp.tax_regime === "old" ? 50000 : 75000;

  const MONTHS_ORDER = [4,5,6,7,8,9,10,11,12,1,2,3];
  const MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-4 print:p-4" id="form16-print">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Form 16 — Part B</h2>
          <p className="text-sm text-muted-foreground">Financial Year: {fiscalYear}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />Print / Download
        </Button>
      </div>

      <Card><CardContent className="pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Employee Details</p>
        <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
          {[["Name", `${emp.first_name} ${emp.last_name}`], ["Emp Code", emp.emp_code], ["Designation", emp.designation_name || "—"], ["PAN", emp.pan || "Not provided"], ["Tax Regime", emp.tax_regime === "old" ? "Old Regime" : "New Regime"]].map(([l, v]) => (
            <div key={l}><span className="text-muted-foreground">{l}: </span><span className="font-medium">{v}</span></div>
          ))}
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Part A — TDS Summary</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left font-medium text-muted-foreground pb-2">Month</th><th className="text-right font-medium text-muted-foreground pb-2">Gross</th><th className="text-right font-medium text-muted-foreground pb-2">TDS</th></tr></thead>
            <tbody>
              {MONTHS_ORDER.map(m => {
                const ps = payslips.find((p: any) => p.month === m);
                if (!ps) return null;
                return <tr key={m} className="border-b last:border-0">
                  <td className="py-1.5">{MONTH_NAMES[m]}</td>
                  <td className="text-right">{fmtRs(ps.gross_salary)}</td>
                  <td className="text-right">{fmtRs(ps.tds)}</td>
                </tr>;
              })}
            </tbody>
            <tfoot><tr className="font-semibold border-t">
              <td className="pt-2">Total</td>
              <td className="text-right pt-2">{fmtRs(totalGross)}</td>
              <td className="text-right pt-2">{fmtRs(totalTDS)}</td>
            </tr></tfoot>
          </table>
        </CardContent></Card>

        <Card><CardContent className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Part B — Income Computation</p>
          <div className="space-y-1.5 text-sm">
            {[
              ["Gross Salary", fmtRs(totalGross)],
              ["Standard Deduction", `(${fmtRs(stdDed)})`],
              ["PF Employee Contribution", `(${fmtRs(totalPF)})`],
              ["Professional Tax Paid", `(${fmtRs(totalPT)})`],
              ...(decl ? [
                ["Section 80C", `(${fmtRs(Math.min(150000, Number(decl.lic_premium||0)+Number(decl.ppf||0)+Number(decl.elss||0)+Number(decl.nsc||0)+Number(decl.home_loan_principal||0)+Number(decl.fd_tax_saving||0)+Number(decl.other_80c||0)))})`],
                ["Section 80D", `(${fmtRs(Number(decl.sec_80d_self||0)+Number(decl.sec_80d_parents||0))})`],
                ...(Number(decl.home_loan_interest) ? [["Home Loan Interest (Sec 24)", `(${fmtRs(Math.min(200000, Number(decl.home_loan_interest)))})`]] : []),
                ...(Number(decl.nps_80ccd) ? [["NPS (80CCD 1B)", `(${fmtRs(Math.min(50000, Number(decl.nps_80ccd)))})`]] : []),
              ] : [["Investment Declaration", "Not submitted"]]),
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-semibold text-sm">
              <span>Net Taxable Income (est.)</span>
              <span>{fmtRs(Math.max(0, totalGross - stdDed - totalPF - totalPT))}</span>
            </div>
            <div className="flex justify-between py-2 font-bold">
              <span>Total TDS Deducted</span>
              <span>{fmtRs(totalTDS)}</span>
            </div>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function HrTdsDeclarations() {
  const { toast } = useToast();
  const [tab, setTab] = useState("declarations");
  const [fiscalYear, setFiscalYear] = useState("2024-25");
  const [showForm, setShowForm] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [form16Emp, setForm16Emp] = useState("");
  const [form16FY, setForm16FY] = useState("2024-25");
  const [search, setSearch] = useState("");

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });
  const { data: declarations = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/tds-declarations", fiscalYear],
    queryFn: async () => {
      const r = await fetch(`/api/hr/tds-declarations?fiscalYear=${fiscalYear}`, { credentials: "include" });
      return r.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/tds-declarations/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/tds-declarations"] }); toast({ title: "Declaration removed" }); },
  });

  const activeEmpList = (employees as any[]).filter((e: any) => e.status === "active");
  const filteredDecl = (declarations as any[]).filter((d: any) =>
    !search || `${d.first_name} ${d.last_name} ${d.emp_code}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">TDS & Compliance</h1>
          <p className="text-sm text-muted-foreground">Manage investment declarations and generate Form 16</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="declarations"><Shield className="h-3.5 w-3.5 mr-1.5" />Investment Declarations</TabsTrigger>
          <TabsTrigger value="form16"><FileText className="h-3.5 w-3.5 mr-1.5" />Form 16</TabsTrigger>
        </TabsList>

        <TabsContent value="declarations" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9 w-56" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{FISCAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setSelectedEmp(null); setShowForm(true); }} data-testid="btn-add-declaration">
              <Plus className="h-4 w-4 mr-1.5" />Add Declaration
            </Button>
          </div>

          {filteredDecl.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No declarations for {fiscalYear}</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Add Declaration" to enter investment details for TDS computation</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Employee", "FY", "Regime", "80C (Declared)", "80D", "HRA Rent/mo", "Status", ""].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDecl.map((d: any) => {
                    const total80c = Number(d.lic_premium||0)+Number(d.ppf||0)+Number(d.elss||0)+Number(d.nsc||0)+Number(d.home_loan_principal||0)+Number(d.fd_tax_saving||0)+Number(d.other_80c||0);
                    return (
                      <tr key={d.id} className="border-t hover-elevate" data-testid={`row-declaration-${d.id}`}>
                        <td className="px-3 py-2.5 font-medium">{d.first_name} {d.last_name}<br/><span className="text-xs text-muted-foreground">{d.emp_code}</span></td>
                        <td className="px-3 py-2.5">{d.fiscal_year}</td>
                        <td className="px-3 py-2.5"><Badge variant="outline">{d.regime === "new" ? "New" : "Old"}</Badge></td>
                        <td className="px-3 py-2.5">{fmtRs(total80c)} {total80c > 150000 && <Badge variant="secondary" className="ml-1">Capped</Badge>}</td>
                        <td className="px-3 py-2.5">{fmtRs(Number(d.sec_80d_self||0)+Number(d.sec_80d_parents||0))}</td>
                        <td className="px-3 py-2.5">{Number(d.rent_per_month) ? fmtRs(d.rent_per_month) : "—"}</td>
                        <td className="px-3 py-2.5"><Badge variant="default">Submitted</Badge></td>
                        <td className="px-3 py-2.5 text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedEmp(d); setShowForm(true); }}>Edit</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="form16" className="space-y-4 mt-4">
          <Card><CardContent className="pt-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={form16Emp} onValueChange={setForm16Emp}>
                  <SelectTrigger className="h-9 w-64"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{activeEmpList.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Financial Year</Label>
                <Select value={form16FY} onValueChange={setForm16FY}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{FISCAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent></Card>
          {form16Emp && <Form16View employeeId={Number(form16Emp)} fiscalYear={form16FY} />}
          {!form16Emp && (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select an employee and financial year to generate Form 16</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setSelectedEmp(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmp ? "Edit Investment Declaration" : "New Investment Declaration"}</DialogTitle>
          </DialogHeader>
          <DeclarationForm
            employees={activeEmpList}
            employee={selectedEmp?.employee_id || ""}
            fiscalYear={fiscalYear}
            existing={selectedEmp}
            onSave={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
