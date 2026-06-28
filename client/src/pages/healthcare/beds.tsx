import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const BED_STATUS_COLORS: Record<string, string> = { available: "bg-green-100 border-green-400 text-green-800", occupied: "bg-yellow-100 border-yellow-400 text-yellow-800", maintenance: "bg-red-100 border-red-400 text-red-800" };

export default function HealthcareBedsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bed_number: "", ward: "", bed_type: "general", floor: "" });

  const { data: beds = [] } = useQuery({ queryKey: ["/api/healthcare/beds"], queryFn: () => api("GET", "/api/healthcare/beds") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/beds", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/beds"] }); setShowForm(false); toast({ title: "Bed added" }); }
  });

  const wards = [...new Set(beds.map((b: any) => b.ward))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bed Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Bed</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Total Beds", v: beds.length }, { label: "Available", v: beds.filter((b:any) => b.status==="available").length }, { label: "Occupied", v: beds.filter((b:any) => b.status==="occupied").length }].map(s => (
          <Card key={s.label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-3xl font-bold">{s.v}</p></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add Bed</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["bed_number","Bed Number"],["ward","Ward"],["floor","Floor"]].map(([k,l]) => (
              <div key={k}><label className="text-sm font-medium">{l}</label>
                <Input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Bed Type</label>
              <Select value={form.bed_type} onValueChange={v => setForm(p => ({ ...p, bed_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["general","semi-private","private","ICU"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      {wards.map((ward: any) => (
        <Card key={ward}>
          <CardHeader><CardTitle>{ward}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {beds.filter((b: any) => b.ward === ward).map((b: any) => (
                <div key={b.id} className="p-2 rounded border text-xs text-center">
                  <div className="font-bold">{b.bed_number}</div>
                  <div className="text-xs">{b.bed_type}</div>
                  <div className="truncate">{b.patient_name || "Available"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {wards.length === 0 && (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Bed No</TableHead><TableHead>Ward</TableHead><TableHead>Type</TableHead><TableHead>Floor</TableHead><TableHead>Status</TableHead><TableHead>Patient</TableHead></TableRow></TableHeader>
            <TableBody><TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No beds configured</TableCell></TableRow></TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}
