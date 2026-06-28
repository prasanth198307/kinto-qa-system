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

const EMPTY = { hsn_code: "", description: "", gst_rate: "", cess_rate: "" };

export default function MastersHSNCodesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");

  const { data: hsnCodes = [] } = useQuery({ queryKey: ["/api/masters/hsn-codes"], queryFn: () => api("GET", "/api/masters/hsn-codes") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/hsn-codes", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/hsn-codes"] }); toast({ title: "HSN Code added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const filtered = Array.isArray(hsnCodes) ? hsnCodes.filter((h: any) =>
    !search || h.hsn_code?.includes(search) || h.description?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">HSN Codes</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add HSN Code</Button>
      </div>
      <Input placeholder="Search by code or description" value={search} onChange={e => setSearch(e.target.value)} className="w-80" />
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add HSN Code</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Input placeholder="HSN Code" value={form.hsn_code} onChange={e => set("hsn_code", e.target.value)} />
            <Input placeholder="Description" value={form.description} onChange={e => set("description", e.target.value)} />
            <Select value={form.gst_rate} onValueChange={v => set("gst_rate", v)}>
              <SelectTrigger><SelectValue placeholder="GST Rate %" /></SelectTrigger>
              <SelectContent>
                {["0","0.25","1.5","3","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Cess Rate %" value={form.cess_rate} onChange={e => set("cess_rate", e.target.value)} />
            <div className="col-span-2 flex gap-2">
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
              <TableHead>HSN Code</TableHead><TableHead>Description</TableHead><TableHead>GST Rate</TableHead><TableHead>Cess Rate</TableHead><TableHead>Effective Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((h: any) => (
                <TableRow key={h.id || h.hsn_code}>
                  <TableCell>{h.hsn_code}</TableCell><TableCell>{h.description}</TableCell>
                  <TableCell>{h.gst_rate}%</TableCell><TableCell>{h.cess_rate || 0}%</TableCell>
                  <TableCell>{h.effective_date?.slice(0,10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
