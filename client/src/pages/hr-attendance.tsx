import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, ChevronLeft, ChevronRight, Plus, Trash2, Clock, AlertCircle } from "lucide-react";

const STATUSES = [
  { value: "present",    label: "P",  color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "absent",     label: "A",  color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "half_day",   label: "H",  color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "lop",        label: "LOP",color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { value: "on_leave",   label: "OL", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "holiday",    label: "H*", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "weekly_off", label: "WO", color: "bg-muted text-muted-foreground" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── OT Register Tab ──────────────────────────────────────────────────────────
function OTRegisterTab({ month, year, employees }: { month: number; year: number; employees: any[] }) {
  const { toast } = useToast();
  const [empId, setEmpId] = useState("");
  const [date, setDate] = useState("");
  const [otHours, setOtHours] = useState("");
  const [otType, setOtType] = useState<"paid" | "comp">("paid");
  const [isArrear, setIsArrear] = useState(false);
  const [arrearMonth, setArrearMonth] = useState(month === 1 ? 12 : month - 1);
  const [arrearYear, setArrearYear] = useState(month === 1 ? year - 1 : year);

  const { data: otEntries = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/hr/attendance/ot", month, year],
    queryFn: () => fetch(`/api/hr/attendance/ot?month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
  });

  // When arrear mode is toggled on, auto-set date to last day of current month
  const handleArrearToggle = (on: boolean) => {
    setIsArrear(on);
    if (on) {
      const lastDay = new Date(year, month, 0).getDate();
      setDate(`${year}-${String(month).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`);
    } else {
      setDate("");
    }
  };

  const arrearRemarks = isArrear
    ? `Arrear OT from ${FULL_MONTHS[arrearMonth - 1]} ${arrearYear}`
    : undefined;

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hr/attendance/ot", {
      employeeId: Number(empId),
      date,
      otHours: Number(otHours),
      otType,
      remarks: arrearRemarks ?? null,
    }),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance/summary", month, year] });
      setEmpId(""); setOtHours("");
      if (!isArrear) setDate("");
      toast({ title: isArrear ? "Arrear OT saved — will be paid in this month's payroll" : "OT entry saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const delMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/attendance/ot/${id}`),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance/summary", month, year] });
      toast({ title: "OT entry removed" });
    },
  });

  const activeEmps = employees.filter((e: any) => e.status === "active");
  const minDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const maxDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
  const totalOT = (otEntries as any[]).reduce((s: number, e: any) => s + Number(e.ot_hours), 0);
  const arrearCount = (otEntries as any[]).filter((e: any) => e.remarks?.startsWith("Arrear OT")).length;

  const yearOptions = [year - 2, year - 1, year];

  return (
    <div className="space-y-4">
      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Register Overtime — {MONTHS[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Arrear toggle */}
          <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Switch
              checked={isArrear}
              onCheckedChange={handleArrearToggle}
              data-testid="switch-arrear-ot"
            />
            <div>
              <p className="text-sm font-medium">Arrear / Carry-Forward OT</p>
              <p className="text-xs text-muted-foreground">
                OT earned in a previous month that wasn't paid then — will be included in <strong>{MONTHS[month - 1]} {year}</strong> payroll
              </p>
            </div>
          </div>

          {/* Arrear source month picker */}
          {isArrear && (
            <div className="flex items-start gap-3 p-3 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                  OT was originally earned in which month?
                </p>
                <div className="flex gap-2">
                  <Select value={String(arrearMonth)} onValueChange={v => setArrearMonth(Number(v))}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FULL_MONTHS.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(arrearYear)} onValueChange={v => setArrearYear(Number(v))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Will be recorded as: <em>"{FULL_MONTHS[arrearMonth - 1]} {arrearYear} arrear OT"</em> in {MONTHS[month - 1]} {year} payroll
                </p>
              </div>
            </div>
          )}

          {/* Main form row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger data-testid="select-ot-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmps.map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.emp_code} — {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">
                {isArrear ? "Pay Date (in current month)" : "Date *"}
              </Label>
              <Input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={e => setDate(e.target.value)}
                data-testid="input-ot-date"
              />
              {isArrear && (
                <p className="text-xs text-muted-foreground mt-1">
                  Date within {MONTHS[month - 1]} {year} — payroll picks it up for this month
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">OT Hours *</Label>
              <div className="flex gap-1.5 flex-wrap">
                <Input
                  type="number"
                  min="0.5"
                  max="200"
                  step="0.5"
                  placeholder="hrs"
                  value={otHours}
                  onChange={e => setOtHours(e.target.value)}
                  data-testid="input-ot-hours"
                  className="w-24"
                />
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: "2h",  value: "2" },
                    { label: "4h",  value: "4" },
                    { label: "8h (full day)", value: "8" },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={otHours === opt.value ? "default" : "outline"}
                      onClick={() => setOtHours(opt.value)}
                      className="text-xs"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* OT Settlement Type */}
          <div className="flex items-center gap-4 p-3 rounded-md border">
            <p className="text-sm font-medium shrink-0">OT Settlement:</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOtType("paid")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${otType === "paid" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}
                data-testid="btn-ot-type-paid"
              >
                Paid (Cash)
              </button>
              <button
                type="button"
                onClick={() => setOtType("comp")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${otType === "comp" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}
                data-testid="btn-ot-type-comp"
              >
                Compensatory Off
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {otType === "paid" ? "OT pay added to payroll at 1.5× rate" : "COMP off leave credited to employee balance (8 hrs = 1 day)"}
            </p>
          </div>

          <div>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!empId || !date || !otHours || addMutation.isPending}
              data-testid="btn-add-ot"
            >
              <Plus className="h-4 w-4 mr-1" />
              {addMutation.isPending
                ? "Saving..."
                : isArrear
                  ? `Save Arrear OT (from ${FULL_MONTHS[arrearMonth - 1]} ${arrearYear})`
                  : "Save OT Entry"
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OT Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">
              OT Entries — {MONTHS[month - 1]} {year}
            </CardTitle>
            <div className="flex gap-2">
              {arrearCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900">
                  {arrearCount} arrear {arrearCount === 1 ? "entry" : "entries"}
                </Badge>
              )}
              {(otEntries as any[]).length > 0 && (
                <Badge variant="secondary">Total: {totalOT.toFixed(1)} hrs</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(otEntries as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No OT entries for {MONTHS[month - 1]} {year}. Add overtime hours above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type / Remarks</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Attendance</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Settlement</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">OT Hours</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {(otEntries as any[]).map((entry: any) => {
                    const d = new Date(entry.date);
                    const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
                    const st = STATUS_MAP[entry.status];
                    const isArrearEntry = entry.remarks?.startsWith("Arrear OT");
                    return (
                      <tr key={entry.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{entry.first_name} {entry.last_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.emp_code}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p>{d.toLocaleDateString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground">{dayName}</p>
                        </td>
                        <td className="px-3 py-2">
                          {isArrearEntry ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 text-xs">
                              {entry.remarks}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Regular OT</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {st ? (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${st.color}`}>{st.label}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={entry.ot_type === "comp" ? "secondary" : "default"} className="text-xs">
                            {entry.ot_type === "comp" ? "Comp Off" : "Paid"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold">
                          {Number(entry.ot_hours).toFixed(1)} hrs
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => delMutation.mutate(entry.id)}
                            disabled={delMutation.isPending}
                            data-testid={`btn-del-ot-${entry.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRAttendancePage() {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<"mark" | "ot" | "summary">("mark");

  const { data: attendance = [] } = useQuery({
    queryKey: ["/api/hr/attendance", month, year],
    queryFn: () => fetch(`/api/hr/attendance?month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/hr/employees"] });

  const { data: summary = [] } = useQuery({
    queryKey: ["/api/hr/attendance/summary", month, year],
    queryFn: () => fetch(`/api/hr/attendance/summary?month=${month}&year=${year}`, { credentials: "include" }).then(r => r.json()),
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const attMap: Record<string, Record<string, string>> = {};
  (attendance as any[]).forEach((a: any) => {
    if (!attMap[a.employee_id]) attMap[a.employee_id] = {};
    // a.date may be a JS Date object or an ISO string — use toISOString() to get UTC date safely
    const iso: string = a.date instanceof Date ? a.date.toISOString() : String(a.date);
    const day = parseInt(iso.split("T")[0].split("-")[2], 10);
    attMap[a.employee_id][day] = a.status;
  });

  const [changes, setChanges] = useState<Record<string, string>>({});

  const markChange = (empId: number, day: number, status: string) => {
    setChanges(c => ({ ...c, [`${empId}_${day}`]: status }));
  };

  const getStatus = (empId: number, day: number): string => {
    const key = `${empId}_${day}`;
    if (changes[key]) return changes[key];
    return attMap[empId]?.[day] || "";
  };

  const bulkSave = useMutation({
    mutationFn: async () => {
      const records = Object.entries(changes).map(([key, status]) => {
        const [empId, day] = key.split("_");
        // Build date string directly to avoid UTC timezone shift (e.g. IST midnight → previous UTC day)
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return { employeeId: Number(empId), date: dateStr, status };
      });
      return apiRequest("POST", "/api/hr/attendance/bulk", { records });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance", month, year] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr/attendance/summary", month, year] });
      setChanges({});
      toast({ title: `Attendance saved for ${MONTHS[month - 1]} ${year}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activeEmps = (employees as any[]).filter((e: any) => e.status === "active");

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark attendance and register overtime hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-medium min-w-28 text-center">{MONTHS[month - 1]} {year}</span>
          <Button size="icon" variant="outline" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={tab === "mark" ? "default" : "outline"} onClick={() => setTab("mark")}>
          Mark Attendance
        </Button>
        <Button size="sm" variant={tab === "ot" ? "default" : "outline"} onClick={() => setTab("ot")}>
          <Clock className="h-3.5 w-3.5 mr-1" />OT Register
        </Button>
        <Button size="sm" variant={tab === "summary" ? "default" : "outline"} onClick={() => setTab("summary")}>
          Monthly Summary
        </Button>
      </div>

      {/* ── Mark Attendance ─────────────────────────────────────────────── */}
      {tab === "mark" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm">
                {MONTHS[month - 1]} {year} — {activeEmps.length} Active Employees
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1 flex-wrap">
                  {STATUSES.slice(0, 5).map(s => (
                    <span key={s.value} className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.color}`}>
                      {s.label}={s.value.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                {Object.keys(changes).length > 0 && (
                  <Button size="sm" onClick={() => bulkSave.mutate()} disabled={bulkSave.isPending} data-testid="btn-save-attendance">
                    <Save className="h-3.5 w-3.5 mr-1" />
                    {bulkSave.isPending ? "Saving..." : `Save ${Object.keys(changes).length} Changes`}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeEmps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active employees. Add employees first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground sticky left-0 bg-background min-w-32">Employee</th>
                      {days.map(d => {
                        const dow = new Date(year, month - 1, d).getDay();
                        const isWeekend = dow === 0 || dow === 6;
                        return (
                          <th key={d} className={`px-1 py-1.5 text-center font-medium min-w-8 ${isWeekend ? "text-muted-foreground" : "text-foreground"}`}>
                            {d}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmps.map((emp: any) => (
                      <tr key={emp.id} className="border-t">
                        <td className="px-2 py-1 sticky left-0 bg-background">
                          <div>
                            <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                            <p className="text-muted-foreground">{emp.emp_code}</p>
                          </div>
                        </td>
                        {days.map(day => {
                          const status = getStatus(emp.id, day);
                          const st = STATUS_MAP[status];
                          const isChanged = changes[`${emp.id}_${day}`];
                          return (
                            <td key={day} className="px-0.5 py-0.5 text-center">
                              <Select value={status || ""} onValueChange={v => markChange(emp.id, day, v)}>
                                <SelectTrigger className={`h-7 w-9 px-0 border-0 text-xs font-medium justify-center ${st ? st.color : "text-muted-foreground"} ${isChanged ? "ring-1 ring-primary" : ""}`}>
                                  <SelectValue>{st ? st.label : "—"}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label} — {s.value.replace(/_/g, " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── OT Register ─────────────────────────────────────────────────── */}
      {tab === "ot" && (
        <OTRegisterTab month={month} year={year} employees={employees as any[]} />
      )}

      {/* ── Monthly Summary ──────────────────────────────────────────────── */}
      {tab === "summary" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Summary — {MONTHS[month - 1]} {year}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Present</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Absent</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">Half Day</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">On Leave</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">LOP</th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">OT Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary as any[]).length === 0 && (
                    <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No attendance data for this month</td></tr>
                  )}
                  {(summary as any[]).map((s: any) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2">
                        <p className="font-medium">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.emp_code}</p>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900">{s.present}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900">{s.absent}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">{s.half_day}</td>
                      <td className="px-3 py-2 text-center">{s.on_leave}</td>
                      <td className="px-3 py-2 text-center">
                        {s.lop > 0 ? <Badge variant="destructive">{s.lop}</Badge> : "0"}
                      </td>
                      <td className="px-3 py-2 text-center font-medium">
                        {Number(s.total_ot_hours) > 0
                          ? <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900">{Number(s.total_ot_hours).toFixed(1)}</Badge>
                          : "—"
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
