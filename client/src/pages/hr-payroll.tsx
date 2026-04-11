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
  MessageCircle, Mail, IndianRupee, Users, ExternalLink, Settings2, FileArchive
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
  const [settingsForm, setSettingsForm] = useState({ signatoryName: "", signatoryDesignation: "", showEmployerContributions: true, showLoanDeductions: true, footerNote: "" });

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

  function openSettings() {
    if (psSettings) {
      setSettingsForm({
        signatoryName: psSettings.signatory_name || "",
        signatoryDesignation: psSettings.signatory_designation || "",
        showEmployerContributions: psSettings.show_employer_contributions !== false,
        showLoanDeductions: psSettings.show_loan_deductions !== false,
        footerNote: psSettings.footer_note || "",
      });
    }
    setSettingsOpen(true);
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
                        <Button size="icon" variant="ghost" onClick={() => { setViewRun(null); setLocation(`/hr/payslip/${p.id}`); }} title="Open Payslip">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
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

      {/* Payslip Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payslip Settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Signatory Name</Label>
                <Input value={settingsForm.signatoryName} onChange={e => setSettingsForm(f => ({ ...f, signatoryName: e.target.value }))} placeholder="e.g. Rajesh Kumar" data-testid="input-signatory-name" />
              </div>
              <div className="space-y-1">
                <Label>Signatory Designation</Label>
                <Input value={settingsForm.signatoryDesignation} onChange={e => setSettingsForm(f => ({ ...f, signatoryDesignation: e.target.value }))} placeholder="e.g. HR Manager" data-testid="input-signatory-designation" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Show Employer Contributions</p>
                <p className="text-xs text-muted-foreground">Display employer PF/ESI on payslip</p>
              </div>
              <Switch checked={settingsForm.showEmployerContributions} onCheckedChange={v => setSettingsForm(f => ({ ...f, showEmployerContributions: v }))} data-testid="switch-employer-contributions" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Show Loan Deductions</p>
                <p className="text-xs text-muted-foreground">Display loan EMI deductions section</p>
              </div>
              <Switch checked={settingsForm.showLoanDeductions} onCheckedChange={v => setSettingsForm(f => ({ ...f, showLoanDeductions: v }))} data-testid="switch-loan-deductions" />
            </div>
            <div className="space-y-1">
              <Label>Footer Note</Label>
              <Textarea value={settingsForm.footerNote} onChange={e => setSettingsForm(f => ({ ...f, footerNote: e.target.value }))} rows={2} placeholder="e.g. This is a computer generated payslip." data-testid="input-footer-note" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate({
                signatory_name: settingsForm.signatoryName,
                signatory_designation: settingsForm.signatoryDesignation,
                show_employer_contributions: settingsForm.showEmployerContributions,
                show_loan_deductions: settingsForm.showLoanDeductions,
                footer_note: settingsForm.footerNote,
              })} data-testid="btn-save-payslip-settings">
                {saveSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
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
    </div>
  );
}
