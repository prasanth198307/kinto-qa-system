import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { rule_name: "", tax_type: "", cgst_rate: "", sgst_rate: "", igst_rate: "", applicable_states: "", effective_from: "" };

export default function MastersTaxConfigPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: taxRules = [] } = useQuery({ queryKey: ["/api/masters/tax-config"], queryFn: () => api("GET", "/api/masters/tax-config") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/tax-config", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/tax-config"] }); toast({ title: "Tax rule added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tax Configuration</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Rule</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Tax Rule</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Input placeholder="Rule Name" value={form.rule_name} onChange={e => set("rule_name", e.target.value)} />
            <Select value={form.tax_type} onValueChange={v => set("tax_type", v)}>
              <SelectTrigger><SelectValue placeholder="Tax Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CGST+SGST">CGST+SGST</SelectItem>
                <SelectItem value="IGST">IGST</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="CGST Rate %" value={form.cgst_rate} onChange={e => set("cgst_rate", e.target.value)} />
            <Input placeholder="SGST Rate %" value={form.sgst_rate} onChange={e => set("sgst_rate", e.target.value)} />
            <Input placeholder="IGST Rate %" value={form.igst_rate} onChange={e => set("igst_rate", e.target.value)} />
            <Input placeholder="Applicable States (comma separated)" value={form.applicable_states} onChange={e => set("applicable_states", e.target.value)} />
            <Input type="date" value={form.effective_from} onChange={e => set("effective_from", e.target.value)} />
            <div className="col-span-3 flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Rule Name</TableHead><TableHead>Tax Type</TableHead><TableHead>Rate</TableHead>
              <TableHead>Applies To</TableHead><TableHead>State</TableHead><TableHead>Effective From</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(taxRules) && taxRules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.rule_name}</TableCell><TableCell>{r.tax_type}</TableCell>
                  <TableCell>{r.rate || `${r.cgst_rate}+${r.sgst_rate}`}%</TableCell>
                  <TableCell>{r.applies_to}</TableCell><TableCell>{r.state || r.applicable_states}</TableCell>
                  <TableCell>{r.effective_from?.slice(0,10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
