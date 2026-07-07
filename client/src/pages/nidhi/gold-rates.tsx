import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Gem, TrendingUp } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

export default function NidhiGoldRatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ rate_22k: "", rate_24k: "", rate_18k: "", rate_date: today });

  const { data: rates = [] } = useQuery<any[]>({
    queryKey: ["nidhi-gold-rates"],
    queryFn: () => api("GET", "/api/nidhi/gold-rates"),
  });

  const addMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/gold-rates", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-gold-rates"] }); setForm({ rate_22k: "", rate_24k: "", rate_18k: "", rate_date: today }); toast({ title: "Gold rate updated" }); },
  });

  const latest = rates[0];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Gold Rates</h1>

      {latest && (
        <div className="grid grid-cols-3 gap-4">
          {[["22K", latest.rate_22k], ["24K", latest.rate_24k], ["18K", latest.rate_18k]].map(([k, v]) => (
            <Card key={k}><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Gem className="w-4 h-4 text-yellow-600" /><span className="text-xs text-muted-foreground">{k} per gram</span></div>
              <div className="text-2xl font-bold">₹{Number(v || 0).toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">as of {latest.rate_date}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card><CardHeader><CardTitle className="text-base">Update Today's Rates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-xs">Date</Label><Input type="date" value={form.rate_date} onChange={e => setForm(p => ({ ...p, rate_date: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">22K Rate (₹/g)</Label><Input type="number" value={form.rate_22k} onChange={e => setForm(p => ({ ...p, rate_22k: e.target.value }))} className="h-8 text-sm" placeholder="7200" /></div>
            <div><Label className="text-xs">24K Rate (₹/g)</Label><Input type="number" value={form.rate_24k} onChange={e => setForm(p => ({ ...p, rate_24k: e.target.value }))} className="h-8 text-sm" placeholder="7854" /></div>
            <div><Label className="text-xs">18K Rate (₹/g)</Label><Input type="number" value={form.rate_18k} onChange={e => setForm(p => ({ ...p, rate_18k: e.target.value }))} className="h-8 text-sm" placeholder="5891" /></div>
          </div>
          <Button className="mt-3" onClick={() => addMut.mutate(form)} disabled={addMut.isPending}>Save Rates</Button>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Rate History (Last 30 days)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>22K (₹/g)</TableHead><TableHead>24K (₹/g)</TableHead><TableHead>18K (₹/g)</TableHead></TableRow></TableHeader>
            <TableBody>
              {rates.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.rate_date}</TableCell>
                  <TableCell className="font-semibold">₹{Number(r.rate_22k || 0).toLocaleString("en-IN")}</TableCell>
                  <TableCell>₹{Number(r.rate_24k || 0).toLocaleString("en-IN")}</TableCell>
                  <TableCell>₹{Number(r.rate_18k || 0).toLocaleString("en-IN")}</TableCell>
                </TableRow>
              ))}
              {!rates.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No rates entered yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
