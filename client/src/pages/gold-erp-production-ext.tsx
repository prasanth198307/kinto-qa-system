import { useState, useRef } from "react";
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
import { Plus, CheckCircle, AlertTriangle, RefreshCw, Pencil, Upload, Image, Clock, Check, RotateCcw, ArrowRight, X } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `₹${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FieldRow({ label, children }: any) {
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
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    alert: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return <Badge className={`text-xs capitalize ${cls[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</Badge>;
}

// ── Sketch Process ────────────────────────────────────────────────────────────
export function SketchSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: sketches = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/sketch"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/gold-erp/sketch/${editing.id}`, d) : apiRequest("POST", "/api/gold-erp/sketch", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/sketch"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Sketch saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Sketch Process" action={<Button size="sm" onClick={() => { setEditing(null); setForm({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Sketch</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order No.", "Design", "Sketch URL", "Customer Approved", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(sketches as any[]).map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.order_no}</td>
                <td className="px-4 py-2">{s.design_name || "Custom"}</td>
                <td className="px-4 py-2">{s.sketch_image_url ? <a href={s.sketch_image_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">View</a> : "—"}</td>
                <td className="px-4 py-2">{s.customer_approval ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                <td className="px-4 py-2"><SBadge status={s.status} /></td>
                <td className="px-4 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => { setEditing(s); setForm(s); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {sketches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sketch records</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Sketch" : "New Sketch Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <FieldRow label="Production Order *">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>}
            <FieldRow label="Customer Brief"><Textarea value={form.customer_brief || ""} onChange={e => set("customer_brief", e.target.value)} rows={3} /></FieldRow>
            <FieldRow label="Sketch Image URL"><Input value={form.sketch_image_url || ""} onChange={e => set("sketch_image_url", e.target.value)} placeholder="https://…" /></FieldRow>
            <FieldRow label="Design Category"><Input value={form.design_category || ""} onChange={e => set("design_category", e.target.value)} placeholder="Ring, Necklace…" /></FieldRow>
            {editing && <>
              <FieldRow label="Status">
                <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.customer_approval} onChange={e => set("customer_approval", e.target.checked ? 1 : 0)} id="capp" />
                <Label htmlFor="capp" className="text-sm">Customer Approved</Label>
              </div>
              <FieldRow label="Revision Notes"><Textarea value={form.revision_notes || ""} onChange={e => set("revision_notes", e.target.value)} rows={2} /></FieldRow>
            </>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── CAD Process ───────────────────────────────────────────────────────────────

const CAD_SOFTWARE_OPTIONS = ["RhinoGold", "Matrix", "JewelCAD", "3Design", "Other"];

// Purity factors for gold value calc
const PURITY_FACTORS: Record<string, number> = {
  "24K (999)": 0.999, "22K (916)": 0.916, "18K (750)": 0.750, "14K (585)": 0.585,
};

function CADForm({ editing, orders, onClose, onSave, isPending }: {
  editing: any; orders: any[]; onClose: () => void; onSave: (data: any, sendToCam: boolean) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<any>(editing ? { ...editing, approval_status: editing.customer_approval ? "approved" : "pending" } : { approval_status: "pending", mcx_rate: 6820, revision_count: 0 });
  const [cadFileName, setCadFileName] = useState<string>(editing?.cad_file_url || "");
  const [renderCount, setRenderCount] = useState(editing?.render_image_url ? 2 : 0);
  const cadFileRef = useRef<HTMLInputElement>(null);
  const renderFileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Auto-fill from selected production order
  const selectedOrder = orders.find((o: any) => o.id === form.production_order_id);
  const autoFill = selectedOrder ? {
    designCode: selectedOrder.design_code || selectedOrder.order_no,
    metal: `${selectedOrder.metal_type || "Gold"} / ${selectedOrder.purity || "22K"}`,
    customer: selectedOrder.customer_name || "—",
    purity: selectedOrder.purity || "22K (916)",
  } : null;

  // Live gold value calculation
  const wt = parseFloat(form.weight_estimate_gm) || 0;
  const rate = parseFloat(form.mcx_rate) || 6820;
  const purityKey = autoFill?.purity || "22K (916)";
  const purityFactor = Object.entries(PURITY_FACTORS).find(([k]) => purityKey.includes(k.split(" ")[0]))?.[1] || 0.916;
  const goldValue = wt > 0 ? Math.round(wt * rate * purityFactor) : 0;

  const approvalStatus: string = form.approval_status || "pending";
  const version = (form.revision_count || 0) + 1;
  const isApproved = approvalStatus === "approved";

  function handleOrderChange(val: string) {
    set("production_order_id", parseInt(val));
  }

  function handleCadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setCadFileName(file.name); set("cad_file_url", file.name); }
  }

  function handleRenderAdd(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) setRenderCount(c => Math.min(c + e.target.files!.length, 6));
  }

  function handleSave(sendToCam = false) {
    const data = { ...form };
    if (approvalStatus === "approved") { data.customer_approval = 1; data.status = "approved"; }
    else if (approvalStatus === "revision") { data.customer_approval = 0; data.status = "in_progress"; data.revision_count = (data.revision_count || 0) + 1; }
    else { data.customer_approval = 0; data.status = "in_progress"; }
    onSave(data, sendToCam);
  }

  return (
    <div className="flex flex-col max-h-[90dvh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-medium">{editing ? "Edit CAD Process" : "CAD Process Entry"}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#EEEDFE] text-[#3C3489] border border-[#AFA9EC]">v{version}</span>
          <span className="text-xs text-muted-foreground">auto-increments on revision</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

        {/* Production Order */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Production order <span className="text-destructive">*</span></Label>
          <Select value={form.production_order_id?.toString() || ""} onValueChange={handleOrderChange}>
            <SelectTrigger data-testid="select-cad-order"><SelectValue placeholder="Select order…" /></SelectTrigger>
            <SelectContent>
              {(orders as any[]).map((o: any) => (
                <SelectItem key={o.id} value={o.id.toString()}>
                  {o.order_no}{o.customer_name ? ` — ${o.customer_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-fill panel */}
        {autoFill && (
          <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 border px-3 py-2">
            {[["Design code", autoFill.designCode], ["Metal / purity", autoFill.metal], ["Customer", autoFill.customer]].map(([label, val]) => (
              <div key={label}>
                <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                <div className="text-sm font-medium">{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* CAD Operator + Software */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">CAD operator <span className="text-destructive">*</span></Label>
            <Input data-testid="input-cad-operator" placeholder="Operator name" value={form.cad_operator || ""} onChange={e => set("cad_operator", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">CAD software <span className="text-destructive">*</span></Label>
            <Select value={form.cad_software || ""} onValueChange={v => set("cad_software", v)}>
              <SelectTrigger data-testid="select-cad-software"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{CAD_SOFTWARE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Weight + Volume + MCX Rate */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Weight estimate (g) <span className="text-destructive">*</span></Label>
            <Input data-testid="input-weight-estimate" type="number" step="0.01" placeholder="0.00" value={form.weight_estimate_gm || ""} onChange={e => set("weight_estimate_gm", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Metal volume (cc)</Label>
            <Input data-testid="input-metal-volume" type="number" step="0.001" placeholder="0.000" value={form.metal_volume_cc || ""} onChange={e => set("metal_volume_cc", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">
              MCX rate (₹/g)
              <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 rounded">live</span>
            </Label>
            <Input data-testid="input-mcx-rate" type="number" value={form.mcx_rate || 6820} onChange={e => set("mcx_rate", e.target.value)} />
          </div>
        </div>

        {/* Live gold value */}
        {wt > 0 && (
          <div className="flex items-center justify-between rounded-md px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
            <div>
              <div className="text-xs text-amber-800 dark:text-amber-300">Estimated gold value (read-only)</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Based on MCX rate ₹{rate.toLocaleString("en-IN")}/g · {purityKey.split(" ")[0]} · today
              </div>
            </div>
            <div className="text-base font-semibold text-amber-900 dark:text-amber-200" data-testid="text-gold-value">
              ₹{goldValue.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1">CAD file &amp; renders</div>

        {/* CAD File Upload */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">CAD file upload <span className="text-destructive">*</span></Label>
          <div
            className="border border-dashed rounded-md p-3 text-center cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => cadFileRef.current?.click()}
            data-testid="upload-cad-file"
          >
            <input ref={cadFileRef} type="file" accept=".3dm,.stl,.obj" className="hidden" onChange={handleCadFileChange} />
            {cadFileName ? (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />{cadFileName}
              </div>
            ) : (
              <>
                <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">Click to upload CAD file</div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5">.3dm · .stl · .obj · max 50 MB</div>
              </>
            )}
          </div>
        </div>

        {/* Render Images */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Render images <span className="text-destructive">*</span>
            <span className="ml-1 text-muted-foreground/60">(min 4 angles)</span>
          </Label>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {Array.from({ length: renderCount }).map((_, i) => (
              <div key={i} className="h-12 w-12 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                <Image className="h-4 w-4 text-blue-500" />
              </div>
            ))}
            {renderCount < 6 && (
              <div
                className="h-12 w-12 rounded-md bg-muted border border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => renderFileRef.current?.click()}
                data-testid="upload-render-image"
              >
                <input ref={renderFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleRenderAdd} />
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground/70">Top · side · front · back angles required</div>
          {renderCount < 4 && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400">{4 - renderCount} more angle{4 - renderCount !== 1 ? "s" : ""} needed</div>
          )}
        </div>

        {/* Divider */}
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-1">Quality &amp; approval</div>

        {/* Stone Placement */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Stone placement verified</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="stone-placement"
              data-testid="check-stone-placement"
              className="h-4 w-4 cursor-pointer"
              checked={!!form.stone_placement_verified}
              onChange={e => set("stone_placement_verified", e.target.checked ? 1 : 0)}
            />
            <label htmlFor="stone-placement" className="text-sm cursor-pointer">All stones positioned as per design spec</label>
          </div>
          {!!form.stone_placement_verified && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                <Check className="h-3 w-3" /> Stone placement verified
              </span>
            </div>
          )}
        </div>

        {/* Customer Approval Status */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Customer approval status <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { val: "pending", label: "Pending", icon: <Clock className="h-3.5 w-3.5 mx-auto mb-0.5" />, active: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300" },
              { val: "approved", label: "Approved", icon: <Check className="h-3.5 w-3.5 mx-auto mb-0.5" />, active: "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-800 dark:text-green-300" },
              { val: "revision", label: "Revision requested", icon: <RotateCcw className="h-3.5 w-3.5 mx-auto mb-0.5" />, active: "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300" },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                data-testid={`status-${opt.val}`}
                onClick={() => set("approval_status", opt.val)}
                className={`border rounded-md py-1.5 px-2 text-xs text-center transition-all ${approvalStatus === opt.val ? opt.active : "border-border text-muted-foreground hover:bg-muted/50"}`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>

          {/* Revision notes (conditional) */}
          {approvalStatus === "revision" && (
            <div className="mt-2">
              <Textarea
                data-testid="textarea-revision-notes"
                placeholder="Describe what the customer wants changed…"
                value={form.revision_notes || ""}
                onChange={e => set("revision_notes", e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Approved by / on (conditional) */}
          {approvalStatus === "approved" && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Approved by</Label>
                <Input data-testid="input-approved-by" placeholder="Name" value={form.approved_by || ""} onChange={e => set("approved_by", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Approved on</Label>
                <Input data-testid="input-approved-on" type="date" value={form.approved_on || today()} onChange={e => set("approved_on", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Additional notes */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Additional notes</Label>
          <Textarea data-testid="textarea-cad-notes" placeholder="Any other observations…" value={form.design_notes || ""} onChange={e => set("design_notes", e.target.value)} rows={2} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-5 py-3 border-t shrink-0 flex-wrap">
        <span className="text-[11px] text-muted-foreground mr-auto">"Send to CAM" enabled only when status = Approved</span>
        <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cad-cancel">Cancel</Button>
        <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isPending} data-testid="button-cad-draft">Save draft</Button>
        <Button
          size="sm"
          disabled={!isApproved || isPending}
          onClick={() => handleSave(true)}
          data-testid="button-send-to-cam"
          className={isApproved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "opacity-40 cursor-not-allowed"}
        >
          <ArrowRight className="h-4 w-4 mr-1" />Send to CAM
        </Button>
      </div>
    </div>
  );
}

export function CADSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: cadList = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/cad"] });

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/gold-erp/cad/${editing.id}`, d) : apiRequest("POST", "/api/gold-erp/cad", d),
    onSuccess: (_res: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/cad"] });
      setShowForm(false);
      setEditing(null);
      const sentToCam = vars.__sendToCam;
      toast({ title: sentToCam ? "Sent to CAM" : "CAD record saved", description: sentToCam ? "CAD approved and forwarded to CAM stage." : undefined });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function handleSave(data: any, sendToCam: boolean) {
    saveMut.mutate({ ...data, __sendToCam: sendToCam });
  }

  const approvalStatusLabel: Record<string, { label: string; cls: string }> = {
    approved: { label: "Approved", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    revision: { label: "Revision", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  };

  return (
    <>
      <SH title="CAD / Design Process" action={
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} data-testid="button-add-cad">
          <Plus className="h-4 w-4 mr-1" />Add CAD
        </Button>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Order", "Operator", "Software", "Wt (g)", "Gold Value", "Rev.", "Approval", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(cadList as any[]).map((c: any) => {
              const st = c.customer_approval ? "approved" : (c.revision_notes ? "revision" : "pending");
              const statusInfo = approvalStatusLabel[st];
              return (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.order_no || `#${c.production_order_id}`}</td>
                  <td className="px-3 py-2">{c.cad_operator || "—"}</td>
                  <td className="px-3 py-2">{c.cad_software || "—"}</td>
                  <td className="px-3 py-2">{c.weight_estimate_gm ? fmtWt(c.weight_estimate_gm) : "—"}</td>
                  <td className="px-3 py-2">{c.weight_estimate_gm && c.mcx_rate ? fmtAmt(Math.round(c.weight_estimate_gm * c.mcx_rate * 0.916)) : "—"}</td>
                  <td className="px-3 py-2 text-center">{c.revision_count || 0}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-xs ${statusInfo.cls}`}>{statusInfo.label}</Badge>
                  </td>
                  <td className="px-3 py-2"><SBadge status={c.status || "in_progress"} /></td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setShowForm(true); }} data-testid={`button-edit-cad-${c.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {cadList.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No CAD records yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg p-0 max-h-[90dvh] overflow-hidden">
          <CADForm
            editing={editing}
            orders={orders}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={handleSave}
            isPending={saveMut.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Ghat Entries ──────────────────────────────────────────────────────────────
export function GhatSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ stage_name: "Casting", weigh_date: today() });
  const { data: entries = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ghat-entries"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/ghat-entries", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ghat-entries"] }); setShowForm(false); setForm({ stage_name: "Casting", weigh_date: today() }); toast({ title: "Ghat entry saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Ghat / Weight Verification" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Stage", "Issued (g)", "Received (g)", "Wastage (g)", "Wastage %", "Alert", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(entries as any[]).map((e: any) => (
              <tr key={e.id} className={`border-t hover:bg-muted/30 ${e.alert_flag ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                <td className="px-4 py-2 text-xs">{e.order_no}</td>
                <td className="px-4 py-2">{e.stage_name}</td>
                <td className="px-4 py-2">{fmtWt(e.issued_weight_gm)}</td>
                <td className="px-4 py-2">{fmtWt(e.received_weight_gm)}</td>
                <td className="px-4 py-2 font-semibold text-red-600">{fmtWt(e.wastage_gm)}</td>
                <td className="px-4 py-2">{Number(e.wastage_pct || 0).toFixed(2)}%</td>
                <td className="px-4 py-2">{e.alert_flag ? <AlertTriangle className="h-4 w-4 text-red-500" /> : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.weigh_date}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No ghat entries</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Ghat / Weight Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Stage">
              <Select value={form.stage_name || "Casting"} onValueChange={v => set("stage_name", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Sketch","CAD","CAM","Casting","Filing","Polish","Finishing","QC","Settlement"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Karigar">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Issued (g)"><Input type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Received (g)"><Input type="number" value={form.received_weight_gm || ""} onChange={e => set("received_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Assay Purity %"><Input type="number" value={form.assay_purity_pct || ""} onChange={e => set("assay_purity_pct", e.target.value)} /></FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.weigh_date || today()} onChange={e => set("weigh_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save Entry</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Settlement ────────────────────────────────────────────────────────────────
export function SettlementSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ allowable_wastage_pct: 3, settlement_date: today() });
  const { data: settlements = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/settlements"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const calcSettlement = () => {
    const issued = Number(form.gold_issued_gm || 0);
    const received = Number(form.gold_received_gm || 0);
    const actual_wastage = issued - received;
    const allowable = issued * Number(form.allowable_wastage_pct || 3) / 100;
    const excess = Math.max(0, actual_wastage - allowable);
    const rate = Number(form.gold_rate || 0);
    const excess_deduction = excess * rate;
    const wage = Number(form.wage_amount || 0);
    const net = wage - excess_deduction;
    setForm((p: any) => ({ ...p, actual_wastage_gm: actual_wastage.toFixed(3), excess_wastage_gm: excess.toFixed(3), excess_deduction: excess_deduction.toFixed(2), net_payable: net.toFixed(2) }));
  };

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/settlements", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/settlements"] }); setShowForm(false); setForm({ allowable_wastage_pct: 3, settlement_date: today() }); toast({ title: "Settlement recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Karigar Settlement" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Settlement</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Karigar", "Issued", "Received", "Excess Wastage", "Wage", "Deduction", "Net Payable", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(settlements as any[]).map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs">{s.order_no}</td>
                <td className="px-4 py-2">{s.karigar_name}</td>
                <td className="px-4 py-2">{fmtWt(s.gold_issued_gm)}</td>
                <td className="px-4 py-2">{fmtWt(s.gold_received_gm)}</td>
                <td className="px-4 py-2 text-red-600">{fmtWt(s.excess_wastage_gm)}</td>
                <td className="px-4 py-2">{fmtAmt(s.wage_amount)}</td>
                <td className="px-4 py-2 text-red-600">-{fmtAmt(s.excess_deduction)}</td>
                <td className="px-4 py-2 font-bold text-green-700">{fmtAmt(s.net_payable)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.settlement_date}</td>
              </tr>
            ))}
            {settlements.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No settlements</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Karigar Settlement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Production Order">
                <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                  <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Karigar">
                <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gold Issued (g)"><Input type="number" value={form.gold_issued_gm || ""} onChange={e => set("gold_issued_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Gold Received (g)"><Input type="number" value={form.gold_received_gm || ""} onChange={e => set("gold_received_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Allowable Wastage %"><Input type="number" value={form.allowable_wastage_pct || 3} onChange={e => set("allowable_wastage_pct", e.target.value)} /></FieldRow>
              <FieldRow label="Gold Rate (₹/g)"><Input type="number" value={form.gold_rate || ""} onChange={e => set("gold_rate", e.target.value)} /></FieldRow>
              <FieldRow label="Wage Amount (₹)"><Input type="number" value={form.wage_amount || ""} onChange={e => set("wage_amount", e.target.value)} /></FieldRow>
              <FieldRow label="Settlement Date"><Input type="date" value={form.settlement_date || today()} onChange={e => set("settlement_date", e.target.value)} /></FieldRow>
            </div>
            <Button variant="outline" className="w-full" onClick={calcSettlement}><RefreshCw className="h-4 w-4 mr-2" />Calculate Settlement</Button>
            {form.net_payable && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Actual Wastage</span><span className="text-red-600">{fmtWt(form.actual_wastage_gm)}</span></div>
                <div className="flex justify-between"><span>Excess Wastage</span><span className="text-red-600">{fmtWt(form.excess_wastage_gm)}</span></div>
                <div className="flex justify-between"><span>Wage</span><span>{fmtAmt(form.wage_amount)}</span></div>
                <div className="flex justify-between"><span>Excess Deduction</span><span className="text-red-600">-{fmtAmt(form.excess_deduction)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Net Payable</span><span className="text-green-700">{fmtAmt(form.net_payable)}</span></div>
              </div>
            )}
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Record Settlement</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Job Finalize ──────────────────────────────────────────────────────────────
export function JobFinalizeSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ finalize_date: today() });
  const { data: finalizes = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/finalize"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/finalize", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/finalize"] }); setShowForm(false); setForm({ finalize_date: today() }); toast({ title: "Job finalized — moved to stock" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Job Finalize & Barcode / HUID" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Finalize Job</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Final Wt", "HUID", "Barcode", "QC Passed", "Moved to Stock", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(finalizes as any[]).map((f: any) => (
              <tr key={f.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs">{f.order_no}</td>
                <td className="px-4 py-2">{fmtWt(f.final_weight_gm)}</td>
                <td className="px-4 py-2 font-mono text-xs text-blue-600">{f.huid_no || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{f.barcode || "—"}</td>
                <td className="px-4 py-2">{f.qc_passed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}</td>
                <td className="px-4 py-2">{f.moved_to_stock ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{f.finalize_date}</td>
              </tr>
            ))}
            {finalizes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No finalized jobs</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Finalize Production Job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Final Weight (g)"><Input type="number" value={form.final_weight_gm || ""} onChange={e => set("final_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="HUID No."><Input value={form.huid_no || ""} onChange={e => set("huid_no", e.target.value)} placeholder="Auto or manual" /></FieldRow>
              <FieldRow label="Barcode"><Input value={form.barcode || ""} onChange={e => set("barcode", e.target.value)} /></FieldRow>
              <FieldRow label="RFID Tag"><Input value={form.rfid_tag || ""} onChange={e => set("rfid_tag", e.target.value)} /></FieldRow>
              <FieldRow label="Finalize Date"><Input type="date" value={form.finalize_date || today()} onChange={e => set("finalize_date", e.target.value)} /></FieldRow>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.stone_setting_done} onChange={e => set("stone_setting_done", e.target.checked ? 1 : 0)} id="sts" /><Label htmlFor="sts" className="text-sm">Stone Setting Done</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.qc_passed} onChange={e => set("qc_passed", e.target.checked ? 1 : 0)} id="qcp" /><Label htmlFor="qcp" className="text-sm">QC Passed</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.moved_to_stock} onChange={e => set("moved_to_stock", e.target.checked ? 1 : 0)} id="mts" /><Label htmlFor="mts" className="text-sm">Move to Stock</Label></div>
            </div>
            <FieldRow label="QC Notes"><Textarea value={form.qc_notes || ""} onChange={e => set("qc_notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Finalize</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Karigar Material Ledger ───────────────────────────────────────────────────
export function KarigarLedgerSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterKarigar, setFilterKarigar] = useState("");
  const [form, setForm] = useState<any>({ txn_type: "issue", metal_type: "gold", txn_date: today() });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigar-ledger"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/karigar-ledger", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigar-ledger"] }); setShowForm(false); setForm({ txn_type: "issue", metal_type: "gold", txn_date: today() }); toast({ title: "Ledger entry saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (ledger as any[]).filter(l => !filterKarigar || l.karigar_name?.toLowerCase().includes(filterKarigar.toLowerCase()));

  return (
    <>
      <SH title="Karigar Material Ledger" action={
        <div className="flex items-center gap-2">
          <Input className="w-40" placeholder="Filter karigar…" value={filterKarigar} onChange={e => setFilterKarigar(e.target.value)} />
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Karigar", "Order", "Type", "Metal", "Weight (g)", "Date", "Notes"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{l.karigar_name}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.order_no || "—"}</td>
                <td className="px-4 py-2"><Badge className={`text-xs ${l.txn_type === "issue" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{l.txn_type}</Badge></td>
                <td className="px-4 py-2 capitalize">{l.metal_type}</td>
                <td className="px-4 py-2 font-semibold">{fmtWt(l.weight_gm)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.txn_date}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.notes || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No ledger entries</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Karigar Material Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Karigar *">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Type">
                <Select value={form.txn_type || "issue"} onValueChange={v => set("txn_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="issue">Issue</SelectItem><SelectItem value="return">Return</SelectItem><SelectItem value="wastage">Wastage</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.txn_date || today()} onChange={e => set("txn_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
