import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardShell } from "@/components/DashboardShell";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: b ? { "Content-Type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

const ROLES = ["server", "cashier", "kitchen", "manager", "host", "bartender"];
const ROLE_COLORS: Record<string, string> = {
  server: "bg-blue-100 text-blue-700",
  cashier: "bg-green-100 text-green-700",
  kitchen: "bg-orange-100 text-orange-700",
  manager: "bg-purple-100 text-purple-700",
  host: "bg-pink-100 text-pink-700",
  bartender: "bg-yellow-100 text-yellow-700",
};

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(date: Date) { return date.toISOString().split("T")[0]; }
function fmtDisplay(date: Date) { return date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }); }

export default function RestaurantStaffPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"schedule" | "attendance" | "tips">("schedule");
  const [showAddShift, setShowAddShift] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({
    staff_name: "", staff_role: "server", schedule_date: fmt(new Date()),
    shift_start: "09:00", shift_end: "17:00",
  });

  const weekDates = getWeekDates().map(d => {
    const shifted = new Date(d);
    shifted.setDate(d.getDate() + weekOffset * 7);
    return shifted;
  });

  const fromDate = fmt(weekDates[0]);
  const toDate = fmt(weekDates[6]);

  const { data: schedules = [], refetch } = useQuery({
    queryKey: ["/api/restaurant/staff/schedules", fromDate, toDate],
    queryFn: () => api("GET", `/api/restaurant/staff/schedules?from=${fromDate}&to=${toDate}`),
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ["/api/restaurant/staff/attendance"],
    queryFn: () => api("GET", "/api/restaurant/staff/attendance"),
    enabled: tab === "attendance",
    refetchInterval: 30000,
  });

  const schedList = Array.isArray(schedules) ? schedules : (schedules as any)?.data || [];
  const attnList = Array.isArray(attendance) ? attendance : (attendance as any)?.data || [];

  const addShift = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/staff/schedules", form),
    onSuccess: () => {
      toast({ title: "Shift added!" });
      qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/schedules"] });
      setShowAddShift(false);
      setForm(f => ({ ...f, staff_name: "" }));
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clockIn = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/staff/schedules/${id}/clock-in`, {}),
    onSuccess: () => { toast({ title: "Clocked in!" }); refetch(); qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/attendance"] }); },
  });

  const clockOut = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/staff/schedules/${id}/clock-out`, {}),
    onSuccess: () => { toast({ title: "Clocked out!" }); refetch(); qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/attendance"] }); },
  });

  const deleteShift = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/staff/schedules/${id}`, {}),
    onSuccess: () => { toast({ title: "Shift removed" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/schedules"] }); },
  });

  const totalTips = attnList.reduce((s: number, a: any) => s + Number(a.tips_earned || 0), 0);
  const clockedInCount = attnList.filter((a: any) => a.status === "clocked_in").length;
  const scheduledCount = attnList.length;

  const tabs = [
    { id: "schedule", label: "📅 Weekly Schedule" },
    { id: "attendance", label: "✅ Attendance" },
    { id: "tips", label: "💰 Tips" },
  ] as const;

  return (
    <DashboardShell activeNavId="restaurant-staff" title="Staff & Tips Management">
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Scheduled Today", value: scheduledCount, icon: "📅", color: "text-blue-600" },
            { label: "Currently In", value: clockedInCount, icon: "🟢", color: "text-green-600" },
            { label: "Tips Today", value: `₹${totalTips.toFixed(0)}`, icon: "💰", color: "text-yellow-600" },
            { label: "Shifts This Week", value: schedList.length, icon: "🗓️", color: "text-purple-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Schedule tab */}
        {tab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
                <span className="text-sm font-semibold text-gray-700">
                  {fmtDisplay(weekDates[0])} — {fmtDisplay(weekDates[6])}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
                {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>}
              </div>
              <Button onClick={() => setShowAddShift(true)}>+ Add Shift</Button>
            </div>

            {/* Weekly grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="text-xs font-semibold text-gray-500 px-2">Staff</div>
                  {weekDates.map(d => (
                    <div key={d.toISOString()} className={`text-xs font-semibold text-center px-1 ${fmt(d) === fmt(new Date()) ? "text-blue-600" : "text-gray-500"}`}>
                      {fmtDisplay(d)}
                    </div>
                  ))}
                </div>

                {Array.from(new Set(schedList.map((s: any) => s.staff_name))).map((name) => (
                  <div key={name as string} className="grid grid-cols-8 gap-1 mb-1 items-start">
                    <div className="text-sm font-medium text-gray-800 px-2 py-2 truncate">{name as string}</div>
                    {weekDates.map(d => {
                      const dayShifts = schedList.filter((s: any) => s.staff_name === name && fmt(new Date(s.schedule_date)) === fmt(d));
                      return (
                        <div key={d.toISOString()} className={`min-h-[3rem] rounded-lg p-1 ${fmt(d) === fmt(new Date()) ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}>
                          {dayShifts.map((shift: any) => (
                            <div key={shift.id} className="mb-1">
                              <div className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[shift.staff_role] || "bg-gray-100 text-gray-600"}`}>
                                {shift.staff_role}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{shift.shift_start?.slice(0,5)}–{shift.shift_end?.slice(0,5)}</div>
                              <button onClick={() => deleteShift.mutate(shift.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {schedList.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-sm">No shifts scheduled this week. Click "Add Shift" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attendance tab */}
        {tab === "attendance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Today's Attendance — {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</h3>
              <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["/api/restaurant/staff/attendance"] })}>Refresh</Button>
            </div>
            <div className="space-y-3">
              {attnList.map((a: any) => {
                const hoursWorked = Number(a.hours_worked || 0);
                return (
                  <Card key={a.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${a.status === "clocked_in" ? "bg-green-100 text-green-700" : a.status === "clocked_out" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                            {(a.staff_name as string)?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-semibold">{a.staff_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-xs ${ROLE_COLORS[a.staff_role] || "bg-gray-100 text-gray-600"}`}>{a.staff_role}</Badge>
                              <Badge variant={a.status === "clocked_in" ? "default" : "secondary"} className="text-xs">
                                {a.status === "clocked_in" ? "🟢 Clocked In" : a.status === "clocked_out" ? "⚫ Clocked Out" : "📅 Scheduled"}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Shift: {a.shift_start?.slice(0,5)} – {a.shift_end?.slice(0,5)}
                              {a.actual_start && ` · In: ${new Date(a.actual_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                              {a.actual_end && ` · Out: ${new Date(a.actual_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                              {a.status === "clocked_out" && hoursWorked > 0 && ` · ${hoursWorked.toFixed(1)}h worked`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {a.status === "scheduled" && (
                            <Button size="sm" onClick={() => clockIn.mutate(a.id)} disabled={clockIn.isPending}>
                              Clock In
                            </Button>
                          )}
                          {a.status === "clocked_in" && (
                            <Button size="sm" variant="outline" onClick={() => clockOut.mutate(a.id)} disabled={clockOut.isPending}>
                              Clock Out
                            </Button>
                          )}
                          {a.status === "clocked_out" && (
                            <span className="text-sm text-gray-500 self-center">{hoursWorked.toFixed(1)}h</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {attnList.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">No staff scheduled for today. Add shifts in the Schedule tab.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips tab */}
        {tab === "tips" && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Tip Distribution — Today</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-4 mb-4">
                  <div className="text-4xl font-black text-yellow-500">₹{totalTips.toFixed(2)}</div>
                  <div className="text-gray-500 text-sm">Total tips collected today</div>
                </div>
                {attnList.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-3">Distribution by role (servers get 40%, kitchen 30%, cashier 20%, manager 10%):</p>
                    {[
                      { role: "server", pct: 40 },
                      { role: "kitchen", pct: 30 },
                      { role: "cashier", pct: 20 },
                      { role: "manager", pct: 10 },
                    ].map(({ role, pct }) => {
                      const roleStaff = attnList.filter((a: any) => a.staff_role === role);
                      const roleTotal = totalTips * pct / 100;
                      const perHead = roleStaff.length > 0 ? roleTotal / roleStaff.length : 0;
                      return (
                        <div key={role} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex justify-between mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[role] || "bg-gray-100"}`}>{role}</span>
                            <span className="font-bold">₹{roleTotal.toFixed(2)} ({pct}%)</span>
                          </div>
                          {roleStaff.length > 0 ? (
                            <div className="text-xs text-gray-500">
                              {roleStaff.map((s: any) => s.staff_name).join(", ")} — ₹{perHead.toFixed(2)} each
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">No {role} staff scheduled today</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm py-4">No staff attendance data for today</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">How Tips Are Collected</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Tips are automatically aggregated from POS payments where customers add a tip amount. The daily total is shown here and distributed at end of shift based on role percentages above.</p>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  💡 Tip: Connect your POS payment methods to automatically track tips per transaction. Go to POS → Settings to enable tip collection.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Shift Modal */}
      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b"><h2 className="font-bold text-lg">Add Shift</h2></div>
            <div className="p-5 space-y-4">
              <div><Label>Staff Name</Label><Input className="mt-1" placeholder="e.g. Ravi Kumar" value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} /></div>
              <div>
                <Label>Role</Label>
                <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={form.staff_role} onChange={e => setForm(f => ({ ...f, staff_role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div><Label>Date</Label><Input type="date" className="mt-1" value={form.schedule_date} onChange={e => setForm(f => ({ ...f, schedule_date: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Shift Start</Label><Input type="time" className="mt-1" value={form.shift_start} onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))} /></div>
                <div><Label>Shift End</Label><Input type="time" className="mt-1" value={form.shift_end} onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))} /></div>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddShift(false)}>Cancel</Button>
              <Button onClick={() => addShift.mutate()} disabled={!form.staff_name || addShift.isPending}>Add Shift</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
