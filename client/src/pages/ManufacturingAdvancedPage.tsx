/**
 * Manufacturing Advanced Page — BOM Explosion, MRP II, ECN
 * Route: /manufacturing-advanced
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GitBranch, Layers, ClipboardList, Settings2, PlayCircle, PlusCircle, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

function rupee(paise: number) { return `${sym}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` }

// ─── BOM Explosion Tab ────────────────────────────────────────────────────────
function BOMExplosionTab() {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [qty, setQty] = useState("1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const explode = async () => {
    if (!productId) return toast({ title: "Enter a product ID", variant: "destructive" });
    setLoading(true);
    try {
      const r = await apiRequest("GET", `/api/manufacturing/bom-explosion/${productId}?qty=${qty}`);
      setResult(r);
    } catch (e: any) {
      toast({ title: "BOM explosion failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Multi-Level BOM Explosion</CardTitle>
          <CardDescription>Recursively explode bill of materials for any finished good to see all raw material requirements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label>Product ID</Label>
              <Input className="w-32" placeholder="e.g. 101" value={productId} onChange={e => setProductId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Qty to Produce</Label>
              <Input className="w-24" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <Button onClick={explode} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Explode BOM
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.product_name} — BOM for qty {result.qty_to_produce}</CardTitle>
            <CardDescription>Total material cost: <strong>{sym}{Number(result.total_material_cost / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty/Parent</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result.bom_explosion || []).map((row: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">L{row.level}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{row.material_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{row.path}</TableCell>
                    <TableCell>{row.uom}</TableCell>
                    <TableCell className="text-right">{Number(row.qty_per_parent).toFixed(3)}</TableCell>
                    <TableCell className="text-right font-medium">{Number(row.total_qty_needed).toFixed(3)}</TableCell>
                    <TableCell className="text-right">{sym}{Number(row.cost_price / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{Number(row.total_cost / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6">
              <h4 className="font-semibold mb-2">Aggregated Requirements</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Total Qty Needed</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(result.aggregated_requirements || []).map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.material_name}</TableCell>
                      <TableCell>{row.uom}</TableCell>
                      <TableCell className="text-right">{Number(row.total_qty_needed).toFixed(3)}</TableCell>
                      <TableCell className="text-right font-medium">{sym}{Number(row.total_cost / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── MRP Tab ──────────────────────────────────────────────────────────────────
function MRPTab() {
  const { toast } = useToast();
  const [horizon, setHorizon] = useState("30");
  const [safetyStock, setSafetyStock] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const runMRP = async () => {
    setLoading(true);
    try {
      const r = await apiRequest("POST", "/api/manufacturing/mrp/run", {
        horizon_days: Number(horizon),
        include_safety_stock: safetyStock,
      });
      setResult(r);
    } catch (e: any) {
      toast({ title: "MRP run failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const commitOrders = async () => {
    if (!result?.planned_purchase_orders?.length) return;
    setCommitting(true);
    try {
      await apiRequest("POST", "/api/manufacturing/mrp/commit-planned-orders", {
        planned_orders: result.planned_purchase_orders,
      });
      toast({ title: "Planned orders committed", description: `${result.planned_purchase_orders.length} purchase requisitions created` });
    } catch (e: any) {
      toast({ title: "Commit failed", description: e.message, variant: "destructive" });
    } finally { setCommitting(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> MRP II — Material Requirements Planning</CardTitle>
          <CardDescription>Computes net material requirements from open work orders and sales orders, accounting for current stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label>Planning Horizon (days)</Label>
              <Input className="w-28" type="number" min="7" max="365" value={horizon} onChange={e => setHorizon(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <input type="checkbox" id="safety" checked={safetyStock} onChange={e => setSafetyStock(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="safety">Include Safety Stock (10%)</Label>
            </div>
            <Button onClick={runMRP} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Run MRP
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MRP Results — Horizon: {result.horizon}</CardTitle>
                <CardDescription>
                  Demand from {result.demand_sources?.work_orders} work orders + {result.demand_sources?.sales_orders} sales orders.
                  {" "}<strong>{result.summary?.materials_short}</strong> materials short of {result.summary?.total_materials} total.
                </CardDescription>
              </div>
              {result.planned_purchase_orders?.length > 0 && (
                <Button variant="outline" onClick={commitOrders} disabled={committing} className="gap-2">
                  {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Commit {result.planned_purchase_orders.length} POs
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Gross Req</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Net Req</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result.material_plan || []).map((m: any, i: number) => (
                  <TableRow key={i} className={m.net_requirement > 0 ? "bg-red-50" : ""}>
                    <TableCell className="font-medium">{m.material_name}</TableCell>
                    <TableCell>{m.uom}</TableCell>
                    <TableCell className="text-right">{Number(m.gross_requirement).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(m.on_hand).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{Number(m.net_requirement).toFixed(2)}</TableCell>
                    <TableCell>
                      {m.net_requirement > 0 ? (
                        <Badge variant="destructive" className="text-xs">Create PO</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-green-600">Sufficient</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── ECN Tab ─────────────────────────────────────────────────────────────────
function ECNTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", change_type: "bom_change", priority: "normal", reason: "", impact_analysis: "", effective_date: "" });

  const { data: ecns = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/manufacturing/ecn"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/manufacturing/ecn", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/manufacturing/ecn"] }); setShowForm(false); toast({ title: "ECN created" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/manufacturing/ecn/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/manufacturing/ecn"] }); toast({ title: "ECN approved" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const implementMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/manufacturing/ecn/${id}/implement`),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ["/api/manufacturing/ecn"] }); toast({ title: "ECN implemented", description: r.message }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const statusColor: Record<string, string> = {
    draft: "secondary", approved: "default", implemented: "outline", rejected: "destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Engineering Change Notices</h3>
          <p className="text-sm text-muted-foreground">Track design changes, BOM updates, and production process changes</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2"><PlusCircle className="h-4 w-4" /> New ECN</Button>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ECN Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecns.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No ECNs yet. Create one to track engineering changes.</TableCell></TableRow>
            )}
            {ecns.map((ecn: any) => (
              <TableRow key={ecn.id}>
                <TableCell className="font-mono text-xs">{ecn.ecn_number}</TableCell>
                <TableCell className="font-medium">{ecn.title}</TableCell>
                <TableCell className="capitalize text-xs">{(ecn.change_type || "").replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <Badge variant={ecn.priority === "critical" ? "destructive" : "outline"} className="text-xs capitalize">{ecn.priority}</Badge>
                </TableCell>
                <TableCell className="text-sm">{ecn.effective_date || "—"}</TableCell>
                <TableCell>
                  <Badge variant={(statusColor[ecn.status] || "outline") as any} className="text-xs capitalize">{ecn.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {ecn.status === "draft" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => approveMut.mutate(ecn.id)} disabled={approveMut.isPending}>
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                    )}
                    {ecn.status === "approved" && (
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => implementMut.mutate(ecn.id)} disabled={implementMut.isPending}>
                        <Settings2 className="h-3 w-3" /> Implement
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Engineering Change Notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input placeholder="e.g. Change raw material supplier for component X" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Change Type</Label>
                <Select value={form.change_type} onValueChange={v => setForm(f => ({ ...f, change_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom_change">BOM Change</SelectItem>
                    <SelectItem value="process_change">Process Change</SelectItem>
                    <SelectItem value="spec_change">Specification Change</SelectItem>
                    <SelectItem value="supplier_change">Supplier Change</SelectItem>
                    <SelectItem value="drawing_change">Drawing Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Reason for Change</Label>
              <Textarea rows={2} placeholder="Why is this change needed?" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div>
              <Label>Impact Analysis</Label>
              <Textarea rows={2} placeholder="What will be affected? Cost, quality, delivery..." value={form.impact_analysis} onChange={e => setForm(f => ({ ...f, impact_analysis: e.target.value }))} />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create ECN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cost Rollup Tab ──────────────────────────────────────────────────────────
function CostRollupTab() {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const compute = async () => {
    if (!productId) return toast({ title: "Enter a product ID", variant: "destructive" });
    setLoading(true);
    try {
      const r = await apiRequest("GET", `/api/manufacturing/cost-rollup/${productId}?qty=${qty}`);
      setResult(r);
    } catch (e: any) {
      toast({ title: "Cost rollup failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const updateStandard = async () => {
  const { currency_symbol: sym } = useTenantConfig();
    if (!productId) return;
    setUpdating(true);
    try {
      await apiRequest("POST", "/api/manufacturing/cost-rollup/update-standard", { product_ids: [Number(productId)] });
      toast({ title: "Standard cost updated successfully" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally { setUpdating(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Standard Cost Rollup</CardTitle>
          <CardDescription>Compute standard cost from BOM material costs + routing labour + overhead</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label>Product ID</Label>
              <Input className="w-32" placeholder="e.g. 101" value={productId} onChange={e => setProductId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Qty</Label>
              <Input className="w-24" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <Button onClick={compute} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Compute Cost
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{result.product_name} — Cost Rollup</CardTitle>
                <CardDescription>Qty: {result.qty}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={updateStandard} disabled={updating} className="gap-2">
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Set as Standard Cost
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Material Cost", value: result.cost_breakdown?.material_cost, color: "text-blue-600" },
                { label: "Labour Cost", value: result.cost_breakdown?.labour_cost, color: "text-orange-600" },
                { label: "Overhead Cost", value: result.cost_breakdown?.overhead_cost, color: "text-purple-600" },
                { label: "Total Standard Cost", value: result.cost_breakdown?.total_standard_cost, color: "text-green-600" },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg border">
                  <div className={`text-lg font-bold ${item.color}`}>{sym}{Number((item.value || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            {result.variance !== 0 && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${result.variance > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                <AlertTriangle className="h-4 w-4" />
                Variance from existing standard: {result.variance > 0 ? "+" : ""}{sym}{Number(Math.abs(result.variance) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                {" "}({result.variance > 0 ? "above" : "below"} current standard)
              </div>
            )}

            <h4 className="font-semibold mb-2 text-sm">Material Breakdown</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result.material_details || []).map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{m.material_name}</TableCell>
                    <TableCell>{m.uom}</TableCell>
                    <TableCell className="text-right">{Number(m.total_qty_needed).toFixed(3)}</TableCell>
                    <TableCell className="text-right">{sym}{Number(m.cost_price / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{Number(m.total_cost / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManufacturingAdvancedPage() {
  const { currency_symbol: sym } = useTenantConfig();
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Manufacturing Advanced</h1>
        <p className="text-muted-foreground text-sm">Multi-level BOM explosion · MRP II · Engineering Change Notices · Standard Costing</p>
      </div>

      <Tabs defaultValue="bom">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="bom">BOM Explosion</TabsTrigger>
          <TabsTrigger value="mrp">MRP II</TabsTrigger>
          <TabsTrigger value="ecn">ECN</TabsTrigger>
          <TabsTrigger value="cost">Cost Rollup</TabsTrigger>
        </TabsList>

        <TabsContent value="bom" className="mt-4"><BOMExplosionTab /></TabsContent>
        <TabsContent value="mrp" className="mt-4"><MRPTab /></TabsContent>
        <TabsContent value="ecn" className="mt-4"><ECNTab /></TabsContent>
        <TabsContent value="cost" className="mt-4"><CostRollupTab /></TabsContent>
      </Tabs>
    </div>
  );
}
