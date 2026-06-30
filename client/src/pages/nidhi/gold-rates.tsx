import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function GoldRatesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rate_22k: "", rate_24k: "", rate_18k: "" });
  const qc = useQueryClient();

  const { data: rates = [] } = useQuery({
    queryKey: ["nidhi-gold-rates"],
    queryFn: () => api("GET", "/api/nidhi-company/gold-rates?days=30"),
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi-company/gold-rates", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-gold-rates"] }); setOpen(false); setForm({ rate_22k: "", rate_24k: "", rate_18k: "" }); },
  });

  const last7 = [...rates].slice(0, 7).reverse();
  const max22 = Math.max(...last7.map((r: any) => Number(r.rate_22k)), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gold Rates</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" />Add Today's Rate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Today's Gold Rate (₹/gram)</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>22K Rate</Label><Input type="number" value={form.rate_22k} onChange={(e) => setForm({ ...form, rate_22k: e.target.value })} /></div>
              <div><Label>24K Rate</Label><Input type="number" value={form.rate_24k} onChange={(e) => setForm({ ...form, rate_24k: e.target.value })} /></div>
              <div><Label>18K Rate</Label><Input type="number" value={form.rate_18k} onChange={(e) => setForm({ ...form, rate_18k: e.target.value })} /></div>
              <Button className="w-full" onClick={() => addMutation.mutate({ rate_22k: Number(form.rate_22k), rate_24k: Number(form.rate_24k), rate_18k: Number(form.rate_18k) })} disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {last7.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Last 7 Days — 22K Rate</p>
          <div className="flex items-end gap-2 h-20">
            {last7.map((r: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="bg-yellow-400 w-8 rounded-t" style={{ height: `${(Number(r.rate_22k) / max22) * 64}px` }} />
                <span className="text-xs text-muted-foreground">{r.rate_date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>22K (₹/g)</TableHead>
            <TableHead>24K (₹/g)</TableHead>
            <TableHead>18K (₹/g)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{r.rate_date}</TableCell>
              <TableCell>₹{Number(r.rate_22k).toLocaleString("en-IN")}</TableCell>
              <TableCell>₹{Number(r.rate_24k).toLocaleString("en-IN")}</TableCell>
              <TableCell>₹{Number(r.rate_18k).toLocaleString("en-IN")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
