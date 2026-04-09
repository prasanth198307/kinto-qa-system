import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle, Lock, Eye, Plus, Users, TrendingUp, IndianRupee } from "lucide-react";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CONFIG: Record<string, { label: string; variant: any; color: string }> = {
  draft: { label: "Draft", variant: "secondary", color: "text-muted-foreground" },
  approved: { label: "Approved", variant: "default", color: "text-green-600" },
  locked: { label: "Locked", variant: "default", color: "text-blue-600" },
};

function fmt(n: number) { return n?.toLocaleString("en-IN") ?? "0"; }

export default function HRPayrollPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRun, setViewRun] = useState<any>(null);
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));

  const { data: runs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/payroll-runs"] });

  const { data: payslips = [] } = useQuery({
    queryKey: ["/api/hr/payroll-runs", viewRun?.id, "payslips"],
    queryFn: () => viewRun ? fetch(`/api/hr/payroll-runs/${viewRun.id}/payslips`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
    enabled: !!viewRun,
  });

  const createRun = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/hr/payroll-runs", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] }); setCreateOpen(false); toast({ title: "Payroll run created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const processRun = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/hr/payroll-runs/${id}/process`, {}),
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
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const lockRun = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/hr/payroll-runs/${id}/lock`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-runs"] }); toast({ title: "Payroll locked" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Process monthly payroll and generate payslips</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="btn-create-payroll">
          <Plus className="h-4 w-4 mr-1" />New Payroll Run
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading payroll runs...</div>
      ) : (runs as any[]).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <IndianRupee className="h-10 w-10 mb-3 opacity-30" />
            <p>No payroll runs yet. Create one to get started.</p>
            <Button className="mt-3" onClick={() => setCreateOpen(true)}>Create Payroll Run</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(runs as any[]).map((run: any) => {
            const sc = STATUS_CONFIG[run.status] || STATUS_CONFIG.draft;
            return (
              <Card key={run.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{MONTHS[run.month]} {run.year}</h3>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm flex-wrap">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />{run.employee_count || 0} employees
                        </div>
                        {run.total_gross > 0 && (
                          <>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="h-3.5 w-3.5" />Gross: <span className="font-medium text-foreground">₹{fmt(run.total_gross)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <IndianRupee className="h-3.5 w-3.5" />Net: <span className="font-medium text-foreground">₹{fmt(run.total_net)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(run.status === "draft" || !run.processed_at) && (
                        <Button size="sm" variant="outline" onClick={() => processRun.mutate(run.id)} disabled={processRun.isPending} data-testid={`btn-process-${run.id}`}>
                          <Play className="h-3.5 w-3.5 mr-1" />{processRun.isPending ? "Processing..." : "Process"}
                        </Button>
                      )}
                      {run.status === "draft" && run.processed_at && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => processRun.mutate(run.id)} disabled={processRun.isPending}>
                            <Play className="h-3.5 w-3.5 mr-1" />Re-process
                          </Button>
                          <Button size="sm" onClick={() => approveRun.mutate(run.id)} disabled={approveRun.isPending} data-testid={`btn-approve-${run.id}`}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                          </Button>
                        </>
                      )}
                      {run.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => lockRun.mutate(run.id)} disabled={lockRun.isPending} data-testid={`btn-lock-${run.id}`}>
                          <Lock className="h-3.5 w-3.5 mr-1" />Lock
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setViewRun(run)} data-testid={`btn-view-${run.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1" />View Payslips
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Payroll Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select value={newMonth} onValueChange={setNewMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.slice(1).map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Select value={newYear} onValueChange={setNewYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">This will create a new payroll run for {MONTHS[Number(newMonth)]} {newYear}. After creating, click Process to calculate all payslips automatically.</p>
            <Button className="w-full" onClick={() => createRun.mutate({ month: Number(newMonth), year: Number(newYear) })} disabled={createRun.isPending} data-testid="btn-confirm-create-payroll">
              {createRun.isPending ? "Creating..." : "Create Payroll Run"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payslips Dialog */}
      <Dialog open={!!viewRun} onOpenChange={() => setViewRun(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payslips — {viewRun ? `${MONTHS[viewRun.month]} ${viewRun.year}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Days</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Basic</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gross</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">PF</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">ESI</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">PT</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net Pay</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(payslips as any[]).length === 0 && (
                  <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">
                    {viewRun?.processed_at ? "No payslips found" : "Click Process to generate payslips"}
                  </td></tr>
                )}
                {(payslips as any[]).map((ps: any) => (
                  <tr key={ps.id} className="border-t">
                    <td className="px-3 py-2">
                      <p className="font-medium">{ps.first_name} {ps.last_name}</p>
                      <p className="text-xs text-muted-foreground">{ps.emp_code} · {ps.designation_name}</p>
                    </td>
                    <td className="px-3 py-2 text-center">{Number(ps.days_worked).toFixed(1)}/{ps.days_in_month}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(ps.basic_salary)}</td>
                    <td className="px-3 py-2 text-right">₹{fmt(ps.gross_salary)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(ps.pf_employee)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(ps.esi_employee)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">₹{fmt(ps.pt)}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{fmt(ps.net_salary)}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => window.open(`/hr/payslip/${ps.id}`, "_blank")} data-testid={`btn-view-payslip-${ps.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {(payslips as any[]).length > 0 && (
                <tfoot className="bg-muted/50 font-semibold border-t-2">
                  <tr>
                    <td className="px-3 py-2" colSpan={3}>Total ({(payslips as any[]).length} employees)</td>
                    <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.gross_salary), 0))}</td>
                    <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.pf_employee), 0))}</td>
                    <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.esi_employee), 0))}</td>
                    <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.pt), 0))}</td>
                    <td className="px-3 py-2 text-right">₹{fmt((payslips as any[]).reduce((s, p) => s + Number(p.net_salary), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
