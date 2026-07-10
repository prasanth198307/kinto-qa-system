import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileCheck, FileX, Truck, RefreshCw, Settings, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) => (n / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, { label: string; class: string }> = {
    generated: { label: 'IRN Generated', class: 'bg-green-100 text-green-700' },
    cancelled:  { label: 'Cancelled',     class: 'bg-red-100 text-red-700' },
    pending:    { label: 'Pending',        class: 'bg-yellow-100 text-yellow-700' },
  };
  const cfg = s[status] || { label: status, class: 'bg-gray-100 text-gray-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>{cfg.label}</span>;
}

function GenerateIRNDialog({ invoiceId, invoiceNumber, open, onClose }: any) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/einvoice/generate/${invoiceId}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'IRN Generated!', description: `IRN: ${data.irn}` });
        queryClient.invalidateQueries({ queryKey: ['/api/einvoice/list'] });
        onClose();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate IRN for {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Before generating IRN:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Invoice must have seller & buyer GSTIN</li>
                <li>• All items must have HSN codes</li>
                <li>• CGST/SGST/IGST must be correctly split</li>
                <li>• IRN cannot be edited after generation</li>
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</> : <><FileCheck className="h-4 w-4 mr-2" />Generate IRN</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelIRNDialog({ invoiceId, invoiceNumber, irn, open, onClose }: any) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/einvoice/cancel/${invoiceId}`, { reason, remarks }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'IRN Cancelled' });
        queryClient.invalidateQueries({ queryKey: ['/api/einvoice/list'] });
        onClose();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel IRN — {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="text-xs bg-muted rounded p-2 font-mono break-all">{irn}</div>
          <div className="space-y-1.5">
            <Label>Cancellation Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Duplicate</SelectItem>
                <SelectItem value="2">Data Entry Mistake</SelectItem>
                <SelectItem value="3">Order Cancelled</SelectItem>
                <SelectItem value="4">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={!reason || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileX className="h-4 w-4 mr-2" />}
            Cancel IRN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EWayBillDialog({ invoiceId, invoiceNumber, open, onClose }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({ transMode: '1', transId: '', transName: '', vehNo: '', vehType: 'R' });

  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/einvoice/eway-bill/${invoiceId}`, form).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'e-Way Bill Generated!', description: `EWB No: ${data.ewayBillNo}` });
        queryClient.invalidateQueries({ queryKey: ['/api/einvoice/list'] });
        onClose();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate e-Way Bill — {invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Transport Mode</Label>
            <Select value={form.transMode} onValueChange={v => setForm(f => ({ ...f, transMode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Road</SelectItem>
                <SelectItem value="2">Rail</SelectItem>
                <SelectItem value="3">Air</SelectItem>
                <SelectItem value="4">Ship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Transporter GSTIN</Label>
              <Input value={form.transId} onChange={e => setForm(f => ({ ...f, transId: e.target.value }))} placeholder="GSTIN or ID" />
            </div>
            <div className="space-y-1.5">
              <Label>Transporter Name</Label>
              <Input value={form.transName} onChange={e => setForm(f => ({ ...f, transName: e.target.value }))} placeholder="Name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vehicle Number</Label>
              <Input value={form.vehNo} onChange={e => setForm(f => ({ ...f, vehNo: e.target.value }))} placeholder="AP09AB1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Type</Label>
              <Select value={form.vehType} onValueChange={v => setForm(f => ({ ...f, vehType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="R">Regular</SelectItem>
                  <SelectItem value="O">Over Dimensional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
            Generate e-Way Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceListTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInv, setSelectedInv] = useState<any>(null);
  const [dialog, setDialog] = useState<'irn' | 'cancel' | 'ewb' | null>(null);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/einvoice/list', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await fetch(`/api/einvoice/list?${params}`, { credentials: 'include' });
      return r.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending IRN</SelectItem>
            <SelectItem value="generated">IRN Generated</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
        <span className="text-sm text-muted-foreground ml-auto">{data?.total || 0} invoices</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {(data?.data || []).map((inv: any) => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{inv.invoice_number}</span>
                      <StatusBadge status={inv.irn_status || 'pending'} />
                      {inv.eway_bill_number && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">EWB: {inv.eway_bill_number}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{inv.buyer_name} · {inv.buyer_gstin || 'No GSTIN'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : ''} · {fmt(inv.total_amount)}
                    </p>
                    {inv.irn && (
                      <p className="text-xs font-mono text-muted-foreground mt-1 truncate">IRN: {inv.irn}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {!inv.irn && (
                      <Button size="sm" onClick={() => { setSelectedInv(inv); setDialog('irn'); }}>
                        <FileCheck className="h-3.5 w-3.5 mr-1" />Generate IRN
                      </Button>
                    )}
                    {inv.irn && inv.irn_status === 'generated' && !inv.eway_bill_number && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedInv(inv); setDialog('ewb'); }}>
                        <Truck className="h-3.5 w-3.5 mr-1" />e-Way Bill
                      </Button>
                    )}
                    {inv.irn && inv.irn_status === 'generated' && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setSelectedInv(inv); setDialog('cancel'); }}>
                        <FileX className="h-3.5 w-3.5 mr-1" />Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.data?.length && (
            <div className="text-center py-10 text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No invoices found</p>
            </div>
          )}
        </div>
      )}

      {selectedInv && dialog === 'irn' && (
        <GenerateIRNDialog invoiceId={selectedInv.id} invoiceNumber={selectedInv.invoice_number} open={true} onClose={() => { setSelectedInv(null); setDialog(null); }} />
      )}
      {selectedInv && dialog === 'cancel' && (
        <CancelIRNDialog invoiceId={selectedInv.id} invoiceNumber={selectedInv.invoice_number} irn={selectedInv.irn} open={true} onClose={() => { setSelectedInv(null); setDialog(null); }} />
      )}
      {selectedInv && dialog === 'ewb' && (
        <EWayBillDialog invoiceId={selectedInv.id} invoiceNumber={selectedInv.invoice_number} open={true} onClose={() => { setSelectedInv(null); setDialog(null); }} />
      )}
    </div>
  );
}

function StatsCards() {
  const { data } = useQuery<any>({
    queryKey: ['/api/einvoice/list', 1, ''],
    queryFn: async () => {
      const r = await fetch('/api/einvoice/list?pageSize=1000', { credentials: 'include' });
      return r.json();
    },
  });

  const invoices = data?.data || [];
  const generated = invoices.filter((i: any) => i.irn_status === 'generated').length;
  const pending = invoices.filter((i: any) => !i.irn || i.irn_status === 'pending').length;
  const cancelled = invoices.filter((i: any) => i.irn_status === 'cancelled').length;
  const withEwb = invoices.filter((i: any) => i.eway_bill_number).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[
        { label: 'IRN Generated', value: generated, icon: CheckCircle2, color: 'text-green-600' },
        { label: 'Pending IRN', value: pending, icon: Clock, color: 'text-yellow-600' },
        { label: 'Cancelled', value: cancelled, icon: XCircle, color: 'text-red-600' },
        { label: 'With e-Way Bill', value: withEwb, icon: Truck, color: 'text-blue-600' },
      ].map(s => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EInvoicePage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">e-Invoice & e-Way Bill</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate IRN from NIC IRP · Cancel IRN · Generate e-Way Bill</p>
      </div>

      <StatsCards />

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><FileCheck className="h-3.5 w-3.5 mr-1.5" />Invoices</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-3.5 w-3.5 mr-1.5" />Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <InvoiceListTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NIC IRP Configuration</CardTitle>
              <CardDescription>Configure your GSP credentials for e-Invoice generation. Contact your GSP (Government Service Provider) for credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Configuration managed by Super Admin</p>
                  <p className="text-xs mt-0.5">Go to Super Admin → Settings → e-Invoice to configure NIC credentials.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Sandbox URL</p><p className="font-mono text-xs">einv-apisandbox.nic.in</p></div>
                <div><p className="text-muted-foreground">Production URL</p><p className="font-mono text-xs">einvoice1.gst.gov.in</p></div>
                <div><p className="text-muted-foreground">IRN Format</p><p className="font-mono text-xs">64-character hex string</p></div>
                <div><p className="text-muted-foreground">Cancel Window</p><p className="text-xs">Within 24 hours of generation</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
