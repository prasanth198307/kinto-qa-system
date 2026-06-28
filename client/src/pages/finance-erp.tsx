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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, BarChart3, BookOpen, Lock, Unlock, ExternalLink, Search, ArrowUpRight, ArrowDownRight, Plus, Upload, CheckCircle, X, Pencil } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const FL = ({ label, children, full }: any) => <div className={`space-y-1 ${full ? "col-span-2" : ""}`}><Label className="text-xs">{label}</Label>{children}</div>;

function KPICard({ title, value, sub, icon: Icon, color, alert }: any) {
  return (
    <Card className={alert ? "border-red-300" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className={`p-1.5 rounded ${color}`}><Icon className="h-3.5 w-3.5" /></div>
        </div>
        <p className={`text-xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── CFO DASHBOARD ─────────────────────────────────────────────────────────────
function CfoDashboard() {
  const { data: d = {} as any } = useQuery<any>({ queryKey: ["/api/finance/cfo-dashboard"] });
  const { data: ratios = {} as any } = useQuery<any>({ queryKey: ["/api/finance/ratio-analysis"] });

  const ratioColor = (val: number, good: number, dir: 'high' | 'low') =>
    dir === 'high' ? (val >= good ? "text-green-600" : "text-red-600") : (val <= good ? "text-green-600" : "text-red-600");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Revenue MTD" value={`₹${fmt(d.totalRevenueMtd)}`} icon={TrendingUp} color="bg-blue-100 text-blue-600" sub={`YTD: ₹${fmt(d.totalRevenueYtd)}`} />
        <KPICard title="Expenses MTD" value={`₹${fmt(d.totalExpensesMtd)}`} icon={TrendingDown} color="bg-red-100 text-red-600" sub={`YTD: ₹${fmt(d.totalExpensesYtd)}`} />
        <KPICard title="Net Profit MTD" value={`₹${fmt(d.netProfitMtd)}`} icon={DollarSign} color={d.netProfitMtd >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} alert={d.netProfitMtd < 0} />
        <KPICard title="Cash + Bank" value={`₹${fmt(d.totalCashBank)}`} icon={BarChart3} color="bg-purple-100 text-purple-600" sub={`Cash: ₹${fmt(d.cashBalance)} | Bank: ₹${fmt(d.bankBalance)}`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="AR Overdue" value={`₹${fmt(d.arOverdue)}`} icon={Clock} color="bg-orange-100 text-orange-600" alert={d.arOverdue > 0} sub={`Total AR: ₹${fmt(d.arTotal)}`} />
        <KPICard title="AP Overdue" value={`₹${fmt(d.apOverdue)}`} icon={Clock} color="bg-yellow-100 text-yellow-600" alert={d.apOverdue > 0} sub={`Total AP: ₹${fmt(d.apTotal)}`} />
        <KPICard title="DSO" value={`${d.dso || 0} days`} icon={ArrowDownRight} color="bg-blue-100 text-blue-600" sub="Days Sales Outstanding" />
        <KPICard title="DPO" value={`${d.dpo || 0} days`} icon={ArrowUpRight} color="bg-green-100 text-green-600" sub="Days Payable Outstanding" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Overdue Customers</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs"><tr><th className="text-left pb-1">Customer</th><th className="text-right pb-1">Overdue</th><th className="text-right pb-1">Days</th></tr></thead>
              <tbody>{(d.topOverdueCustomers || []).map((c: any, i: number) => (
                <tr key={i} className="border-t"><td className="py-1.5">{c.customer_name}</td><td className="py-1.5 text-right font-bold text-red-600">₹{fmt(c.overdue_amount)}</td><td className="py-1.5 text-right">{c.max_days_overdue}d</td></tr>
              ))}{!(d.topOverdueCustomers?.length) && <tr><td colSpan={3} className="py-3 text-center text-muted-foreground text-xs">No overdue</td></tr>}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Overdue Vendors</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs"><tr><th className="text-left pb-1">Vendor</th><th className="text-right pb-1">Overdue</th><th className="text-right pb-1">Days</th></tr></thead>
              <tbody>{(d.topOverdueVendors || []).map((v: any, i: number) => (
                <tr key={i} className="border-t"><td className="py-1.5">{v.vendor_name}</td><td className="py-1.5 text-right font-bold text-red-600">₹{fmt(v.overdue_amount)}</td><td className="py-1.5 text-right">{v.max_days_overdue}d</td></tr>
              ))}{!(d.topOverdueVendors?.length) && <tr><td colSpan={3} className="py-3 text-center text-muted-foreground text-xs">No overdue</td></tr>}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Financial Ratios */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Financial Ratios</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { label: "Current Ratio", val: ratios.currentRatio, good: 2, dir: 'high', bench: ">2.0" },
              { label: "Quick Ratio", val: ratios.quickRatio, good: 1, dir: 'high', bench: ">1.0" },
              { label: "D/E Ratio", val: ratios.debtEquityRatio, good: 2, dir: 'low', bench: "<2.0" },
              { label: "ROE", val: ratios.returnOnEquity, good: 15, dir: 'high', bench: ">15%" },
              { label: "ROA", val: ratios.returnOnAssets, good: 5, dir: 'high', bench: ">5%" },
              { label: "Gross Margin", val: ratios.grossMargin, good: 20, dir: 'high', bench: ">20%" },
            ].map(r => (
              <div key={r.label} className="border rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className={`text-lg font-bold ${r.val != null ? ratioColor(Number(r.val), r.good, r.dir as any) : ""}`}>{r.val ?? "N/A"}{r.label.includes("Ratio") ? "x" : r.label.includes("%")||r.label.includes("Margin")||r.label.includes("ROE")||r.label.includes("ROA") ? "%" : ""}</p>
                <p className="text-xs text-muted-foreground">{r.bench}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── AR TAB ─────────────────────────────────────────────────────────────────────
function ArTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [payDlg, setPayDlg] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ payment_mode: "bank", amount: "" });

  const { data: aging = {} as any } = useQuery<any>({ queryKey: ["/api/finance/ar-aging"] });
  const { data: invoices = [] } = useQuery<any[]>({ queryKey: ["/api/finance/ar-invoices", search], queryFn: () => fetch(`/api/finance/ar-invoices${search ? `?customer_name=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });

  const recordPay = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("POST", `/api/finance/ar-payment/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/ar-invoices"] }); queryClient.invalidateQueries({ queryKey: ["/api/finance/ar-aging"] }); queryClient.invalidateQueries({ queryKey: ["/api/finance/cfo-dashboard"] }); setPayDlg(null); toast({ title: "Payment recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const sendReminder = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/ar-reminder", data),
    onSuccess: () => toast({ title: "Reminder sent" }),
  });

  const BUCKETS = [{ label: "0–30 days", k: "0-30", col: "text-green-600" }, { label: "31–60 days", k: "31-60", col: "text-yellow-600" }, { label: "61–90 days", k: "61-90", col: "text-orange-600" }, { label: "90+ days", k: "90+", col: "text-red-600" }];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUCKETS.map(b => <Card key={b.k}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{b.label}</p><p className={`text-xl font-bold ${b.col}`}>₹{fmt((aging.summary || {})[b.k])}</p></CardContent></Card>)}
      </div>

      {(aging.customers || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">AR Aging by Customer</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Customer","0-30","31-60","61-90","90+","Total"].map(h => <th key={h} className={`px-2 py-1.5 font-medium ${h==="Customer"?"text-left":"text-right"}`}>{h}</th>)}</tr></thead>
              <tbody>{aging.customers.map((c: any, i: number) => (
                <tr key={i} className="border-t text-xs">
                  <td className="px-2 py-1.5 font-medium">{c.customer_name}</td>
                  {["0-30","31-60","61-90","90+"].map(b => <td key={b} className="px-2 py-1.5 text-right">{c[b]>0?`₹${fmt(c[b])}`:"—"}</td>)}
                  <td className="px-2 py-1.5 text-right font-bold">₹{fmt(c.total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Outstanding Invoices</CardTitle>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search customer…" className="pl-8 h-8 text-sm w-48" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Invoice","Customer","Date","Due Date","Amount","Balance","Days","Actions"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(invoices as any[]).map((inv: any) => (
              <tr key={inv.id} className="border-t hover:bg-muted/30">
                <td className="px-2 py-1.5 font-medium text-blue-600 text-xs">{inv.invoice_number}</td>
                <td className="px-2 py-1.5 text-xs">{inv.customer_name}</td>
                <td className="px-2 py-1.5 text-xs">{fmtD(inv.invoice_date)}</td>
                <td className="px-2 py-1.5 text-xs">{fmtD(inv.due_date)}</td>
                <td className="px-2 py-1.5 text-xs">₹{fmt(inv.total_amount)}</td>
                <td className="px-2 py-1.5 font-bold text-red-600 text-xs">₹{fmt(inv.balance_due)}</td>
                <td className="px-2 py-1.5 text-xs">{inv.days_overdue > 0 ? <Badge variant="destructive" className="text-xs">{inv.days_overdue}d</Badge> : <Badge variant="outline" className="text-xs">Current</Badge>}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs px-2" onClick={() => { setPayDlg(inv); setPayForm({ payment_mode: "bank", amount: inv.balance_due }); }}>Pay</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => sendReminder.mutate({ invoice_id: inv.id, customer_name: inv.customer_name, customer_phone: inv.customer_phone, amount_due: inv.balance_due, days_overdue: inv.days_overdue, reminder_type: 'whatsapp' })}>WA</Button>
                  </div>
                </td>
              </tr>
            ))}{invoices.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground text-xs">No outstanding invoices</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!payDlg} onOpenChange={v => { if (!v) setPayDlg(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment — {payDlg?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Customer</Label><p className="font-medium text-sm">{payDlg?.customer_name}</p></div>
            <div><Label className="text-xs">Balance Due</Label><p className="font-bold text-red-600">₹{fmt(payDlg?.balance_due)}</p></div>
            <FL label="Amount *"><Input type="number" value={payForm.amount} onChange={e => setPayForm((p: any) => ({ ...p, amount: e.target.value }))} /></FL>
            <FL label="Payment Mode"><Select value={payForm.payment_mode} onValueChange={v => setPayForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","bank","upi","cheque","neft","rtgs"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Reference #"><Input value={payForm.reference || ""} onChange={e => setPayForm((p: any) => ({ ...p, reference: e.target.value }))} /></FL>
            <FL label="Payment Date"><Input type="date" value={payForm.payment_date || ""} onChange={e => setPayForm((p: any) => ({ ...p, payment_date: e.target.value }))} /></FL>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => recordPay.mutate({ id: payDlg?.id, data: payForm })} disabled={!payForm.amount}>Record</Button>
            <Button variant="outline" onClick={() => setPayDlg(null)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── AP TAB ─────────────────────────────────────────────────────────────────────
function ApTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [batchForm, setBatchForm] = useState<any>({ payment_mode: "bank_transfer" });

  const { data: aging = {} as any } = useQuery<any>({ queryKey: ["/api/finance/ap-aging"] });
  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/finance/ap-bills", search], queryFn: () => fetch(`/api/finance/ap-bills${search ? `?vendor_name=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });
  const { data: batches = [] } = useQuery<any[]>({ queryKey: ["/api/finance/ap-payment/list"] });

  const createBatch = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/ap-payment/batch", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/ap-bills"] }); queryClient.invalidateQueries({ queryKey: ["/api/finance/ap-payment/list"] }); setSelected([]); toast({ title: "Payment batch created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const BUCKETS = [{ label: "0–30 days", k: "0-30", col: "text-green-600" }, { label: "31–60 days", k: "31-60", col: "text-yellow-600" }, { label: "61–90 days", k: "61-90", col: "text-orange-600" }, { label: "90+ days", k: "90+", col: "text-red-600" }];
  const totalSelected = (bills as any[]).filter((b: any) => selected.includes(b.id)).reduce((s, b: any) => s + Number(b.balance_due), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {BUCKETS.map(b => <Card key={b.k}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{b.label}</p><p className={`text-xl font-bold ${b.col}`}>₹{fmt((aging.summary || {})[b.k])}</p></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Outstanding Vendor Bills</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search vendor…" className="pl-8 h-8 text-sm w-40" value={search} onChange={e => setSearch(e.target.value)} /></div>
              {selected.length > 0 && (
                <div className="flex gap-2 items-center">
                  <Select value={batchForm.payment_mode} onValueChange={v => setBatchForm((p: any) => ({ ...p, payment_mode: v }))}>
                    <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{["bank_transfer","cheque","neft","rtgs"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" className="h-8" onClick={() => createBatch.mutate({ ...batchForm, voucher_ids: selected })}>
                    Pay {selected.length} bills (₹{fmt(totalSelected)})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs">
              <tr>
                <th className="px-2 py-1.5"><input type="checkbox" onChange={e => setSelected(e.target.checked ? (bills as any[]).map((b: any) => b.id) : [])} /></th>
                {["Voucher #","Vendor","Date","Due Date","Amount","Paid","Balance","Status"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>{(bills as any[]).map((b: any) => (
              <tr key={b.id} className={`border-t hover:bg-muted/30 text-xs ${selected.includes(b.id) ? "bg-blue-50" : ""}`}>
                <td className="px-2 py-1.5"><input type="checkbox" checked={selected.includes(b.id)} onChange={e => setSelected(e.target.checked ? [...selected, b.id] : selected.filter(s => s !== b.id))} /></td>
                <td className="px-2 py-1.5 font-medium text-blue-600">{b.voucher_number}</td>
                <td className="px-2 py-1.5">{b.vendor_name}</td>
                <td className="px-2 py-1.5">{fmtD(b.voucher_date)}</td>
                <td className={`px-2 py-1.5 ${Number(b.days_overdue) > 0 ? "text-red-600 font-bold" : ""}`}>{fmtD(b.due_date)}</td>
                <td className="px-2 py-1.5">₹{fmt(b.total_amount)}</td>
                <td className="px-2 py-1.5 text-green-600">₹{fmt(b.paid_amount)}</td>
                <td className="px-2 py-1.5 font-bold text-red-600">₹{fmt(b.balance_due)}</td>
                <td className="px-2 py-1.5"><Badge variant="outline" className="text-xs">{b.payment_status}</Badge></td>
              </tr>
            ))}{bills.length === 0 && <tr><td colSpan={9} className="px-2 py-4 text-center text-muted-foreground text-xs">No outstanding bills</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      {batches.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Payment Batches</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs"><tr>{["Date","Mode","Amount","Reference","Status"].map(h => <th key={h} className="text-left pb-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(batches as any[]).map((b: any) => (
                <tr key={b.id} className="border-t text-xs">
                  <td className="py-1">{fmtD(b.payment_date)}</td>
                  <td className="py-1">{b.payment_mode}</td>
                  <td className="py-1 font-bold">₹{fmt(b.total_amount)}</td>
                  <td className="py-1">{b.reference_number || "—"}</td>
                  <td className="py-1"><Badge className={b.status === "paid" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"} variant="outline">{b.status}</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── GST TAB ───────────────────────────────────────────────────────────────────
function GstTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState("gstr2b");
  const [uploading, setUploading] = useState(false);
  const [selectedImport, setSelectedImport] = useState<any>(null);
  const [period, setPeriod] = useState("");
  const [fy, setFy] = useState("2024-2025");

  const { data: imports = [] } = useQuery<any[]>({ queryKey: ["/api/finance/gstr2b/list"] });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/finance/gstr2b/records", selectedImport?.id], queryFn: () => selectedImport ? fetch(`/api/finance/gstr2b/${selectedImport.id}/records`).then(r => r.json()) : Promise.resolve([]), enabled: !!selectedImport });
  const { data: itc = {} as any } = useQuery<any>({ queryKey: ["/api/finance/itc-utilization"] });
  const { data: gstr9 = {} as any } = useQuery<any>({ queryKey: ["/api/finance/gstr9-data", fy], queryFn: () => fetch(`/api/finance/gstr9-data?fy=${fy}`).then(r => r.json()) });

  const uploadGstr2b = async (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("period", period);
    try {
      const r = await fetch("/api/finance/gstr2b/upload", { method: "POST", body: fd });
      const data = await r.json();
      queryClient.invalidateQueries({ queryKey: ["/api/finance/gstr2b/list"] });
      toast({ title: `Uploaded: ${data.matched} matched, ${data.unmatched} unmatched` });
    } catch (e: any) { toast({ title: "Upload failed", variant: "destructive" }); }
    setUploading(false); e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["gstr2b","gstr9","itc"].map(t => <Button key={t} size="sm" variant={subTab===t?"default":"outline"} onClick={() => setSubTab(t)}>{t==="gstr2b"?"GSTR-2B Recon":t==="gstr9"?"GSTR-9 Data":"ITC Utilization"}</Button>)}
      </div>

      {subTab === "gstr2b" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Upload GSTR-2B CSV</CardTitle></CardHeader>
            <CardContent className="flex gap-3 items-end">
              <FL label="Period (MMYYYY)"><Input value={period} onChange={e => setPeriod(e.target.value)} placeholder="062025" className="w-32" /></FL>
              <label className="cursor-pointer"><Button size="sm" variant="outline" disabled={uploading} onClick={e => { e.preventDefault(); document.getElementById("gstr2b-file")?.click(); }}><Upload className="h-4 w-4 mr-1" />{uploading ? "Uploading…" : "Upload CSV"}</Button><input id="gstr2b-file" type="file" accept=".csv" className="hidden" onChange={uploadGstr2b} /></label>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Import History</CardTitle></CardHeader>
              <CardContent>
                {(imports as any[]).map((imp: any) => (
                  <div key={imp.id} className={`border rounded p-3 mb-2 cursor-pointer hover:border-blue-300 ${selectedImport?.id === imp.id ? "border-blue-500 bg-blue-50" : ""}`} onClick={() => setSelectedImport(imp)}>
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">{imp.file_name}</p>
                      <Badge variant="outline" className="text-xs">{imp.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Period: {imp.period} | Total: {imp.total_records} | <span className="text-green-600">✓{imp.matched}</span> <span className="text-red-600">✗{imp.unmatched}</span></p>
                  </div>
                ))}
                {imports.length === 0 && <p className="text-xs text-muted-foreground">No imports yet</p>}
              </CardContent>
            </Card>
            {selectedImport && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Unmatched Records — {selectedImport.file_name}</CardTitle></CardHeader>
                <CardContent className="max-h-64 overflow-y-auto">
                  {(records as any[]).filter((r: any) => r.match_status === "unmatched").map((r: any) => (
                    <div key={r.id} className="border rounded p-2 mb-1.5 text-xs">
                      <p className="font-medium">{r.supplier_name} <span className="text-muted-foreground">({r.supplier_gstin})</span></p>
                      <p>Inv: {r.invoice_number} | ₹{fmt(r.invoice_value)} | CGST: ₹{fmt(r.cgst)} SGST: ₹{fmt(r.sgst)}</p>
                    </div>
                  ))}
                  {(records as any[]).filter((r: any) => r.match_status === "unmatched").length === 0 && <p className="text-xs text-muted-foreground">All records matched!</p>}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {subTab === "itc" && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "CGST", input: itc.cgstInput, output: itc.cgstOutput, net: itc.cgstNet },
            { label: "SGST", input: itc.sgstInput, output: itc.sgstOutput, net: itc.sgstNet },
            { label: "IGST", input: itc.igstInput, output: itc.igstOutput, net: itc.igstNet },
          ].map(t => (
            <Card key={t.label}>
              <CardHeader><CardTitle className="text-sm">{t.label}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Input Credit</span><span className="font-bold text-green-600">₹{fmt(t.input)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Output Liability</span><span className="font-bold text-red-600">₹{fmt(t.output)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-medium">Net</span><span className={`font-bold ${Number(t.net) >= 0 ? "text-green-600" : "text-red-600"}`}>₹{fmt(t.net)}</span></div>
              </CardContent>
            </Card>
          ))}
          <Card className="md:col-span-3">
            <CardContent className="p-4 flex gap-8">
              <div><p className="text-xs text-muted-foreground">Total ITC Available</p><p className="text-xl font-bold text-green-600">₹{fmt(itc.totalInput)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Output Liability</p><p className="text-xl font-bold text-red-600">₹{fmt(itc.totalOutput)}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Position</p><p className={`text-xl font-bold ${(itc.totalInput - itc.totalOutput) >= 0 ? "text-green-600" : "text-red-600"}`}>₹{fmt(itc.totalInput - itc.totalOutput)}</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {subTab === "gstr9" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <FL label="Financial Year"><Input value={fy} onChange={e => setFy(e.target.value)} placeholder="2024-2025" className="w-32" /></FL>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[{ label: "Outward Supplies", data: gstr9.outwardSupplies }, { label: "Inward Supplies (ITC)", data: gstr9.inwardSupplies }].map(sec => (
              <Card key={sec.label}>
                <CardHeader><CardTitle className="text-sm">{sec.label}</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {[["Taxable Value", "taxable"], ["CGST", "cgst"], ["SGST", "sgst"], ["IGST", "igst"], ["Total", "total"]].map(([label, key]) => (
                    <div key={key} className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">₹{fmt(sec.data?.[key])}</span></div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TDS TAB ───────────────────────────────────────────────────────────────────
function TdsTab() {
  const { toast } = useToast();
  const [quarter, setQuarter] = useState("Q1");
  const [fy, setFy] = useState("2024-25");
  const [returnType, setReturnType] = useState("26Q");

  const { data: tdsData = [] } = useQuery<any[]>({ queryKey: ["/api/finance/tds-return", quarter, fy], queryFn: () => fetch(`/api/finance/tds-return/${quarter}/${fy}`).then(r => r.json()) });

  const compile = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/tds-return/compile", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/tds-return"] }); toast({ title: "TDS data compiled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Compile TDS Return</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap items-end">
          <FL label="Return Type"><Select value={returnType} onValueChange={setReturnType}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{["24Q","26Q","27EQ"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL>
          <FL label="Quarter"><Select value={quarter} onValueChange={setQuarter}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent>{["Q1","Q2","Q3","Q4"].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select></FL>
          <FL label="Financial Year"><Input value={fy} onChange={e => setFy(e.target.value)} placeholder="2024-25" className="w-28" /></FL>
          <Button size="sm" onClick={() => compile.mutate({ return_type: returnType, quarter, financial_year: fy })} disabled={compile.isPending}>Compile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">TDS Return Data — {returnType} {quarter} {fy}</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground"><tr>{["Deductee Name","PAN","Section","Payment Date","Payment Amt","TDS Amount","Challan #","Status"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(tdsData as any[]).map((t: any, i: number) => (
              <tr key={i} className="border-t"><td className="px-2 py-1">{t.deductee_name}</td><td className="px-2 py-1">{t.deductee_pan || "—"}</td><td className="px-2 py-1">{t.section_code || "—"}</td><td className="px-2 py-1">{fmtD(t.payment_date)}</td><td className="px-2 py-1">₹{fmt(t.payment_amount)}</td><td className="px-2 py-1 font-bold">₹{fmt(t.tds_amount)}</td><td className="px-2 py-1">{t.challan_number || "—"}</td><td className="px-2 py-1"><Badge variant="outline" className="text-xs">{t.status}</Badge></td></tr>
            ))}{tdsData.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">No data — click Compile</td></tr>}</tbody>
          </table>
          {tdsData.length > 0 && (
            <div className="mt-3 flex gap-4 text-sm border-t pt-2">
              <span>Records: <strong>{tdsData.length}</strong></span>
              <span>Total TDS: <strong>₹{fmt((tdsData as any[]).reduce((s, t: any) => s + Number(t.tds_amount || 0), 0))}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── PETTY CASH TAB ────────────────────────────────────────────────────────────
function PettyCashTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ voucher_type: "payment", category: "general" });

  const { data: pc = {} as any, refetch } = useQuery<any>({ queryKey: ["/api/finance/petty-cash"] });
  const config = pc.config || {};
  const vouchers = pc.vouchers || [];

  const addVoucher = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/petty-cash/voucher", data),
    onSuccess: () => { refetch(); setForm({ voucher_type: "payment", category: "general" }); toast({ title: "Voucher added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const replenish = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/petty-cash/replenish", data),
    onSuccess: () => { refetch(); toast({ title: "Replenished" }); },
  });

  const balance = Number(config.current_balance || 0);
  const threshold = Number(config.replenishment_threshold || 1000);
  const needsReplenish = balance < threshold;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={needsReplenish ? "border-red-300" : "border-green-300"}>
          <CardContent className="p-5 text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className={`text-3xl font-bold mt-1 ${needsReplenish ? "text-red-600" : "text-green-600"}`}>₹{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Float: ₹{fmt(config.float_amount)} | Threshold: ₹{fmt(threshold)}</p>
            {needsReplenish && <Badge variant="destructive" className="mt-2">Needs Replenishment</Badge>}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Add Voucher</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Type"><Select value={form.voucher_type} onValueChange={v => setForm((p: any) => ({ ...p, voucher_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="payment">Payment</SelectItem><SelectItem value="receipt">Receipt</SelectItem></SelectContent></Select></FL>
              <FL label="Amount *"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FL>
              <FL label="Purpose *" full><Input value={form.purpose || ""} onChange={e => setForm((p: any) => ({ ...p, purpose: e.target.value }))} /></FL>
              <FL label="Category"><Select value={form.category || "general"} onValueChange={v => setForm((p: any) => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["general","office","travel","food","maintenance","utilities","misc"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FL>
              <FL label={form.voucher_type === "payment" ? "Paid To" : "Received From"}><Input value={form.paid_to || form.received_from || ""} onChange={e => setForm((p: any) => ({ ...p, [form.voucher_type==="payment"?"paid_to":"received_from"]: e.target.value }))} /></FL>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => addVoucher.mutate(form)} disabled={!form.amount || !form.purpose}>Add Voucher</Button>
              {needsReplenish && <Button size="sm" variant="outline" onClick={() => replenish.mutate({ amount: Number(config.float_amount) - balance })}>Replenish to Float</Button>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Voucher History</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs"><tr>{["#","Date","Type","Purpose","Category","Amount","Balance"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(vouchers as any[]).map((v: any) => (
              <tr key={v.id} className="border-t text-xs">
                <td className="px-2 py-1">{v.voucher_number}</td>
                <td className="px-2 py-1">{fmtD(v.voucher_date)}</td>
                <td className="px-2 py-1"><Badge variant="outline" className="text-xs">{v.voucher_type}</Badge></td>
                <td className="px-2 py-1">{v.purpose}</td>
                <td className="px-2 py-1">{v.category || "—"}</td>
                <td className={`px-2 py-1 font-bold ${v.voucher_type==="payment"?"text-red-600":"text-green-600"}`}>{v.voucher_type==="payment"?"-":"+"} ₹{fmt(v.amount)}</td>
                <td className="px-2 py-1">₹{fmt(v.balance_after)}</td>
              </tr>
            ))}{vouchers.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No vouchers</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── PDC TAB ───────────────────────────────────────────────────────────────────
function PdcTab() {
  const { toast } = useToast();
  const [pdcType, setPdcType] = useState("given");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ pdc_type: "given" });
  const [statusDlg, setStatusDlg] = useState<any>(null);
  const [statusForm, setStatusForm] = useState<any>({});

  const { data: pdcs = [] } = useQuery<any[]>({ queryKey: ["/api/finance/pdc", pdcType], queryFn: () => fetch(`/api/finance/pdc?pdc_type=${pdcType}`).then(r => r.json()) });

  const create = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/finance/pdc", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/pdc"] }); setShowForm(false); toast({ title: "PDC added" }); }, onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) });
  const updateStatus = useMutation({ mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/finance/pdc/${id}/status`, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/pdc"] }); setStatusDlg(null); toast({ title: "Status updated" }); } });

  const today = new Date().toISOString().slice(0, 10);
  const STATUS_COLOR: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", presented: "bg-blue-100 text-blue-700", cleared: "bg-green-100 text-green-700", bounced: "bg-red-100 text-red-700", cancelled: "bg-gray-100 text-gray-600" };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={pdcType==="given"?"default":"outline"} onClick={() => setPdcType("given")}>PDC Given</Button>
          <Button size="sm" variant={pdcType==="received"?"default":"outline"} onClick={() => setPdcType("received")}>PDC Received</Button>
        </div>
        <Button size="sm" onClick={() => { setForm({ pdc_type: pdcType }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add PDC</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Cheque #","Bank","Party","Date","Amount","Status",""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(pdcs as any[]).map((p: any) => (
              <tr key={p.id} className={`border-t hover:bg-muted/30 ${p.cheque_date === today ? "bg-red-50" : ""}`}>
                <td className="px-3 py-2 font-medium">{p.cheque_number}</td>
                <td className="px-3 py-2 text-xs">{p.bank_name || "—"}</td>
                <td className="px-3 py-2 text-xs">{p.party_name || "—"}</td>
                <td className={`px-3 py-2 text-xs font-medium ${p.cheque_date <= today && p.status==="pending" ? "text-red-600" : ""}`}>{fmtD(p.cheque_date)}{p.cheque_date <= today && p.status==="pending" && " ⚠"}</td>
                <td className="px-3 py-2 font-bold">₹{fmt(p.amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLOR[p.status] || ""}>{p.status}</Badge></td>
                <td className="px-3 py-2"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setStatusDlg(p); setStatusForm({ status: p.status }); }}><Pencil className="h-3 w-3" /></Button></td>
              </tr>
            ))}{pdcs.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground text-xs">No PDCs</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add PDC {pdcType === "given" ? "Given" : "Received"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Cheque # *"><Input value={form.cheque_number || ""} onChange={e => setForm((p: any) => ({ ...p, cheque_number: e.target.value }))} /></FL>
            <FL label="Bank Name"><Input value={form.bank_name || ""} onChange={e => setForm((p: any) => ({ ...p, bank_name: e.target.value }))} /></FL>
            <FL label="Branch"><Input value={form.branch_name || ""} onChange={e => setForm((p: any) => ({ ...p, branch_name: e.target.value }))} /></FL>
            <FL label="Cheque Date *"><Input type="date" value={form.cheque_date || ""} onChange={e => setForm((p: any) => ({ ...p, cheque_date: e.target.value }))} /></FL>
            <FL label="Amount *"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FL>
            <FL label="Party Type"><Select value={form.party_type || ""} onValueChange={v => setForm((p: any) => ({ ...p, party_type: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem></SelectContent></Select></FL>
            <FL label="Party Name" full><Input value={form.party_name || ""} onChange={e => setForm((p: any) => ({ ...p, party_name: e.target.value }))} /></FL>
            <FL label="Purpose" full><Input value={form.purpose || ""} onChange={e => setForm((p: any) => ({ ...p, purpose: e.target.value }))} /></FL>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => create.mutate({ ...form, pdc_type: pdcType })} disabled={!form.cheque_number || !form.cheque_date || !form.amount}>Add PDC</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusDlg} onOpenChange={v => { if (!v) setStatusDlg(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Status — {statusDlg?.cheque_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Status"><Select value={statusForm.status || ""} onValueChange={v => setStatusForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","presented","cleared","bounced","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FL>
            {statusForm.status === "presented" && <FL label="Presented Date"><Input type="date" value={statusForm.presented_date || ""} onChange={e => setStatusForm((p: any) => ({ ...p, presented_date: e.target.value }))} /></FL>}
            {statusForm.status === "cleared" && <FL label="Cleared Date"><Input type="date" value={statusForm.cleared_date || ""} onChange={e => setStatusForm((p: any) => ({ ...p, cleared_date: e.target.value }))} /></FL>}
            {statusForm.status === "bounced" && <FL label="Bounce Reason"><Input value={statusForm.bounce_reason || ""} onChange={e => setStatusForm((p: any) => ({ ...p, bounce_reason: e.target.value }))} /></FL>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => updateStatus.mutate({ id: statusDlg.id, data: statusForm })}>Update</Button>
            <Button variant="outline" onClick={() => setStatusDlg(null)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── PERIOD LOCK TAB ───────────────────────────────────────────────────────────
function PeriodLockTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ period_lock_date: "", reason: "" });

  const { data: lock } = useQuery<any>({ queryKey: ["/api/finance/period-lock"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/finance/period-lock", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/period-lock"] }); toast({ title: "Period lock updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isLocked = !!lock?.lock_date;

  return (
    <div className="max-w-lg space-y-4">
      <Card className={isLocked ? "border-red-300" : "border-green-300"}>
        <CardContent className="p-5 flex items-center gap-4">
          {isLocked ? <Lock className="h-8 w-8 text-red-600" /> : <Unlock className="h-8 w-8 text-green-600" />}
          <div>
            <p className="font-semibold text-base">{isLocked ? "Period Locked" : "No Period Lock Active"}</p>
            {isLocked ? <><p className="text-sm text-muted-foreground">All entries before <strong>{fmtD(lock.lock_date)}</strong> are locked</p><p className="text-xs text-muted-foreground">{lock.reason && `Reason: ${lock.reason}`} {lock.locked_by && `| By: ${lock.locked_by}`}</p></> : <p className="text-sm text-muted-foreground">No restrictions on backdated entries</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">{isLocked ? "Update" : "Set"} Period Lock</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <FL label="Lock Date"><Input type="date" value={form.period_lock_date || (lock?.lock_date?.slice(0,10) || "")} onChange={e => setForm((p: any) => ({ ...p, period_lock_date: e.target.value }))} /></FL>
          <FL label="Reason"><Input value={form.reason || ""} placeholder="e.g. Q3 FY2025-26 closed" onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} /></FL>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate(form)} disabled={!form.period_lock_date || save.isPending} className="flex-1">{isLocked ? "Update Lock" : "Lock Period"}</Button>
            {isLocked && <Button variant="outline" className="text-red-600 border-red-300" onClick={() => save.mutate({ period_lock_date: null, reason: "Lock cleared" })}>Clear Lock</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── MULTI-CURRENCY TAB ────────────────────────────────────────────────────────
function MultiCurrencyTab() {
  const { toast } = useToast();
  const [rateForm, setRateForm] = useState<any>({ currency_code: "USD", rate_date: new Date().toISOString().slice(0,10) });
  const [fxForm, setFxForm] = useState<any>({ transaction_type: "purchase", foreign_currency: "USD" });

  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/finance/currency-rates"] });
  const { data: fxTxns = [] } = useQuery<any[]>({ queryKey: ["/api/finance/forex-transactions"] });

  const addRate = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/finance/currency-rates", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/currency-rates"] }); toast({ title: "Rate updated" }); } });
  const addFx = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/finance/forex-transactions", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/finance/forex-transactions"] }); setFxForm({ transaction_type: "purchase", foreign_currency: "USD" }); toast({ title: "Transaction recorded" }); } });

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Exchange Rates (vs INR)</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm mb-3">
              <thead className="text-muted-foreground text-xs"><tr>{["Currency","Name","Rate","Date"].map(h => <th key={h} className="text-left pb-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(rates as any[]).map((r: any) => <tr key={r.id} className="border-t text-xs"><td className="py-1 font-bold">{r.currency_code}</td><td className="py-1">{r.currency_name || "—"}</td><td className="py-1">₹{fmt(r.rate_to_inr)}</td><td className="py-1">{fmtD(r.rate_date)}</td></tr>)}</tbody>
            </table>
            <div className="grid grid-cols-3 gap-2">
              <FL label="Currency"><Input value={rateForm.currency_code} onChange={e => setRateForm((p: any) => ({ ...p, currency_code: e.target.value.toUpperCase() }))} maxLength={3} /></FL>
              <FL label="Rate (INR)"><Input type="number" step="0.0001" value={rateForm.rate_to_inr || ""} onChange={e => setRateForm((p: any) => ({ ...p, rate_to_inr: e.target.value }))} /></FL>
              <FL label="Date"><Input type="date" value={rateForm.rate_date} onChange={e => setRateForm((p: any) => ({ ...p, rate_date: e.target.value }))} /></FL>
            </div>
            <Button size="sm" className="mt-2" onClick={() => addRate.mutate(rateForm)} disabled={!rateForm.rate_to_inr}>Update Rate</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Record Forex Transaction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FL label="Type"><Select value={fxForm.transaction_type} onValueChange={v => setFxForm((p: any) => ({ ...p, transaction_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["purchase","sale","remittance","receipt"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL>
              <FL label="Currency"><Select value={fxForm.foreign_currency} onValueChange={v => setFxForm((p: any) => ({ ...p, foreign_currency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD","EUR","GBP","AED","SGD"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FL>
              <FL label="Foreign Amount"><Input type="number" value={fxForm.foreign_amount || ""} onChange={e => { const fa = e.target.value; const rate = (rates as any[]).find(r => r.currency_code === fxForm.foreign_currency)?.rate_to_inr || 0; setFxForm((p: any) => ({ ...p, foreign_amount: fa, inr_amount: Math.round(Number(fa) * Number(rate) * 100)/100, exchange_rate: rate })); }} /></FL>
              <FL label="Exchange Rate"><Input type="number" step="0.0001" value={fxForm.exchange_rate || ""} onChange={e => setFxForm((p: any) => ({ ...p, exchange_rate: e.target.value }))} /></FL>
              <FL label="INR Amount" full><Input type="number" value={fxForm.inr_amount || ""} onChange={e => setFxForm((p: any) => ({ ...p, inr_amount: e.target.value }))} /></FL>
            </div>
            <Button size="sm" onClick={() => addFx.mutate(fxForm)} disabled={!fxForm.foreign_amount}>Record</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Forex Transactions</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground"><tr>{["Type","Currency","Forex Amount","Rate","INR Amount","Gain/Loss","Date"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(fxTxns as any[]).map((t: any) => <tr key={t.id} className="border-t"><td className="px-2 py-1">{t.transaction_type}</td><td className="px-2 py-1 font-bold">{t.foreign_currency}</td><td className="px-2 py-1">{fmt(t.foreign_amount)}</td><td className="px-2 py-1">{t.exchange_rate}</td><td className="px-2 py-1">₹{fmt(t.inr_amount)}</td><td className={`px-2 py-1 font-bold ${Number(t.forex_gain_loss) >= 0 ? "text-green-600" : "text-red-600"}`}>{Number(t.forex_gain_loss) >= 0 ? "+" : ""}₹{fmt(t.forex_gain_loss)}</td><td className="px-2 py-1">{fmtD(t.created_at)}</td></tr>)}{fxTxns.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No transactions</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── FINANCIAL REPORTS TAB ─────────────────────────────────────────────────────
function ReportsTab() {
  const links = [
    { name: "Profit & Loss", desc: "Income and expense summary", path: "/profit-loss", icon: TrendingUp },
    { name: "Balance Sheet", desc: "Assets, liabilities & equity", path: "/balance-sheet", icon: BarChart3 },
    { name: "Trial Balance", desc: "All account debit/credit totals", path: "/trial-balance", icon: BookOpen },
    { name: "Cash Flow", desc: "Operating, investing, financing", path: "/cash-flow-statement", icon: DollarSign },
    { name: "GSTR Reports", desc: "GST outward/inward summary", path: "/gstr-reports", icon: CheckCircle },
    { name: "Day Book", desc: "Daily transaction journal", path: "/day-book", icon: BookOpen },
    { name: "Aging Report", desc: "AR/AP aging buckets", path: "/aging-report", icon: Clock },
    { name: "Income Tax", desc: "Tax computation & advance tax", path: "", icon: DollarSign },
  ];
  const { data: tax = {} as any } = useQuery<any>({ queryKey: ["/api/finance/income-tax-computation"] });

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        {links.map(r => (
          <Card key={r.name} className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => r.path && (window.location.href = r.path)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="font-semibold text-sm">{r.name}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {tax.taxableProfit != null && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Income Tax Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Taxable Profit</p><p className="font-bold text-lg">₹{fmt(tax.taxableProfit)}</p></div>
              <div><p className="text-muted-foreground text-xs">Estimated Tax (25%)</p><p className="font-bold text-lg text-red-600">₹{fmt(tax.estimatedTax)}</p></div>
              <div><p className="text-muted-foreground text-xs">TDS Credit</p><p className="font-bold text-lg text-green-600">₹{fmt(tax.tdsCredit)}</p></div>
            </div>
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-semibold mb-2">Advance Tax Schedule</p>
              <div className="flex gap-4 flex-wrap">{(tax.advanceTaxDates || []).map((d: any) => <div key={d.due} className="border rounded p-2 text-xs"><p className="text-muted-foreground">{d.due} ({d.percent}%)</p><p className="font-bold">₹{fmt(d.amount)}</p></div>)}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FinanceErpPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
        <div><h1 className="text-2xl font-bold">Finance ERP</h1><p className="text-sm text-muted-foreground">CFO dashboard · AR/AP · GST recon · TDS · Petty Cash · PDC · Multi-Currency</p></div>
      </div>
      <Tabs defaultValue="cfo">
        <TabsList className="flex-wrap h-auto">
          {[["cfo","CFO Dashboard"],["ar","AR"],["ap","AP"],["gst","GST Recon"],["tds","TDS"],["petty","Petty Cash"],["pdc","PDC Register"],["period","Period Lock"],["currency","Multi-Currency"],["reports","Reports"]].map(([val,label]) => <TabsTrigger key={val} value={val} className="text-xs">{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="cfo"><CfoDashboard /></TabsContent>
        <TabsContent value="ar"><ArTab /></TabsContent>
        <TabsContent value="ap"><ApTab /></TabsContent>
        <TabsContent value="gst"><GstTab /></TabsContent>
        <TabsContent value="tds"><TdsTab /></TabsContent>
        <TabsContent value="petty"><PettyCashTab /></TabsContent>
        <TabsContent value="pdc"><PdcTab /></TabsContent>
        <TabsContent value="period"><PeriodLockTab /></TabsContent>
        <TabsContent value="currency"><MultiCurrencyTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
