import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Bus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function TransportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"vehicles" | "routes" | "assignments">("vehicles");
  const [showForm, setShowForm] = useState(false);
  const [vForm, setVForm] = useState({ registration_no: "", capacity: "40", driver_name: "", driver_phone: "" });
  const [rForm, setRForm] = useState({ name: "", vehicle_id: "", stops: "" });
  const [aForm, setAForm] = useState({ student_id: "", route_id: "", pickup_stop: "" });

  const { data: vehicles = [] } = useQuery<any[]>({ queryKey: ["/api/education/vehicles"], queryFn: () => api("GET", "/api/education/vehicles") });
  const { data: routes = [] } = useQuery<any[]>({ queryKey: ["/api/education/routes"], queryFn: () => api("GET", "/api/education/routes") });
  const { data: assignments = [] } = useQuery<any[]>({ queryKey: ["/api/education/student-transport"], queryFn: () => api("GET", "/api/education/student-transport") });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });

  const createV = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/vehicles", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/vehicles"] }); setShowForm(false); } });
  const delV = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/vehicles/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/vehicles"] }) });
  const createR = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/routes", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/routes"] }); setShowForm(false); } });
  const delR = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/routes/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/routes"] }) });
  const createA = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/student-transport", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/student-transport"] }); setShowForm(false); } });
  const delA = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/education/student-transport/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/education/student-transport"] }) });

  const vArr = Array.isArray(vehicles) ? vehicles : [];
  const rArr = Array.isArray(routes) ? routes : [];
  const aArr = Array.isArray(assignments) ? assignments : [];
  const stdArr = Array.isArray(students) ? students : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transport</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />{tab === "vehicles" ? "Add Vehicle" : tab === "routes" ? "Add Route" : "Assign Student"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex gap-2 items-center"><Bus className="w-6 h-6 text-blue-500" /><div><p className="text-sm text-gray-500">Vehicles</p><p className="text-xl font-bold">{vArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Routes</p><p className="text-xl font-bold">{rArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Students Assigned</p><p className="text-xl font-bold text-green-600">{aArr.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {(["vehicles","routes","assignments"] as const).map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {showForm && tab === "vehicles" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Vehicle</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>Registration No</Label><Input value={vForm.registration_no} onChange={e => setVForm(p => ({ ...p, registration_no: e.target.value }))} /></div>
            <div><Label>Capacity</Label><Input type="number" value={vForm.capacity} onChange={e => setVForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            <div><Label>Driver Name</Label><Input value={vForm.driver_name} onChange={e => setVForm(p => ({ ...p, driver_name: e.target.value }))} /></div>
            <div><Label>Driver Phone</Label><Input value={vForm.driver_phone} onChange={e => setVForm(p => ({ ...p, driver_phone: e.target.value }))} /></div>
            <div className="col-span-2 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createV.mutate({ ...vForm, capacity: parseInt(vForm.capacity) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "routes" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Add Route</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Route Name</Label><Input value={rForm.name} onChange={e => setRForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Vehicle</Label><Select value={rForm.vehicle_id} onValueChange={v => setRForm(p => ({ ...p, vehicle_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{vArr.map((v: any) => <SelectItem key={v.id} value={v.id.toString()}>{v.registration_no}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Stops (comma-separated)</Label><Input value={rForm.stops} onChange={e => setRForm(p => ({ ...p, stops: e.target.value }))} placeholder="Stop 1, Stop 2, Stop 3" /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createR.mutate({ ...rForm, vehicle_id: parseInt(rForm.vehicle_id) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "assignments" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Assign Student to Route</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Student</Label><Select value={aForm.student_id} onValueChange={v => setAForm(p => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{stdArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Route</Label><Select value={aForm.route_id} onValueChange={v => setAForm(p => ({ ...p, route_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{rArr.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Pickup Stop</Label><Input value={aForm.pickup_stop} onChange={e => setAForm(p => ({ ...p, pickup_stop: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createA.mutate({ ...aForm, student_id: parseInt(aForm.student_id), route_id: parseInt(aForm.route_id) })}>Assign</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "vehicles" && <div className="grid grid-cols-3 gap-3">{vArr.map((v: any) => <Card key={v.id}><CardContent className="pt-4 flex justify-between items-start"><div><p className="font-semibold">{v.registration_no}</p><p className="text-xs text-gray-500">Cap: {v.capacity} · Driver: {v.driver_name} ({v.driver_phone})</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delV.mutate(v.id)}>Del</Button></CardContent></Card>)}{vArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-4 text-center">No vehicles yet.</p>}</div>}

      {tab === "routes" && <div className="grid grid-cols-2 gap-3">{rArr.map((r: any) => <Card key={r.id}><CardContent className="pt-4 flex justify-between items-start"><div><p className="font-semibold">{r.name}</p><p className="text-sm text-gray-500">Vehicle: {r.registration_no ?? r.vehicle_id}</p><p className="text-xs text-gray-400">{r.stops}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delR.mutate(r.id)}>Del</Button></CardContent></Card>)}{rArr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-4 text-center">No routes yet.</p>}</div>}

      {tab === "assignments" && <div className="space-y-2">{aArr.map((a: any) => <Card key={a.id}><CardContent className="pt-4 flex justify-between items-center"><div><p className="font-semibold">{a.student_name ?? `Student #${a.student_id}`}</p><p className="text-sm text-gray-500">Route: {a.route_name ?? a.route_id} · Pickup: {a.pickup_stop}</p></div><Button size="sm" variant="ghost" className="text-red-500" onClick={() => delA.mutate(a.id)}>Remove</Button></CardContent></Card>)}{aArr.length === 0 && <p className="text-center text-gray-400 py-8">No transport assignments yet.</p>}</div>}
    </div>
  );
}
