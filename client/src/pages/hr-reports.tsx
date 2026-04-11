import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, Users, CalendarDays, IndianRupee, TrendingUp, FileBarChart2 } from "lucide-react";

const MONTHS = [
  { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
  { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
const currentMonth = String(new Date().getMonth() + 1);

const fmt = (n: any) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

// ── Employee Directory ────────────────────────────────────────────────────────
function EmployeeDirectoryReport() {
  const [status, setStatus] = useState("active");
  const [deptId, setDeptId] = useState("all");

  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });

  const queryParams = new URLSearchParams();
  if (status !== "all") queryParams.set("status", status);
  if (deptId !== "all") queryParams.set("departmentId", deptId);

  const { data: employees = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/reports/employee-directory", status, deptId],
    queryFn: async () => {
      const r = await fetch(`/api/hr/reports/employee-directory?${queryParams}`, { credentials: "include" });
      return r.json();
    }
  });

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_notice">On Notice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />Print
        </Button>
      </div>

      <div className="print-area overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Emp Code</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Designation</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Join Date</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No data found</td></tr>
            ) : employees.map((e: any) => (
              <tr key={e.id} className="border-t" data-testid={`row-dir-${e.id}`}>
                <td className="px-3 py-2">{e.emp_code}</td>
                <td className="px-3 py-2 font-medium">{e.first_name} {e.last_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.department_name || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.designation_name || "—"}</td>
                <td className="px-3 py-2">{e.phone || "—"}</td>
                <td className="px-3 py-2">{e.email || "—"}</td>
                <td className="px-3 py-2">{e.join_date || "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={e.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                    {e.status?.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length > 0 && (
          <div className="px-3 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
            Total: {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Attendance Summary ────────────────────────────────────────────────────────
function AttendanceSummaryReport() {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(currentYear));
  const [deptId, setDeptId] = useState("all");
  const [fetched, setFetched] = useState(false);

  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });

  const queryParams = new URLSearchParams({ month, year });
  if (deptId !== "all") queryParams.set("departmentId", deptId);

  const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/reports/attendance-summary", month, year, deptId],
    queryFn: async () => {
      const r = await fetch(`/api/hr/reports/attendance-summary?${queryParams}`, { credentials: "include" });
      return r.json();
    },
    enabled: fetched,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label>Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { setFetched(true); refetch(); }} data-testid="btn-generate-attendance">
          Generate Report
        </Button>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Print
          </Button>
        )}
      </div>

      {fetched && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Present</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Absent</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Half Day</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">LOP</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">On Leave</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">OT Hrs</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No attendance data found for selected period</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} className="border-t" data-testid={`row-att-${r.id}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.emp_code}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.department_name || "—"}</td>
                  <td className="px-3 py-2 text-center font-medium text-green-600">{r.present_days || 0}</td>
                  <td className="px-3 py-2 text-center font-medium text-destructive">{r.absent_days || 0}</td>
                  <td className="px-3 py-2 text-center">{r.half_days || 0}</td>
                  <td className="px-3 py-2 text-center text-orange-600">{r.lop_days || 0}</td>
                  <td className="px-3 py-2 text-center">{r.leave_days || 0}</td>
                  <td className="px-3 py-2 text-center">{Number(r.total_ot_hours || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Payroll Summary ───────────────────────────────────────────────────────────
function PayrollSummaryReport() {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/hr/reports/payroll-summary"],
    queryFn: async () => {
      const r = await fetch("/api/hr/reports/payroll-summary", { credentials: "include" });
      return r.json();
    }
  });

  const totalNet = rows.reduce((s: number, r: any) => s + Number(r.total_net || 0), 0);
  const totalPf = rows.reduce((s: number, r: any) => s + Number(r.total_pf_employee || 0) + Number(r.total_pf_employer || 0), 0);
  const totalEsi = rows.reduce((s: number, r: any) => s + Number(r.total_esi_employee || 0) + Number(r.total_esi_employer || 0), 0);

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Net Pay (all runs)</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalNet)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total PF (ee + er)</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalPf)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total ESI (ee + er)</p>
            <p className="text-2xl font-semibold mt-1">{fmt(totalEsi)}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1.5" />Print
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Period</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Employees</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Gross</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PF (EE)</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">ESI (EE)</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PT</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">TDS</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No payroll runs found</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.run_id} className="border-t" data-testid={`row-payroll-${r.run_id}`}>
                <td className="px-3 py-2 font-medium">{MONTHS.find(m => m.value === String(r.month))?.label} {r.year}</td>
                <td className="px-3 py-2">
                  <Badge variant={r.run_status === "locked" ? "default" : r.run_status === "approved" ? "secondary" : "outline"} className="capitalize text-xs">
                    {r.run_status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">{r.employee_count || 0}</td>
                <td className="px-3 py-2 text-right">{fmt(r.total_gross)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.total_pf_employee)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.total_esi_employee)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.total_pt)}</td>
                <td className="px-3 py-2 text-right">{fmt(r.total_tds)}</td>
                <td className="px-3 py-2 text-right font-medium">{fmt(r.total_net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Leave Balance ─────────────────────────────────────────────────────────────
function LeaveBalanceReport() {
  const [year, setYear] = useState(String(currentYear));
  const [deptId, setDeptId] = useState("all");
  const [fetched, setFetched] = useState(false);

  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });

  const queryParams = new URLSearchParams({ year });
  if (deptId !== "all") queryParams.set("departmentId", deptId);

  const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/reports/leave-balance", year, deptId],
    queryFn: async () => {
      const r = await fetch(`/api/hr/reports/leave-balance?${queryParams}`, { credentials: "include" });
      return r.json();
    },
    enabled: fetched,
  });

  // Group by employee
  const grouped = rows.reduce((acc: any, row: any) => {
    const key = `${row.emp_code}`;
    if (!acc[key]) acc[key] = { ...row, leaves: [] };
    acc[key].leaves.push({ type: row.leave_type, code: row.leave_code, total: row.total_days, used: row.used_days, balance: row.balance_days });
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { setFetched(true); refetch(); }} data-testid="btn-generate-leave">
          Generate Report
        </Button>
        {Object.keys(grouped).length > 0 && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Print
          </Button>
        )}
      </div>

      {fetched && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Leave Type</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Allotted</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Used</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No leave balance data found. Initialize leave balances first.</td></tr>
              ) : Object.values(grouped).map((emp: any) =>
                emp.leaves.map((lv: any, idx: number) => (
                  <tr key={`${emp.emp_code}-${lv.code}`} className="border-t" data-testid={`row-leave-${emp.emp_code}-${lv.code}`}>
                    {idx === 0 ? (
                      <>
                        <td className="px-3 py-2" rowSpan={emp.leaves.length}>
                          <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.emp_code}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground" rowSpan={emp.leaves.length}>{emp.department_name || "—"}</td>
                      </>
                    ) : null}
                    <td className="px-3 py-2">{lv.type} <span className="text-xs text-muted-foreground">({lv.code})</span></td>
                    <td className="px-3 py-2 text-center">{lv.total}</td>
                    <td className="px-3 py-2 text-center text-orange-600">{lv.used}</td>
                    <td className="px-3 py-2 text-center font-medium text-green-600">{lv.balance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Salary Revision Report ────────────────────────────────────────────────────
function SalaryRevisionReport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deptId, setDeptId] = useState("all");
  const [fetched, setFetched] = useState(false);

  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });

  const queryParams = new URLSearchParams();
  if (fromDate) queryParams.set("fromDate", fromDate);
  if (toDate) queryParams.set("toDate", toDate);
  if (deptId !== "all") queryParams.set("departmentId", deptId);

  const { data: rows = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/reports/salary-revisions", fromDate, toDate, deptId],
    queryFn: async () => {
      const r = await fetch(`/api/hr/reports/salary-revisions?${queryParams}`, { credentials: "include" });
      return r.json();
    },
    enabled: fetched,
  });

  const pct = (o: any, n: any) => {
    if (!o || !n || Number(o) === 0) return "";
    const diff = ((Number(n) - Number(o)) / Number(o)) * 100;
    return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label>From Date</Label>
          <Input className="h-9 w-40" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>To Date</Label>
          <Input className="h-9 w-40" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { setFetched(true); refetch(); }} data-testid="btn-generate-revisions">
          Generate Report
        </Button>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Print
          </Button>
        )}
      </div>

      {fetched && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Department</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Effective Date</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Old Basic</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">New Basic</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Change %</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">New CTC</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No salary revisions found for selected period</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} className="border-t" data-testid={`row-rev-${r.id}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.emp_code}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.department_name || "—"}</td>
                  <td className="px-3 py-2">{r.effective_date}</td>
                  <td className="px-3 py-2 capitalize">{r.revision_type}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.old_basic)}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(r.new_basic)}</td>
                  <td className="px-3 py-2 text-right text-green-600">{pct(r.old_basic, r.new_basic)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.new_ctc)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.approved_by || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
export default function HrReports() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">HR Reports</h1>
        <p className="text-sm text-muted-foreground">Generate and print operational HR reports</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Employee Directory", desc: "Full employee listing with contact info" },
          { icon: CalendarDays, label: "Attendance Summary", desc: "Month-wise attendance report" },
          { icon: IndianRupee, label: "Payroll Summary", desc: "Payroll run-wise financial summary" },
          { icon: TrendingUp, label: "Salary Revisions", desc: "Increment and revision history" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="directory">Employee Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Summary</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Summary</TabsTrigger>
          <TabsTrigger value="leave">Leave Balance</TabsTrigger>
          <TabsTrigger value="revisions">Salary Revisions</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="directory"><EmployeeDirectoryReport /></TabsContent>
          <TabsContent value="attendance"><AttendanceSummaryReport /></TabsContent>
          <TabsContent value="payroll"><PayrollSummaryReport /></TabsContent>
          <TabsContent value="leave"><LeaveBalanceReport /></TabsContent>
          <TabsContent value="revisions"><SalaryRevisionReport /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
