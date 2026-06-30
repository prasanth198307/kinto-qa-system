import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Printer } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function FeesPage() {
  const qc = useQueryClient();
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectForm, setCollectForm] = useState<any>({ fee_id: "", amount: "", payment_mode: "cash", reference: "" });
  const [selectedFee, setSelectedFee] = useState<any>(null);

  const { data: fees = [] } = useQuery({ queryKey: ["edu-fees"], queryFn: () => api("GET", "/api/education/fees") });

  const collectFee = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/fees/collect", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-fees"] }); setCollectOpen(false); },
  });

  const generateBills = useMutation({
    mutationFn: () => api("POST", "/api/education/fees/generate-bills", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["edu-fees"] }),
  });

  const list = Array.isArray(fees) ? fees : [];
  const filtered = list.filter((f: any) => {
    if (filterClass !== "all" && f.class !== filterClass) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const collected = list.filter((f: any) => f.status === "paid").reduce((s: number, f: any) => s + Number(f.paid_amount || 0), 0);
  const pending = list.filter((f: any) => f.status === "pending").reduce((s: number, f: any) => s + Number(f.balance || 0), 0);
  const overdue = list.filter((f: any) => f.status === "overdue").reduce((s: number, f: any) => s + Number(f.balance || 0), 0);

  const classes = [...new Set(list.map((f: any) => f.class))];

  const openCollect = (fee: any) => { setSelectedFee(fee); setCollectForm({ fee_id: fee.id, amount: fee.balance, payment_mode: "cash", reference: "" }); setCollectOpen(true); };
  const set = (k: string, v: string) => setCollectForm((f: any) => ({ ...f, [k]: v }));

  const statusVariant: Record<string, any> = { paid: "default", pending: "secondary", overdue: "destructive", partial: "outline" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <Button onClick={() => generateBills.mutate()} disabled={generateBills.isPending}>Generate Bills</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><IndianRupee className="w-8 h-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold">₹{collected.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><IndianRupee className="w-8 h-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">₹{pending.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><IndianRupee className="w-8 h-8 text-red-500" /><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold">₹{overdue.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <div className="flex gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Classes</SelectItem>{classes.map((c: any) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Fee Head</TableHead>
              <TableHead>Due Date</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.student_name}</TableCell>
                  <TableCell>{f.class}</TableCell>
                  <TableCell>{f.fee_head}</TableCell>
                  <TableCell>{f.due_date}</TableCell>
                  <TableCell>₹{Number(f.amount).toLocaleString()}</TableCell>
                  <TableCell>₹{Number(f.paid_amount || 0).toLocaleString()}</TableCell>
                  <TableCell>₹{Number(f.balance || 0).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusVariant[f.status] || "secondary"}>{f.status}</Badge></TableCell>
                  <TableCell className="space-x-1">
                    {f.status !== "paid" && <Button size="sm" onClick={() => openCollect(f)}>Collect</Button>}
                    <Button size="sm" variant="ghost" onClick={() => alert("Printing receipt...")}><Printer className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Collect Fee — {selectedFee?.student_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Balance: ₹{selectedFee?.balance}</div>
            <Input placeholder="Amount" type="number" value={collectForm.amount} onChange={(e) => set("amount", e.target.value)} />
            <Select value={collectForm.payment_mode} onValueChange={(v) => set("payment_mode", v)}>
              <SelectTrigger><SelectValue placeholder="Payment Mode" /></SelectTrigger>
              <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Reference / Transaction ID" value={collectForm.reference} onChange={(e) => set("reference", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectOpen(false)}>Cancel</Button>
            <Button onClick={() => collectFee.mutate(collectForm)} disabled={collectFee.isPending}>Collect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
