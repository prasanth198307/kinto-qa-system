import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const COLLECTION_TYPES = ["pigmy", "rd_installment", "loan_emi", "fd_interest"];
const PAYMENT_MODES = ["cash", "upi", "neft", "cheque"];
const blank = { member_id: "", deposit_id: "", loan_id: "", collection_type: "pigmy", amount: "", payment_mode: "cash", agent_name: "", notes: "" };

export default function DailyCollectionPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const qc = useQueryClient();

  const { data: summary } = useQuery({
    queryKey: ["nidhi-collection-summary", date],
    queryFn: () => api("GET", `/api/nidhi-company/daily-collection/summary?date=${date}`),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["nidhi-collections", date],
    queryFn: () => api("GET", `/api/nidhi-company/daily-collection?date=${date}`),
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi-company/daily-collection", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nidhi-collections"] });
      qc.invalidateQueries({ queryKey: ["nidhi-collection-summary"] });
      setOpen(false);
      setForm(blank);
    },
  });

  const byAgent: Record<string, number> = summary?.by_agent ?? {};
  const byType: Record<string, number> = summary?.by_collection_type ?? {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Collection (Pigmy)</h1>
        <div className="flex gap-3 items-center">
          <Calendar className="w-4 h-4" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" />New Collection</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Collection Entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Member ID</Label><Input value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} placeholder="Search member ID" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Deposit ID (opt)</Label><Input value={form.deposit_id} onChange={(e) => setForm({ ...form, deposit_id: e.target.value })} /></div>
                  <div><Label>Loan ID (opt)</Label><Input value={form.loan_id} onChange={(e) => setForm({ ...form, loan_id: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Collection Type</Label>
                  <Select value={form.collection_type} onValueChange={(v) => setForm({ ...form, collection_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COLLECTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div>
                  <Label>Payment Mode</Label>
                  <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Agent Name</Label><Input value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={() => addMutation.mutate({ ...form, collection_date: date, amount: Number(form.amount) })} disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Agent</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(byAgent).map(([agent, amt]) => (
              <div key={agent} className="flex justify-between text-sm"><span>{agent}</span><span className="font-semibold">₹{Number(amt).toLocaleString("en-IN")}</span></div>
            ))}
            {!Object.keys(byAgent).length && <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Collection Type</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(byType).map(([type, amt]) => (
              <div key={type} className="flex justify-between text-sm"><span>{type.replace(/_/g, " ")}</span><span className="font-semibold">₹{Number(amt).toLocaleString("en-IN")}</span></div>
            ))}
            {!Object.keys(byType).length && <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Agent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((c: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{c.member_id}</TableCell>
              <TableCell>{c.collection_type?.replace(/_/g, " ")}</TableCell>
              <TableCell>₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
              <TableCell>{c.payment_mode}</TableCell>
              <TableCell>{c.agent_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
