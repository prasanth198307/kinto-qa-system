import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY = { store_name: "", franchisee_name: "", location: "", royalty_pct: "", sales_target: "", renewal_date: "" };

const MOCK = [
  { id: 1, store_name: "Kinto Indore", franchisee_name: "Rajiv Malhotra", location: "Indore, MP", royalty_pct: 5, sales_target: 500000, actual_sales: 620000, compliance_score: 92, renewal_date: "2027-03-31" },
  { id: 2, store_name: "Kinto Bhopal", franchisee_name: "Sunita Agarwal", location: "Bhopal, MP", royalty_pct: 5, sales_target: 400000, actual_sales: 360000, compliance_score: 78, renewal_date: "2027-06-30" },
  { id: 3, store_name: "Kinto Pune", franchisee_name: "Arjun Desai", location: "Pune, MH", royalty_pct: 6, sales_target: 600000, actual_sales: 710000, compliance_score: 96, renewal_date: "2026-12-31" },
];

const CHECKLIST = [
  "Brand signage standards",
  "Staff uniforms compliance",
  "Inventory range requirements",
  "Customer service SOP",
  "Monthly reporting submitted",
];

export default function FranchisePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [selected, setSelected] = useState<typeof MOCK[0] | null>(null);

  const { data: franchises = [] } = useQuery({ queryKey: ["franchises"], queryFn: () => api("GET", "/api/retail/franchises") });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/retail/franchises", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["franchises"] }); setOpen(false); setForm({ ...EMPTY }); },
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(franchises) && franchises.length ? franchises : MOCK;

  const totalRoyalty = rows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.actual_sales) * Number(r.royalty_pct) / 100), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Franchise Management</h1>
          <p className="text-muted-foreground">Manage franchise stores, royalties and compliance</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Franchise</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Franchises</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Monthly Royalty</p><p className="text-2xl font-bold">₹{Math.round(totalRoyalty).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Avg Compliance Score</p>
          <p className="text-2xl font-bold">{Math.round(rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.compliance_score || 0), 0) / rows.length)}%</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Franchise List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Franchisee</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Royalty %</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual Sales</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: Record<string, unknown>, i) => {
                const pct = Number(r.royalty_pct);
                const actual = Number(r.actual_sales);
                const royalty = Math.round(actual * pct / 100);
                const score = Number(r.compliance_score);
                return (
                  <TableRow key={i} className="cursor-pointer" onClick={() => setSelected(r as typeof MOCK[0])}>
                    <TableCell className="font-medium">{String(r.store_name)}</TableCell>
                    <TableCell>{String(r.franchisee_name)}</TableCell>
                    <TableCell>{String(r.location)}</TableCell>
                    <TableCell>{pct}%</TableCell>
                    <TableCell>₹{Number(r.sales_target).toLocaleString()}</TableCell>
                    <TableCell>₹{actual.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={score >= 90 ? "default" : score >= 75 ? "outline" : "destructive"}>{score}%</Badge>
                    </TableCell>
                    <TableCell>{String(r.renewal_date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader><CardTitle>Royalty Calculator — {selected.store_name}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded p-3">
                <p className="text-sm text-muted-foreground">Monthly Sales</p>
                <p className="text-xl font-bold">₹{Number(selected.actual_sales).toLocaleString()}</p>
              </div>
              <div className="bg-muted rounded p-3">
                <p className="text-sm text-muted-foreground">Royalty Rate</p>
                <p className="text-xl font-bold">{selected.royalty_pct}%</p>
              </div>
              <div className="bg-yellow-50 rounded p-3">
                <p className="text-sm text-muted-foreground">Royalty Amount</p>
                <p className="text-xl font-bold">₹{Math.round(Number(selected.actual_sales) * Number(selected.royalty_pct) / 100).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="font-medium mb-2">Compliance Checklist</p>
              {CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <input type="checkbox" defaultChecked={Number(selected.compliance_score) > 85} className="rounded" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Franchise</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["store_name", "franchisee_name", "location", "royalty_pct", "sales_target", "renewal_date"] as const).map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
