import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const DEPOSIT_TYPES = ["FD", "RD", "Savings", "Recurring"];
const LOAN_TYPES = ["gold_loan", "property", "fd_loan", "personal"];
const blank = { rate_type: "deposit", deposit_type: "FD", loan_type: "gold_loan", min_tenure_months: "", max_tenure_months: "", interest_rate: "", senior_citizen_rate: "", effective_from: "", effective_to: "" };

export default function InterestRatesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(blank);
  const qc = useQueryClient();

  const { data: rates = [] } = useQuery({
    queryKey: ["nidhi-interest-rates"],
    queryFn: () => api("GET", "/api/nidhi-company/interest-rates"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => editing
      ? api("PUT", `/api/nidhi-company/interest-rates/${editing.id}`, payload)
      : api("POST", "/api/nidhi-company/interest-rates", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-interest-rates"] }); setOpen(false); setEditing(null); setForm(blank); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: any) => api("PUT", `/api/nidhi-company/interest-rates/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nidhi-interest-rates"] }),
  });

  function openEdit(rate: any) {
    setEditing(rate);
    setForm({ ...rate });
    setOpen(true);
  }

  function openAdd() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interest Rate Master</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" />Add Rate</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Tenure (months)</TableHead>
            <TableHead>Rate %</TableHead>
            <TableHead>Sr. Citizen %</TableHead>
            <TableHead>Effective From</TableHead>
            <TableHead>Effective To</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="capitalize">{r.rate_type}</TableCell>
              <TableCell>{r.rate_type === "deposit" ? r.deposit_type : r.loan_type}</TableCell>
              <TableCell>{r.min_tenure_months} – {r.max_tenure_months}</TableCell>
              <TableCell>{r.interest_rate}%</TableCell>
              <TableCell>{r.senior_citizen_rate}%</TableCell>
              <TableCell>{r.effective_from}</TableCell>
              <TableCell>{r.effective_to ?? "—"}</TableCell>
              <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, is_active: v })} /></TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Rate" : "Add Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rate Type</Label>
              <Select value={form.rate_type} onValueChange={(v) => setForm({ ...form, rate_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="loan">Loan</SelectItem></SelectContent>
              </Select>
            </div>
            {form.rate_type === "deposit" && (
              <div>
                <Label>Deposit Type</Label>
                <Select value={form.deposit_type} onValueChange={(v) => setForm({ ...form, deposit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPOSIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.rate_type === "loan" && (
              <div>
                <Label>Loan Type</Label>
                <Select value={form.loan_type} onValueChange={(v) => setForm({ ...form, loan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOAN_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Tenure (months)</Label><Input type="number" value={form.min_tenure_months} onChange={(e) => setForm({ ...form, min_tenure_months: e.target.value })} /></div>
              <div><Label>Max Tenure (months)</Label><Input type="number" value={form.max_tenure_months} onChange={(e) => setForm({ ...form, max_tenure_months: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Interest Rate %</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></div>
              <div><Label>Senior Citizen Rate %</Label><Input type="number" step="0.01" value={form.senior_citizen_rate} onChange={(e) => setForm({ ...form, senior_citizen_rate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Effective From</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
              <div><Label>Effective To</Label><Input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
