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

const EMPTY = { doc_type: "", prefix: "", suffix: "", starting_number: "1", padding: "5", reset_period: "yearly" };

export default function MastersDocNumberingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: configs = [] } = useQuery({ queryKey: ["/api/masters/doc-numbering"], queryFn: () => api("GET", "/api/masters/doc-numbering") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/doc-numbering", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/doc-numbering"] }); toast({ title: "Config saved" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const year = new Date().getFullYear();
  const preview = form.prefix
    ? `${form.prefix}-${year}-${String(Number(form.starting_number || 1)).padStart(Number(form.padding || 5), "0")}${form.suffix ? "-" + form.suffix : ""}`
    : "Configure prefix to preview";

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Document Numbering</h1>
        <Button onClick={() => setShowForm(s => !s)}>Configure</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Configure Numbering</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Select value={form.doc_type} onValueChange={v => set("doc_type", v)}>
              <SelectTrigger><SelectValue placeholder="Document Type" /></SelectTrigger>
              <SelectContent>
                {["Invoice","PO","GRN","Payment","Credit Note","Debit Note","Quotation","Delivery Challan"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Prefix (e.g. INV)" value={form.prefix} onChange={e => set("prefix", e.target.value)} />
            <Input placeholder="Suffix (optional)" value={form.suffix} onChange={e => set("suffix", e.target.value)} />
            <Input placeholder="Starting Number" type="number" value={form.starting_number} onChange={e => set("starting_number", e.target.value)} />
            <Input placeholder="Padding Length" type="number" value={form.padding} onChange={e => set("padding", e.target.value)} />
            <Select value={form.reset_period} onValueChange={v => set("reset_period", v)}>
              <SelectTrigger><SelectValue placeholder="Reset Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
            <div className="col-span-3 p-3 bg-muted rounded text-sm">
              <strong>Preview:</strong> {preview}
            </div>
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
              <TableHead>Doc Type</TableHead><TableHead>Prefix</TableHead><TableHead>Suffix</TableHead>
              <TableHead>Current Number</TableHead><TableHead>Padding</TableHead><TableHead>Reset Period</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(configs) && configs.map((c: any) => (
                <TableRow key={c.id || c.doc_type}>
                  <TableCell>{c.doc_type}</TableCell><TableCell>{c.prefix}</TableCell><TableCell>{c.suffix || "-"}</TableCell>
                  <TableCell>{c.current_number}</TableCell><TableCell>{c.padding_length || c.padding}</TableCell>
                  <TableCell>{c.reset_period}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
