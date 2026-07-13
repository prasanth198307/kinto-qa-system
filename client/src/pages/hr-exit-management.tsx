import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import {
  UserX, Clock, CheckCircle2, Search, AlertCircle,
  Calendar, FileText, TrendingDown, Users, DoorOpen,
  Calculator, Printer, IndianRupee
} from "lucide-react";

const EXIT_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "absconding", label: "Absconding" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "other", label: "Other" },
];

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN");
const fmtRs = (n: any) => `${sym}${fmt(n)}`;

// ── Process Exit Dialog ───────────────────────────────────────────────────────
function ProcessExitDialog({ emp, open, onClose }: { emp: any; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    resignationDate: emp?.resignation_date || "",
    exitDate: emp?.exit_date || "",
    exitType: emp?.exit_type || "",
    exitReason: emp?.exit_reason || "",
    status: emp?.status || "on_notice",
  });

  const f = (key: string) => (e: any) => setForm(p => ({ ...p, [key]: e.target.value }));
  const s = (key: string) => (v: string) => setForm(p => ({ ...p, [key]: v }));

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PUT", `/api/hr/employees/${emp.id}`, {
      ...emp,
      departmentId: emp.department_id,
      designationId: emp.designation_id,
      shiftId: emp.shift_id,
      salaryStructureId: emp.salary_structure_id,
      reportingManagerId: emp.reporting_manager_id,
      basicSalary: emp.basic_salary,
      numberOfChildren: emp.number_of_children || 0,
      joinDate: emp.join_date,
      ...payload,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Exit processed successfully" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.exitType) {
      toast({ title: "Please select exit type", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      resignationDate: form.resignationDate || null,
      exitDate: form.exitDate || null,
      exitType: form.exitType,
      exitReason: form.exitReason || null,
      status: form.status,
    });
  };

  if (!emp) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Exit — {emp.first_name} {emp.last_name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
          <Avatar className="h-9 w-9">
            <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
            <AvatarFallback className="text-xs">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{emp.first_name} {emp.last_name} · {emp.emp_code}</p>
            <p className="text-xs text-muted-foreground">{emp.designation_name || "—"} · {emp.department_name || "—"}</p>
            <p className="text-xs text-muted-foreground">Joined: {emp.join_date}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Resignation / Notice Date</Label>
              <Input className="h-9" type="date" value={form.resignationDate} onChange={f("resignationDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Working Date</Label>
              <Input className="h-9" type="date" value={form.exitDate} onChange={f("exitDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Exit Type <span className="text-destructive">*</span></Label>
            <Select value={form.exitType} onValueChange={s("exitType")}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select reason for leaving" /></SelectTrigger>
              <SelectContent>
                {EXIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Exit Reason / Remarks</Label>
            <Textarea value={form.exitReason} onChange={f("exitReason")} placeholder="Reason for leaving, any notes..." className="min-h-[80px]" />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Update Employee Status</Label>
            <Select value={form.status} onValueChange={s("status")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (no change)</SelectItem>
                <SelectItem value="on_notice">On Notice Period</SelectItem>
                <SelectItem value="inactive">Inactive (exit complete)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Set to "Inactive" once the employee has left.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="btn-save-exit">
            {saveMutation.isPending ? "Saving..." : "Save Exit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── F&F Settlement Dialog ──────────────────────────────────────────────────────
function FnFDialog({ employees, existing, open, onClose }: { employees: any[]; existing?: any; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [empId, setEmpId] = useState(existing?.employee_id ? String(existing.employee_id) : "");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [settlementDate, setSettlementDate] = useState(existing?.settlement_date || new Date().toISOString().slice(0, 10));
  const [calc, setCalc] = useState<any>(existing || null);
  const [overrides, setOverrides] = useState<any>({
    noticeServedDays: existing?.notice_served_days || 0,
    bonusArrears: existing?.bonus_arrears || 0,
    otherAdditions: existing?.other_additions || 0,
    otherDeductions: existing?.other_deductions || 0,
    tdsOnSettlement: existing?.tds_on_settlement || 0,
    notes: existing?.notes || "",
  });

  const calcMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/fnf/calculate", { employeeId: empId, settlementDate }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data: any) => {
      setCalc(data);
      setOverrides(p => ({ ...p, noticeServedDays: data.noticeServedDays }));
    },
    onError: (e: any) => toast({ title: "Calculation failed", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: (status: string) => {
      if (!calc) return Promise.reject(new Error("No calculation"));
      const noticeRecovery = Math.max(0, (Number(calc.noticePeriodDays) - Number(overrides.noticeServedDays)) * (Number(calc.pendingSalary) / 26));
      const noticePay = 0;
      const gross = Number(calc.pendingSalary) + Number(calc.elEncashmentAmount) + Number(calc.gratuityAmount) + Number(overrides.bonusArrears) + Number(overrides.otherAdditions);
      const totalDed = Number(noticeRecovery) + Number(overrides.otherDeductions);
      const netSettlement = gross - totalDed - Number(overrides.tdsOnSettlement);
      return apiRequest("POST", "/api/hr/fnf", {
        employeeId: empId, settlementDate, lastWorkingDate: calc.lastWorkingDate,
        noticePeriodDays: calc.noticePeriodDays, noticeServedDays: overrides.noticeServedDays,
        pendingSalaryDays: calc.pendingSalaryDays, pendingSalary: calc.pendingSalary,
        elEncashmentDays: calc.elEncashmentDays, elEncashmentAmount: calc.elEncashmentAmount,
        gratuityAmount: calc.gratuityAmount, noticeRecovery, noticePay,
        bonusArrears: overrides.bonusArrears, otherAdditions: overrides.otherAdditions,
        otherDeductions: overrides.otherDeductions, grossSettlement: gross,
        tdsOnSettlement: overrides.tdsOnSettlement, netSettlement, status, notes: overrides.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/fnf"] });
      toast({ title: "F&F settlement saved" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const o = (k: string) => (e: any) => setOverrides((p: any) => ({ ...p, [k]: e.target.value }));

  const noticeRecovery = calc ? Math.max(0, (Number(calc.noticePeriodDays) - Number(overrides.noticeServedDays)) * (Number(calc.pendingSalary) / 26)) : 0;
  const gross = calc ? Number(calc.pendingSalary) + Number(calc.elEncashmentAmount) + Number(calc.gratuityAmount) + Number(overrides.bonusArrears) + Number(overrides.otherAdditions) : 0;
  const netSettlement = gross - noticeRecovery - Number(overrides.otherDeductions) - Number(overrides.tdsOnSettlement);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Full & Final Settlement</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Employee</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter((e: any) => e.status !== "active" || e.exit_date).map((e: any) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Settlement Date</Label>
            <Input className="h-9" type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} />
          </div>
        </div>

        <Button variant="outline" onClick={() => calcMutation.mutate()} disabled={!empId || calcMutation.isPending}>
          <Calculator className="h-4 w-4 mr-1.5" />{calcMutation.isPending ? "Calculating..." : "Auto-Calculate"}
        </Button>

        {calc && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted/50 text-sm space-y-1">
              <p><span className="text-muted-foreground">Years Served: </span><span className="font-medium">{calc.yearsServed} years</span></p>
              <p><span className="text-muted-foreground">Days in Last Month: </span><span className="font-medium">{calc.pendingSalaryDays} days</span></p>
              {calc.yearsServed >= 5 && <p className="text-green-700 dark:text-green-400">Gratuity eligible (5+ years)</p>}
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Component</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (${sym})</th>
                </tr></thead>
                <tbody>
                  <tr className="border-t bg-green-50 dark:bg-green-950/20">
                    <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Earnings</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Pending Salary ({calc.pendingSalaryDays} days)</td>
                    <td className="px-3 py-2 text-right">{fmtRs(calc.pendingSalary)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">EL Encashment ({calc.elEncashmentDays} days)</td>
                    <td className="px-3 py-2 text-right">{fmtRs(calc.elEncashmentAmount)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">Gratuity</td>
                    <td className="px-3 py-2 text-right">{fmtRs(calc.gratuityAmount)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      Bonus / Arrears
                      <Input type="number" min="0" className="h-7 w-28 mt-1 text-right" value={overrides.bonusArrears} onChange={o("bonusArrears")} />
                    </td>
                    <td className="px-3 py-2 text-right align-top">{fmtRs(overrides.bonusArrears)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      Other Additions
                      <Input type="number" min="0" className="h-7 w-28 mt-1 text-right" value={overrides.otherAdditions} onChange={o("otherAdditions")} />
                    </td>
                    <td className="px-3 py-2 text-right align-top">{fmtRs(overrides.otherAdditions)}</td>
                  </tr>
                  <tr className="border-t font-semibold bg-muted/30">
                    <td className="px-3 py-2">Gross Settlement</td>
                    <td className="px-3 py-2 text-right">{fmtRs(Math.round(gross))}</td>
                  </tr>
                  <tr className="border-t bg-red-50 dark:bg-red-950/20">
                    <td colSpan={2} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Deductions</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      Notice Recovery ({calc.noticePeriodDays}d required, served:
                      <Input type="number" min="0" max={calc.noticePeriodDays} className="h-7 w-16 mx-1 inline-block text-right" value={overrides.noticeServedDays} onChange={o("noticeServedDays")} />d)
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">{noticeRecovery > 0 ? `(${fmtRs(Math.round(noticeRecovery))})` : "—"}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      Other Deductions
                      <Input type="number" min="0" className="h-7 w-28 mt-1 text-right" value={overrides.otherDeductions} onChange={o("otherDeductions")} />
                    </td>
                    <td className="px-3 py-2 text-right text-destructive align-top">{Number(overrides.otherDeductions) ? `(${fmtRs(overrides.otherDeductions)})` : "—"}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2">
                      TDS on Settlement
                      <Input type="number" min="0" className="h-7 w-28 mt-1 text-right" value={overrides.tdsOnSettlement} onChange={o("tdsOnSettlement")} />
                    </td>
                    <td className="px-3 py-2 text-right text-destructive align-top">{Number(overrides.tdsOnSettlement) ? `(${fmtRs(overrides.tdsOnSettlement)})` : "—"}</td>
                  </tr>
                  <tr className="border-t font-bold bg-muted/50">
                    <td className="px-3 py-3 text-base">Net Settlement Amount</td>
                    <td className="px-3 py-3 text-right text-lg">{fmtRs(Math.round(netSettlement))}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={overrides.notes} onChange={o("notes")} placeholder="Any remarks..." className="min-h-[60px]" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button variant="outline" onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isPending}>Save as Draft</Button>
              <Button onClick={() => saveMutation.mutate("finalized")} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Finalize Settlement"}
              </Button>
            </div>
          </div>
        )}

        {!calc && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Employee Row ──────────────────────────────────────────────────────────────
function ExitEmployeeRow({ emp, onProcess, onFnF }: { emp: any; onProcess: () => void; onFnF: () => void }) {
  const today = new Date();
  const daysToExit = emp.exit_date ? Math.ceil((new Date(emp.exit_date).getTime() - today.getTime()) / 86400000) : null;

  return (
    <tr className="border-t" data-testid={`row-exit-${emp.id}`}>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
            <AvatarFallback className="text-xs">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
            <p className="text-xs text-muted-foreground">{emp.emp_code} · {emp.department_name || "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground">{emp.designation_name || "—"}</td>
      <td className="px-3 py-3 text-sm">{emp.resignation_date || <span className="text-muted-foreground">—</span>}</td>
      <td className="px-3 py-3 text-sm">
        {emp.exit_date ? (
          <span className={daysToExit !== null && daysToExit < 0 ? "text-destructive font-medium" : daysToExit !== null && daysToExit <= 7 ? "text-orange-600 font-medium" : ""}>
            {emp.exit_date}
            {daysToExit !== null && daysToExit >= 0 && <span className="ml-1 text-xs text-muted-foreground">({daysToExit}d left)</span>}
            {daysToExit !== null && daysToExit < 0 && <span className="ml-1 text-xs">(overdue)</span>}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3 text-sm capitalize">
        {emp.exit_type ? EXIT_TYPES.find(t => t.value === emp.exit_type)?.label || emp.exit_type : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3">
        <Badge variant={emp.status === "inactive" ? "secondary" : emp.status === "on_notice" ? "outline" : "default"} className="capitalize text-xs">
          {emp.status === "on_notice" ? "On Notice" : emp.status}
        </Badge>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="outline" onClick={onFnF} data-testid={`btn-fnf-${emp.id}`}>
            <IndianRupee className="h-3.5 w-3.5 mr-1" />F&F
          </Button>
          <Button size="sm" variant="ghost" onClick={onProcess} data-testid={`btn-process-exit-${emp.id}`}>
            <DoorOpen className="h-3.5 w-3.5 mr-1" />{emp.status === "inactive" ? "Edit" : "Process"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HrExitManagement() {
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<any>(null);
  const [fnfEmp, setFnfEmp] = useState<any>(null);
  const [showFnF, setShowFnF] = useState(false);

  const { data: employees = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });
  const { data: settlements = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/fnf"],
    queryFn: async () => { const r = await fetch("/api/hr/fnf", { credentials: "include" }); return r.json(); },
  });

  const onNotice = employees.filter((e: any) => e.status === "on_notice" || (e.status === "active" && (e.resignation_date || e.exit_date)));
  const exited = employees.filter((e: any) => e.status === "inactive" && e.exit_date);
  const allExitRelated = employees.filter((e: any) => e.status === "inactive" || e.status === "on_notice" || e.resignation_date || e.exit_date);

  const filterBySearch = (list: any[]) => !search ? list : list.filter((e: any) =>
    `${e.first_name} ${e.last_name} ${e.emp_code}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = employees.filter((e: any) => e.status === "active").length;
  const totalInactive = employees.filter((e: any) => e.status === "inactive").length;
  const totalOnNotice = employees.filter((e: any) => e.status === "on_notice").length;
  const exitTypeBreakdown = exited.reduce((acc: any, e: any) => { const key = e.exit_type || "unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const attritionRate = employees.length > 0 ? ((totalInactive / employees.length) * 100).toFixed(1) : "0.0";

  const TableHeaders = ({ showFnFCol = true }) => (
    <thead className="bg-muted/50">
      <tr>
        {["Employee", "Designation", "Resignation Date", "Last Working Day", "Exit Type", "Status", "Actions"].map(h => (
          <th key={h} className={`px-3 py-2.5 text-left text-sm font-medium text-muted-foreground ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Exit Management</h1>
          <p className="text-sm text-muted-foreground">Manage separations, offboarding, and Full & Final settlements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setFnfEmp(null); setShowFnF(true); }} data-testid="btn-new-fnf">
            <Calculator className="h-4 w-4 mr-1.5" />F&F Settlement
          </Button>
          <Button onClick={() => { const activeEmp = employees.find((e: any) => e.status === "active" && !e.exit_date); if (activeEmp) setProcessing(activeEmp); }} data-testid="btn-initiate-exit">
            <UserX className="h-4 w-4 mr-1.5" />Initiate Exit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", value: totalActive, color: "bg-green-500/10", icon: Users, iconColor: "text-green-600" },
          { label: "On Notice", value: totalOnNotice, color: "bg-orange-500/10", icon: Clock, iconColor: "text-orange-600" },
          { label: "Exited", value: totalInactive, color: "bg-muted", icon: UserX, iconColor: "text-muted-foreground" },
          { label: "Attrition Rate", value: `${attritionRate}%`, color: "bg-destructive/10", icon: TrendingDown, iconColor: "text-destructive" },
        ].map(item => (
          <Card key={item.label}><CardContent className="pt-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full ${item.color} flex items-center justify-center`}>
              <item.icon className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8 h-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-exit" />
      </div>

      <Tabs defaultValue="on-notice">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="on-notice">On Notice {totalOnNotice > 0 && <Badge variant="outline" className="ml-1.5 text-xs">{totalOnNotice}</Badge>}</TabsTrigger>
          <TabsTrigger value="exited">Exited {totalInactive > 0 && <Badge variant="outline" className="ml-1.5 text-xs">{totalInactive}</Badge>}</TabsTrigger>
          <TabsTrigger value="all">All Exit Records</TabsTrigger>
          <TabsTrigger value="fnf">F&F Settlements {(settlements as any[]).length > 0 && <Badge variant="outline" className="ml-1.5 text-xs">{(settlements as any[]).length}</Badge>}</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {["on-notice", "exited", "all"].map(tabVal => {
          const list = tabVal === "on-notice" ? onNotice : tabVal === "exited" ? exited : allExitRelated;
          return (
            <TabsContent key={tabVal} value={tabVal} className="mt-4">
              {list.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">{tabVal === "on-notice" ? "No employees on notice" : tabVal === "exited" ? "No exit records yet" : "No exit records found"}</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <TableHeaders />
                    <tbody>
                      {filterBySearch(list).map((emp: any) => (
                        <ExitEmployeeRow key={emp.id} emp={emp} onProcess={() => setProcessing(emp)} onFnF={() => { setFnfEmp(emp); setShowFnF(true); }} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="fnf" className="mt-4">
          {(settlements as any[]).length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No F&F settlements yet</p>
              <Button className="mt-3" variant="outline" onClick={() => setShowFnF(true)}>Create First Settlement</Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  {["Employee", "Settlement Date", "Pending Salary", "EL Encashment", "Gratuity", "Net Settlement", "Status", ""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(settlements as any[]).map((s: any) => (
                    <tr key={s.id} className="border-t hover-elevate" data-testid={`row-fnf-${s.id}`}>
                      <td className="px-3 py-2.5 font-medium">{s.first_name} {s.last_name}<br/><span className="text-xs text-muted-foreground">{s.emp_code}</span></td>
                      <td className="px-3 py-2.5">{s.settlement_date}</td>
                      <td className="px-3 py-2.5">{fmtRs(s.pending_salary)}</td>
                      <td className="px-3 py-2.5">{fmtRs(s.el_encashment_amount)}</td>
                      <td className="px-3 py-2.5">{fmtRs(s.gratuity_amount)}</td>
                      <td className="px-3 py-2.5 font-semibold">{fmtRs(s.net_settlement)}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={s.status === "finalized" ? "default" : "outline"}>{s.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Button size="sm" variant="ghost" onClick={() => window.print()}>
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Exit Type Breakdown</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(exitTypeBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No exit data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(exitTypeBreakdown).map(([type, count]: any) => {
                      const pct = exited.length > 0 ? Math.round((count / exited.length) * 100) : 0;
                      const label = EXIT_TYPES.find(t => t.value === type)?.label || type;
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-medium">{count} ({pct}%)</span></div>
                          <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Workforce Overview</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Employees (ever)", value: employees.length, color: "bg-blue-500" },
                  { label: "Currently Active", value: totalActive, color: "bg-green-500" },
                  { label: "On Notice Period", value: totalOnNotice, color: "bg-orange-500" },
                  { label: "Exited / Inactive", value: totalInactive, color: "bg-muted-foreground" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><div className={`h-2.5 w-2.5 rounded-full ${item.color}`} /><span className="text-muted-foreground">{item.label}</span></div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Attrition Rate</span>
                  <span className="font-semibold text-destructive">{attritionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {processing && (
        <ProcessExitDialog emp={processing} open={!!processing} onClose={() => setProcessing(null)} />
      )}

      {showFnF && (
        <FnFDialog
          employees={allExitRelated.length > 0 ? allExitRelated : employees}
          existing={fnfEmp ? settlements.find((s: any) => s.employee_id === fnfEmp.id) : undefined}
          open={showFnF}
          onClose={() => { setShowFnF(false); setFnfEmp(null); }}
        />
      )}
    </div>
  );
}
