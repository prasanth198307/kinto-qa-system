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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function PharmacyDrugsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ drug_name: "", generic_name: "", manufacturer: "", category: "", schedule: "OTC", pack_size: "", mrp: "", gst_rate: "" });

  const { data: medicines = [] } = useQuery({ queryKey: ["/api/pharmacy/medicines"], queryFn: () => api("GET", "/api/pharmacy/medicines") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/pharmacy/medicines", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/medicines"] }); setShowForm(false); toast({ title: "Drug added" }); }
  });

  const filtered = medicines.filter((m: any) =>
    m.drug_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(search.toLowerCase())
  );

  const SCHEDULE_COLORS: Record<string,any> = { H: "outline", H1: "outline", X: "destructive", OTC: "secondary" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drug Master</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Medicine</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add Medicine</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["drug_name","Drug Name"],["generic_name","Generic Name"],["manufacturer","Manufacturer"],["category","Category"],["pack_size","Pack Size"],["mrp","MRP","number"],["gst_rate","GST Rate %","number"]].map(([k,l,t]) => (
              <div key={k as string}><label className="text-sm font-medium">{l as string}</label>
                <Input value={(form as any)[k as string]} onChange={e => setForm(p => ({ ...p, [k as string]: e.target.value }))} type={(t as string)||"text"} /></div>
            ))}
            <div><label className="text-sm font-medium">Schedule</label>
              <Select value={form.schedule} onValueChange={v => setForm(p => ({ ...p, schedule: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="H">H</SelectItem><SelectItem value="H1">H1</SelectItem><SelectItem value="X">X</SelectItem><SelectItem value="OTC">OTC</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Input placeholder="Search by drug name or generic name..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Drug Name</TableHead><TableHead>Generic</TableHead><TableHead>Manufacturer</TableHead>
            <TableHead>Category</TableHead><TableHead>Schedule</TableHead><TableHead>Pack Size</TableHead><TableHead>MRP</TableHead><TableHead>GST%</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.drug_name}</TableCell>
                <TableCell>{m.generic_name}</TableCell>
                <TableCell>{m.manufacturer}</TableCell>
                <TableCell>{m.category}</TableCell>
                <TableCell><Badge variant={SCHEDULE_COLORS[m.schedule]||"secondary"}>{m.schedule}</Badge></TableCell>
                <TableCell>{m.pack_size}</TableCell>
                <TableCell className="text-right">{fmt(m.mrp)}</TableCell>
                <TableCell>{m.gst_rate}%</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No medicines found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
