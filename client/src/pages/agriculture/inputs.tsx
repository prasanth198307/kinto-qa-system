import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, IndianRupee } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const INPUT_TYPES = ["seed", "fertilizer", "pesticide", "equipment", "other"];
const EMPTY = { input_type: "seed", item_name: "", quantity: "", unit: "kg", supplier: "", cost: "", applied_to_type: "farm", applied_to_id: "", application_date: "" };

export default function InputsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: farms = [] } = useQuery({ queryKey: ["ag-farms"], queryFn: () => api("GET", "/api/agriculture/farms") });
  const { data: crops = [] } = useQuery({ queryKey: ["ag-crops"], queryFn: () => api("GET", "/api/agriculture/crops") });
  const { data: inputs = [] } = useQuery({ queryKey: ["ag-inputs"], queryFn: () => api("GET", "/api/agriculture/inputs") });

  const save = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/inputs", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-inputs"] }); setOpen(false); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const totalCost = inputs.reduce((s: number, i: any) => s + Number(i.cost || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Farm Inputs</h1>
        <Button onClick={() => { setForm({ ...EMPTY }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Record Input</Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><IndianRupee className="w-4 h-4" />Total Input Cost</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">₹{totalCost.toLocaleString("en-IN")}</p></CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead><TableHead>Item Name</TableHead><TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead><TableHead>Supplier</TableHead><TableHead>Cost (₹)</TableHead>
                <TableHead>Applied To</TableHead><TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inputs.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell><Badge variant="outline">{i.input_type}</Badge></TableCell>
                  <TableCell className="font-medium">{i.item_name}</TableCell>
                  <TableCell>{i.quantity}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell>{i.supplier}</TableCell>
                  <TableCell>₹{Number(i.cost).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{i.applied_to_name || i.applied_to_type}</TableCell>
                  <TableCell>{i.application_date}</TableCell>
                </TableRow>
              ))}
              {inputs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No inputs recorded</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Farm Input</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><label className="text-sm font-medium mb-1 block">Input Type</label>
              <Select value={form.input_type} onValueChange={v => set("input_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INPUT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Item Name</label><Input value={form.item_name} onChange={e => set("item_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Quantity</label><Input type="number" value={form.quantity} onChange={e => set("quantity", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Unit</label><Input value={form.unit} onChange={e => set("unit", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Supplier</label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Cost (₹)</label><Input type="number" value={form.cost} onChange={e => set("cost", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Applied To</label>
              <Select value={form.applied_to_type} onValueChange={v => set("applied_to_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="farm">Farm</SelectItem><SelectItem value="crop">Crop</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">{form.applied_to_type === "farm" ? "Select Farm" : "Select Crop"}</label>
              <Select value={form.applied_to_id} onValueChange={v => set("applied_to_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {form.applied_to_type === "farm"
                    ? farms.map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.farm_name}</SelectItem>)
                    : crops.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.crop_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Application Date</label><Input type="date" value={form.application_date} onChange={e => set("application_date", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
