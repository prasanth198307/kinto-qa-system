import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, RefreshCw } from "lucide-react";

function AddSubsidiaryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", country: "", currency: "", ownership_pct: "", consolidation_method: "full" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/ifrs/subsidiaries", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ifrs/subsidiaries"] }); toast({ title: "Subsidiary added" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Subsidiary</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={set("name")} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={set("country")} /></div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={set("currency")} /></div>
          <div><Label>Ownership %</Label><Input type="number" value={form.ownership_pct} onChange={set("ownership_pct")} /></div>
          <div className="col-span-2">
            <Label>Consolidation Method</Label>
            <Select value={form.consolidation_method} onValueChange={v => setForm(p => ({ ...p, consolidation_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="proportionate">Proportionate</SelectItem>
              </SelectContent>
            </Select>
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

function SubsidiariesTab() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [consolidated, setConsolidated] = useState<Record<string, unknown>[]>([]);
  const { data: subs } = useQuery({ queryKey: ["/api/ifrs/subsidiaries"], queryFn: () => fetch("/api/ifrs/subsidiaries").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const consolidateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ifrs/consolidate", {}),
    onSuccess: (d: unknown) => { setConsolidated(Array.isArray(d) ? d : []); toast({ title: "Consolidated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const arr = Array.isArray(subs) ? subs : [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3 w-3 mr-1" />Add Subsidiary</Button>
        <Button size="sm" variant="outline" onClick={() => consolidateMutation.mutate()} disabled={consolidateMutation.isPending}>
          <Play className="h-3 w-3 mr-1" />Consolidate Now
        </Button>
      </div>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-muted">
          <tr>{["Name","Country","Currency","Ownership %","Method","Active"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {arr.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No subsidiaries</td></tr>}
          {arr.map((s: Record<string, unknown>) => (
            <tr key={s.id as string} className="border-t">
              <td className="p-3 font-medium">{s.name as string}</td>
              <td className="p-3">{s.country as string}</td>
              <td className="p-3">{s.currency as string}</td>
              <td className="p-3">{s.ownership_pct as number}%</td>
              <td className="p-3"><Badge variant="outline">{s.consolidation_method as string}</Badge></td>
              <td className="p-3"><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
      {consolidated.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Consolidated P&L</h3>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted"><tr>{["Account Code","Account Name","Total Amount"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
            <tbody>
              {consolidated.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{r.account_code as string}</td>
                  <td className="p-3">{r.account_name as string}</td>
                  <td className="p-3 text-right">{(r.total_amount as number)?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && <AddSubsidiaryDialog open={showAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function FixedAssetsTab() {
  const { toast } = useToast();
  const { data: assets } = useQuery({ queryKey: ["/api/ifrs/assets"], queryFn: () => fetch("/api/ifrs/assets").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const depMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/ifrs/assets/${id}/depreciate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ifrs/assets"] }); toast({ title: "Depreciation calculated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const arr = Array.isArray(assets) ? assets : [];
  return (
    <table className="w-full text-sm border rounded-lg overflow-hidden">
      <thead className="bg-muted">
        <tr>{["Asset Name","Cost","Acc. Depreciation","Net Book Value","Method",""].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
      </thead>
      <tbody>
        {arr.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No assets</td></tr>}
        {arr.map((a: Record<string, unknown>) => (
          <tr key={a.id as string} className="border-t">
            <td className="p-3 font-medium">{a.asset_name as string}</td>
            <td className="p-3 text-right">{(a.cost as number)?.toLocaleString()}</td>
            <td className="p-3 text-right">{(a.accumulated_depreciation as number)?.toLocaleString()}</td>
            <td className="p-3 text-right">{(a.net_book_value as number)?.toLocaleString()}</td>
            <td className="p-3">{a.method as string}</td>
            <td className="p-3">
              <Button size="sm" variant="outline" onClick={() => depMutation.mutate(a.id as number)} disabled={depMutation.isPending}>
                <RefreshCw className="h-3 w-3 mr-1" />Depreciate
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeriodCloseTab() {
  const { toast } = useToast();
  const [period, setPeriod] = useState("");
  const { data: steps } = useQuery({ queryKey: ["/api/ifrs/period-close"], queryFn: () => fetch("/api/ifrs/period-close").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const runMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ifrs/period-close/run", { period }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ifrs/period-close"] }); toast({ title: "Period close run" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const arr = Array.isArray(steps) ? steps : [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <Label>Period (YYYY-MM)</Label>
          <Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-06" className="w-40" />
        </div>
        <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending || !period}>Run Period Close</Button>
      </div>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-muted"><tr>{["Step","Status"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
        <tbody>
          {arr.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No period close data</td></tr>}
          {arr.map((s: Record<string, unknown>, i: number) => (
            <tr key={i} className="border-t">
              <td className="p-3">{s.step as string}</td>
              <td className="p-3"><Badge variant={s.status === "complete" ? "default" : "secondary"}>{s.status as string}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IfrsConsolidationPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">IFRS Consolidation Dashboard</h1>
      <Tabs defaultValue="subsidiaries">
        <TabsList>
          <TabsTrigger value="subsidiaries">Subsidiaries</TabsTrigger>
          <TabsTrigger value="fixed-assets">Fixed Assets</TabsTrigger>
          <TabsTrigger value="period-close">Period Close</TabsTrigger>
        </TabsList>
        <TabsContent value="subsidiaries" className="mt-4"><SubsidiariesTab /></TabsContent>
        <TabsContent value="fixed-assets" className="mt-4"><FixedAssetsTab /></TabsContent>
        <TabsContent value="period-close" className="mt-4"><PeriodCloseTab /></TabsContent>
      </Tabs>
    </div>
  );
}
