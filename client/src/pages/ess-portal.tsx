import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Calendar, Clock, Shield, User, LogOut,
  IndianRupee, Printer, CheckCircle2, XCircle, ChevronRight,
  Home, Lock, AlertCircle, Download, Info, Receipt, Plus, Trash2
} from "lucide-react";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN");
const fmtRs = (n: any) => `₹${fmt(n)}`;
const FISCAL_YEARS = ["2025-26", "2024-25", "2023-24"];

async function essFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`/api/ess${path}`, { credentials: "include", ...opts });
  if (!r.ok) throw new Error((await r.json()).message || "Request failed");
  return r.json();
}

// ── Payslip Detail ─────────────────────────────────────────────────────────────
function PayslipDetail({ payslipId, onClose }: { payslipId: number; onClose: () => void }) {
  const { data: ps, isLoading, isError } = useQuery({
    queryKey: ["ess-payslip", payslipId],
    queryFn: () => essFetch(`/payslips/${payslipId}`),
  });
  const { toast } = useToast();
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!printRef.current || !ps) return;
    setPdfLoading(true);
    try {
      const [jsPDFMod, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const jsPDF = jsPDFMod.default;
      const html2canvas = html2canvasMod.default;
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      } else {
        let yPos = 0, remaining = imgHeight;
        while (remaining > 0) {
          const slice = Math.min(pageHeight, remaining);
          pdf.addImage(imgData, "PNG", 0, -yPos, pageWidth, imgHeight);
          remaining -= slice; yPos += slice;
          if (remaining > 0) pdf.addPage();
        }
      }
      const name = `${ps.first_name || ""}_${ps.last_name || ""}_${MONTH_NAMES[ps.month]}_${ps.year}`.replace(/\s+/g, "_");
      pdf.save(`Payslip_${name}.pdf`);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "PDF failed", description: e.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading payslip...</div>;
  if (isError || !ps) return (
    <div className="p-8 text-center text-muted-foreground">
      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
      <p className="text-sm">Could not load payslip. Please try again.</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onClose}>Close</Button>
    </div>
  );

  const components = ps.components ? (typeof ps.components === "string" ? JSON.parse(ps.components) : ps.components) : [];
  const earnings = components.filter((c: any) => c.type === "earning");
  const deductions = components.filter((c: any) => c.type === "deduction");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-lg">Pay Slip — {MONTH_NAMES[ps.month]} {ps.year}</h2>
          <p className="text-sm text-muted-foreground">{ps.first_name} {ps.last_name} · {ps.emp_code}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={downloadPDF} disabled={pdfLoading} data-testid="btn-payslip-pdf">
            <Download className="h-3.5 w-3.5 mr-1.5" />{pdfLoading ? "Generating..." : "Download PDF"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Print
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
      <div ref={printRef} className="space-y-4 bg-white text-black rounded-md p-1" id="ess-payslip-print">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {[
          ["Employee", `${ps.first_name} ${ps.last_name}`], ["Emp Code", ps.emp_code],
          ["Designation", ps.designation_name || "—"], ["Department", ps.department_name || "—"],
          ["PAN", ps.pan || "Not provided"], ["PF Number", ps.pf_number || "—"],
          ["Bank", ps.bank_name || "—"], ["Account No.", ps.bank_account_number || "—"],
        ].map(([l, v]) => (
          <div key={l}><span className="text-muted-foreground">{l}: </span><span className="font-medium">{v}</span></div>
        ))}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <div className="grid grid-cols-2 divide-x min-w-[420px]">
          <div>
            <div className="bg-muted/50 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Earnings</div>
            {earnings.map((c: any) => (
              <div key={c.code} className="flex justify-between px-3 py-2 text-sm border-t">
                <span>{c.name}</span><span className="font-medium">{fmtRs(c.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 text-sm border-t font-semibold bg-muted/30">
              <span>Gross Salary</span><span>{fmtRs(ps.gross_salary)}</span>
            </div>
          </div>
          <div>
            <div className="bg-muted/50 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Deductions</div>
            {deductions.map((c: any) => (
              <div key={c.code} className="flex justify-between px-3 py-2 text-sm border-t">
                <span>{c.name}</span><span className="font-medium text-destructive">{fmtRs(c.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 text-sm border-t font-semibold bg-muted/30">
              <span>Total Deductions</span><span className="text-destructive">{fmtRs(ps.total_deductions)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between px-4 py-3 bg-primary text-primary-foreground font-bold text-base">
          <span>Net Pay</span><span>{fmtRs(ps.net_salary)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        {[["Days Worked", ps.days_worked], ["LOP Days", ps.lop_days], ["OT Hours", ps.ot_hours]].map(([l, v]) => (
          <div key={l} className="p-2 rounded-md bg-muted/50 text-center">
            <p className="font-semibold">{v || 0}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      </div>{/* end printRef */}
    </div>
  );
}

// ── Leave Application Form ────────────────────────────────────────────────────
function ApplyLeaveForm({ leaveTypes, leaveBalances, leavesError, onSave, onCancel }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ leaveTypeId: "", fromDate: "", toDate: "", reason: "" });
  const [balanceWarning, setBalanceWarning] = useState("");

  const days = form.fromDate && form.toDate
    ? Math.max(0, Math.ceil((new Date(form.toDate).getTime() - new Date(form.fromDate).getTime()) / 86400000) + 1)
    : 0;

  const lopType = leaveTypes.find((lt: any) => lt.code === "LOP");
  const selectedType = leaveTypes.find((lt: any) => String(lt.id) === form.leaveTypeId);

  // When leave type or days change, validate balance for SL/CL
  const handleLeaveTypeChange = (v: string) => {
    setBalanceWarning("");
    const lt = leaveTypes.find((l: any) => String(l.id) === v);
    if (lt && (lt.code === "SL" || lt.code === "CL")) {
      const bal = leaveBalances?.find((b: any) => b.leave_type_id === lt.id);
      const available = Number(bal?.balance ?? 0);
      if (available <= 0) {
        const lopId = lopType ? String(lopType.id) : "";
        setBalanceWarning(`No ${lt.name} balance available. Switching to Loss of Pay (LOP).`);
        setForm(p => ({ ...p, leaveTypeId: lopId }));
        return;
      }
    }
    setForm(p => ({ ...p, leaveTypeId: v }));
  };

  // Re-validate when days change
  const checkBalanceForDays = (d: number) => {
    if (!selectedType || !["SL", "CL"].includes(selectedType.code)) { setBalanceWarning(""); return; }
    const bal = leaveBalances?.find((b: any) => b.leave_type_id === selectedType.id);
    const available = Number(bal?.balance ?? 0);
    if (d > available) {
      setBalanceWarning(`Only ${available} day(s) of ${selectedType.name} available. Consider Loss of Pay for excess days.`);
    } else {
      setBalanceWarning("");
    }
  };

  const mutation = useMutation({
    mutationFn: () => essFetch("/leaves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ess-leaves"] }); toast({ title: "Leave application submitted" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const balanceMap: Record<string, number> = {};
  (leaveBalances || []).forEach((b: any) => { balanceMap[b.leave_type_id] = Number(b.balance ?? 0); });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Leave Type <span className="text-destructive">*</span></Label>
          <Select value={form.leaveTypeId} onValueChange={handleLeaveTypeChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select leave type" /></SelectTrigger>
            <SelectContent>
              {leaveTypes.length === 0 && leavesError && (
                <div className="px-3 py-2 text-sm text-destructive">Failed to load leave types. Please close and try again.</div>
              )}
              {leaveTypes.length === 0 && !leavesError && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No leave types configured. Contact HR.</div>
              )}
              {leaveTypes.map((lt: any) => {
                const bal = balanceMap[lt.id];
                const showBal = lt.code !== "LOP" && lt.code !== "COMP" && bal !== undefined;
                return (
                  <SelectItem key={lt.id} value={String(lt.id)}>
                    <span>{lt.name}</span>
                    {showBal && <span className="ml-2 text-xs text-muted-foreground">({bal} day{bal !== 1 ? "s" : ""} left)</span>}
                    {lt.code === "COMP" && <span className="ml-2 text-xs text-muted-foreground">(for OT/holiday work)</span>}
                    {lt.code === "LOP" && <span className="ml-2 text-xs text-muted-foreground">(unpaid)</span>}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {balanceWarning && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{balanceWarning}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>From Date <span className="text-destructive">*</span></Label>
          <Input className="h-9" type="date" value={form.fromDate} onChange={e => {
            setForm(p => ({ ...p, fromDate: e.target.value }));
            if (form.toDate) {
              const d = Math.max(0, Math.ceil((new Date(form.toDate).getTime() - new Date(e.target.value).getTime()) / 86400000) + 1);
              checkBalanceForDays(d);
            }
          }} />
        </div>
        <div className="space-y-1.5">
          <Label>To Date <span className="text-destructive">*</span></Label>
          <Input className="h-9" type="date" value={form.toDate} min={form.fromDate} onChange={e => {
            setForm(p => ({ ...p, toDate: e.target.value }));
            if (form.fromDate) {
              const d = Math.max(0, Math.ceil((new Date(e.target.value).getTime() - new Date(form.fromDate).getTime()) / 86400000) + 1);
              checkBalanceForDays(d);
            }
          }} />
        </div>
      </div>
      {days > 0 && (
        <p className="text-sm text-muted-foreground">
          {days} day{days > 1 ? "s" : ""} selected
          {selectedType?.code === "LOP" && " · Unpaid"}
          {selectedType?.code === "COMP" && " · Compensatory Off (OT adjustment)"}
        </p>
      )}
      <div className="space-y-1.5">
        <Label>Reason{selectedType?.code === "COMP" ? " (mention OT date worked)" : ""}</Label>
        <Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
          placeholder={selectedType?.code === "COMP" ? "e.g. Worked on 14-Apr holiday..." : "Optional reason..."}
          className="min-h-[70px]" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.leaveTypeId || !form.fromDate || !form.toDate}>
          {mutation.isPending ? "Submitting..." : "Apply for Leave"}
        </Button>
      </div>
    </div>
  );
}

// ── TDS Declaration Form ──────────────────────────────────────────────────────
function EssDeclarationTab({ employee }: { employee: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fy, setFy] = useState(FISCAL_YEARS[0]);

  const { data: decl } = useQuery({
    queryKey: ["ess-declaration", fy],
    queryFn: () => essFetch(`/declaration?fiscalYear=${fy}`),
  });

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (decl) {
      setForm({
        regime: decl.regime || "new", licPremium: decl.lic_premium || "0", ppf: decl.ppf || "0",
        elss: decl.elss || "0", nsc: decl.nsc || "0", homeLoanPrincipal: decl.home_loan_principal || "0",
        fdTaxSaving: decl.fd_tax_saving || "0", other80c: decl.other_80c || "0",
        sec80dSelf: decl.sec_80d_self || "0", sec80dParents: decl.sec_80d_parents || "0",
        parentsSeniorCitizen: decl.parents_senior_citizen || false,
        rentPerMonth: decl.rent_per_month || "0", cityType: decl.city_type || "non_metro",
        homeLoanInterest: decl.home_loan_interest || "0", eduLoanInterest: decl.edu_loan_interest || "0",
        nps80ccd: decl.nps_80ccd || "0", sec80g: decl.sec_80g || "0",
        sec80tta: decl.sec_80tta || "0", otherDeductions: decl.other_deductions || "0", notes: decl.notes || "",
      });
    } else if (decl === null) {
      setForm({ regime: employee?.tax_regime || "new", licPremium:"0",ppf:"0",elss:"0",nsc:"0",homeLoanPrincipal:"0",fdTaxSaving:"0",other80c:"0",sec80dSelf:"0",sec80dParents:"0",parentsSeniorCitizen:false,rentPerMonth:"0",cityType:"non_metro",homeLoanInterest:"0",eduLoanInterest:"0",nps80ccd:"0",sec80g:"0",sec80tta:"0",otherDeductions:"0",notes:"" });
    }
  }, [decl, employee]);

  const saveMutation = useMutation({
    mutationFn: () => essFetch("/declaration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, fiscalYear: fy }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ess-declaration"] }); toast({ title: "Declaration saved successfully" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const total80c = Math.min(150000, ["licPremium","ppf","elss","nsc","homeLoanPrincipal","fdTaxSaving","other80c"].reduce((s, k) => s + Number(form[k]||0), 0));
  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const s = (k: string) => (v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const numCls = "h-9 text-right";

  return (
    <div className="space-y-4">
      {/* ── Declaration status banner ── */}
      {decl?.status === "approved" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Declaration Approved for {fy}</p>
            <p className="text-xs text-green-700 dark:text-green-300">Your investment declaration has been reviewed and approved by HR. Any updates will require re-approval.</p>
          </div>
        </div>
      )}
      {decl?.status === "rejected" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <XCircle className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Declaration Rejected</p>
            {decl.approver_comment && <p className="text-xs text-muted-foreground mt-0.5">HR note: {decl.approver_comment}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Please update your declaration and resubmit.</p>
          </div>
        </div>
      )}
      {decl?.status === "resubmitted" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">Declaration resubmitted — pending HR review</p>
        </div>
      )}
      {decl?.status === "submitted" && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <Clock className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">Declaration submitted — pending HR review for {fy}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-medium">Investment Declaration</h3>
          <p className="text-sm text-muted-foreground">Declare your investments for TDS computation</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{FISCAL_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          {!decl && <Badge variant="outline">Not submitted</Badge>}
        </div>
      </div>

      {/* ── Tax Regime selector (always visible, controls what's shown below) ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-md bg-muted/40 border">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Tax Regime</Label>
          <p className="text-xs text-muted-foreground">Your choice affects which deductions are available</p>
        </div>
        <Select value={form.regime||"new"} onValueChange={s("regime")}>
          <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="new">New Regime (Default)</SelectItem><SelectItem value="old">Old Regime</SelectItem></SelectContent>
        </Select>
      </div>

      {/* ── New Regime notice — no deductions available ── */}
      {(form.regime||"new") === "new" ? (
        <div className="flex items-start gap-3 p-4 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">No investment declarations required under New Regime</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Deductions under Section 80C, 80D, HRA, Home Loan Interest, etc. are <strong>not available</strong> in the New Tax Regime.</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">A standard deduction of <strong>₹75,000</strong> is automatically applied. Your TDS will be computed using the new slab rates.</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">To claim investment deductions, switch to <strong>Old Regime</strong> above.</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="80c">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="80c">Section 80C</TabsTrigger>
            <TabsTrigger value="80d">Section 80D</TabsTrigger>
            <TabsTrigger value="hra">HRA</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="80c" className="mt-4 space-y-3">
            <div className="flex justify-between text-sm p-2 rounded-md bg-muted/50">
              <span>Total 80C Declared: {fmtRs(["licPremium","ppf","elss","nsc","homeLoanPrincipal","fdTaxSaving","other80c"].reduce((s, k) => s + Number(form[k]||0), 0))}</span>
              <span className="font-medium">Eligible (capped ₹1.5L): {fmtRs(total80c)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[["licPremium","LIC Premium"],["ppf","PPF"],["elss","ELSS / Mutual Funds"],["nsc","NSC"],["homeLoanPrincipal","Home Loan Principal"],["fdTaxSaving","Tax-Saving FD (5 yr)"],["other80c","Others under 80C"]].map(([k,l]) => (
                <div key={k} className="space-y-1.5"><Label className="text-sm">{l}</Label><Input className={numCls} type="number" min="0" value={form[k]||"0"} onChange={f(k)} /></div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="80d" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Self & Family Premium (max ₹25,000)</Label><Input className={numCls} type="number" min="0" value={form.sec80dSelf||"0"} onChange={f("sec80dSelf")} /></div>
              <div className="space-y-1.5"><Label>Parents Premium</Label><Input className={numCls} type="number" min="0" value={form.sec80dParents||"0"} onChange={f("sec80dParents")} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="seniorCitizen" checked={!!form.parentsSeniorCitizen} onCheckedChange={v => setForm((p: any) => ({ ...p, parentsSeniorCitizen: !!v }))} />
              <Label htmlFor="seniorCitizen" className="text-sm">Parents are Senior Citizens (higher limit ₹50,000)</Label>
            </div>
          </TabsContent>

          <TabsContent value="hra" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Monthly Rent Paid (₹)</Label><Input className={numCls} type="number" min="0" value={form.rentPerMonth||"0"} onChange={f("rentPerMonth")} /></div>
              <div className="space-y-1.5">
                <Label>City Type</Label>
                <Select value={form.cityType||"non_metro"} onValueChange={s("cityType")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="metro">Metro City</SelectItem><SelectItem value="non_metro">Non-Metro</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="other" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[["homeLoanInterest","Home Loan Interest (Sec 24, max ₹2L)"],["eduLoanInterest","Education Loan Interest (80E)"],["nps80ccd","NPS (80CCD 1B, max ₹50K)"],["sec80g","Donations (80G)"],["sec80tta","Savings Interest (80TTA, max ₹10K)"],["otherDeductions","Other Deductions"]].map(([k,l]) => (
                <div key={k} className="space-y-1.5"><Label className="text-sm">{l}</Label><Input className={numCls} type="number" min="0" value={form[k]||"0"} onChange={f(k)} /></div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Declaration"}
        </Button>
      </div>
    </div>
  );
}

// ── ESS Expense Claims Tab ────────────────────────────────────────────────────
function EssExpensesTab({ employee }: { employee: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", amount: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });

  const { data: claims = [], isLoading } = useQuery<any[]>({
    queryKey: ["ess-expense-claims"],
    queryFn: () => essFetch("/expense-claims"),
  });

  const submitMutation = useMutation({
    mutationFn: () => essFetch("/expense-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ess-expense-claims"] });
      toast({ title: "Expense claim submitted" });
      setOpen(false);
      setForm({ title: "", category: "", amount: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const STATUS_COLOR: Record<string, any> = { draft: "secondary", submitted: "default", approved: "default", rejected: "destructive", paid: "default" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">My Expense Claims</h2>
        <Button size="sm" onClick={() => setOpen(true)} data-testid="button-new-claim">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Claim
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : (claims as any[]).length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Receipt className="h-8 w-8 mx-auto mb-2" />
          <p>No expense claims yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(claims as any[]).map((claim: any) => (
            <Card key={claim.id} data-testid={`card-claim-${claim.id}`}>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{claim.title}</p>
                    <p className="text-xs text-muted-foreground">{claim.category} · {claim.expense_date ? new Date(claim.expense_date).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">₹{Number(claim.amount || 0).toLocaleString("en-IN")}</span>
                    <Badge variant={STATUS_COLOR[claim.status] || "secondary"}>{claim.status}</Badge>
                  </div>
                </div>
                {claim.notes && <p className="text-xs text-muted-foreground mt-1">{claim.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Expense Claim</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" data-testid="input-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client meeting travel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" data-testid="select-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="Travel">Travel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Meals">Meals</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Communication">Communication</option>
                  <option value="Training">Training</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" type="number" min={0} data-testid="input-amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expense Date</Label>
              <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" type="date" data-testid="input-expense-date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]" data-testid="input-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !form.title || !form.amount || !form.category} data-testid="button-submit-claim">
                {submitMutation.isPending ? "Submitting..." : "Submit Claim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Change Password Dialog ────────────────────────────────────────────────────
function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const mutation = useMutation({
    mutationFn: () => {
      if (form.newPassword !== form.confirmPassword) throw new Error("New passwords don't match");
      return essFetch("/change-password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) });
    },
    onSuccess: () => { toast({ title: "Password changed successfully" }); onClose(); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {[["currentPassword","Current Password"],["newPassword","New Password"],["confirmPassword","Confirm New Password"]].map(([k,l]) => (
            <div key={k} className="space-y-1.5">
              <Label>{l}</Label>
              <Input className="h-9" type="password" value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ESS Portal ───────────────────────────────────────────────────────────
export default function EssPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("home");
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [viewPayslip, setViewPayslip] = useState<number | null>(null);
  const [attMonth, setAttMonth] = useState(String(new Date().getMonth() + 1));
  const [attYear, setAttYear] = useState(String(new Date().getFullYear()));

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: me, isLoading: meLoading, error: meError } = useQuery({
    queryKey: ["ess-me"],
    queryFn: () => essFetch("/me"),
    retry: false,
  });

  const { data: payslips = [] } = useQuery<any[]>({
    queryKey: ["ess-payslips"],
    queryFn: () => essFetch("/payslips"),
    enabled: !!me,
  });

  const { data: attendanceData = [] } = useQuery<any[]>({
    queryKey: ["ess-attendance", attMonth, attYear],
    queryFn: () => essFetch(`/attendance?month=${attMonth}&year=${attYear}`),
    enabled: !!me,
  });

  const { data: leavesData, error: leavesError } = useQuery({
    queryKey: ["ess-leaves"],
    queryFn: () => essFetch("/leaves"),
    enabled: !!me,
    retry: 1,
  });

  // Today's attendance status (for check-in/out card)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayMonth = String(new Date().getMonth() + 1);
  const todayYear = String(new Date().getFullYear());
  const todayRec = (attendanceData as any[]).find((a: any) => String(a.date).split("T")[0] === todayStr);

  const markAttendance = useMutation({
    mutationFn: () => essFetch("/attendance/mark", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ess-attendance"] });
      toast({ title: "Attendance marked successfully" });
    },
    onError: () => toast({ title: "Failed to mark attendance", variant: "destructive" }),
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (meError) setLocation("/ess");
  }, [meError]);

  const handleLogout = async () => {
    await fetch("/api/ess/logout", { method: "POST", credentials: "include" });
    qc.clear();
    setLocation("/ess");
  };

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!me) return null;

  const leaveBalances = leavesData?.balances || [];
  const leaveApplications = leavesData?.applications || [];
  const leaveTypes = leavesData?.leaveTypes || [];

  const presentDays = attendanceData.filter((a: any) => a.status === "present").length;
  const absentDays = attendanceData.filter((a: any) => a.status === "absent").length;
  const halfDays = attendanceData.filter((a: any) => a.status === "half_day").length;

  const latestPayslip = (payslips as any[])[0];
  const totalEL = leaveBalances.find((b: any) => b.type_code === "EL")?.balance || 0;
  const totalSL = leaveBalances.find((b: any) => b.type_code === "SL")?.balance || 0;

  // Define which tabs each employee type gets
  const empType = (me.employee_type || "permanent").toLowerCase();

  const ALL_NAV_ITEMS = [
    { id: "home",        label: "Home",            icon: Home,         types: ["permanent", "consultant", "contract", "intern"] },
    { id: "payslips",    label: "Pay Slips",        icon: IndianRupee,  types: ["permanent", "consultant", "contract", "intern"] },
    { id: "attendance",  label: "Attendance",       icon: Calendar,     types: ["permanent", "consultant", "contract", "intern"] },
    { id: "leaves",      label: "Leave",            icon: Clock,        types: ["permanent", "intern"] },
    { id: "declaration", label: "Tax Declaration",  icon: Shield,       types: ["permanent", "consultant", "contract", "intern"] },
    { id: "expenses",    label: "Expense Claims",   icon: Receipt,      types: ["permanent", "consultant", "contract", "intern"] },
    { id: "profile",     label: "My Profile",       icon: User,         types: ["permanent", "consultant", "contract", "intern"] },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.types.includes(empType));

  // If the current tab isn't accessible for this employee type, reset to home
  const allowedTabIds = NAV_ITEMS.map(n => n.id);
  const activeTab = allowedTabIds.includes(tab) ? tab : "home";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-tight">{me.first_name} {me.last_name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize font-medium">{empType}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{me.emp_code} · {me.tenant_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowChangePw(true)}>
              <Lock className="h-3.5 w-3.5 mr-1.5" />Password
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-4 flex-1 space-y-4">
        {/* Nav tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              data-testid={`nav-ess-${item.id}`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        {/* ── HOME ── */}
        {tab === "home" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Avatar className="h-14 w-14">
                <AvatarImage src={me.photo_path ? `/${me.photo_path}` : undefined} />
                <AvatarFallback className="text-lg">{me.first_name?.[0]}{me.last_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg">Welcome back, {me.first_name}!</h2>
                <p className="text-sm text-muted-foreground">{me.designation_name || "—"} · {me.department_name || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Joined: {me.join_date} · {me.tenant_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Latest Net Pay", value: latestPayslip ? fmtRs(latestPayslip.net_salary) : "—", sub: latestPayslip ? `${MONTH_NAMES[latestPayslip.month]} ${latestPayslip.year}` : "No payslip yet", icon: IndianRupee, color: "bg-green-500/10", iconColor: "text-green-600" },
                { label: "EL Balance", value: `${totalEL} days`, sub: "Earned Leave", icon: Clock, color: "bg-blue-500/10", iconColor: "text-blue-600" },
                { label: "SL Balance", value: `${totalSL} days`, sub: "Sick Leave", icon: Clock, color: "bg-orange-500/10", iconColor: "text-orange-600" },
                { label: "Total Payslips", value: (payslips as any[]).length, sub: "All time", icon: FileText, color: "bg-purple-500/10", iconColor: "text-purple-600" },
              ].map(item => (
                <Card key={item.label}><CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-full ${item.color} flex items-center justify-center shrink-0`}>
                      <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestPayslip && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Latest Payslip — {MONTH_NAMES[latestPayslip.month]} {latestPayslip.year}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[["Gross Salary", fmtRs(latestPayslip.gross_salary)], ["Total Deductions", fmtRs(latestPayslip.total_deductions)], ["Net Pay", fmtRs(latestPayslip.net_salary)]].map(([l, v], i) => (
                      <div key={l} className={`flex justify-between text-sm py-1 ${i > 0 ? "border-t" : ""}`}>
                        <span className="text-muted-foreground">{l}</span>
                        <span className={i === 2 ? "font-bold" : "font-medium"}>{v}</span>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => { setViewPayslip(latestPayslip.id); }}>
                      <FileText className="h-3.5 w-3.5 mr-1.5" />View Full Payslip
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Leave Balances</CardTitle></CardHeader>
                <CardContent>
                  {leaveBalances.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">No leave balances found</p> : (
                    <div className="space-y-2">
                      {leaveBalances.slice(0, 4).map((lb: any) => (
                        <div key={lb.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <span className="text-muted-foreground">{lb.leave_type_name}</span>
                          <span className="font-medium">{lb.balance} days</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => setShowLeaveForm(true)}>
                    Apply for Leave
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── PAYSLIPS ── */}
        {tab === "payslips" && (
          <div className="space-y-3">
            <h2 className="font-semibold">Pay Slips</h2>
            {(payslips as any[]).length === 0 ? (
              <div className="text-center py-12">
                <IndianRupee className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No payslips available yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(payslips as any[]).map((ps: any) => (
                  <Card key={ps.id} className="hover-elevate cursor-pointer" onClick={() => setViewPayslip(ps.id)} data-testid={`card-payslip-${ps.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{MONTH_NAMES[ps.month]} {ps.year}</p>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Gross: {fmtRs(ps.gross_salary)}</span>
                            <span>Deductions: {fmtRs(ps.total_deductions)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold">{fmtRs(ps.net_salary)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {tab === "attendance" && (
          <div className="space-y-4">
            {/* ── Today's Check-In / Check-Out Card ── */}
            {attMonth === todayMonth && attYear === todayYear && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-semibold">Today — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
                      {todayRec?.check_in_time && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          In: <span className="font-medium text-foreground">{todayRec.check_in_time}</span>
                          {todayRec.check_out_time && <> &nbsp;·&nbsp; Out: <span className="font-medium text-foreground">{todayRec.check_out_time}</span></>}
                          {todayRec.working_hours && <> &nbsp;·&nbsp; <span className="font-medium text-green-600">{todayRec.working_hours}h worked</span></>}
                        </p>
                      )}
                      {!todayRec?.check_in_time && (
                        <p className="text-xs text-muted-foreground mt-0.5">Not yet checked in today</p>
                      )}
                    </div>
                    <div>
                      {(!todayRec || !todayRec.check_in_time) && (
                        <Button
                          size="sm"
                          onClick={() => markAttendance.mutate()}
                          disabled={markAttendance.isPending}
                          data-testid="btn-check-in"
                        >
                          Check In
                        </Button>
                      )}
                      {todayRec?.check_in_time && !todayRec?.check_out_time && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAttendance.mutate()}
                          disabled={markAttendance.isPending}
                          data-testid="btn-check-out"
                        >
                          Check Out
                        </Button>
                      )}
                      {todayRec?.check_in_time && todayRec?.check_out_time && (
                        <span className="text-xs text-muted-foreground">Attendance complete for today</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold">Monthly View</h2>
              <div className="flex gap-2">
                <Select value={attMonth} onValueChange={setAttMonth}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTH_NAMES.slice(1).map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={attYear} onValueChange={setAttYear}>
                  <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{[2026,2025,2024,2023].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[["Present", presentDays, "text-green-600"], ["Absent", absentDays, "text-destructive"], ["Half Day", halfDays, "text-orange-600"]].map(([l, v, c]) => (
                <Card key={l as string}><CardContent className="pt-4 text-center">
                  <p className={`text-2xl font-bold ${c}`}>{v}</p>
                  <p className="text-xs text-muted-foreground">{l}</p>
                </CardContent></Card>
              ))}
            </div>

            {attendanceData.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No attendance records for this period</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    {["Date", "Status", "In Time", "Out Time", "Hours"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {attendanceData.map((a: any) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-3 py-2.5">{a.date}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "outline"} className="capitalize text-xs">
                            {a.status?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{a.check_in_time || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{a.check_out_time || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{a.working_hours ? `${a.working_hours}h` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── LEAVES ── */}
        {tab === "leaves" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Leave Management</h2>
              <Button onClick={() => setShowLeaveForm(true)} data-testid="btn-ess-apply-leave">
                Apply for Leave
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {leaveBalances.map((lb: any) => (
                <Card key={lb.id}><CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{lb.balance}</p>
                  <p className="text-xs text-muted-foreground">{lb.leave_type_name}</p>
                </CardContent></Card>
              ))}
            </div>

            <h3 className="font-medium text-sm">Recent Applications</h3>
            {leaveApplications.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No leave applications yet</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    {["Type","From","To","Days","Status","Reason"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {leaveApplications.map((la: any) => (
                      <tr key={la.id} className="border-t">
                        <td className="px-3 py-2.5">{la.leave_type_name}</td>
                        <td className="px-3 py-2.5">{la.from_date}</td>
                        <td className="px-3 py-2.5">{la.to_date}</td>
                        <td className="px-3 py-2.5">{la.days}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={la.status === "approved" ? "default" : la.status === "rejected" ? "destructive" : "outline"} className="capitalize text-xs">
                            {la.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{la.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── DECLARATION ── */}
        {tab === "declaration" && <EssDeclarationTab employee={me} />}

        {/* ── EXPENSE CLAIMS ── */}
        {tab === "expenses" && <EssExpensesTab employee={me} />}

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <h2 className="font-semibold">My Profile</h2>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40">
              <Avatar className="h-16 w-16">
                <AvatarImage src={me.photo_path ? `/${me.photo_path}` : undefined} />
                <AvatarFallback className="text-xl">{me.first_name?.[0]}{me.last_name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{me.first_name} {me.last_name}</h3>
                <p className="text-sm text-muted-foreground">{me.designation_name || "—"} · {me.department_name || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Employment Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[["Employee Code", me.emp_code], ["Join Date", me.join_date], ["Shift", me.shift_name || "—"], ["Status", me.status]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[["Phone", me.phone || "—"], ["Email", me.email || "—"], ["PAN", me.pan || "—"], ["PF Number", me.pf_number || "—"], ["ESI Number", me.esi_number || "—"]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[["Bank Name", me.bank_name || "—"], ["Account Number", me.bank_account || "—"], ["IFSC Code", me.ifsc || "—"]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Salary Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[["Basic Salary", fmtRs(me.basic_salary)], ["Tax Regime", me.tax_regime === "old" ? "Old Regime" : "New Regime (Default)"]].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setShowChangePw(true)}>
                    <Lock className="h-3.5 w-3.5 mr-1.5" />Change ESS Password
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Payslip detail dialog */}
      <Dialog open={!!viewPayslip} onOpenChange={v => !v && setViewPayslip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Payslip</DialogTitle></DialogHeader>
          {viewPayslip && <PayslipDetail payslipId={viewPayslip} onClose={() => setViewPayslip(null)} />}
        </DialogContent>
      </Dialog>

      {/* Leave form dialog */}
      <Dialog open={showLeaveForm} onOpenChange={v => !v && setShowLeaveForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <ApplyLeaveForm leaveTypes={leaveTypes} leaveBalances={leaveBalances} leavesError={leavesError} onSave={() => setShowLeaveForm(false)} onCancel={() => setShowLeaveForm(false)} />
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog open={showChangePw} onClose={() => setShowChangePw(false)} />
    </div>
  );
}
