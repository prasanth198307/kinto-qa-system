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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, CheckCircle, Package } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `₹${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function SH({ title, action }: any) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

function SBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    received: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    delivered: "bg-emerald-100 text-emerald-700",
    submitted: "bg-blue-100 text-blue-700",
    hallmarked: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return <Badge className={`text-xs capitalize ${cls[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</Badge>;
}

// ── Wholesale Jobwork ─────────────────────────────────────────────────────────
export function WholesaleJobworkSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ making_charges_type: "per_gram", customer_gold_purity: "22K" });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/wholesale-jobwork"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/wholesale-jobwork/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/wholesale-jobwork", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/wholesale-jobwork"] });
      setShowForm(false); setEditing(null);
      setForm({ making_charges_type: "per_gram", customer_gold_purity: "22K" });
      toast({ title: editing ? "Updated" : "Jobwork order created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Wholesale Jobwork (Customer Gold)" action={
        <Button size="sm" data-testid="button-new-jobwork" onClick={() => { setEditing(null); setForm({ making_charges_type: "per_gram", customer_gold_purity: "22K" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Jobwork
        </Button>
      } />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.", "Customer", "Design", "Qty", "Gold Recv'd", "Fine Gold", "Making", "Status", ""].map(h =>
              <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(jobs as any[]).map((j: any) => (
              <tr key={j.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{j.jobwork_no}</td>
                <td className="px-4 py-2">
                  <p className="font-medium">{j.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{j.customer_phone}</p>
                </td>
                <td className="px-4 py-2 text-xs">{j.design_ref || "—"}</td>
                <td className="px-4 py-2 text-center">{j.qty_pieces}</td>
                <td className="px-4 py-2">{fmtWt(j.customer_gold_recv_gm)} <span className="text-xs text-muted-foreground">({j.customer_gold_purity})</span></td>
                <td className="px-4 py-2 font-medium">{fmtWt(j.fine_gold_recv_gm)}</td>
                <td className="px-4 py-2">{fmtAmt(j.making_charges)}<span className="text-xs text-muted-foreground ml-1">/{j.making_charges_type === "per_gram" ? "g" : "pc"}</span></td>
                <td className="px-4 py-2"><SBadge status={j.status} /></td>
                <td className="px-4 py-2">
                  <Button size="icon" variant="ghost" data-testid={`button-edit-jobwork-${j.id}`} onClick={() => { setEditing(j); setForm(j); setShowForm(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No wholesale jobwork orders</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Wholesale Jobwork" : "New Wholesale Jobwork Order"}</DialogTitle></DialogHeader>
          {!editing && <p className="text-xs text-muted-foreground -mt-2">Customer brings own gold; jeweller only charges making fees.</p>}
          <div className="space-y-3">
            {!editing && <>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Customer Name *"><Input data-testid="input-jobwork-customer" value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
                <FL label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
                <FL label="Design Reference"><Input value={form.design_ref || ""} onChange={e => set("design_ref", e.target.value)} placeholder="Code or description" /></FL>
                <FL label="Qty Pieces"><Input type="number" value={form.qty_pieces || 1} onChange={e => set("qty_pieces", e.target.value)} /></FL>
                <FL label="Customer Gold Received (g)"><Input data-testid="input-jobwork-gold-recv" type="number" value={form.customer_gold_recv_gm || ""} onChange={e => set("customer_gold_recv_gm", e.target.value)} /></FL>
                <FL label="Customer Gold Purity">
                  <Select value={form.customer_gold_purity || "22K"} onValueChange={v => set("customer_gold_purity", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["24K (999)","22K (916)","18K (750)","14K (585)"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </FL>
                <FL label="Making Charges">
                  <Select value={form.making_charges_type || "per_gram"} onValueChange={v => set("making_charges_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="per_gram">Per Gram</SelectItem><SelectItem value="per_piece">Per Piece</SelectItem><SelectItem value="flat">Flat Amount</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Charges Amount (₹)"><Input data-testid="input-jobwork-making-charges" type="number" value={form.making_charges || ""} onChange={e => set("making_charges", e.target.value)} /></FL>
                <FL label="Stone Setting Charges (₹)"><Input type="number" value={form.stone_setting_charges || ""} onChange={e => set("stone_setting_charges", e.target.value)} /></FL>
                <FL label="Timeline (Days)"><Input type="number" value={form.timeline_days || 10} onChange={e => set("timeline_days", e.target.value)} /></FL>
              </div>
              <FL label="Karigar">
                <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                  <SelectTrigger data-testid="select-jobwork-karigar"><SelectValue placeholder="Assign karigar" /></SelectTrigger>
                  <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
                </Select>
              </FL>
              <FL label="Gold Issued to Karigar (g)"><Input data-testid="input-jobwork-gold-issued" type="number" value={form.gold_issued_to_karigar_gm || ""} onChange={e => set("gold_issued_to_karigar_gm", e.target.value)} /></FL>
            </>}
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "received"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["received","in_progress","completed","delivered","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Finished Weight (g)"><Input type="number" value={form.finished_weight_gm || ""} onChange={e => set("finished_weight_gm", e.target.value)} /></FL>
                <FL label="Gold Balance to Return (g)"><Input type="number" value={form.customer_gold_balance_gm || ""} onChange={e => set("customer_gold_balance_gm", e.target.value)} /></FL>
                <FL label="Delivery Date"><Input type="date" value={form.delivery_date || ""} onChange={e => set("delivery_date", e.target.value)} /></FL>
              </div>
              <FL label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FL>
            </>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button data-testid="button-save-jobwork" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Hallmarking Batches ───────────────────────────────────────────────────────
export function HallmarkingBatchesSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ testing_method: "xrf", date_sent: today() });
  const { data: batches = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/hallmarking-batches"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/hallmarking-batches/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/hallmarking-batches", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/hallmarking-batches"] });
      setShowForm(false); setEditing(null); setForm({ testing_method: "xrf", date_sent: today() });
      toast({ title: "Batch saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Hallmarking Batches (BIS)" action={
        <Button size="sm" data-testid="button-new-hallmark-batch" onClick={() => { setEditing(null); setForm({ testing_method: "xrf", date_sent: today() }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Batch
        </Button>
      } />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(batches as any[]).map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-sm">{b.batch_no}</p>
                  <p className="text-xs text-muted-foreground">{b.centre_name || "Centre not set"}</p>
                </div>
                <SBadge status={b.status} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="text-muted-foreground">Items: </span>{Number(b.item_count || 0)}</div>
                <div><span className="text-muted-foreground">Method: </span>{b.testing_method?.toUpperCase()}</div>
                <div><span className="text-muted-foreground">Sent: </span>{b.date_sent || "—"}</div>
                <div><span className="text-muted-foreground">Received: </span>{b.date_received || "—"}</div>
                {b.items_passed !== null && <div><span className="text-muted-foreground">Passed: </span><span className="text-green-700">{b.items_passed}</span></div>}
                {b.items_rejected > 0 && <div><span className="text-muted-foreground">Rejected: </span><span className="text-red-600">{b.items_rejected}</span></div>}
              </div>
              <Button size="sm" variant="outline" className="w-full" data-testid={`button-edit-batch-${b.id}`} onClick={() => { setEditing(b); setForm(b); setShowForm(true); }}>
                <Pencil className="h-3 w-3 mr-1" />Update
              </Button>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No hallmarking batches yet</p>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Batch" : "New Hallmarking Batch"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Centre Name"><Input data-testid="input-batch-centre" value={form.centre_name || ""} onChange={e => set("centre_name", e.target.value)} placeholder="BIS Hallmarking Centre" /></FL>
              <FL label="BIS Licence No."><Input value={form.bis_licence_no || ""} onChange={e => set("bis_licence_no", e.target.value)} /></FL>
              <FL label="Testing Method">
                <Select value={form.testing_method || "xrf"} onValueChange={v => set("testing_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="xrf">XRF</SelectItem><SelectItem value="fire_assay">Fire Assay</SelectItem><SelectItem value="touchstone">Touchstone</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Date Sent"><Input type="date" value={form.date_sent || today()} onChange={e => set("date_sent", e.target.value)} /></FL>
              <FL label="Total Cost (₹)"><Input type="number" value={form.total_cost || ""} onChange={e => set("total_cost", e.target.value)} /></FL>
            </div>
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "submitted"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="in_testing">In Testing</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                </Select>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Date Received"><Input type="date" value={form.date_received || ""} onChange={e => set("date_received", e.target.value)} /></FL>
                <FL label="Items Passed"><Input type="number" value={form.items_passed || 0} onChange={e => set("items_passed", e.target.value)} /></FL>
                <FL label="Items Rejected"><Input type="number" value={form.items_rejected || 0} onChange={e => set("items_rejected", e.target.value)} /></FL>
                <FL label="Certificate URL"><Input value={form.certificate_url || ""} onChange={e => set("certificate_url", e.target.value)} /></FL>
              </div>
              <FL label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FL>
            </>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button data-testid="button-save-hallmark-batch" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
