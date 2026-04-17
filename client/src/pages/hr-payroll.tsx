import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Play, CheckCircle, Lock, Eye, Plus, Unlock, Download,
  MessageCircle, Mail, IndianRupee, Users, ExternalLink, Settings2, FileArchive, SlidersHorizontal
} from "lucide-react";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  locked: { label: "Locked", variant: "outline" },
};

function fmt(n: any) { return Number(n || 0).toLocaleString("en-IN"); }

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1];

export default function HRPayrollPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRun, setViewRun] = useState<any>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendRun, setSendRun] = useState<any>(null);
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(currentYear));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingTab, setSettingTab] = useState<"company"|"options"|"signatory"|"preview">("company");
  const [settingsForm, setSettingsForm] = useState({
    signatoryName: "", signatoryDesignation: "", showEmployerContributions: true, showLoanDeductions: true, footerNote: "",
    companyName: "", companyAddress: "", companyCity: "", companyState: "", companyPin: "", companyPhone: "", companyEmail: "",
    companyGstin: "", companyCin: "", templateStyle: "classic",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPayslip, setAdjustPayslip] = useState<any>(null);
  const [adjustComps, setAdjustComps] = useState<any[]>([]);
  const [newCompName, setNewCompName] = useState("");
  const [newCompAmt, setNewCompAmt] = useState("");

  const { data: runs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/payroll-runs"] });

  const { data: psSettings } = useQuery<any>({
    queryKey: ["/api/hr/payslip-settings"],
    queryFn: () => fetch("/api/hr/payslip-settings", { credentials: "include" }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d) setSettingsForm({
        signatoryName: d.signatory_name || "",
        signatoryDesignation: d.signatory_designation || "",
        showEmployerContributions: d.show_employer_contributions !== false,
        showLoanDeductions: d.show_loan_deductions !== false,
        footerNote: d.footer_note || "",
      });
    },
  } as any);

  const { data: payslips = [], isLoading: psLoading } = useQuery({
    queryKey: ["/api/hr/payroll-runs", viewRun?.id, "payslips"],
    queryFn: () => viewRun
      ? fetch(`/api/hr/payroll-runs/${viewRun.id}/payslips`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!viewRun,
  });

  const createRun = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/hr/payroll-runs", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] }); setCreateOpen(false); toast({ title: "Payroll run created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const processRun = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/hr/payroll-runs/${id}/process`, {}).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] });
      if (viewRun) queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs", viewRun.id, "payslips"] });
      toast({ title: `Payroll processed for ${data.employeeCount} employees` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveRun = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/hr/payroll-runs/${id}/approve`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] }); toast({ title: "Payroll approved" }); },
  });

  const lockRun = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/hr/payroll-runs/${id}/lock`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] }); toast({ title: "Payroll locked" }); },
  });

  const doUnlock = useMutation({
    mutationFn: ({ id, reason }: any) => apiRequest("PUT", `/api/hr/payroll-runs/${id}/unlock`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] });
      setUnlockOpen(false); setUnlockReason(""); setUnlockTarget(null);
      toast({ title: "Payroll unlocked successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendWhatsApp = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/hr/payroll-runs/${id}/send-whatsapp`, {}).then(r => r.json()),
    onSuccess: (data: any) => { setSendOpen(false); toast({ title: `WhatsApp: ${data.sent} sent, ${data.skipped} skipped` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendEmail = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/hr/payroll-runs/${id}/send-email`, {}).then(r => r.json()),
    onSuccess: (data: any) => { setSendOpen(false); toast({ title: `Email: ${data.sent} sent, ${data.skipped} skipped` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveSettings = useMutation({
    mutationFn: (d: any) => apiRequest("PUT", "/api/hr/payslip-settings", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payslip-settings"] }); setSettingsOpen(false); toast({ title: "Payslip settings saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, adjustments }: any) => apiRequest("PUT", `/api/hr/payslips/${id}/adjust`, { adjustments }),
    onSuccess: () => {
      if (viewRun) queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs", viewRun.id, "payslips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] });
      setAdjustOpen(false);
      toast({ title: "Payslip adjustments saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openAdjust(p: any) {
    const comps = p.components
      ? (typeof p.components === "string" ? JSON.parse(p.components) : p.components)
      : [];
    setAdjustPayslip(p);
    setAdjustComps(comps.filter((c: any) => c.type === "earning").map((c: any) => ({ ...c })));
    setAdjustOpen(true);
  }

  function openSettings() {
    if (psSettings) {
      setSettingsForm({
        signatoryName: psSettings.signatory_name || "",
        signatoryDesignation: psSettings.signatory_designation || "",
        showEmployerContributions: psSettings.show_employer_contributions !== false,
        showLoanDeductions: psSettings.show_loan_deductions !== false,
        footerNote: psSettings.footer_note || "",
        companyName: psSettings.company_name || "",
        companyAddress: psSettings.company_address || "",
        companyCity: psSettings.company_city || "",
        companyState: psSettings.company_state || "",
        companyPin: psSettings.company_pin || "",
        companyPhone: psSettings.company_phone || "",
        companyEmail: psSettings.company_email || "",
        companyGstin: psSettings.company_gstin || "",
        companyCin: psSettings.company_cin || "",
        templateStyle: psSettings.template_style || "classic",
      });
      if (psSettings.logo_path) setLogoPreview(`/${psSettings.logo_path}`);
    }
    setSettingTab("company");
    setSettingsOpen(true);
  }

  async function uploadLogo() {
    if (!logoFile) return;
    const fd = new FormData();
    fd.append("logo", logoFile);
    await fetch("/api/hr/payslip-settings/logo", { method: "POST", body: fd, credentials: "include" });
    queryClient.invalidateQueries({ queryKey: ["/api/hr/payslip-settings"] });
    toast({ title: "Logo uploaded" });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Process monthly payroll and generate payslips</p>
        </div>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openSettings} data-testid="btn-payslip-settings">
          <Settings2 className="h-4 w-4 mr-1" />Payslip Settings
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="btn-new-payroll-run">
          <Plus className="h-4 w-4 mr-1" />New Payroll Run
        </Button>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (runs as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <IndianRupee className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No payroll runs yet. Create your first one.</p>
            <Button onClick={() => setCreateOpen(true)}>Create Payroll Run</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(runs as any[]).map((run: any) => {
            const meta = STATUS_META[run.status] || { label: run.status, variant: "secondary" as const };
            const isLocked = run.status === "locked";
            const isApproved = run.status === "approved";
            const isDraft = run.status === "draft";
            const hasData = run.employee_count > 0;
            return (
              <Card key={run.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{MONTHS[run.month]} {run.year}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {hasData && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />{run.employee_count} employees
                            </span>
                          )}
                          {isLocked && run.unlock_reason && (
                            <span className="text-xs text-amber-600">Last unlock: {run.unlock_reason}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {run.total_gross > 0 && (
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Gross</p>
                          <p className="font-semibold">₹{fmt(run.total_gross)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Deductions</p>
                          <p className="font-semibold text-destructive">₹{fmt(run.total_deductions)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Net Pay</p>
                          <p className="font-semibold text-green-600">₹{fmt(run.total_net)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {(isDraft || isApproved) && !isLocked && (
                        <Button size="sm" variant="outline" onClick={() => processRun.mutate(run.id)} disabled={processRun.isPending} data-testid={`btn-process-${run.id}`}>
                          <Play className="h-3.5 w-3.5 mr-1" />{processRun.isPending ? "Processing..." : "Process"}
                        </Button>
                      )}
                      {isDraft && hasData && (
                        <Button size="sm" onClick={() => approveRun.mutate(run.id)} disabled={approveRun.isPending} data-testid={`btn-approve-${run.id}`}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />{approveRun.isPending ? "..." : "Approve"}
                        </Button>
                      )}
                      {isApproved && (
                        <Button size="sm" variant="outline" onClick={() => lockRun.mutate(run.id)} disabled={lockRun.isPending} data-testid={`btn-lock-${run.id}`}>
                          <Lock className="h-3.5 w-3.5 mr-1" />{lockRun.isPending ? "..." : "Lock"}
                        </Button>
                      )}
                      {isLocked && (
                        <Button size="sm" variant="outline" onClick={() => { setUnlockTarget(run); setUnlockReason(""); setUnlockOpen(true); }} data-testid={`btn-unlock-${run.id}`}>
                          <Unlock className="h-3.5 w-3.5 mr-1" />Unlock
                        </Button>
                      )}
                      {hasData && (
                        <Button size="sm" variant="ghost" onClick={() => setViewRun(run)} data-testid={`btn-view-${run.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" />Payslips
                        </Button>
                      )}
                      {hasData && (
                        <Button size="sm" variant="ghost" onClick={() => { setSendRun(run); setSendOpen(true); }} data-testid={`btn-send-${run.id}`}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />Send
                        </Button>
                      )}
                      {hasData && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/api/hr/payroll-runs/${run.id}/bank-file`, "_blank")} data-testid={`btn-bank-file-${run.id}`}>
                          <Download className="h-3.5 w-3.5 mr-1" />Bank File
                        </Button>
                      )}
                      {hasData && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/api/hr/payroll-runs/${run.id}/salary-sheet`, "_blank")} data-testid={`btn-salary-sheet-${run.id}`}>
                          <Download className="h-3.5 w-3.5 mr-1" />Salary Sheet
                        </Button>
                      )}
                      {hasData && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/api/hr/payroll-runs/${run.id}/payslips/zip`, "_blank")} data-testid={`btn-zip-${run.id}`}>
                          <FileArchive className="h-3.5 w-3.5 mr-1" />ZIP
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Month *</Label>
                <Select value={newMonth} onValueChange={setNewMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year *</Label>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Creates a payroll run for {MONTHS[Number(newMonth)]} {newYear}. After creating, click <strong>Process</strong> to auto-calculate all payslips.
            </p>
            <Button className="w-full" onClick={() => createRun.mutate({ month: Number(newMonth), year: Number(newYear) })} disabled={createRun.isPending} data-testid="btn-confirm-create-payroll">
              {createRun.isPending ? "Creating..." : "Create Payroll Run"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslips View Dialog */}
      <Dialog open={!!viewRun} onOpenChange={() => setViewRun(null)}>
        <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslips — {viewRun ? `${MONTHS[viewRun.month]} ${viewRun.year}` : ""}</DialogTitle>
          </DialogHeader>
          {psLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading payslips...</p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Days</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">PF</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">ESI</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">PT</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">TDS</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net Pay</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {(payslips as any[]).length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No payslips. Click Process to generate.</td></tr>
                  )}
                  {(payslips as any[]).map((p: any) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <p className="font-medium">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.emp_code} · {p.department_name}</p>
                      </td>
                      <td className="px-3 py-2 text-right">{Number(p.days_worked).toFixed(1)}/{p.days_in_month}</td>
                      <td className="px-3 py-2 text-right font-medium">₹{fmt(p.gross_salary)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(p.pf_employee)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(p.esi_employee)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(p.pt)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(p.tds)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">₹{fmt(p.net_salary)}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {viewRun?.status !== "locked" && (
                            <Button size="icon" variant="ghost" onClick={() => openAdjust(p)} title="Adjust components (TA/DA etc.)">
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => { setViewRun(null); setLocation(`/hr/payslip/${p.id}`); }} title="Open Payslip">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {(payslips as any[]).length > 1 && (
                  <tfoot className="bg-muted/50 font-semibold border-t">
                    <tr>
                      <td className="px-3 py-2">Total ({(payslips as any[]).length})</td>
                      <td />
                      <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.gross_salary), 0))}</td>
                      <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.pf_employee), 0))}</td>
                      <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.esi_employee), 0))}</td>
                      <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.pt), 0))}</td>
                      <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.tds), 0))}</td>
                      <td className="px-3 py-2 text-right text-green-700">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.net_salary), 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={unlockOpen} onOpenChange={v => { if (!v) { setUnlockOpen(false); setUnlockTarget(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unlock Payroll</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Unlocking will revert <strong>{unlockTarget ? `${MONTHS[unlockTarget.month]} ${unlockTarget.year}` : ""}</strong> to Approved status so corrections can be made.
            </p>
            <div>
              <Label>Reason for Unlock *</Label>
              <Textarea value={unlockReason} onChange={e => setUnlockReason(e.target.value)} rows={3} placeholder="e.g. Correction needed for an employee" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setUnlockOpen(false); setUnlockTarget(null); }}>Cancel</Button>
              <Button className="flex-1" disabled={!unlockReason.trim() || doUnlock.isPending}
                onClick={() => unlockTarget && doUnlock.mutate({ id: unlockTarget.id, reason: unlockReason })}
                data-testid="btn-confirm-unlock">
                {doUnlock.isPending ? "Unlocking..." : "Confirm Unlock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslip Template Builder Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Payslip Template Builder</DialogTitle></DialogHeader>

          {/* Tab Nav */}
          <div className="flex gap-1 border-b mb-4 flex-wrap">
            {(["company", "options", "signatory", "preview"] as const).map(t => (
              <button key={t} onClick={() => setSettingTab(t)}
                className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${settingTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
                {t === "company" ? "Company & Logo" : t === "options" ? "Display Options" : t === "signatory" ? "Signatory" : "Preview"}
              </button>
            ))}
          </div>

          {/* Company & Logo Tab */}
          {settingTab === "company" && (
            <div className="space-y-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? <img src={logoPreview} className="h-12 object-contain rounded border p-1" alt="logo" /> : <div className="h-12 w-24 rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">No logo</div>}
                  <div className="space-y-1">
                    <Input type="file" accept="image/*" className="text-xs" onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }
                    }} />
                    {logoFile && <Button size="sm" variant="outline" onClick={uploadLogo}>Upload Logo</Button>}
                    <p className="text-xs text-muted-foreground">PNG/JPG, max 3MB. Appears on top of payslip.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Company Name <span className="text-xs text-muted-foreground">(as shown on payslip)</span></Label>
                  <Input value={settingsForm.companyName} onChange={e => setSettingsForm(f => ({ ...f, companyName: e.target.value }))} placeholder="e.g. Kinto Water Technologies Pvt Ltd" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Address Line</Label>
                  <Input value={settingsForm.companyAddress} onChange={e => setSettingsForm(f => ({ ...f, companyAddress: e.target.value }))} placeholder="Street / Area / Locality" />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input value={settingsForm.companyCity} onChange={e => setSettingsForm(f => ({ ...f, companyCity: e.target.value }))} placeholder="Hyderabad" />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input value={settingsForm.companyState} onChange={e => setSettingsForm(f => ({ ...f, companyState: e.target.value }))} placeholder="Telangana" />
                </div>
                <div className="space-y-1">
                  <Label>PIN Code</Label>
                  <Input value={settingsForm.companyPin} onChange={e => setSettingsForm(f => ({ ...f, companyPin: e.target.value }))} placeholder="500001" maxLength={6} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={settingsForm.companyPhone} onChange={e => setSettingsForm(f => ({ ...f, companyPhone: e.target.value }))} placeholder="+91 40 1234 5678" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={settingsForm.companyEmail} onChange={e => setSettingsForm(f => ({ ...f, companyEmail: e.target.value }))} placeholder="hr@company.com" />
                </div>
                <div className="space-y-1">
                  <Label>GSTIN</Label>
                  <Input value={settingsForm.companyGstin} onChange={e => setSettingsForm(f => ({ ...f, companyGstin: e.target.value }))} placeholder="36AABCK1234A1Z5" maxLength={15} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>CIN</Label>
                  <Input value={settingsForm.companyCin} onChange={e => setSettingsForm(f => ({ ...f, companyCin: e.target.value }))} placeholder="U12345TG2020PTC123456" />
                </div>
              </div>
            </div>
          )}

          {/* Display Options Tab */}
          {settingTab === "options" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Show Employer Contributions</p>
                  <p className="text-xs text-muted-foreground">Display employer PF/ESI section on payslip</p>
                </div>
                <Switch checked={settingsForm.showEmployerContributions} onCheckedChange={v => setSettingsForm(f => ({ ...f, showEmployerContributions: v }))} data-testid="switch-employer-contributions" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Show Loan Deductions</p>
                  <p className="text-xs text-muted-foreground">Display loan EMI deductions section on payslip</p>
                </div>
                <Switch checked={settingsForm.showLoanDeductions} onCheckedChange={v => setSettingsForm(f => ({ ...f, showLoanDeductions: v }))} data-testid="switch-loan-deductions" />
              </div>
              <div className="space-y-1">
                <Label>Footer Note</Label>
                <Textarea value={settingsForm.footerNote} onChange={e => setSettingsForm(f => ({ ...f, footerNote: e.target.value }))} rows={2} placeholder="e.g. This is a system-generated payslip. Not valid without company seal." data-testid="input-footer-note" />
              </div>
            </div>
          )}

          {/* Signatory Tab */}
          {settingTab === "signatory" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">The signatory details appear at the bottom right of each payslip as the authorised signatory.</p>
              <div className="space-y-1">
                <Label>Signatory Name</Label>
                <Input value={settingsForm.signatoryName} onChange={e => setSettingsForm(f => ({ ...f, signatoryName: e.target.value }))} placeholder="e.g. Rajesh Kumar" data-testid="input-signatory-name" />
              </div>
              <div className="space-y-1">
                <Label>Signatory Designation</Label>
                <Input value={settingsForm.signatoryDesignation} onChange={e => setSettingsForm(f => ({ ...f, signatoryDesignation: e.target.value }))} placeholder="e.g. HR Manager / Director" data-testid="input-signatory-designation" />
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {settingTab === "preview" && (() => {
            const f = settingsForm;
            const coName = f.companyName || "Your Company Name";
            const coAddr = [f.companyAddress, f.companyCity, f.companyState, f.companyPin].filter(Boolean).join(", ");
            const coContact = [f.companyPhone ? `Ph: ${f.companyPhone}` : "", f.companyEmail].filter(Boolean).join(" | ");
            const coReg = [f.companyGstin ? `GSTIN: ${f.companyGstin}` : "", f.companyCin ? `CIN: ${f.companyCin}` : ""].filter(Boolean).join(" | ");
            const signatory = f.signatoryName ? `<div style="margin-top:24px;text-align:right;font-size:11px;border-top:1px solid #ddd;padding-top:8px;"><b>${f.signatoryName}</b>${f.signatoryDesignation ? `<br><span style="color:#555">${f.signatoryDesignation}</span>` : ""}<br>Authorised Signatory</div>` : "";
            const footer = f.footerNote || "This is a system-generated payslip. Not valid without company seal.";
            const logoSection = logoPreview ? `<img src="${logoPreview}" style="height:48px;object-fit:contain;margin-right:12px;">` : `<div style="width:48px;height:48px;border:1px dashed #aaa;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;margin-right:12px;">LOGO</div>`;
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#222;background:#fff}
  .header{display:flex;align-items:center;border-bottom:2px solid #1e40af;padding-bottom:10px;margin-bottom:12px}
  .co-name{font-size:15px;font-weight:bold;color:#1e40af}
  .co-addr,.co-reg{font-size:10px;color:#555;margin-top:2px}
  .slip-title{background:#1e40af;color:#fff;text-align:center;padding:4px 0;font-size:12px;font-weight:bold;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  th,td{border:1px solid #ccc;padding:4px 7px;font-size:11px}
  th{background:#e8edf8;text-align:left}
  .r{text-align:right}
  .total{font-weight:bold;background:#f0f4ff}
  .netpay{background:#1e40af;color:#fff;font-weight:bold;text-align:center;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 12px;margin-bottom:10px;font-size:11px}
  .lbl{color:#666}
  .badge{display:inline-block;background:#e8edf8;border-radius:3px;padding:1px 6px;font-size:10px;color:#1e40af}
</style></head><body>
<div class="header">
  ${logoSection}
  <div>
    <div class="co-name">${coName}</div>
    ${coAddr ? `<div class="co-addr">${coAddr}</div>` : ""}
    ${coContact ? `<div class="co-addr">${coContact}</div>` : ""}
    ${coReg ? `<div class="co-reg">${coReg}</div>` : ""}
  </div>
</div>
<div class="slip-title">SALARY SLIP — APRIL 2025 <span class="badge" style="font-size:10px;color:#fff;background:rgba(255,255,255,0.25)">SAMPLE PREVIEW</span></div>
<div class="grid">
  <div><span class="lbl">Employee:</span> <b>Ramesh Kumar</b></div>
  <div><span class="lbl">Code:</span> EMP-001</div>
  <div><span class="lbl">Department:</span> Production</div>
  <div><span class="lbl">Designation:</span> Senior Engineer</div>
  <div><span class="lbl">PAN:</span> ABCDE1234F</div>
  <div><span class="lbl">PF No:</span> TSHY12345678</div>
  <div><span class="lbl">Days Worked:</span> 26/26</div>
  <div><span class="lbl">LOP Days:</span> 0</div>
  <div><span class="lbl">Bank:</span> SBI</div>
</div>
<table>
  <tr><th>Earnings</th><th class="r">Amount (₹)</th><th>Deductions</th><th class="r">Amount (₹)</th></tr>
  <tr><td>Basic Salary</td><td class="r">25,000</td><td>PF (Employee)</td><td class="r">3,000</td></tr>
  <tr><td>HRA</td><td class="r">10,000</td><td>ESI (Employee)</td><td class="r">1,050</td></tr>
  <tr><td>Special Allowance</td><td class="r">8,500</td><td>Professional Tax</td><td class="r">200</td></tr>
  <tr><td>Travel Allowance</td><td class="r">3,200</td><td></td><td></td></tr>
  <tr class="total"><td>Gross Salary</td><td class="r">46,700</td><td>Total Deductions</td><td class="r" style="color:#c00">4,250</td></tr>
  <tr><td colspan="4" class="netpay">Net Pay: ₹42,450</td></tr>
</table>
${f.showEmployerContributions ? `<table><tr><th colspan="2">Employer Contributions</th></tr><tr><td>PF (Employer)</td><td class="r">₹3,000</td></tr><tr><td>ESI (Employer)</td><td class="r">₹1,991</td></tr></table>` : ""}
<table style="margin-top:10px">
  <tr><th colspan="4" style="background:#e8edf8;text-align:left;font-size:11px">Leave Balance Summary — ${new Date().getFullYear()}</th></tr>
  <tr><th>Leave Type</th><th class="r">Entitled</th><th class="r">Used</th><th class="r">Balance</th></tr>
  <tr><td>Casual Leave (CL)</td><td class="r">12.0</td><td class="r">2.0</td><td class="r" style="font-weight:bold;color:#166534">10.0</td></tr>
  <tr><td>Sick Leave (SL)</td><td class="r">12.0</td><td class="r">0.0</td><td class="r" style="font-weight:bold;color:#166534">12.0</td></tr>
  <tr><td>Earned Leave (EL)</td><td class="r">15.0</td><td class="r">3.0</td><td class="r" style="font-weight:bold;color:#166534">12.0</td></tr>
  <tr><td>Loss of Pay (LOP)</td><td class="r">0.0</td><td class="r">0.0</td><td class="r" style="font-weight:bold;color:#c00">0.0</td></tr>
</table>
${signatory}
<p style="font-size:10px;color:#888;text-align:center;margin-top:12px">${footer}<br>Generated on ${new Date().toLocaleDateString("en-IN")}</p>
</body></html>`;
            return (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">This is a sample preview showing how payslips will look with your current settings. Save the template to apply changes.</p>
                <iframe
                  srcDoc={html}
                  className="w-full rounded-md border bg-white"
                  style={{ height: "520px" }}
                  title="Payslip Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            );
          })()}

          <div className="flex gap-2 pt-3 border-t mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate({
              signatoryName: settingsForm.signatoryName,
              signatoryDesignation: settingsForm.signatoryDesignation,
              showEmployerContributions: settingsForm.showEmployerContributions,
              showLoanDeductions: settingsForm.showLoanDeductions,
              footerNote: settingsForm.footerNote,
              companyName: settingsForm.companyName,
              companyAddress: settingsForm.companyAddress,
              companyCity: settingsForm.companyCity,
              companyState: settingsForm.companyState,
              companyPin: settingsForm.companyPin,
              companyPhone: settingsForm.companyPhone,
              companyEmail: settingsForm.companyEmail,
              companyGstin: settingsForm.companyGstin,
              companyCin: settingsForm.companyCin,
              templateStyle: settingsForm.templateStyle,
            })} data-testid="btn-save-payslip-settings">
              {saveSettings.isPending ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payslips — {sendRun ? `${MONTHS[sendRun.month]} ${sendRun.year}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send salary summaries to all <strong>{sendRun?.employee_count}</strong> employees. WhatsApp needs a phone number; Email needs an email address on each employee's profile.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                className="flex flex-col items-center gap-1 border rounded-md p-4 hover-elevate disabled:opacity-50"
                onClick={() => sendWhatsApp.mutate(sendRun?.id)}
                disabled={sendWhatsApp.isPending || sendEmail.isPending}
                data-testid="btn-send-whatsapp">
                <MessageCircle className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Send via WhatsApp</span>
                <span className="text-xs text-muted-foreground">Salary summary message</span>
                {sendWhatsApp.isPending && <span className="text-xs text-primary mt-1">Sending...</span>}
              </button>
              <button
                className="flex flex-col items-center gap-1 border rounded-md p-4 hover-elevate disabled:opacity-50"
                onClick={() => sendEmail.mutate(sendRun?.id)}
                disabled={sendWhatsApp.isPending || sendEmail.isPending}
                data-testid="btn-send-email">
                <Mail className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Send via Email</span>
                <span className="text-xs text-muted-foreground">Salary summary email</span>
                {sendEmail.isPending && <span className="text-xs text-primary mt-1">Sending...</span>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Components Dialog */}
      <Dialog open={adjustOpen} onOpenChange={v => !v && setAdjustOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Earnings — {adjustPayslip?.first_name} {adjustPayslip?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              For TA/DA, enter the actual number of field-visit days. For other components, edit the amount directly. Set days/amount to <strong>0</strong> to exclude.
            </p>
            <div className="space-y-2">
              {adjustComps.map((comp, i) => {
                const isDaily = !!comp.daily_rate;
                return (
                  <div key={comp.code} className="rounded-md border p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{comp.name}</p>
                        {isDaily && (
                          <p className="text-xs text-muted-foreground">₹{comp.daily_rate}/day × {comp.field_days ?? 0} days = ₹{Number(comp.amount).toLocaleString()}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold">₹{Number(comp.amount).toLocaleString()}</span>
                    </div>
                    {isDaily ? (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Field-visit days:</Label>
                        <Input
                          className="h-8 w-20 text-right"
                          type="number"
                          min="0"
                          max="31"
                          value={comp.field_days ?? 0}
                          onChange={e => {
                            const days = Math.max(0, Number(e.target.value));
                            const newAmount = Math.round(comp.daily_rate * days);
                            setAdjustComps(prev => prev.map((c, idx) =>
                              idx === i ? { ...c, field_days: days, amount: newAmount } : c
                            ));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Amount (₹):</Label>
                        <Input
                          className="h-8 w-28 text-right"
                          type="number"
                          min="0"
                          value={comp.amount}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setAdjustComps(prev => prev.map((c, idx) =>
                              idx === i ? { ...c, amount: val } : c
                            ));
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Add new component (incentive / bonus) */}
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add Incentive / Bonus / Other</p>
              <div className="flex gap-2">
                <Input placeholder="Name (e.g. Incentive, Bonus)" value={newCompName} onChange={e => setNewCompName(e.target.value)} className="flex-1 h-8 text-sm" />
                <Input placeholder="Amount ₹" type="number" min="0" value={newCompAmt} onChange={e => setNewCompAmt(e.target.value)} className="w-28 h-8 text-sm text-right" />
                <Button size="sm" variant="outline" onClick={() => {
                  if (!newCompName.trim() || !Number(newCompAmt)) return;
                  const code = newCompName.trim().toUpperCase().replace(/\s+/g, "_");
                  setAdjustComps(prev => [...prev, { code, name: newCompName.trim(), amount: Number(newCompAmt), type: "earning" }]);
                  setNewCompName(""); setNewCompAmt("");
                }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
              <Button
                disabled={adjustMutation.isPending}
                onClick={() => adjustMutation.mutate({
                  id: adjustPayslip?.id,
                  adjustments: adjustComps.map(c => ({
                    code: c.code,
                    name: c.name,
                    amount: Number(c.amount) || 0,
                    ...(c.daily_rate ? { daily_rate: c.daily_rate, field_days: c.field_days ?? 0 } : {}),
                  })),
                })}
              >
                {adjustMutation.isPending ? "Saving..." : "Save Adjustments"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
