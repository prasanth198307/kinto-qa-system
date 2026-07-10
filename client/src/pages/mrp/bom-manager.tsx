import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight } from "lucide-react";

function AddBOMDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ product_name: "", version: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/mrp/bom", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mrp/bom"] }); toast({ title: "BOM created" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add BOM</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Product Name</Label><Input value={form.product_name} onChange={set("product_name")} /></div>
          <div><Label>Version</Label><Input value={form.version} onChange={set("version")} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ bomId: bomId, open, onClose }: { bomId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ component_name: "", qty: "", unit: "", scrap_pct: "", unit_cost: "", is_phantom: false });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", `/api/mrp/bom/${bomId}/components`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mrp/bom", bomId, "explode"] }); toast({ title: "Component added" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Component</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Component Name</Label><Input value={form.component_name} onChange={set("component_name")} /></div>
          <div><Label>Qty</Label><Input type="number" value={form.qty} onChange={set("qty")} /></div>
          <div><Label>Unit</Label><Input value={form.unit} onChange={set("unit")} /></div>
          <div><Label>Scrap %</Label><Input type="number" value={form.scrap_pct} onChange={set("scrap_pct")} /></div>
          <div><Label>Unit Cost</Label><Input type="number" value={form.unit_cost} onChange={set("unit_cost")} /></div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox checked={form.is_phantom} onCheckedChange={v => setForm(p => ({ ...p, is_phantom: !!v }))} />
            <Label>Phantom</Label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BOMDetail({ bom, onClose }: { bom: Record<string, unknown>; onClose: () => void }) {
  const { toast } = useToast();
  const [showAddComp, setShowAddComp] = useState(false);
  const [costRollup, setCostRollup] = useState<Record<string, unknown> | null>(null);

  const { data: exploded } = useQuery({
    queryKey: ["/api/mrp/bom", bom.id, "explode"],
    queryFn: () => fetch(`/api/mrp/bom/${bom.id}/explode`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const costMutation = useMutation({
    mutationFn: () => fetch(`/api/mrp/bom/${bom.id}/cost-rollup`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (d: unknown) => setCostRollup(d as Record<string, unknown>),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rows: Record<string, unknown>[] = Array.isArray(exploded) ? exploded : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background shadow-xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{bom.product_name as string} <span className="text-sm text-muted-foreground">v{bom.version as string}</span></h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="flex gap-2 mb-4">
          <Button size="sm" onClick={() => setShowAddComp(true)}><Plus className="h-3 w-3 mr-1" />Add Component</Button>
          <Button size="sm" variant="outline" onClick={() => costMutation.mutate()} disabled={costMutation.isPending}>Cost Rollup</Button>
        </div>
        {costRollup && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-xl font-bold">{(costRollup.total_cost as number)?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</div>
            </CardContent>
          </Card>
        )}
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>{["Component","Qty","Unit","Scrap %","Unit Cost"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No components</td></tr>}
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="p-3" style={{ paddingLeft: `${((row.level as number) || 0) * 20 + 12}px` }}>
                  {(row.level as number) > 0 && <ChevronRight className="inline h-3 w-3 mr-1 text-muted-foreground" />}
                  {row.component as string}
                </td>
                <td className="p-3">{row.qty as number}</td>
                <td className="p-3">{row.unit as string}</td>
                <td className="p-3">{row.scrap_pct as number}%</td>
                <td className="p-3">{(row.unit_cost as number)?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {showAddComp && <AddComponentDialog bomId={bom.id as number} open={showAddComp} onClose={() => setShowAddComp(false)} />}
      </div>
    </div>
  );
}

export default function BomManagerPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const { data: boms } = useQuery({ queryKey: ["/api/mrp/bom"], queryFn: () => fetch("/api/mrp/bom").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const arr: Record<string, unknown>[] = Array.isArray(boms) ? boms : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">BOM Manager</h1>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3 w-3 mr-1" />Add BOM</Button>
      </div>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-muted">
          <tr>{["Product","Version","Status","Components",""].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {arr.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No BOMs</td></tr>}
          {arr.map((b) => (
            <tr key={b.id as string} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(b)}>
              <td className="p-3 font-medium">{b.product_name as string}</td>
              <td className="p-3">{b.version as string}</td>
              <td className="p-3"><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status as string}</Badge></td>
              <td className="p-3">{b.component_count as number}</td>
              <td className="p-3 text-primary text-xs">Explode →</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAdd && <AddBOMDialog open={showAdd} onClose={() => setShowAdd(false)} />}
      {selected && <BOMDetail bom={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
