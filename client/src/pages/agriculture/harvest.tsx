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

export default function AgricultureHarvestPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ farmer_id: "", crop_id: "", harvest_date: "", quantity_kg: "", quality_grade: "", moisture_pct: "" });

  const { data: records = [] } = useQuery({ queryKey: ["/api/agriculture/harvest"], queryFn: () => api("GET", "/api/agriculture/harvest") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/harvest", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/harvest"] }); setShowForm(false); toast({ title: "Harvest recorded" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalKg = records.reduce((s: number, r: any) => s + Number(r.quantity_kg || 0), 0);
  const totalValue = records.reduce((s: number, r: any) => s + Number(r.total_value || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Harvest Records</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Record Harvest</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{records.length}</div><div className="text-sm text-muted-foreground">Total Records</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{fmt(totalKg)} kg</div><div className="text-sm text-muted-foreground">Total Produce</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(totalValue)}</div><div className="text-sm text-muted-foreground">Total Value</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Harvest</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Quality Grade</label>
                <Select value={form.quality_grade} onValueChange={v => setForm(p => ({...p, quality_grade: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {["A","B","C"].map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {["farmer_id","crop_id","harvest_date","quantity_kg","moisture_pct"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("date") ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Harvest Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Farmer</TableHead><TableHead>Crop</TableHead>
                <TableHead>Area (Acres)</TableHead><TableHead>Qty (kg)</TableHead><TableHead>Grade</TableHead>
                <TableHead>Moisture %</TableHead><TableHead>Market Price</TableHead><TableHead>Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.harvest_date}</TableCell>
                  <TableCell>{r.farmer_name}</TableCell>
                  <TableCell>{r.crop_name}</TableCell>
                  <TableCell>{fmt(r.area_harvested)}</TableCell>
                  <TableCell>{fmt(r.quantity_kg)}</TableCell>
                  <TableCell><Badge variant="outline">Grade {r.quality_grade}</Badge></TableCell>
                  <TableCell>{r.moisture_pct}%</TableCell>
                  <TableCell>₹{fmt(r.market_price)}/kg</TableCell>
                  <TableCell>₹{fmt(r.total_value)}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No harvest records found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
