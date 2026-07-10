import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLORS: Record<string, string> = { present: "bg-green-500 text-white border-green-500", absent: "bg-red-500 text-white border-red-500", late: "bg-yellow-500 text-white border-yellow-500", leave: "bg-gray-400 text-white border-gray-400" };

export default function AttendancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"students" | "staff" | "biometric">("students");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState("");
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [df, setDf] = useState({ device_name: "", device_type: "zkteco", ip_address: "", location: "" });

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ["/api/education/classes"], queryFn: () => api("GET", "/api/education/classes") });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students", classId], queryFn: () => api("GET", `/api/education/students${classId ? `?class_id=${classId}` : ""}`), enabled: !!classId });
  const { data: attendance = [] } = useQuery<any[]>({ queryKey: ["/api/education/attendance", date, classId], queryFn: () => api("GET", `/api/education/attendance?date=${date}&class_id=${classId}`), enabled: !!classId });
  const { data: staffAtt = [] } = useQuery<any[]>({ queryKey: ["/api/education/staff-attendance", date], queryFn: () => api("GET", `/api/education/staff-attendance?date=${date}`), enabled: tab === "staff" });
  const { data: bioDevices = [] } = useQuery<any[]>({ queryKey: ["/api/education/biometric/devices"], queryFn: () => api("GET", "/api/education/biometric/devices"), enabled: tab === "biometric" });
  const { data: bioAtt = [] } = useQuery<any[]>({ queryKey: ["/api/education/biometric/attendance", date], queryFn: () => api("GET", `/api/education/biometric/attendance/${date}`), enabled: tab === "biometric" });

  const bulkSave = useMutation({ mutationFn: (records: any[]) => api("POST", "/api/education/attendance/bulk", { records }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/attendance"] }) });
  const syncBio = useMutation({ mutationFn: (deviceId: number) => api("POST", "/api/education/biometric/sync", { device_id: deviceId, date }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/biometric/attendance"] }) });
  const addDevice = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/biometric/devices", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/biometric/devices"] }); setShowDeviceForm(false); } });

  const stdArr = Array.isArray(students) ? students : [];
  const clsArr = Array.isArray(classes) ? classes : [];
  const attMap = (Array.isArray(attendance) ? attendance : []).reduce((m: any, a: any) => { m[a.student_id] = a.status; return m; }, {});
  const bioDevArr = Array.isArray(bioDevices) ? bioDevices : [];
  const bioAttArr = Array.isArray(bioAtt) ? bioAtt : [];
  const staffAttArr = Array.isArray(staffAtt) ? staffAtt : [];

  const markAll = (status: string) => { const m: Record<number, string> = {}; stdArr.forEach((s: any) => { m[s.id] = status; }); setMarks(m); };
  const saveAtt = () => { const records = stdArr.map((s: any) => ({ student_id: s.id, date, status: marks[s.id] || attMap[s.id] || "present", class_id: parseInt(classId) })); bulkSave.mutate(records); };

  const present = stdArr.filter((s: any) => (marks[s.id] || attMap[s.id] || "present") === "present").length;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>

      <div className="flex gap-2 border-b pb-1">
        {(["students", "staff", "biometric"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t === "students" ? "Students" : t === "staff" ? "Staff Attendance" : "Biometric Devices"}</button>)}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" /></div>
        {tab === "students" && <><div><Label className="text-xs">Class</Label><Select value={classId} onValueChange={v => { setClassId(v); setMarks({}); }}><SelectTrigger className="w-40"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{clsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} {c.section}</SelectItem>)}</SelectContent></Select></div>
          {classId && <><Button variant="outline" size="sm" onClick={() => markAll("present")}>All Present</Button><Button variant="outline" size="sm" onClick={() => markAll("absent")}>All Absent</Button><Button size="sm" onClick={saveAtt}>Save Attendance</Button></>}</>}
      </div>

      {tab === "students" && classId && (
        <>
          <p className="text-sm text-gray-500">Present: {present}/{stdArr.length}</p>
          <div className="space-y-1">
            {stdArr.map((s: any) => {
              const cur = marks[s.id] || attMap[s.id] || "present";
              return <div key={s.id} className="flex items-center justify-between bg-white border rounded p-2">
                <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.roll_number}</p></div>
                <div className="flex gap-1">{["present", "absent", "late", "leave"].map(st => <button key={st} onClick={() => setMarks(p => ({ ...p, [s.id]: st }))} className={`px-2 py-0.5 text-xs rounded border ${cur === st ? STATUS_COLORS[st] : "border-gray-200 text-gray-500"}`}>{st.charAt(0).toUpperCase() + st.slice(1)}</button>)}</div>
              </div>;
            })}
            {stdArr.length === 0 && <p className="text-center text-gray-400 py-4">No students in this class.</p>}
          </div>
        </>
      )}
      {tab === "students" && !classId && <p className="text-center text-gray-400 py-8">Select a class to mark attendance.</p>}

      {tab === "staff" && (
        <div className="space-y-2">
          {staffAttArr.map((a: any) => <div key={a.id} className="flex items-center justify-between border rounded p-2"><div><p className="font-medium text-sm">{a.staff_name ?? `Staff #${a.employee_id}`}</p><p className="text-xs text-gray-500">In: {a.check_in ?? "—"} · Out: {a.check_out ?? "—"} · {a.source}</p></div><Badge className={a.status === "present" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{a.status}</Badge></div>)}
          {staffAttArr.length === 0 && <p className="text-center text-gray-400 py-8">No staff records for {date}.</p>}
        </div>
      )}

      {tab === "biometric" && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => setShowDeviceForm(true)}><Plus className="w-4 h-4 mr-1" />Add Device</Button></div>
          {showDeviceForm && <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Biometric Device</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowDeviceForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={df.device_name} onChange={e => setDf(p => ({ ...p, device_name: e.target.value }))} /></div>
              <div><Label>Type</Label><Select value={df.device_type} onValueChange={v => setDf(p => ({ ...p, device_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="zkteco">ZKTeco</SelectItem><SelectItem value="fingerprint">Fingerprint</SelectItem><SelectItem value="face">Face Recognition</SelectItem></SelectContent></Select></div>
              <div><Label>IP Address</Label><Input value={df.ip_address} onChange={e => setDf(p => ({ ...p, ip_address: e.target.value }))} placeholder="192.168.1.100" /></div>
              <div><Label>Location</Label><Input value={df.location} onChange={e => setDf(p => ({ ...p, location: e.target.value }))} /></div>
              <div className="col-span-2 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowDeviceForm(false)}>Cancel</Button><Button onClick={() => addDevice.mutate(df)}>Add</Button></div>
            </CardContent></Card>}
          <div className="grid grid-cols-2 gap-3">
            {bioDevArr.map((d: any) => <Card key={d.id}><CardContent className="pt-4 flex items-center justify-between"><div><p className="font-semibold">{d.device_name}</p><p className="text-sm text-gray-500">{d.device_type} · {d.ip_address} · {d.location}</p></div><Button size="sm" variant="outline" onClick={() => syncBio.mutate(d.id)}><RefreshCw className="w-3 h-3 mr-1" />Sync</Button></CardContent></Card>)}
            {bioDevArr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-4 text-center">No biometric devices. ZKTeco sync via IP/TCP push.</p>}
          </div>
          <div className="space-y-1">
            {bioAttArr.map((a: any, i: number) => <div key={i} className="flex items-center justify-between border rounded p-2 text-sm"><div><p className="font-medium">{a.staff_name ?? `Emp #${a.employee_id}`}</p><p className="text-xs text-gray-500">In: {a.check_in ?? "—"} · Out: {a.check_out ?? "—"}</p></div><Badge className="bg-blue-100 text-blue-800">Biometric</Badge></div>)}
            {bioAttArr.length === 0 && <p className="text-gray-400 text-sm text-center py-2">No biometric records for {date}. Sync a device above.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
