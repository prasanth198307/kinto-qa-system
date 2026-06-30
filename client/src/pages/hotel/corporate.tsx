import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, FileText, ArrowLeft } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

type CorporateAccount = { id: number; company_name: string; contact_person: string; contact_phone: string; contact_email: string; credit_limit: number; outstanding_balance: number; billing_cycle: string; gst_number: string; address: string };
type Reservation = { id: number; reservation_number: string; check_in_date: string; check_out_date: string; rate_per_night: number; total_amount: number; status: string; source: string };

const emptyForm = { company_name: "", contact_person: "", contact_phone: "", contact_email: "", credit_limit: "", outstanding_balance: "", billing_cycle: "monthly", gst_number: "", address: "" };

function CreditBar({ outstanding, limit }: { outstanding: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8">{pct}%</span>
    </div>
  );
}

export default function CorporatePage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ account?: CorporateAccount } | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [selectedAccount, setSelectedAccount] = useState<CorporateAccount | null>(null);

  const { data: accounts = [] } = useQuery<CorporateAccount[]>({ queryKey: ["corporate-accounts"], queryFn: () => api("GET", "/api/hotel/corporate-accounts") });
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["corporate-reservations", selectedAccount?.id],
    queryFn: () => api("GET", `/api/hotel/reservations?corporate_id=${selectedAccount!.id}`),
    enabled: !!selectedAccount,
  });

  const save = useMutation({
    mutationFn: (b: unknown) => dialog?.account ? api("PUT", `/api/hotel/corporate-accounts/${dialog.account.id}`, b) : api("POST", "/api/hotel/corporate-accounts", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["corporate-accounts"] }); setDialog(null); setForm(emptyForm); },
  });

  const generateInvoice = useMutation({
    mutationFn: (id: number) => api("POST", `/api/hotel/corporate-accounts/${id}/invoice`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["corporate-accounts"] }),
  });

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (selectedAccount) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAccount(null)}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-2xl font-bold">{selectedAccount.company_name} — Reservations</h1>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => generateInvoice.mutate(selectedAccount.id)}>
              <FileText className="w-4 h-4 mr-1" />Generate Invoice
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reservation #</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Rate/Night</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.reservation_number}</TableCell>
                <TableCell>{r.check_in_date}</TableCell>
                <TableCell>{r.check_out_date}</TableCell>
                <TableCell>₹{r.rate_per_night}</TableCell>
                <TableCell>₹{r.total_amount}</TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell><Badge variant={r.status === "confirmed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
            {reservations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No reservations found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Corporate Accounts</h1>
        <Button size="sm" onClick={() => { setDialog({}); setForm(emptyForm); }}><Plus className="w-4 h-4 mr-1" />Add Account</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Credit Limit</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Utilization</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>GST</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedAccount(a)}>
              <TableCell className="font-medium">{a.company_name}</TableCell>
              <TableCell>{a.contact_person}</TableCell>
              <TableCell>{a.contact_phone}</TableCell>
              <TableCell>₹{a.credit_limit?.toLocaleString()}</TableCell>
              <TableCell>₹{a.outstanding_balance?.toLocaleString()}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}><CreditBar outstanding={a.outstanding_balance} limit={a.credit_limit} /></TableCell>
              <TableCell><Badge variant="outline">{a.billing_cycle}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{a.gst_number}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => { setDialog({ account: a }); setForm({ company_name: a.company_name, contact_person: a.contact_person, contact_phone: a.contact_phone, contact_email: a.contact_email, credit_limit: String(a.credit_limit), outstanding_balance: String(a.outstanding_balance), billing_cycle: a.billing_cycle, gst_number: a.gst_number, address: a.address }); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{dialog?.account ? "Edit" : "Add"} Corporate Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Company Name</Label><Input value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setField("contact_person", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setField("contact_phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} /></div>
            <div><Label>GST Number</Label><Input value={form.gst_number} onChange={(e) => setField("gst_number", e.target.value)} /></div>
            <div><Label>Credit Limit</Label><Input type="number" value={form.credit_limit} onChange={(e) => setField("credit_limit", e.target.value)} /></div>
            <div><Label>Outstanding Balance</Label><Input type="number" value={form.outstanding_balance} onChange={(e) => setField("outstanding_balance", e.target.value)} /></div>
            <div>
              <Label>Billing Cycle</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => setField("billing_cycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setField("address", e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate(form)}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
