import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
}

function AddEntryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ investor_name: "", share_class: "common", shares: "", investment_amount: "", anti_dilution: "none" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/investor/cap-table", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/investor/cap-table"] }); toast({ title: "Entry added" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Cap Table Entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Investor Name</Label><Input value={form.investor_name} onChange={set("investor_name")} /></div>
          <div>
            <Label>Share Class</Label>
            <Select value={form.share_class} onValueChange={v => setForm(p => ({ ...p, share_class: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="preferred_a">Preferred A</SelectItem>
                <SelectItem value="preferred_b">Preferred B</SelectItem>
                <SelectItem value="esop">ESOP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Shares</Label><Input type="number" value={form.shares} onChange={set("shares")} /></div>
          <div><Label>Investment Amount</Label><Input type="number" value={form.investment_amount} onChange={set("investment_amount")} /></div>
          <div className="col-span-2"><Label>Anti-Dilution</Label><Input value={form.anti_dilution} onChange={set("anti_dilution")} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DilutionModelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ new_investment_amount: "", pre_money_valuation: "" });
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/investor/cap-table/dilution-model", d),
    onSuccess: (d: unknown) => { setResult(d as Record<string, unknown>); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const before: Record<string, unknown>[] = Array.isArray(result?.before) ? result.before as Record<string, unknown>[] : [];
  const after: Record<string, unknown>[] = Array.isArray(result?.after) ? result.after as Record<string, unknown>[] : [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Dilution Model</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>New Investment Amount</Label><Input type="number" value={form.new_investment_amount} onChange={set("new_investment_amount")} /></div>
          <div><Label>Pre-Money Valuation</Label><Input type="number" value={form.pre_money_valuation} onChange={set("pre_money_valuation")} /></div>
        </div>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="mt-2">Run Model</Button>
        {result && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Before</h3>
              <table className="w-full text-xs border rounded overflow-hidden">
                <thead className="bg-muted"><tr>{["Investor","Ownership %"].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
                <tbody>{before.map((r, i) => <tr key={i} className="border-t"><td className="p-2">{r.investor_name as string}</td><td className="p-2">{(r.ownership_pct as number)?.toFixed(2)}%</td></tr>)}</tbody>
              </table>
            </div>
            <div>
              <h3 className="font-semibold mb-2">After</h3>
              <table className="w-full text-xs border rounded overflow-hidden">
                <thead className="bg-muted"><tr>{["Investor","Ownership %"].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
                <tbody>{after.map((r, i) => <tr key={i} className="border-t"><td className="p-2">{r.investor_name as string}</td><td className="p-2">{(r.ownership_pct as number)?.toFixed(2)}%</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end mt-2"><Button variant="outline" onClick={onClose}>Close</Button></div>
      </DialogContent>
    </Dialog>
  );
}

export default function CapTablePage() {
  const [showAdd, setShowAdd] = useState(false);
  const [showDilution, setShowDilution] = useState(false);
  const { data: capTable } = useQuery({ queryKey: ["/api/investor/cap-table"], queryFn: () => fetch("/api/investor/cap-table").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const arr: Record<string, unknown>[] = Array.isArray(capTable) ? capTable : [];
  const totals = arr.reduce((acc: { shares: number; investment_amount: number }, r) => ({
    shares: acc.shares + ((r.shares as number) || 0),
    investment_amount: acc.investment_amount + ((r.investment_amount as number) || 0),
  }), { shares: 0, investment_amount: 0 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cap Table</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowDilution(true)}>Run Dilution Model</Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3 w-3 mr-1" />Add Entry</Button>
        </div>
      </div>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-muted">
          <tr>{["Investor","Share Class","Shares","Ownership %","Diluted %","Investment"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {arr.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No entries</td></tr>}
          {arr.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="p-3 font-medium">{e.investor_name as string}</td>
              <td className="p-3">{e.share_class as string}</td>
              <td className="p-3 text-right">{(e.shares as number)?.toLocaleString()}</td>
              <td className="p-3 text-right">{(e.ownership_pct as number)?.toFixed(2)}%</td>
              <td className="p-3 text-right">{(e.diluted_pct as number)?.toFixed(2)}%</td>
              <td className="p-3 text-right">{fmt(e.investment_amount as number)}</td>
            </tr>
          ))}
          {arr.length > 0 && (
            <tr className="border-t bg-muted font-bold">
              <td className="p-3" colSpan={2}>Total</td>
              <td className="p-3 text-right">{totals.shares.toLocaleString()}</td>
              <td className="p-3" colSpan={2}></td>
              <td className="p-3 text-right">{fmt(totals.investment_amount)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {showAdd && <AddEntryDialog open={showAdd} onClose={() => setShowAdd(false)} />}
      {showDilution && <DilutionModelDialog open={showDilution} onClose={() => setShowDilution(false)} />}
    </div>
  );
}
