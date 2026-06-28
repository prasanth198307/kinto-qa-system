import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, CheckCircle, BarChart3, BookOpen, Lock, Unlock, ExternalLink, Search, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const pct = (n: any) => `${Number(n || 0).toFixed(1)}%`;

function KpiCard({ title, value, sub, icon: Icon, color, trend }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-md ${color}`}><Icon className="h-4 w-4" /></div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend != null && <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>{trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(trend)}% vs last period</p>}
      </CardContent>
    </Card>
  );
}

// ── CFO Dashboard ─────────────────────────────────────────────────────────────
function CfoDashboard() {
  const { data: d = {} as any } = useQuery<any>({ queryKey: ["/api/finance/cfo-dashboard"] });
  const { data: cash = {} as any } = useQuery<any>({ queryKey: ["/api/finance/cash-flow-summary"] });

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={`₹${fmt(d.totalRevenue)}`} icon={TrendingUp} color="bg-blue-100 text-blue-600" sub={`${d.invoiceCount} invoices`} />
        <KpiCard title="Total Expenses" value={`₹${fmt(d.totalExpenses)}`} icon={TrendingDown} color="bg-red-100 text-red-600" sub={`${d.billCount} bills`} />
        <KpiCard title="Net Profit" value={`₹${fmt(d.netProfit)}`} icon={DollarSign} color={d.netProfit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} sub={pct((d.netProfit / (d.totalRevenue || 1)) * 100) + " margin"} />
        <KpiCard title="Cash & Bank" value={`₹${fmt(d.cashBalance)}`} icon={BarChart3} color="bg-purple-100 text-purple-600" sub={`Bank: ₹${fmt(d.bankBalance)}`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total AR" value={`₹${fmt(d.totalAR)}`} icon={Clock} color="bg-orange-100 text-orange-600" sub="Outstanding receivables" />
        <KpiCard title="Total AP" value={`₹${fmt(d.totalAP)}`} icon={Clock} color="bg-yellow-100 text-yellow-600" sub="Outstanding payables" />
        <KpiCard title="DSO" value={`${Math.round(d.dso || 0)} days`} icon={ArrowDownRight} color="bg-blue-100 text-blue-600" sub="Days Sales Outstanding" />
        <KpiCard title="DPO" value={`${Math.round(d.dpo || 0)} days`} icon={ArrowUpRight} color="bg-green-100 text-green-600" sub="Days Payable Outstanding" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Customers by Revenue</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr><th className="text-left pb-2">Customer</th><th className="text-right pb-2">Revenue</th><th className="text-right pb-2">Invoices</th></tr></thead>
              <tbody>
                {(d.topCustomers || []).map((c: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5"><p className="font-medium">{c.customer_name}</p></td>
                    <td className="py-1.5 text-right font-bold text-green-600">₹{fmt(c.total_revenue)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{c.invoice_count}</td>
                  </tr>
                ))}
                {!(d.topCustomers?.length) && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No data</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Vendors by Expenses</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr><th className="text-left pb-2">Vendor</th><th className="text-right pb-2">Expenses</th><th className="text-right pb-2">Bills</th></tr></thead>
              <tbody>
                {(d.topVendors || []).map((v: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5"><p className="font-medium">{v.vendor_name}</p></td>
                    <td className="py-1.5 text-right font-bold text-red-600">₹{fmt(v.total_expenses)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{v.bill_count}</td>
                  </tr>
                ))}
                {!(d.topVendors?.length) && <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No data</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Cash Flow Summary (by Payment Mode)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(cash.modes || []).map((m: any, i: number) => (
              <div key={i} className="border rounded p-3">
                <p className="text-xs text-muted-foreground capitalize">{m.payment_mode || "Unknown"}</p>
                <p className="font-bold text-green-600">↑ ₹{fmt(m.total_inflow)}</p>
                <p className="font-bold text-red-600">↓ ₹{fmt(m.total_outflow)}</p>
                <p className="text-xs font-semibold mt-1">Net: ₹{fmt(m.net_flow)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── AR Tab ────────────────────────────────────────────────────────────────────
function ArTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ payment_mode: "bank", amount: "" });

  const { data: aging = {} as any } = useQuery<any>({ queryKey: ["/api/finance/ar-aging"] });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/finance/ar-invoices", search], queryFn: () => fetch(`/api/finance/ar-invoices${search ? `?customer_name=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });

  const recordPayment = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("POST", `/api/finance/ar-payment/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/ar-invoices"] }); queryClient.invalidateQueries({ queryKey: ["/api/finance/ar-aging"] }); queryClient.invalidateQueries({ queryKey: ["/api/finance/cfo-dashboard"] }); setPayDialog(null); toast({ title: "Payment recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const BUCKETS = [
    { label: "0–30 days", key: "bucket_0_30", color: "text-green-600" },
    { label: "31–60 days", key: "bucket_31_60", color: "text-yellow-600" },
    { label: "61–90 days", key: "bucket_61_90", color: "text-orange-600" },
    { label: "90+ days", key: "bucket_90_plus", color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* AR Aging Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUCKETS.map(b => (
          <Card key={b.key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className={`text-xl font-bold ${b.color}`}>₹{fmt(aging[b.key])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AR Aging by Customer */}
      {(aging.customers || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Aging by Customer</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground"><tr>{["Customer","0-30","31-60","61-90","90+","Total"].map(h => <th key={h} className="text-right px-2 py-1.5 first:text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {aging.customers.map((c: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{c.customer_name}</td>
                    <td className="px-2 py-1.5 text-right text-green-600">{c.bucket_0_30 > 0 ? `₹${fmt(c.bucket_0_30)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-yellow-600">{c.bucket_31_60 > 0 ? `₹${fmt(c.bucket_31_60)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-orange-600">{c.bucket_61_90 > 0 ? `₹${fmt(c.bucket_61_90)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-red-600">{c.bucket_90_plus > 0 ? `₹${fmt(c.bucket_90_plus)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-bold">₹{fmt(c.total_outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Outstanding Invoices</CardTitle>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search customer…" className="pl-8 h-8 w-48" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>{["Invoice #", "Customer", "Date", "Due Date", "Amount", "Balance Due", "Status", ""].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-medium text-blue-600">{inv.invoice_number}</td>
                  <td className="px-2 py-1.5">{inv.customer_name}</td>
                  <td className="px-2 py-1.5">{fmtDate(inv.invoice_date)}</td>
                  <td className="px-2 py-1.5">{fmtDate(inv.due_date)}</td>
                  <td className="px-2 py-1.5">₹{fmt(inv.total_amount)}</td>
                  <td className="px-2 py-1.5 font-bold text-red-600">₹{fmt(inv.balance_due)}</td>
                  <td className="px-2 py-1.5"><Badge variant="outline" className="text-xs">{inv.payment_status}</Badge></td>
                  <td className="px-2 py-1.5"><Button size="sm" className="h-7 text-xs" onClick={() => { setPayDialog(inv); setPayForm({ payment_mode: "bank", amount: inv.balance_due }); }}>Pay</Button></td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">No outstanding invoices</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Record Payment */}
      <Dialog open={!!payDialog} onOpenChange={v => { if (!v) setPayDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment — {payDialog?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Customer</Label><p className="text-sm font-medium">{payDialog?.customer_name}</p></div>
            <div><Label className="text-xs">Balance Due</Label><p className="text-sm font-bold text-red-600">₹{fmt(payDialog?.balance_due)}</p></div>
            <div><Label className="text-xs">Payment Amount *</Label><Input type="number" value={payForm.amount} onChange={e => setPayForm((p: any) => ({ ...p, amount: e.target.value }))} /></div>
            <div><Label className="text-xs">Payment Mode</Label><Select value={payForm.payment_mode} onValueChange={v => setPayForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","bank","upi","cheque","neft","rtgs"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Reference #</Label><Input value={payForm.reference || ""} onChange={e => setPayForm((p: any) => ({ ...p, reference: e.target.value }))} /></div>
            <div><Label className="text-xs">Payment Date</Label><Input type="date" value={payForm.payment_date || ""} onChange={e => setPayForm((p: any) => ({ ...p, payment_date: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => recordPayment.mutate({ id: payDialog?.id, data: payForm })} disabled={!payForm.amount}>Record Payment</Button>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── AP Tab ────────────────────────────────────────────────────────────────────
function ApTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: aging = {} as any } = useQuery<any>({ queryKey: ["/api/finance/ap-aging"] });
  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/finance/ap-bills", search], queryFn: () => fetch(`/api/finance/ap-bills${search ? `?vendor_name=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });

  const BUCKETS = [
    { label: "0–30 days", key: "bucket_0_30", color: "text-green-600" },
    { label: "31–60 days", key: "bucket_31_60", color: "text-yellow-600" },
    { label: "61–90 days", key: "bucket_61_90", color: "text-orange-600" },
    { label: "90+ days", key: "bucket_90_plus", color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUCKETS.map(b => (
          <Card key={b.key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className={`text-xl font-bold ${b.color}`}>₹{fmt(aging[b.key])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(aging.vendors || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Aging by Vendor</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground"><tr>{["Vendor","0-30","31-60","61-90","90+","Total"].map(h => <th key={h} className="text-right px-2 py-1.5 first:text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {aging.vendors.map((v: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{v.vendor_name}</td>
                    <td className="px-2 py-1.5 text-right text-green-600">{v.bucket_0_30 > 0 ? `₹${fmt(v.bucket_0_30)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-yellow-600">{v.bucket_31_60 > 0 ? `₹${fmt(v.bucket_31_60)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-orange-600">{v.bucket_61_90 > 0 ? `₹${fmt(v.bucket_61_90)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right text-red-600">{v.bucket_90_plus > 0 ? `₹${fmt(v.bucket_90_plus)}` : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-bold">₹{fmt(v.total_outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Outstanding Vendor Bills</CardTitle>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search vendor…" className="pl-8 h-8 w-48" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>{["Voucher #", "Vendor", "Date", "Due Date", "Amount", "Paid", "Balance", "Status"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {bills.map((b: any) => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-medium text-blue-600">{b.voucher_number}</td>
                  <td className="px-2 py-1.5">{b.vendor_name}</td>
                  <td className="px-2 py-1.5">{fmtDate(b.voucher_date)}</td>
                  <td className="px-2 py-1.5">{fmtDate(b.due_date)}</td>
                  <td className="px-2 py-1.5">₹{fmt(b.total_amount)}</td>
                  <td className="px-2 py-1.5 text-green-600">₹{fmt(b.paid_amount)}</td>
                  <td className="px-2 py-1.5 font-bold text-red-600">₹{fmt(b.balance_due)}</td>
                  <td className="px-2 py-1.5"><Badge variant="outline" className="text-xs">{b.payment_status}</Badge></td>
                </tr>
              ))}
              {bills.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">No outstanding bills</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── General Ledger Tab ────────────────────────────────────────────────────────
function GlTab() {
  const [search, setSearch] = useState("");
  const [drilldown, setDrilldown] = useState<any>(null);

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/finance/gl-ledger", search], queryFn: () => fetch(`/api/finance/gl-ledger${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/finance/gl-transactions", drilldown?.id], queryFn: () => drilldown ? fetch(`/api/finance/gl-transactions/${drilldown.id}`).then(r => r.json()) : Promise.resolve([]), enabled: !!drilldown });

  const grouped = accounts.reduce((acc: any, a: any) => { const t = a.account_type || "Other"; if (!acc[t]) acc[t] = []; acc[t].push(a); return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search accounts…" className="pl-8 max-w-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>

      {!drilldown ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, accs]: any) => {
            const totalDebit = accs.reduce((s: number, a: any) => s + Number(a.total_debit || 0), 0);
            const totalCredit = accs.reduce((s: number, a: any) => s + Number(a.total_credit || 0), 0);
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize flex justify-between">
                    <span>{type}</span>
                    <span className="text-xs font-normal text-muted-foreground">Debit: ₹{fmt(totalDebit)} | Credit: ₹{fmt(totalCredit)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground"><tr><th className="text-left pb-1">Account</th><th className="text-left pb-1">Code</th><th className="text-right pb-1">Debit</th><th className="text-right pb-1">Credit</th><th className="text-right pb-1">Balance</th><th className="pb-1"></th></tr></thead>
                    <tbody>
                      {accs.map((a: any) => (
                        <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDrilldown(a)}>
                          <td className="py-1 font-medium">{a.account_name}</td>
                          <td className="py-1 text-muted-foreground">{a.account_code}</td>
                          <td className="py-1 text-right">₹{fmt(a.total_debit)}</td>
                          <td className="py-1 text-right">₹{fmt(a.total_credit)}</td>
                          <td className={`py-1 text-right font-bold ${Number(a.balance) >= 0 ? "text-green-600" : "text-red-600"}`}>₹{fmt(Math.abs(a.balance))}{Number(a.balance) < 0 ? " (Cr)" : ""}</td>
                          <td className="py-1 text-right"><ChevronRight className="h-3 w-3 text-muted-foreground inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
          {accounts.length === 0 && <div className="text-center py-8 text-muted-foreground">No accounts found</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setDrilldown(null)}>← Back to COA</Button>
            <h3 className="font-semibold">{drilldown.account_name} ({drilldown.account_code})</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Debit</p><p className="font-bold">₹{fmt(drilldown.total_debit)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Credit</p><p className="font-bold">₹{fmt(drilldown.total_credit)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Balance</p><p className={`font-bold ${drilldown.balance >= 0 ? "text-green-600" : "text-red-600"}`}>₹{fmt(Math.abs(drilldown.balance))}</p></CardContent></Card>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground"><tr>{["Date","Journal","Description","Debit","Credit"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {txns.map((t: any) => (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-1.5">{fmtDate(t.entry_date)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{t.journal_number || t.reference}</td>
                    <td className="px-3 py-1.5">{t.description || t.narration || "—"}</td>
                    <td className="px-3 py-1.5 text-green-600">{t.debit_amount > 0 ? `₹${fmt(t.debit_amount)}` : "—"}</td>
                    <td className="px-3 py-1.5 text-red-600">{t.credit_amount > 0 ? `₹${fmt(t.credit_amount)}` : "—"}</td>
                  </tr>
                ))}
                {txns.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No journal entries</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Financial Reports Tab ─────────────────────────────────────────────────────
function ReportsTab() {
  const reports = [
    { name: "Balance Sheet", desc: "Assets, liabilities, and equity as of date", path: "/reports/balance-sheet" },
    { name: "Profit & Loss", desc: "Income and expense summary for the period", path: "/reports/profit-loss" },
    { name: "Cash Flow Statement", desc: "Operating, investing, and financing activities", path: "/reports/cash-flow" },
    { name: "Trial Balance", desc: "Debit/credit totals for all accounts", path: "/reports/trial-balance" },
    { name: "AR Aging Report", desc: "Receivables by age bucket per customer", path: "/reports/ar-aging" },
    { name: "AP Aging Report", desc: "Payables by age bucket per vendor", path: "/reports/ap-aging" },
    { name: "Bank Reconciliation", desc: "Match bank statement to books", path: "/reports/bank-reconciliation" },
    { name: "GST Summary", desc: "GST collected and input credit summary", path: "/reports/gst-summary" },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4 mt-2">
      {reports.map(r => (
        <Card key={r.name} className="cursor-pointer hover:border-blue-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div><p className="font-semibold">{r.name}</p><p className="text-sm text-muted-foreground">{r.desc}</p></div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Period Management Tab ─────────────────────────────────────────────────────
function PeriodTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ period_lock_date: "", reason: "" });

  const { data: lock, isLoading } = useQuery<any>({ queryKey: ["/api/finance/period-lock"], onSuccess: (d: any) => { if (d?.lock_date) setForm({ period_lock_date: d.lock_date.slice(0, 10), reason: d.reason || "" }); } });

  const saveLock = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/finance/period-lock", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/period-lock"] }); toast({ title: "Period lock updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const clearLock = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/finance/period-lock", { period_lock_date: null, reason: "Lock cleared" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/period-lock"] }); setForm({ period_lock_date: "", reason: "" }); toast({ title: "Period lock cleared" }); },
  });

  const isLocked = !!lock?.lock_date;

  return (
    <div className="max-w-xl space-y-6">
      <Card className={isLocked ? "border-red-300" : "border-green-300"}>
        <CardContent className="p-5 flex items-center gap-4">
          {isLocked ? <Lock className="h-8 w-8 text-red-600" /> : <Unlock className="h-8 w-8 text-green-600" />}
          <div>
            <p className="font-semibold text-lg">{isLocked ? "Period Locked" : "No Period Lock"}</p>
            {isLocked ? (
              <>
                <p className="text-sm text-muted-foreground">All entries before <strong>{fmtDate(lock.lock_date)}</strong> are locked</p>
                {lock.reason && <p className="text-xs text-muted-foreground">Reason: {lock.reason}</p>}
                {lock.locked_by && <p className="text-xs text-muted-foreground">Locked by: {lock.locked_by}</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">No restrictions on backdated entries</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{isLocked ? "Update Lock Date" : "Set Period Lock"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Lock Date</Label>
            <p className="text-xs text-muted-foreground mb-1">No entries will be allowed before this date</p>
            <Input type="date" value={form.period_lock_date || ""} onChange={e => setForm((p: any) => ({ ...p, period_lock_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input value={form.reason || ""} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Q3 FY2025-26 closed" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveLock.mutate(form)} disabled={!form.period_lock_date || saveLock.isPending} className="flex-1">
              {isLocked ? "Update Lock" : "Lock Period"}
            </Button>
            {isLocked && <Button variant="outline" onClick={() => clearLock.mutate()} disabled={clearLock.isPending} className="text-red-600 border-red-300">Clear Lock</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">What Period Lock Does</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Prevents journal entries with dates before the lock date</li>
            <li>Prevents editing or deleting invoices dated before the lock date</li>
            <li>Prevents backdated expense vouchers</li>
            <li>Ensures closed financial periods remain unchanged</li>
            <li>Only Finance Admin can modify or clear the lock</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceErpPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
        <div><h1 className="text-2xl font-bold">Finance ERP</h1><p className="text-sm text-muted-foreground">CFO dashboard, AR/AP, general ledger & period management</p></div>
      </div>
      <Tabs defaultValue="cfo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cfo">CFO Dashboard</TabsTrigger>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
          <TabsTrigger value="gl">General Ledger</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="period">Period Management</TabsTrigger>
        </TabsList>
        <TabsContent value="cfo"><CfoDashboard /></TabsContent>
        <TabsContent value="ar"><ArTab /></TabsContent>
        <TabsContent value="ap"><ApTab /></TabsContent>
        <TabsContent value="gl"><GlTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="period"><PeriodTab /></TabsContent>
      </Tabs>
    </div>
  );
}
