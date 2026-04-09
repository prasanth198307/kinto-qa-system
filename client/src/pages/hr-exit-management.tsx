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
import {
  UserX, Clock, CheckCircle2, Search, AlertCircle,
  Calendar, FileText, TrendingDown, Users, DoorOpen
} from "lucide-react";

const EXIT_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "retirement", label: "Retirement" },
  { value: "absconding", label: "Absconding" },
  { value: "end_of_contract", label: "End of Contract" },
  { value: "other", label: "Other" },
];

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
          <div className="grid grid-cols-2 gap-3">
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
            <Textarea
              value={form.exitReason}
              onChange={f("exitReason")}
              placeholder="Reason for leaving, any notes..."
              className="min-h-[80px]"
            />
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
            <p className="text-xs text-muted-foreground">Set to "Inactive" once the employee has left the organization.</p>
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

// ── Employee Row ──────────────────────────────────────────────────────────────
function ExitEmployeeRow({ emp, onProcess }: { emp: any; onProcess: () => void }) {
  const today = new Date();

  const noticeDays = emp.resignation_date && emp.exit_date
    ? Math.ceil((new Date(emp.exit_date).getTime() - new Date(emp.resignation_date).getTime()) / 86400000)
    : null;

  const daysToExit = emp.exit_date
    ? Math.ceil((new Date(emp.exit_date).getTime() - today.getTime()) / 86400000)
    : null;

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
            {daysToExit !== null && daysToExit >= 0 && (
              <span className="ml-1 text-xs text-muted-foreground">({daysToExit}d left)</span>
            )}
            {daysToExit !== null && daysToExit < 0 && (
              <span className="ml-1 text-xs">(overdue)</span>
            )}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3 text-sm capitalize">
        {emp.exit_type
          ? EXIT_TYPES.find(t => t.value === emp.exit_type)?.label || emp.exit_type
          : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3">
        <Badge
          variant={emp.status === "inactive" ? "secondary" : emp.status === "on_notice" ? "outline" : "default"}
          className="capitalize text-xs"
        >
          {emp.status === "on_notice" ? "On Notice" : emp.status}
        </Badge>
      </td>
      <td className="px-3 py-3 text-right">
        <Button size="sm" variant="outline" onClick={onProcess} data-testid={`btn-process-exit-${emp.id}`}>
          <DoorOpen className="h-3.5 w-3.5 mr-1.5" />
          {emp.status === "inactive" ? "Edit Exit" : "Process Exit"}
        </Button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HrExitManagement() {
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<any>(null);

  const { data: employees = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  // Split employees into categories
  const onNotice = employees.filter((e: any) =>
    e.status === "on_notice" || (e.status === "active" && (e.resignation_date || e.exit_date))
  );
  const exited = employees.filter((e: any) => e.status === "inactive" && e.exit_date);
  const allExitRelated = employees.filter((e: any) =>
    e.status === "inactive" || e.status === "on_notice" || e.resignation_date || e.exit_date
  );

  const filterBySearch = (list: any[]) =>
    !search ? list : list.filter((e: any) =>
      `${e.first_name} ${e.last_name} ${e.emp_code}`.toLowerCase().includes(search.toLowerCase())
    );

  // Stats
  const totalActive = employees.filter((e: any) => e.status === "active").length;
  const totalInactive = employees.filter((e: any) => e.status === "inactive").length;
  const totalOnNotice = employees.filter((e: any) => e.status === "on_notice").length;

  const exitTypeBreakdown = exited.reduce((acc: any, e: any) => {
    const key = e.exit_type || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const attritionRate = employees.length > 0
    ? ((totalInactive / employees.length) * 100).toFixed(1)
    : "0.0";

  const TableHeaders = () => (
    <thead className="bg-muted/50">
      <tr>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Employee</th>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Designation</th>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Resignation Date</th>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Last Working Day</th>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Exit Type</th>
        <th className="px-3 py-2.5 text-left text-sm font-medium text-muted-foreground">Status</th>
        <th className="px-3 py-2.5 text-right text-sm font-medium text-muted-foreground">Action</th>
      </tr>
    </thead>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Exit Management</h1>
          <p className="text-sm text-muted-foreground">Manage employee separations, resignations, and offboarding</p>
        </div>
        <Button
          onClick={() => {
            // Open process exit for any active employee
            const activeEmp = employees.find((e: any) => e.status === "active" && !e.exit_date);
            if (activeEmp) setProcessing(activeEmp);
          }}
          data-testid="btn-initiate-exit"
        >
          <UserX className="h-4 w-4 mr-1.5" />
          Initiate Exit
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalActive}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalOnNotice}</p>
              <p className="text-xs text-muted-foreground">On Notice</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <UserX className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalInactive}</p>
              <p className="text-xs text-muted-foreground">Exited</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{attritionRate}%</p>
              <p className="text-xs text-muted-foreground">Attrition Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8 h-9"
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          data-testid="input-search-exit"
        />
      </div>

      <Tabs defaultValue="on-notice">
        <TabsList>
          <TabsTrigger value="on-notice">
            On Notice
            {totalOnNotice > 0 && (
              <Badge variant="outline" className="ml-1.5 text-xs">{totalOnNotice}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exited">
            Exited
            {totalInactive > 0 && (
              <Badge variant="outline" className="ml-1.5 text-xs">{totalInactive}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Exit Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ON NOTICE */}
        <TabsContent value="on-notice" className="mt-4">
          {onNotice.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium">No employees on notice</p>
              <p className="text-sm text-muted-foreground mt-1">All employees are active</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <TableHeaders />
                <tbody>
                  {filterBySearch(onNotice).map((emp: any) => (
                    <ExitEmployeeRow key={emp.id} emp={emp} onProcess={() => setProcessing(emp)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* EXITED */}
        <TabsContent value="exited" className="mt-4">
          {exited.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No exit records yet</p>
              <p className="text-sm text-muted-foreground mt-1">Processed exits will appear here</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <TableHeaders />
                <tbody>
                  {filterBySearch(exited).map((emp: any) => (
                    <ExitEmployeeRow key={emp.id} emp={emp} onProcess={() => setProcessing(emp)} />
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
                {exited.length} employee{exited.length !== 1 ? "s" : ""} exited
              </div>
            </div>
          )}
        </TabsContent>

        {/* ALL */}
        <TabsContent value="all" className="mt-4">
          {allExitRelated.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No exit records found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <TableHeaders />
                <tbody>
                  {filterBySearch(allExitRelated).map((emp: any) => (
                    <ExitEmployeeRow key={emp.id} emp={emp} onProcess={() => setProcessing(emp)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Exit Type Breakdown</CardTitle>
              </CardHeader>
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
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{label}</span>
                            <span className="font-medium">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Workforce Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Employees (ever)", value: employees.length, color: "bg-blue-500" },
                  { label: "Currently Active", value: totalActive, color: "bg-green-500" },
                  { label: "On Notice Period", value: totalOnNotice, color: "bg-orange-500" },
                  { label: "Exited / Inactive", value: totalInactive, color: "bg-muted-foreground" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
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

            {/* Recent exits */}
            {exited.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recent Exits (last 5)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...exited]
                      .sort((a, b) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime())
                      .slice(0, 5)
                      .map((emp: any) => (
                        <div key={emp.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={emp.photo_path ? `/${emp.photo_path}` : undefined} />
                              <AvatarFallback className="text-xs">{emp.first_name?.[0]}{emp.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.designation_name || "—"} · {emp.department_name || "—"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{emp.exit_date}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {EXIT_TYPES.find(t => t.value === emp.exit_type)?.label || emp.exit_type || "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Process Exit Dialog */}
      <ProcessExitDialog
        emp={processing}
        open={!!processing}
        onClose={() => setProcessing(null)}
      />
    </div>
  );
}
