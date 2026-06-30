import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BedDouble, Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const STATUS_STYLES: Record<string, string> = {
  available: "border-green-400 bg-green-50",
  occupied: "border-red-400 bg-red-50",
  reserved: "border-yellow-400 bg-yellow-50",
  maintenance: "border-gray-300 bg-gray-100",
};

const STATUS_DOT: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-yellow-400",
  maintenance: "bg-gray-400",
};

const WARDS = ["General", "ICU", "Semi-Private", "Private", "Maternity"];
const ADD_BLANK = { bed_number: "", ward: "General" };

export default function BedsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newBed, setNewBed] = useState({ ...ADD_BLANK });

  const { data: beds = [] } = useQuery({
    queryKey: ["/api/healthcare/beds"],
    queryFn: () => api("GET", "/api/healthcare/beds").then(d => Array.isArray(d) ? d : []),
    refetchInterval: 60000,
  });

  const release = useMutation({
    mutationFn: (id: any) => api("PUT", `/api/healthcare/beds/${id}/release`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: any) => api("PUT", `/api/healthcare/beds/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }),
  });

  const addBed = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/beds", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }); setShowAdd(false); setNewBed({ ...ADD_BLANK }); },
  });

  const total = beds.length;
  const occupied = beds.filter((b: any) => b.status === "occupied").length;
  const available = beds.filter((b: any) => b.status === "available").length;
  const pct = total ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold">Bed Management</h1>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Bed</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Beds", value: total, color: "text-gray-800" },
          { label: "Occupied", value: occupied, color: "text-red-600" },
          { label: "Available", value: available, color: "text-green-600" },
          { label: "Occupancy", value: `${pct}%`, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {WARDS.map(ward => {
        const wardBeds = beds.filter((b: any) => b.ward === ward);
        if (wardBeds.length === 0) return null;
        return (
          <div key={ward}>
            <h2 className="font-semibold text-base mb-2">{ward} Ward <span className="text-gray-400 text-xs">({wardBeds.length} beds)</span></h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {wardBeds.map((b: any) => (
                <div key={b.id} className={`border-2 rounded-lg p-2.5 space-y-1 ${STATUS_STYLES[b.status] || "border-gray-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{b.bed_number}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[b.status] || "bg-gray-300"}`} />
                  </div>
                  <p className="text-xs capitalize text-gray-600">{b.status || "available"}</p>
                  {b.status === "occupied" && <p className="text-xs text-gray-500 truncate">{b.patient_name || "Patient"}</p>}
                  {b.status === "occupied" && b.admission_date && <p className="text-xs text-gray-400">{new Date(b.admission_date).toLocaleDateString()}</p>}
                  <div className="flex gap-1 flex-wrap mt-1">
                    {b.status === "occupied" && (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-1.5" onClick={() => release.mutate(b.id)}>Release</Button>
                    )}
                    {b.status === "available" && (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-1.5" onClick={() => setStatus.mutate({ id: b.id, status: "maintenance" })}>Maint.</Button>
                    )}
                    {(b.status === "maintenance" || b.status === "reserved") && (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-1.5" onClick={() => setStatus.mutate({ id: b.id, status: "available" })}>Available</Button>
                    )}
                    {b.status === "available" && (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-1.5" onClick={() => setStatus.mutate({ id: b.id, status: "reserved" })}>Reserve</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {beds.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No beds configured. Add beds to get started.</p>
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setNewBed({ ...ADD_BLANK }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Bed</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1"><Label>Bed Number</Label><Input value={newBed.bed_number} onChange={e => setNewBed(p => ({ ...p, bed_number: e.target.value }))} placeholder="e.g. G-101" /></div>
            <div className="space-y-1"><Label>Ward</Label>
              <Select value={newBed.ward} onValueChange={v => setNewBed(p => ({ ...p, ward: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WARDS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addBed.mutate(newBed)} disabled={addBed.isPending || !newBed.bed_number}>{addBed.isPending ? "Adding…" : "Add Bed"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
