import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const RESTAURANT_ROLES = ["server", "cashier", "kitchen", "manager", "host", "bartender", "steward", "captain"];
const ROLE_COLORS: Record<string, string> = {
  server: "bg-blue-100 text-blue-700", cashier: "bg-green-100 text-green-700",
  kitchen: "bg-orange-100 text-orange-700", manager: "bg-purple-100 text-purple-700",
  host: "bg-pink-100 text-pink-700", bartender: "bg-yellow-100 text-yellow-700",
  steward: "bg-cyan-100 text-cyan-700", captain: "bg-rose-100 text-rose-700",
};

export default function RestaurantStaffPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"employees" | "schedule" | "attendance" | "performance">("employees");
  const [search, setSearch] = useState("");
  const [linkForm, setLinkForm] = useState({ employee_id: "", role: "server", outlet_id: "" });
  const [attendanceMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: rawEmployees } = useQuery({ queryKey: ["/api/restaurant/staff/hr-employees"], queryFn: () => api("GET", "/api/restaurant/staff/hr-employees") });
  const employees = Array.isArray(rawEmployees) ? rawEmployees : [];

  const { data: rawOutlets } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });
  const outlets = Array.isArray(rawOutlets) ? rawOutlets : [];

  const { data: rawSchedules } = useQuery({
    queryKey: ["/api/restaurant/staff/schedules"],
    queryFn: () => api("GET", `/api/restaurant/staff/schedules?from=${new Date().toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`),
    enabled: tab === "schedule",
  });
  const schedules = Array.isArray(rawSchedules) ? rawSchedules : [];

  const { data: rawAttendance } = useQuery({
    queryKey: ["/api/restaurant/staff/attendance-summary", attendanceMonth],
    queryFn: () => api("GET", `/api/restaurant/staff/attendance-summary?month=${attendanceMonth}`),
    enabled: tab === "attendance",
  });
  const attendance = Array.isArray(rawAttendance) ? rawAttendance : [];

  const { data: rawPerf } = useQuery({
    queryKey: ["/api/restaurant/staff/waiter-performance"],
    queryFn: () => api("GET", `/api/restaurant/staff/waiter-performance?from=${new Date().toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`),
    enabled: tab === "performance",
  });
  const performance = Array.isArray(rawPerf) ? rawPerf : [];

  const linkMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/restaurant/staff/link-employee", data),
    onSuccess: () => { toast({ title: "Restaurant role assigned" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/hr-employees"] }); setLinkForm({ employee_id: "", role: "server", outlet_id: "" }); },
    onError: () => toast({ title: "Failed to assign role", variant: "destructive" }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (empId: any) => api("DELETE", `/api/restaurant/staff/link-employee/${empId}`, {}),
    onSuccess: () => { toast({ title: "Role removed" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/hr-employees"] }); },
  });

  const filtered = employees.filter((e: any) => !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-gray-500">{employees.length} employees from HR •{" "}
            <button className="text-blue-600 hover:underline text-sm" onClick={() => navigate("/hr-employees")}>Open HR Module →</button>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/hr-payroll")}>HR Payroll →</Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[["employees","👤 All Staff (HR)"],["schedule","📅 Shifts"],["attendance","🕐 Attendance"],["performance","🏆 Performance"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === id ? "border-red-700 text-red-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "employees" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assign Restaurant Role</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={linkForm.employee_id} onValueChange={v => setLinkForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.filter((e: any) => !e.restaurant_role).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.employee_code})</SelectItem>)}</SelectContent>
                </Select>
                <Select value={linkForm.role} onValueChange={v => setLinkForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESTAURANT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={linkForm.outlet_id} onValueChange={v => setLinkForm(f => ({ ...f, outlet_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Outlet (optional)" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">All Outlets</SelectItem>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={() => linkMutation.mutate(linkForm)} disabled={!linkForm.employee_id || linkMutation.isPending} className="bg-red-700 hover:bg-red-800 text-white">Assign Role</Button>
              </div>
            </CardContent>
          </Card>
          <Input placeholder="Search by name or employee code..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3">Employee</th><th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Outlet</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y">
                  {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                    No employees. <button className="text-blue-600 hover:underline" onClick={() => navigate("/hr-employees")}>Add in HR module →</button>
                  </td></tr>}
                  {filtered.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-gray-500">{emp.employee_code}</td>
                      <td className="px-4 py-3">{emp.restaurant_role ? <Badge className={ROLE_COLORS[emp.restaurant_role] || "bg-gray-100 text-gray-700"}>{emp.restaurant_role}</Badge> : <span className="text-gray-400 text-xs">Not assigned</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{emp.outlet_name || "—"}</td>
                      <td className="px-4 py-3 flex gap-2">
                        {emp.restaurant_role && <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => unlinkMutation.mutate(emp.id)}>Remove</Button>}
                        <Button size="sm" variant="ghost" className="text-blue-500 h-7 px-2" onClick={() => navigate("/hr-employees")}>HR Profile</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "schedule" && (
        <Card>
          <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Today's Shifts</CardTitle><Button size="sm" variant="outline" onClick={() => navigate("/hr-attendance")}>HR Attendance →</Button></div></CardHeader>
          <CardContent>
            {schedules.length === 0 ? <p className="text-center py-8 text-gray-400">No shifts today.</p> : (
              <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-2">Staff</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Start</th><th className="text-left px-4 py-2">End</th><th className="text-left px-4 py-2">Status</th>
              </tr></thead><tbody className="divide-y">
                {schedules.map((s: any) => <tr key={s.id}><td className="px-4 py-2">{s.staff_name}</td><td className="px-4 py-2"><Badge className={ROLE_COLORS[s.staff_role] || "bg-gray-100 text-gray-700"}>{s.staff_role}</Badge></td><td className="px-4 py-2">{s.shift_start || "—"}</td><td className="px-4 py-2">{s.shift_end || "—"}</td><td className="px-4 py-2">{s.status}</td></tr>)}
              </tbody></table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Attendance — {attendanceMonth}</CardTitle><Button size="sm" variant="outline" onClick={() => navigate("/hr-attendance")}>Full HR Attendance →</Button></div></CardHeader>
          <CardContent>
            {attendance.length === 0 ? <p className="text-center py-8 text-gray-400">No attendance data.</p> : (
              <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-2">Employee</th><th className="text-left px-4 py-2">Role</th><th className="text-right px-4 py-2">Days</th><th className="text-right px-4 py-2">Hours</th><th className="text-right px-4 py-2">Tips</th></tr></thead>
              <tbody className="divide-y">{attendance.map((a: any, i: number) => <tr key={i}><td className="px-4 py-2">{a.name}</td><td className="px-4 py-2"><Badge className={ROLE_COLORS[a.role] || "bg-gray-100 text-gray-700"}>{a.role || "—"}</Badge></td><td className="px-4 py-2 text-right">{a.days_present}</td><td className="px-4 py-2 text-right">{Number(a.hours_worked||0).toFixed(1)}h</td><td className="px-4 py-2 text-right">₹{Number(a.tips_earned||0).toLocaleString()}</td></tr>)}</tbody></table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "performance" && (
        <Card>
          <CardHeader><div className="flex justify-between items-center"><CardTitle className="text-base">Waiter / Steward Performance — Today</CardTitle><Button size="sm" variant="outline" onClick={() => navigate("/hr-payroll")}>HR Payroll →</Button></div></CardHeader>
          <CardContent>
            {performance.length === 0 ? <p className="text-center py-8 text-gray-400">No performance data today.</p> : (
              <table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-2">Staff</th><th className="text-right px-4 py-2">Orders</th><th className="text-right px-4 py-2">Revenue</th><th className="text-right px-4 py-2">Avg Bill</th><th className="text-right px-4 py-2">Tips</th></tr></thead>
              <tbody className="divide-y">{performance.map((p: any, i: number) => <tr key={i}><td className="px-4 py-2">{p.waiter_name}</td><td className="px-4 py-2 text-right">{p.orders_served}</td><td className="px-4 py-2 text-right">₹{Number(p.revenue_generated||0).toLocaleString()}</td><td className="px-4 py-2 text-right">₹{Number(p.avg_bill_value||0).toFixed(0)}</td><td className="px-4 py-2 text-right">₹{Number(p.tips_earned||0).toLocaleString()}</td></tr>)}</tbody></table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
