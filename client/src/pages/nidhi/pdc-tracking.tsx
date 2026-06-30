import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUS_BADGE: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  Pending: "secondary",
  Presented: "default",
  Cleared: "outline",
  Bounced: "destructive",
  Replaced: "secondary",
};

const SAMPLE = [
  { id: 1, member: "Ravi Kumar", loan_id: "L001", cheque_no: "123456", bank: "SBI", amount: 5000, instrument_date: "2026-06-30", status: "Pending" },
  { id: 2, member: "Priya Sharma", loan_id: "L002", cheque_no: "234567", bank: "HDFC", amount: 3000, instrument_date: "2026-07-05", status: "Presented" },
  { id: 3, member: "Anil Gupta", loan_id: "L003", cheque_no: "345678", bank: "ICICI", amount: 8000, instrument_date: "2026-06-20", status: "Bounced" },
  { id: 4, member: "Sunita Devi", loan_id: "L004", cheque_no: "456789", bank: "Axis", amount: 4500, instrument_date: "2026-07-01", status: "Cleared" },
];

const today = new Date().toISOString().slice(0, 10);

export default function PDCTrackingPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member: "", loan_id: "", cheque_no: "", bank: "", amount: "", instrument_date: "" });

  const { data: cheques = [] } = useQuery<any[]>({
    queryKey: ["nidhi-pdc-cheques"],
    queryFn: () => api("GET", "/api/nidhi/pdc-cheques").catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi/pdc-cheques", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-pdc-cheques"] }); setOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/nidhi/pdc-cheques/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nidhi-pdc-cheques"] }),
  });

  const rows = cheques.length ? cheques : SAMPLE;
  const todayDue = rows.filter((c: any) => c.instrument_date === today && c.status === "Pending");

  // Monthly calendar grouping
  const byDate: Record<string, any[]> = {};
  rows.forEach((c: any) => {
    const d = c.instrument_date?.slice(0, 7) || "Unknown";
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(c);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PDC Cheque Tracking</h1>
        <Button onClick={() => setOpen(true)}>+ Add Cheque</Button>
      </div>

      {todayDue.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader><CardTitle className="text-yellow-700 dark:text-yellow-300">Today's Due Cheques ({todayDue.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {todayDue.map((c: any) => (
                <div key={c.id} className="border border-yellow-400 rounded p-2 text-sm">
                  <div className="font-medium">{c.member}</div>
                  <div>Cheque #{c.cheque_no} · ₹{Number(c.amount).toLocaleString()}</div>
                  <Button size="sm" className="mt-1" onClick={() => updateMutation.mutate({ id: c.id, status: "Presented" })}>
                    Present
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">PDC Register</TabsTrigger>
          <TabsTrigger value="calendar">Monthly Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="register">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Loan ID</TableHead>
                    <TableHead>Cheque No</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Instrument Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c: any) => (
                    <TableRow key={c.id} className={c.instrument_date === today && c.status === "Pending" ? "bg-yellow-50 dark:bg-yellow-950" : ""}>
                      <TableCell className="font-medium">{c.member}</TableCell>
                      <TableCell>{c.loan_id}</TableCell>
                      <TableCell>{c.cheque_no}</TableCell>
                      <TableCell>{c.bank}</TableCell>
                      <TableCell>₹{Number(c.amount).toLocaleString()}</TableCell>
                      <TableCell>{c.instrument_date}</TableCell>
                      <TableCell><Badge variant={STATUS_BADGE[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === "Pending" && (
                            <Button size="sm" variant="outline"
                              onClick={() => updateMutation.mutate({ id: c.id, status: "Presented" })}>
                              Present
                            </Button>
                          )}
                          {c.status === "Presented" && (
                            <>
                              <Button size="sm" variant="outline"
                                onClick={() => updateMutation.mutate({ id: c.id, status: "Cleared" })}>
                                Cleared
                              </Button>
                              <Button size="sm" variant="destructive"
                                onClick={() => updateMutation.mutate({ id: c.id, status: "Bounced" })}>
                                Bounced
                              </Button>
                            </>
                          )}
                          {c.status === "Bounced" && (
                            <div className="text-xs text-destructive">Bounce charges: ₹500</div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(byDate).map(([month, items]) => (
              <Card key={month}>
                <CardHeader><CardTitle className="text-sm">{month}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {items.map((c: any) => (
                      <div key={c.id} className="flex justify-between">
                        <span>{c.instrument_date?.slice(8)} - {c.member} (#{c.cheque_no})</span>
                        <Badge variant={STATUS_BADGE[c.status]} className="text-xs">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add PDC Cheque</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Member</Label><Input value={form.member} onChange={e => setForm(f => ({ ...f, member: e.target.value }))} /></div>
            <div><Label>Loan ID</Label><Input value={form.loan_id} onChange={e => setForm(f => ({ ...f, loan_id: e.target.value }))} /></div>
            <div><Label>Cheque No</Label><Input value={form.cheque_no} onChange={e => setForm(f => ({ ...f, cheque_no: e.target.value }))} /></div>
            <div><Label>Bank</Label><Input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></div>
            <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label>Instrument Date</Label><Input type="date" value={form.instrument_date} onChange={e => setForm(f => ({ ...f, instrument_date: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate({ ...form, status: "Pending" })}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
