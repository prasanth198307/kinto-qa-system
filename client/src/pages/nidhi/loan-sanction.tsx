import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STAGES = ["Application", "Credit Check", "Committee Approval", "Sanction Letter", "Disbursement"];

const STATUS_BADGE: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  Applied: "secondary",
  Verified: "default",
  Sanctioned: "default",
  Disbursed: "outline",
  Rejected: "destructive",
};


function stageIdx(status: string) {
  return { Applied: 0, Verified: 1, Sanctioned: 3, Disbursed: 4, Rejected: -1 }[status] ?? 0;
}

function nextAction(status: string) {
  if (status === "Applied") return { label: "Verify", next: "Verified" };
  if (status === "Verified") return { label: "Committee Approve", next: "Sanctioned" };
  if (status === "Sanctioned") return { label: "Disburse", next: "Disbursed" };
  return null;
}

export default function LoanSanctionPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member: "", amount: "", purpose: "", security: "" });

  const { data: loans = [] } = useQuery<any[]>({
    queryKey: ["nidhi-loan-applications"],
    queryFn: () => api("GET", "/api/nidhi/loan-applications").catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi/loan-applications", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-loan-applications"] }); setOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/nidhi/loan-applications/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nidhi-loan-applications"] }),
  });

  const printSanction = (loan: any) => {
    const html = `<html><body style="font-family:Arial;padding:40px">
      <h2 style="text-align:center">SANCTION LETTER</h2>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <p>Dear <strong>${loan.member_name}</strong>,</p>
      <p>We are pleased to sanction <strong>${sym}${Number(loan.amount).toLocaleString()}</strong>
      for <em>${loan.purpose}</em> at <strong>${loan.interest_rate}% p.a.</strong> for <strong>${loan.tenure_months} months</strong>.</p>
      <p>Security: ${loan.security}</p>
      <br/><p>Authorised Signatory</p></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.print(); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loan Sanction Workflow</h1>
        <Button onClick={() => setOpen(true)}>+ New Application</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Workflow Stages</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <span className="text-xs mt-1 text-center w-20">{stage}</span>
                </div>
                {i < STAGES.length - 1 && <div className="h-px w-6 bg-border mb-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Loan Applications</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan: any) => {
                const action = nextAction(loan.status);
                const idx = stageIdx(loan.status);
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.member_name}</TableCell>
                    <TableCell>{sym}{Number(loan.amount).toLocaleString()}</TableCell>
                    <TableCell>{loan.purpose}</TableCell>
                    <TableCell>{loan.security}</TableCell>
                    <TableCell>{loan.applied_date}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE[loan.status]}>{loan.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {STAGES.map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {action && (
                          <Button size="sm" variant="outline"
                            onClick={() => updateMutation.mutate({ id: loan.id, status: action.next })}>
                            {action.label}
                          </Button>
                        )}
                        {loan.status === "Sanctioned" && (
                          <Button size="sm" variant="ghost" onClick={() => printSanction(loan)}>
                            <Printer className="w-3 h-3 mr-1" />Print
                          </Button>
                        )}
                        {loan.status !== "Rejected" && loan.status !== "Disbursed" && (
                          <Button size="sm" variant="ghost" className="text-destructive"
                            onClick={() => updateMutation.mutate({ id: loan.id, status: "Rejected" })}>
                            Reject
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Loan Application</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Member Name</Label><Input value={form.member} onChange={e => setForm(f => ({ ...f, member: e.target.value }))} /></div>
            <div><Label>Loan Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Purpose</Label><Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} /></div>
            <div><Label>Security</Label><Input value={form.security} onChange={e => setForm(f => ({ ...f, security: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate({ ...form, status: "Applied", applied_date: new Date().toISOString().slice(0, 10) })}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
