import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, RefreshCw, FileDown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const LEAVE_COLORS = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];

export default function HRLeavesPage() {
  const { toast } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionComment, setActionComment] = useState("");
  const [carryFwdOpen, setCarryFwdOpen] = useState(false);
  const [carryFwdYear, setCarryFwdYear] = useState(String(new Date().getFullYear()));

  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();

  const [applyForm, setApplyForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    fromDate: "",
    toDate: "",
    days: "",
    reason: "",
  });

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });
  const { data: leaveTypes = [] } = useQuery<any[]>({ queryKey: ["/api/hr/leave-types"] });
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/hr/leave-applications", statusFilter],
    queryFn: () => {
      const url = statusFilter !== "all"
        ? `/api/hr/leave-applications?status=${statusFilter}`
        : "/api/hr/leave-applications";
      return fetch(url, { credentials: "include" }).then(r => r.json());
    },
  });

  const { data: calendarData = [] } = useQuery({
    queryKey: ["/api/hr/leave-calendar", calMonth, calYear],
    queryFn: () => fetch(`/api/hr/leave-calendar?month=${calMonth}&year=${calYear}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["/api/hr/leave-balances", applyForm.employeeId, currentYear],
    queryFn: () => applyForm.employeeId
      ? fetch(`/api/hr/leave-balances?employeeId=${applyForm.employeeId}&year=${currentYear}`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!applyForm.employeeId,
  });

  const initBalance = useMutation({
    mutationFn: (empId: number) => apiRequest("POST", "/api/hr/leave-balances/initialize", { employeeId: empId, year: currentYear }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-balances"] }),
  });

  const applyMutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/hr/leave-applications", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-applications"] });
      setApplyOpen(false);
      setApplyForm({ employeeId: "", leaveTypeId: "", fromDate: "", toDate: "", days: "", reason: "" });
      toast({ title: "Leave application submitted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/hr/leave-applications/${id}/action`, { status, approverComment: actionComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-applications"] });
      setActionOpen(false);
      setActionComment("");
      toast({ title: "Action taken" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const carryFwdMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/leave-balances/carry-forward", { fromYear: Number(carryFwdYear) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-balances"] });
      setCarryFwdOpen(false);
      toast({ title: "Carry Forward Complete", description: data.message });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleEmpChange = (empId: string) => {
    setApplyForm(f => ({ ...f, employeeId: empId }));
    initBalance.mutate(Number(empId));
  };

  const computeDays = (from: string, to: string) => {
    if (!from || !to) return "";
    const d1 = new Date(from), d2 = new Date(to);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
    return String(Math.max(1, diff));
  };

  const pending = (applications as any[]).filter((a: any) => a.status === "pending");
  const activeEmps = (employees as any[]).filter((e: any) => e.status === "active");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Leave Management</h1>
          <p className="text-sm text-muted-foreground">Apply, approve and track employee leaves</p>
        </div>
        <Button size="sm" onClick={() => setApplyOpen(true)} data-testid="btn-apply-leave">
          <Plus className="h-4 w-4 mr-1" />Apply Leave
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">{pending.length} leave application{pending.length > 1 ? "s" : ""} pending approval</span>
        </div>
      )}

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm">Leave Applications</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Leave Type</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">From</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">To</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">Days</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(applications as any[]).length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No applications found</td></tr>
                    )}
                    {(applications as any[]).map((app: any) => (
                      <tr key={app.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{app.first_name} {app.last_name}</p>
                          <p className="text-xs text-muted-foreground">{app.emp_code}</p>
                        </td>
                        <td className="px-3 py-2">{app.leave_type_name} <span className="text-muted-foreground text-xs">({app.code})</span></td>
                        <td className="px-3 py-2">{app.from_date}</td>
                        <td className="px-3 py-2">{app.to_date}</td>
                        <td className="px-3 py-2 text-center font-medium">{app.days}</td>
                        <td className="px-3 py-2">
                          <Badge variant={STATUS_COLORS[app.status] as any} className="capitalize">{app.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {app.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => { setSelectedApp({ ...app, action: "approved" }); setActionOpen(true); }} title="Approve" data-testid={`btn-approve-${app.id}`}>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => { setSelectedApp({ ...app, action: "rejected" }); setActionOpen(true); }} title="Reject" data-testid={`btn-reject-${app.id}`}>
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                          {app.approver_comment && <p className="text-xs text-muted-foreground mt-0.5">{app.approver_comment}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-3">
          <LeaveBalancesTab
            employees={activeEmps}
            leaveTypes={leaveTypes as any[]}
            currentYear={currentYear}
            onCarryForward={() => setCarryFwdOpen(true)}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-3">
          <LeaveCalendarTab
            calMonth={calMonth}
            calYear={calYear}
            onPrev={() => {
              if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
              else setCalMonth(m => m - 1);
            }}
            onNext={() => {
              if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
              else setCalMonth(m => m + 1);
            }}
            data={calendarData as any[]}
          />
        </TabsContent>
      </Tabs>

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Employee *</Label>
              <Select value={applyForm.employeeId} onValueChange={handleEmpChange}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmps.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {applyForm.employeeId && (balances as any[]).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {(balances as any[]).map((b: any) => (
                  <div key={b.id} className="text-xs px-2 py-1 rounded bg-muted">
                    <span className="font-medium">{b.code}</span>: {b.balance}/{b.entitled} left
                  </div>
                ))}
              </div>
            )}
            <div><Label>Leave Type *</Label>
              <Select value={applyForm.leaveTypeId} onValueChange={v => setApplyForm(f => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{(leaveTypes as any[]).map((lt: any) => <SelectItem key={lt.id} value={String(lt.id)}>{lt.name} ({lt.code})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>From Date *</Label>
                <Input type="date" value={applyForm.fromDate} onChange={e => {
                  const from = e.target.value;
                  setApplyForm(f => ({ ...f, fromDate: from, days: computeDays(from, f.toDate) }));
                }} />
              </div>
              <div><Label>To Date *</Label>
                <Input type="date" value={applyForm.toDate} onChange={e => {
                  const to = e.target.value;
                  setApplyForm(f => ({ ...f, toDate: to, days: computeDays(f.fromDate, to) }));
                }} />
              </div>
            </div>
            <div><Label>Number of Days</Label>
              <Input type="number" value={applyForm.days} onChange={e => setApplyForm(f => ({ ...f, days: e.target.value }))} min="0.5" step="0.5" />
            </div>
            <div><Label>Reason</Label><Textarea value={applyForm.reason} onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))} rows={2} /></div>
            <Button className="w-full" disabled={!applyForm.employeeId || !applyForm.leaveTypeId || !applyForm.fromDate || !applyForm.toDate || applyMutation.isPending}
              onClick={() => applyMutation.mutate({ ...applyForm, employeeId: Number(applyForm.employeeId), leaveTypeId: Number(applyForm.leaveTypeId), days: Number(applyForm.days) })}
              data-testid="btn-submit-leave">
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{selectedApp?.action} Leave Request</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-3">
              <p className="text-sm"><span className="text-muted-foreground">Employee:</span> {selectedApp.first_name} {selectedApp.last_name}</p>
              <p className="text-sm"><span className="text-muted-foreground">Leave:</span> {selectedApp.leave_type_name} — {selectedApp.days} day(s)</p>
              <p className="text-sm"><span className="text-muted-foreground">Period:</span> {selectedApp.from_date} to {selectedApp.to_date}</p>
              {selectedApp.reason && <p className="text-sm"><span className="text-muted-foreground">Reason:</span> {selectedApp.reason}</p>}
              <div><Label>Comment (optional)</Label>
                <Textarea value={actionComment} onChange={e => setActionComment(e.target.value)} rows={2} placeholder="Add a comment..." />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setActionOpen(false)}>Cancel</Button>
                <Button
                  className={`flex-1 ${selectedApp?.action === "rejected" ? "bg-destructive text-destructive-foreground" : ""}`}
                  onClick={() => actionMutation.mutate({ id: selectedApp.id, status: selectedApp.action })}
                  disabled={actionMutation.isPending}
                  data-testid="btn-confirm-action">
                  {actionMutation.isPending ? "Processing..." : selectedApp?.action === "approved" ? "Approve" : "Reject"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Carry Forward Dialog */}
      <Dialog open={carryFwdOpen} onOpenChange={setCarryFwdOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Year-End Leave Carry Forward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will carry forward the EL (Earned Leave) balances from the selected year to the next year, capped at the maximum carry-forward limit configured in the Leave Type Master.
            </p>
            <div>
              <Label>Carry Forward From Year *</Label>
              <Input type="number" value={carryFwdYear} onChange={e => setCarryFwdYear(e.target.value)} min="2020" max="2099" />
            </div>
            <p className="text-xs text-muted-foreground">Balances will be added to {Number(carryFwdYear) + 1}.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCarryFwdOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => carryFwdMutation.mutate()} disabled={carryFwdMutation.isPending} data-testid="btn-confirm-carry-forward">
                {carryFwdMutation.isPending ? "Processing..." : "Run Carry Forward"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveBalancesTab({ employees, leaveTypes, currentYear, onCarryForward }: any) {
  const [selectedEmp, setSelectedEmp] = useState("");

  const { data: balances = [] } = useQuery({
    queryKey: ["/api/hr/leave-balances", selectedEmp, currentYear],
    queryFn: () => selectedEmp
      ? fetch(`/api/hr/leave-balances?employeeId=${selectedEmp}&year=${currentYear}`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!selectedEmp,
  });

  const initBalance = useMutation({
    mutationFn: (empId: number) => apiRequest("POST", "/api/hr/leave-balances/initialize", { employeeId: empId, year: currentYear }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hr/leave-balances", selectedEmp, currentYear] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm">Leave Balances — {currentYear}</CardTitle>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={selectedEmp} onValueChange={v => { setSelectedEmp(v); initBalance.mutate(Number(v)); }}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name} ({e.emp_code})</SelectItem>)}</SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/api/hr/leave-balances/export-excel?year=${currentYear}`, "_blank")}
              data-testid="btn-download-leave-balances"
            >
              <FileDown className="h-3.5 w-3.5 mr-1" />Download Excel
            </Button>
            <Button size="sm" variant="outline" onClick={onCarryForward} data-testid="btn-carry-forward">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Year-End Carry Forward
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedEmp ? (
          <p className="text-sm text-muted-foreground text-center py-6">Select an employee to view leave balances</p>
        ) : (balances as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No leave balance records. Select employee to auto-initialize.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(balances as any[]).map((b: any) => (
              <div key={b.id} className="rounded-md border p-3">
                <p className="font-medium text-sm">{b.leave_type_name}</p>
                <p className="text-xs text-muted-foreground mb-2">{b.code}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entitled</span>
                  <span className="font-medium">{b.entitled}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium text-amber-600">{b.used}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span className={`font-semibold ${b.balance <= 0 ? "text-destructive" : "text-green-600"}`}>{b.balance}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${b.entitled > 0 ? Math.max(0, (b.balance / b.entitled) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveCalendarTab({ calMonth, calYear, onPrev, onNext, data }: any) {
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();

  // Build a map: date -> list of leave entries
  const dateMap: Record<number, any[]> = {};
  for (const entry of data) {
    const from = new Date(entry.from_date);
    const to = new Date(entry.to_date);
    let cur = new Date(from);
    while (cur <= to) {
      if (cur.getMonth() + 1 === calMonth && cur.getFullYear() === calYear) {
        const day = cur.getDate();
        if (!dateMap[day]) dateMap[day] = [];
        dateMap[day].push(entry);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Unique employees for color coding
  const empList: string[] = [];
  for (const entry of data) {
    const key = entry.emp_code;
    if (!empList.includes(key)) empList.push(key);
  }
  const empColorMap: Record<string, string> = {};
  empList.forEach((ec, i) => { empColorMap[ec] = LEAVE_COLORS[i % LEAVE_COLORS.length]; });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm">Leave Calendar — {MONTHS[calMonth]} {calYear}</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        {empList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {empList.map(ec => {
              const entry = data.find((d: any) => d.emp_code === ec);
              return (
                <div key={ec} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${empColorMap[ec]}`} />
                  <span>{entry?.first_name} {entry?.last_name} ({ec})</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {cells.map((day, idx) => (
            <div key={idx} className={`min-h-[60px] rounded border p-1 ${day ? "bg-background" : "bg-muted/30"}`}>
              {day && (
                <>
                  <p className="text-xs font-medium mb-1">{day}</p>
                  <div className="space-y-0.5">
                    {(dateMap[day] || []).slice(0, 3).map((entry: any, ei: number) => (
                      <div key={ei} className={`text-white text-[10px] px-1 rounded truncate ${empColorMap[entry.emp_code] || "bg-blue-500"}`}
                        title={`${entry.first_name} ${entry.last_name} — ${entry.leave_type_name}`}>
                        {entry.emp_code}
                      </div>
                    ))}
                    {(dateMap[day] || []).length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{(dateMap[day] || []).length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No leave applications for {MONTHS[calMonth]} {calYear}</p>
        )}
      </CardContent>
    </Card>
  );
}
