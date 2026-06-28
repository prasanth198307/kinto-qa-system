import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { sac_code: "", service_description: "", gst_rate: "" };

export default function MastersSACCodesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: sacCodes = [] } = useQuery({ queryKey: ["/api/masters/sac-codes"], queryFn: () => api("GET", "/api/masters/sac-codes") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/masters/sac-codes", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/sac-codes"] }); toast({ title: "SAC Code added" }); setShowForm(false); setForm(EMPTY); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SAC Codes</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add SAC Code</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add SAC Code</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Input placeholder="SAC Code" value={form.sac_code} onChange={e => set("sac_code", e.target.value)} />
            <Input placeholder="Service Description" value={form.service_description} onChange={e => set("service_description", e.target.value)} />
            <Input placeholder="GST Rate %" value={form.gst_rate} onChange={e => set("gst_rate", e.target.value)} />
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
              <TableHead>SAC Code</TableHead><TableHead>Service Description</TableHead><TableHead>GST Rate</TableHead><TableHead>Effective Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(sacCodes) && sacCodes.map((s: any) => (
                <TableRow key={s.id || s.sac_code}>
                  <TableCell>{s.sac_code}</TableCell><TableCell>{s.service_description}</TableCell>
                  <TableCell>{s.gst_rate}%</TableCell><TableCell>{s.effective_date?.slice(0,10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
