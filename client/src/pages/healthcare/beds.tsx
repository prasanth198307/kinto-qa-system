import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_STYLE: Record<string, string> = {
  available: "bg-green-50 border-green-300 text-green-800",
  occupied: "bg-red-50 border-red-300 text-red-800",
  maintenance: "bg-yellow-50 border-yellow-300 text-yellow-800",
  reserved: "bg-blue-50 border-blue-300 text-blue-800",
};

export default function BedsPage() {
  const qc = useQueryClient();
  const [assigning, setAssigning] = useState<any>(null);
  const [patientId, setPatientId] = useState("");
  const [wardFilter, setWardFilter] = useState("");

  const { data: beds = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/beds"], queryFn: () => api("GET", "/api/healthcare/beds") });
  const { data: wards = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/wards"], queryFn: () => api("GET", "/api/healthcare/wards") });
  const { data: patients = [] } = useQuery<any[]>({ queryKey: ["/api/healthcare/patients"], queryFn: () => api("GET", "/api/healthcare/patients") });

  const assign = useMutation({ mutationFn: ({ id, pid }: any) => api("POST", `/api/healthcare/beds/${id}/assign`, { patient_id: pid }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }); setAssigning(null); setPatientId(""); } });
  const release = useMutation({ mutationFn: (id: number) => api("POST", `/api/healthcare/beds/${id}/release`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }) });
  const setStatus = useMutation({ mutationFn: ({ id, status }: any) => api("PUT", `/api/healthcare/beds/${id}/status`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }) });

  const arr = Array.isArray(beds) ? beds : [];
  const filtered = wardFilter ? arr.filter((b: any) => b.ward_id?.toString() === wardFilter) : arr;
  const occupied = arr.filter((b: any) => b.status === "occupied").length;
  const available = arr.filter((b: any) => b.status === "available").length;
  const occupancyPct = arr.length > 0 ? Math.round((occupied / arr.length) * 100) : 0;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bed Management</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><BedDouble className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-gray-500">Total Beds</p><p className="text-2xl font-bold">{arr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold text-green-600">{available}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Occupied</p><p className="text-2xl font-bold text-red-600">{occupied}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Occupancy</p><p className="text-2xl font-bold">{occupancyPct}%</p></CardContent></Card>
      </div>

      <div><Label className="text-xs">Filter by Ward</Label>
        <Select value={wardFilter} onValueChange={setWardFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All wards" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All wards</SelectItem>
            {Array.isArray(wards) && wards.map((w: any) => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {filtered.map((b: any) => (
          <div key={b.id} className={`border-2 rounded-lg p-3 ${STATUS_STYLE[b.status] ?? "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold">{b.bed_no ?? `Bed ${b.id}`}</p>
              <Badge variant="outline" className="text-xs">{b.status}</Badge>
            </div>
            <p className="text-xs">{b.ward_name ?? `Ward #${b.ward_id}`}</p>
            {b.patient_name && <p className="text-xs font-medium mt-1">{b.patient_name}</p>}
            <div className="flex gap-1 mt-2">
              {b.status === "available" && <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => setAssigning(b)}>Assign</Button>}
              {b.status === "occupied" && <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => release.mutate(b.id)}>Release</Button>}
              {b.status === "available" && <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setStatus.mutate({ id: b.id, status: "maintenance" })}>Maint.</Button>}
              {b.status === "maintenance" && <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setStatus.mutate({ id: b.id, status: "available" })}>Ready</Button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-4 py-8 text-center">No beds configured.</p>}
      </div>

      {assigning && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Assign {assigning.bed_no ?? `Bed ${assigning.id}`}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAssigning(null)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="flex gap-2 items-end">
            <div className="flex-1"><Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{Array.isArray(patients) && patients.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => assign.mutate({ id: assigning.id, pid: parseInt(patientId) })}>Assign Bed</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
