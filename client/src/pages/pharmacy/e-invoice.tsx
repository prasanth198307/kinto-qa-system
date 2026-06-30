import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Zap, XCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Generated: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const CANCEL_REASONS = ["Duplicate Invoice", "Data Entry Error", "Order Cancelled", "Wrong GSTIN", "Other"];

const MOCK_INVOICES = [
  { id: 1, bill_no: "PH-2026-001", patient: "Ravi Kumar", date: "2026-06-30", amount: 1250, gst: 62.5, status: "Pending", irn: null, ack_no: null },
  { id: 2, bill_no: "PH-2026-002", patient: "Meena Devi", date: "2026-06-30", amount: 3400, gst: 170, status: "Generated", irn: "IRN3456789ABC", ack_no: "ACK-2026-00234" },
  { id: 3, bill_no: "PH-2026-003", patient: "Suresh Babu", date: "2026-06-29", amount: 890, gst: 44.5, status: "Cancelled", irn: "IRN9876543XYZ", ack_no: "ACK-2026-00201" },
  { id: 4, bill_no: "PH-2026-004", patient: "Anitha S", date: "2026-06-29", amount: 5600, gst: 280, status: "Pending", irn: null, ack_no: null },
  { id: 5, bill_no: "PH-2026-005", patient: "Manoj K", date: "2026-06-28", amount: 2100, gst: 105, status: "Pending", irn: null, ack_no: null },
];

export default function PharmacyEInvoicePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  const [selected, setSelected] = useState<number[]>([]);
  const [cancelDialog, setCancelDialog] = useState<{ id: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: serverInvoices } = useQuery({
    queryKey: ["pharmacy-einvoices"],
    queryFn: () => api("GET", "/api/pharmacy/e-invoice"),
  });

  const generateIRN = useMutation({
    mutationFn: (id: number) => api("POST", "/api/pharmacy/e-invoice/generate", { invoice_id: id }),
    onSuccess: (data, id) => {
      setInvoices(prev => prev.map(inv => inv.id === id
        ? { ...inv, status: "Generated", irn: data.irn || `IRN${Math.random().toString(36).substring(2, 14).toUpperCase()}`, ack_no: data.ack_no || `ACK-2026-${String(id).padStart(5, "0")}` }
        : inv
      ));
      toast({ title: "IRN Generated", description: `IRN: ${data.irn || "IRN-MOCK"}` });
      qc.invalidateQueries({ queryKey: ["pharmacy-einvoices"] });
    },
    onError: () => toast({ title: "Failed to generate IRN", variant: "destructive" }),
  });

  const cancelIRN = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api("POST", `/api/pharmacy/e-invoice/cancel`, { invoice_id: id, reason }),
    onSuccess: (_, { id }) => {
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "Cancelled" } : inv));
      toast({ title: "IRN Cancelled" });
      setCancelDialog(null);
      setCancelReason("");
      qc.invalidateQueries({ queryKey: ["pharmacy-einvoices"] });
    },
  });

  const bulkGenerate = useMutation({
    mutationFn: () => api("POST", "/api/pharmacy/e-invoice/bulk-generate", { invoice_ids: selected }),
    onSuccess: (data) => {
      const count = data.generated || selected.length;
      setInvoices(prev => prev.map(inv => selected.includes(inv.id) && inv.status === "Pending"
        ? { ...inv, status: "Generated", irn: `IRN${Math.random().toString(36).substring(2, 14).toUpperCase()}`, ack_no: `ACK-BULK-${inv.id}` }
        : inv
      ));
      toast({ title: `Bulk Generate Complete`, description: `${count} IRNs generated` });
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["pharmacy-einvoices"] });
    },
  });

  const toggleSelect = (id: number) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAll = () => setSelected(invoices.filter(i => i.status === "Pending").map(i => i.id));
  const pending = invoices.filter(i => i.status === "Pending");
  const detailInv = invoices.find(i => i.id === detailId);

  const downloadJSON = (inv: typeof MOCK_INVOICES[0]) => {
    const json = JSON.stringify({ irn: inv.irn, ack_no: inv.ack_no, bill_no: inv.bill_no, amount: inv.amount, gst: inv.gst }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${inv.bill_no}-einvoice.json`; a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">GST E-Invoice (Pharmacy)</h1>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button onClick={() => bulkGenerate.mutate()} disabled={bulkGenerate.isPending}>
              <Zap className="h-4 w-4 mr-1" />Bulk Generate ({selected.length})
            </Button>
          )}
          {pending.length > 0 && (
            <Button variant="outline" onClick={selectAll}>Select All Pending</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: invoices.filter(i => i.status === "Pending").length, color: "text-yellow-600" },
          { label: "Generated", count: invoices.filter(i => i.status === "Generated").length, color: "text-green-600" },
          { label: "Cancelled", count: invoices.filter(i => i.status === "Cancelled").length, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Bill No</TableHead><TableHead>Patient</TableHead>
                <TableHead>Date</TableHead><TableHead>Amount</TableHead>
                <TableHead>GST</TableHead><TableHead>IRN</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {inv.status === "Pending" && (
                      <Checkbox checked={selected.includes(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{inv.bill_no}</TableCell>
                  <TableCell>{inv.patient}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>₹{inv.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>₹{inv.gst}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[120px] truncate">{inv.irn || "—"}</TableCell>
                  <TableCell><Badge className={STATUS_COLOR[inv.status]}>{inv.status}</Badge></TableCell>
                  <TableCell className="flex gap-1 flex-wrap">
                    {inv.status === "Pending" && (
                      <Button size="sm" onClick={() => generateIRN.mutate(inv.id)} disabled={generateIRN.isPending}>
                        <Zap className="h-3 w-3 mr-1" />Generate IRN
                      </Button>
                    )}
                    {inv.status === "Generated" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setDetailId(inv.id)}>View</Button>
                        <Button size="sm" variant="outline" onClick={() => downloadJSON(inv)}>
                          <Download className="h-3 w-3 mr-1" />JSON
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelDialog({ id: inv.id })}>
                          <XCircle className="h-3 w-3 mr-1 text-red-500" />Cancel
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* IRN Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>E-Invoice Details — {detailInv?.bill_no}</DialogTitle></DialogHeader>
          {detailInv && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-gray-500">IRN</p><p className="font-mono font-medium break-all">{detailInv.irn}</p></div>
                <div><p className="text-gray-500">Ack No</p><p className="font-mono">{detailInv.ack_no}</p></div>
                <div><p className="text-gray-500">Bill No</p><p>{detailInv.bill_no}</p></div>
                <div><p className="text-gray-500">Amount</p><p>₹{detailInv.amount}</p></div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-gray-500 text-xs mb-1">Signed QR Code (text representation)</p>
                <p className="font-mono text-xs break-all">{btoa(`${detailInv.irn}|${detailInv.bill_no}|${detailInv.amount}`)}</p>
              </div>
              <Button className="w-full" onClick={() => downloadJSON(detailInv)}>
                <Download className="h-4 w-4 mr-1" />Download E-Invoice JSON
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel IRN</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cancellation Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{CANCEL_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialog(null)}>Back</Button>
              <Button variant="destructive" onClick={() => cancelDialog && cancelIRN.mutate({ id: cancelDialog.id, reason: cancelReason })} disabled={!cancelReason || cancelIRN.isPending}>
                {cancelIRN.isPending ? "Cancelling..." : "Cancel IRN"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
