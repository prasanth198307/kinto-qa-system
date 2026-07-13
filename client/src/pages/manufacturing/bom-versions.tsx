import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle, Layers, GitBranch, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });


export default function BomVersionsPage() {
  const fmt = (n: number) => `${sym}${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedProduct, setSelectedProduct] = useState("");
  const [explodeQty, setExplodeQty] = useState("1");
  const [explodeResult, setExplodeResult] = useState<any[]>([]);
  const [exploding, setExploding] = useState(false);
  const [ecnOpen, setEcnOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [ecnForm, setEcnForm] = useState({ product_id: "", description: "", reason: "", priority: "medium" });
  const [verForm, setVerForm] = useState({ product_id: "", version_no: "", effective_from: "", change_description: "", change_reason: "" });

  const { data: products = [] } = useQuery<any[]>({ queryKey: ["products-list"], queryFn: () => fetch("/api/products").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: ecns = [] } = useQuery<any[]>({ queryKey: ["mfg-ecn"], queryFn: () => fetch("/api/mrp/ecn").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: versions = [] } = useQuery<any[]>({
    queryKey: ["bom-versions", selectedProduct],
    queryFn: () => selectedProduct ? fetch(`/api/mrp/bom/${selectedProduct}/versions`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedProduct,
  });

  const createECN = useMutation({
    mutationFn: (d: any) => api("POST", "/api/mrp/ecn", d),
    onSuccess: () => { toast({ title: "ECN created" }); qc.invalidateQueries({ queryKey: ["mfg-ecn"] }); setEcnOpen(false); },
  });

  const approveECN = useMutation({
    mutationFn: (id: number) => api("POST", `/api/mrp/ecn/${id}/approve`, {}),
    onSuccess: () => { toast({ title: "ECN approved" }); qc.invalidateQueries({ queryKey: ["mfg-ecn"] }); },
  });

  const implementECN = useMutation({
    mutationFn: (id: number) => api("POST", `/api/mrp/ecn/${id}/implement`, {}),
    onSuccess: () => { toast({ title: "ECN implemented — BOM version updated" }); qc.invalidateQueries({ queryKey: ["mfg-ecn", "bom-versions"] }); },
  });

  const createVersion = useMutation({
    mutationFn: (d: any) => api("POST", "/api/mrp/bom/versions", d),
    onSuccess: () => { toast({ title: "BOM version created" }); qc.invalidateQueries({ queryKey: ["bom-versions"] }); setVersionOpen(false); },
  });

  const activateVersion = useMutation({
    mutationFn: (id: number) => api("POST", `/api/mrp/bom/${id}/activate`, {}),
    onSuccess: () => { toast({ title: "BOM version activated" }); qc.invalidateQueries({ queryKey: ["bom-versions"] }); },
  });

  const runExplode = async () => {
    if (!selectedProduct) return;
    setExploding(true);
    try {
      const data = await fetch(`/api/mrp/bom/${selectedProduct}/explode?qty=${explodeQty}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
      setExplodeResult(Array.isArray(data) ? data : data.items || []);
      toast({ title: `BOM exploded: ${Array.isArray(data) ? data.length : data.items?.length || 0} components` });
    } catch { toast({ title: "BOM explosion failed", variant: "destructive" }); }
    setExploding(false);
  };

  const ECN_STATUS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-blue-100 text-blue-700",
    implemented: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BOM Version Control + ECN</h1>
          <p className="text-sm text-muted-foreground">Multi-level BOM explosion · SAP PP-style phantom sub-assemblies · Engineering Change Notices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setVersionOpen(true)}><GitBranch className="h-3 w-3 mr-1" />New BOM Version</Button>
          <Button size="sm" onClick={() => setEcnOpen(true)}><Plus className="h-3 w-3 mr-1" />New ECN</Button>
        </div>
      </div>

      <Tabs defaultValue="explode">
        <TabsList>
          <TabsTrigger value="explode"><Layers className="h-3 w-3 mr-1" />BOM Explosion</TabsTrigger>
          <TabsTrigger value="versions">BOM Versions</TabsTrigger>
          <TabsTrigger value="ecn">Engineering Change Notices</TabsTrigger>
        </TabsList>

        <TabsContent value="explode" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label>Finished Good / Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
                    <SelectContent>{(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name || p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Label>Quantity</Label>
                  <Input type="number" value={explodeQty} onChange={e => setExplodeQty(e.target.value)} min="1" />
                </div>
                <Button onClick={runExplode} disabled={!selectedProduct || exploding}>
                  {exploding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Layers className="h-4 w-4 mr-1" />}
                  Explode BOM
                </Button>
              </div>
            </CardContent>
          </Card>

          {explodeResult.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Multi-Level BOM — {explodeResult.length} components for qty {explodeQty}</h3>
                <div className="text-sm text-muted-foreground">
                  Total Cost: {fmt(explodeResult.reduce((s, r) => s + (r.total_cost || 0), 0))}
                </div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Level</TableHead><TableHead>Component</TableHead><TableHead>Path</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty/Parent</TableHead><TableHead className="text-right">Total Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead>Phantom</TableHead></TableRow></TableHeader>
                <TableBody>
                  {explodeResult.map((r: any, i: number) => (
                    <TableRow key={i} className={r.level > 0 ? "bg-muted/20" : ""}>
                      <TableCell>
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">L{r.level ?? 0}</span>
                      </TableCell>
                      <TableCell className="font-medium" style={{ paddingLeft: `${(r.level ?? 0) * 20 + 8}px` }}>
                        {r.material_name || r.item_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{r.path}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.material_type || r.item_type || "component"}</Badge></TableCell>
                      <TableCell className="text-right">{Number(r.qty_per_parent || r.quantity || 0).toFixed(3)} {r.uom || r.unit}</TableCell>
                      <TableCell className="text-right font-semibold">{Number(r.total_qty_needed || r.qty_needed || 0).toFixed(3)}</TableCell>
                      <TableCell className="text-right">{fmt(r.cost_price || r.unit_cost || 0)}</TableCell>
                      <TableCell className="text-right">{fmt(r.total_cost || 0)}</TableCell>
                      <TableCell>{r.is_phantom || r.is_phantom ? <Badge className="text-xs bg-purple-100 text-purple-700">Phantom</Badge> : null}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/30 border-t-2">
                    <TableCell colSpan={7} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right">{fmt(explodeResult.reduce((s, r) => s + (r.total_cost || 0), 0))}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          {explodeResult.length === 0 && !exploding && (
            <p className="text-center text-muted-foreground py-8">Select a product and click "Explode BOM" to view the multi-level component tree.</p>
          )}
        </TabsContent>

        <TabsContent value="versions" className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="w-64">
              <Label>Filter by Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
                <SelectContent>{(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Effective From</TableHead><TableHead>Description</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(versions as any[]).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-bold">{v.version_no}</TableCell>
                  <TableCell>{v.effective_from ? new Date(v.effective_from).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{v.change_description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.change_reason}</TableCell>
                  <TableCell><Badge className={`text-xs ${v.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{v.is_active ? "Active" : v.status}</Badge></TableCell>
                  <TableCell>
                    {!v.is_active && <Button size="sm" variant="outline" onClick={() => activateVersion.mutate(v.id)} className="text-xs h-7">Activate</Button>}
                    {v.is_active && <Badge className="text-xs bg-green-50 text-green-600">Current</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {(versions as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Select a product to view BOM versions</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="ecn" className="space-y-3">
          <Table>
            <TableHeader><TableRow><TableHead>ECN No</TableHead><TableHead>Product</TableHead><TableHead>Description</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(ecns as any[]).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">ECN-{String(e.id).padStart(4, "0")}</TableCell>
                  <TableCell>{e.product_id}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${e.priority === "critical" ? "bg-red-100 text-red-700" : e.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-gray-100"}`}>
                      {e.priority}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge className={`text-xs ${ECN_STATUS[e.status] || ""}`}>{e.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {e.status === "draft" && <Button size="sm" variant="outline" onClick={() => approveECN.mutate(e.id)} className="text-xs h-7 text-blue-700">Approve</Button>}
                      {e.status === "approved" && <Button size="sm" variant="outline" onClick={() => implementECN.mutate(e.id)} className="text-xs h-7 text-green-700">Implement</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(ecns as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No ECNs raised</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={ecnOpen} onOpenChange={setEcnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Raise Engineering Change Notice (ECN)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Product</Label>
              <Select value={ecnForm.product_id} onValueChange={v => setEcnForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={ecnForm.priority} onValueChange={v => setEcnForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Change Description</Label><Textarea value={ecnForm.description} onChange={e => setEcnForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div><Label>Reason / Justification</Label><Textarea value={ecnForm.reason} onChange={e => setEcnForm(f => ({ ...f, reason: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEcnOpen(false)}>Cancel</Button>
            <Button onClick={() => createECN.mutate(ecnForm)} disabled={!ecnForm.product_id || !ecnForm.description || createECN.isPending}>Create ECN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create BOM Version</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Product</Label>
              <Select value={verForm.product_id} onValueChange={v => setVerForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(products as any[]).map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.product_name || p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Version No</Label><Input value={verForm.version_no} onChange={e => setVerForm(f => ({ ...f, version_no: e.target.value }))} placeholder="v2.0" /></div>
            <div><Label>Effective From</Label><Input type="date" value={verForm.effective_from} onChange={e => setVerForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Change Description</Label><Input value={verForm.change_description} onChange={e => setVerForm(f => ({ ...f, change_description: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Reason</Label><Input value={verForm.change_reason} onChange={e => setVerForm(f => ({ ...f, change_reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button onClick={() => createVersion.mutate(verForm)} disabled={!verForm.product_id || !verForm.version_no || createVersion.isPending}>Create Version</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
