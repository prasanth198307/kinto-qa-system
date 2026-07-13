import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Check, DollarSign } from "lucide-react";

function fmtINR(n: number | string, config: ReturnType<typeof useTenantConfig>, tenantConfig) {
  const num = Number(n) || 0;
  return fmtCur(num, config);
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-500",
};

interface BillItem { description: string; quantity: number; unit_price: number; tax_rate: number; }
interface Bill { id: number; bill_number: string; vendor_name: string; bill_date: string; due_date: string; total_amount: string; paid_amount: string; status: string; }

export default function AccountsPayable() {
  const tenantConfig = useTenantConfig();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [newBillOpen, setNewBillOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [billForm, setBillForm] = useState({ vendor_name: "", bill_date: "", due_date: "", notes: "" });
  const [billItems, setBillItems] = useState<BillItem[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);

  const [runOpen, setRunOpen] = useState(false);
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [runForm, setRunForm] = useState({ run_date: "", payment_mode: "bank_transfer", bank_account: "" });

  const { data: bills = [] } = useQuery<Bill[]>({ queryKey: ["/api/ap/vendor-bills"] });
  const { data: aging } = useQuery<any>({ queryKey: ["/api/ap/ap-aging"] });
  const { data: runs = [] } = useQuery<any[]>({ queryKey: ["/api/ap/payment-runs"] });

  const approvables = (bills as Bill[]).filter(b => ["approved", "partial"].includes(b.status));

  const createBill = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ap/vendor-bills", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ap/vendor-bills"] }); setNewBillOpen(false); toast({ title: "Bill created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveBill = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/ap/vendor-bills/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ap/vendor-bills"] }); toast({ title: "Bill approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payBill = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => apiRequest("POST", `/api/ap/vendor-bills/${id}/pay`, { amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ap/vendor-bills"] }); setPayOpen(null); toast({ title: "Payment recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRun = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ap/payment-runs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ap/payment-runs"] }); setRunOpen(false); toast({ title: "Payment run created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const processRun = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/ap/payment-runs/${id}/process`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ap/payment-runs"] }); qc.invalidateQueries({ queryKey: ["/api/ap/vendor-bills"] }); toast({ title: "Run processed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function submitBill() {
    createBill.mutate({ ...billForm, items: billItems });
  }

  function submitRun() {
    const items = Array.from(selectedBills).map(id => {
      const bill = approvables.find(b => b.id === id);
      return { bill_id: id, paying_amount: Number(bill?.total_amount || 0) - Number(bill?.paid_amount || 0) };
    });
    createRun.mutate({ ...runForm, items });
  }

  const agingBuckets = [
    { label: "Current", key: "current", color: "bg-green-50 border-green-200" },
    { label: "1–30 Days", key: "days_1_30", color: "bg-yellow-50 border-yellow-200" },
    { label: "31–60 Days", key: "days_31_60", color: "bg-orange-50 border-orange-200" },
    { label: "61–90 Days", key: "days_61_90", color: "bg-red-50 border-red-200" },
    { label: "90+ Days", key: "days_90_plus", color: "bg-red-100 border-red-400" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Accounts Payable</h1>
      <Tabs defaultValue="bills">
        <TabsList>
          <TabsTrigger value="bills">Vendor Bills</TabsTrigger>
          <TabsTrigger value="aging">AP Aging</TabsTrigger>
          <TabsTrigger value="runs">Payment Runs</TabsTrigger>
        </TabsList>

        {/* VENDOR BILLS TAB */}
        <TabsContent value="bills">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendor Bills</CardTitle>
              <Button onClick={() => setNewBillOpen(true)}><Plus className="h-4 w-4 mr-2" />New Bill</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bills as Bill[]).map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.bill_number}</TableCell>
                      <TableCell>{b.vendor_name}</TableCell>
                      <TableCell>{b.bill_date}</TableCell>
                      <TableCell>{b.due_date}</TableCell>
                      <TableCell>{fmtINR(b.total_amount, tenantConfig)}</TableCell>
                      <TableCell>{fmtINR(b.paid_amount, tenantConfig)}</TableCell>
                      <TableCell>{fmtINR(Number(b.total_amount, tenantConfig) - Number(b.paid_amount))}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[b.status] || ""}>{b.status}</Badge></TableCell>
                      <TableCell className="space-x-1">
                        {b.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => approveBill.mutate(b.id)}>
                            <Check className="h-3 w-3 mr-1" />Approve
                          </Button>
                        )}
                        {["approved", "partial", "overdue"].includes(b.status) && (
                          <Button size="sm" variant="outline" onClick={() => { setPayOpen(b.id); setPayAmount(""); }}>
                            <DollarSign className="h-3 w-3 mr-1" />Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(bills as Bill[]).length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No bills found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AP AGING TAB */}
        <TabsContent value="aging">
          <div className="grid grid-cols-5 gap-3 mb-4">
            {agingBuckets.map(b => (
              <Card key={b.key} className={`border ${b.color}`}>
                <CardContent className="pt-4">
                  <div className="text-xs font-medium text-gray-500">{b.label}</div>
                  <div className="text-lg font-bold mt-1">{fmtINR(aging?.summary?.[b.key] || 0, tenantConfig)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Aging by Vendor</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead><TableHead>Current</TableHead><TableHead>1–30</TableHead>
                    <TableHead>31–60</TableHead><TableHead>61–90</TableHead><TableHead>90+</TableHead><TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aging?.vendors || []).map((v: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{v.vendor_name}</TableCell>
                      <TableCell>{fmtINR(v.current_amount, tenantConfig)}</TableCell>
                      <TableCell>{fmtINR(v.days_1_30, tenantConfig)}</TableCell>
                      <TableCell>{fmtINR(v.days_31_60, tenantConfig)}</TableCell>
                      <TableCell>{fmtINR(v.days_61_90, tenantConfig)}</TableCell>
                      <TableCell className="text-red-600">{fmtINR(v.days_90_plus, tenantConfig)}</TableCell>
                      <TableCell className="font-semibold">{fmtINR(v.total_outstanding, tenantConfig)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT RUNS TAB */}
        <TabsContent value="runs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Runs</CardTitle>
              <Button onClick={() => setRunOpen(true)}><Plus className="h-4 w-4 mr-2" />New Payment Run</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run #</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead>
                    <TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(runs as any[]).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.run_number}</TableCell>
                      <TableCell>{r.run_date}</TableCell>
                      <TableCell>{r.payment_mode}</TableCell>
                      <TableCell>{fmtINR(r.total_amount, tenantConfig)}</TableCell>
                      <TableCell><Badge className={r.status === "processed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{r.status}</Badge></TableCell>
                      <TableCell>
                        {r.status === "draft" && (
                          <Button size="sm" onClick={() => processRun.mutate(r.id)}>Process</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NEW BILL DIALOG */}
      <Dialog open={newBillOpen} onOpenChange={setNewBillOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Vendor Bill</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor Name *</Label><Input value={billForm.vendor_name} onChange={e => setBillForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
              <div><Label>Notes</Label><Input value={billForm.notes} onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div><Label>Bill Date *</Label><Input type="date" value={billForm.bill_date} onChange={e => setBillForm(f => ({ ...f, bill_date: e.target.value }))} /></div>
              <div><Label>Due Date *</Label><Input type="date" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-2"><Label>Line Items</Label><Button size="sm" variant="outline" onClick={() => setBillItems(i => [...i, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }])}>+ Add</Button></div>
              {billItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 mb-2 items-end">
                  <div className="col-span-2"><Input placeholder="Description" value={item.description} onChange={e => setBillItems(items => items.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} /></div>
                  <div><Input type="number" placeholder="Qty" value={item.quantity} onChange={e => setBillItems(items => items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))} /></div>
                  <div><Input type="number" placeholder="Price" value={item.unit_price} onChange={e => setBillItems(items => items.map((it, i) => i === idx ? { ...it, unit_price: Number(e.target.value) } : it))} /></div>
                  <div><Input type="number" placeholder="Tax%" value={item.tax_rate} onChange={e => setBillItems(items => items.map((it, i) => i === idx ? { ...it, tax_rate: Number(e.target.value) } : it))} /></div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBillOpen(false)}>Cancel</Button>
            <Button onClick={submitBill} disabled={createBill.isPending}>Create Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAY DIALOG */}
      <Dialog open={payOpen !== null} onOpenChange={() => setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div><Label>Amount *</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Enter payment amount" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={() => payOpen && payBill.mutate({ id: payOpen, amount: Number(payAmount) })} disabled={payBill.isPending}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAYMENT RUN DIALOG */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Payment Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Run Date *</Label><Input type="date" value={runForm.run_date} onChange={e => setRunForm(f => ({ ...f, run_date: e.target.value }))} /></div>
              <div><Label>Payment Mode</Label><Input value={runForm.payment_mode} onChange={e => setRunForm(f => ({ ...f, payment_mode: e.target.value }))} /></div>
              <div><Label>Bank Account</Label><Input value={runForm.bank_account} onChange={e => setRunForm(f => ({ ...f, bank_account: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Select Bills to Pay</Label>
              <Table>
                <TableHeader><TableRow><TableHead></TableHead><TableHead>Bill #</TableHead><TableHead>Vendor</TableHead><TableHead>Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>
                  {approvables.map(b => (
                    <TableRow key={b.id}>
                      <TableCell><input type="checkbox" checked={selectedBills.has(b.id)} onChange={e => { const s = new Set(selectedBills); e.target.checked ? s.add(b.id) : s.delete(b.id); setSelectedBills(s); }} /></TableCell>
                      <TableCell>{b.bill_number}</TableCell>
                      <TableCell>{b.vendor_name}</TableCell>
                      <TableCell>{fmtINR(Number(b.total_amount, tenantConfig) - Number(b.paid_amount))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button onClick={submitRun} disabled={createRun.isPending || selectedBills.size === 0}>Create Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
