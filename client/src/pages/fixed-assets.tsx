import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { Plus, Trash2, Package, CheckCircle, ChevronRight, Pencil } from "lucide-react";

const ASSET_CATEGORIES = ["Land & Building", "Plant & Machinery", "Furniture & Fixtures", "Vehicles", "Office Equipment", "Computers & IT", "Electrical Fittings", "Tools & Equipment", "Intangible Assets", "Other"];
const DEP_METHODS = [{ value: "straight_line", label: "Straight Line (SLM)" }, { value: "written_down_value", label: "Written Down Value (WDV)" }];
const STATUS_COLORS: Record<string, string> = { active: "default", disposed: "secondary", scrapped: "destructive", under_maintenance: "secondary" };

function AssetForm({ asset, onSave, onCancel }: any) {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const [form, setForm] = useState({
    name: asset?.name || "", assetCode: asset?.asset_code || "", category: asset?.category || "",
    purchaseDate: asset?.purchase_date?.split("T")[0] || "", purchaseCost: asset?.purchase_cost || "",
    usefulLifeMonths: asset?.useful_life_months || "", salvageValue: asset?.salvage_value || "0",
    depreciationMethod: asset?.depreciation_method || "straight_line",
    location: asset?.location || "", vendorName: asset?.vendor_name || "", invoiceRef: asset?.invoice_ref || "",
    status: asset?.status || "active",
  });

  const mutation = useMutation({
    mutationFn: (d: any) => asset
      ? apiRequest("PUT", `/api/assets/fixed-assets/${asset.id}`, d)
      : apiRequest("POST", "/api/assets/fixed-assets", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets/fixed-assets"] });
      toast({ title: asset ? "Asset updated" : "Asset added and depreciation schedule generated" });
      onSave();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const depAmount = form.purchaseCost && form.usefulLifeMonths
    ? ((Number(form.purchaseCost) - Number(form.salvageValue || 0)) / Number(form.usefulLifeMonths)).toFixed(2)
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>Asset Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} data-testid="input-asset-name" /></div>
        <div><Label>Asset Code</Label><Input value={form.assetCode} onChange={e => setForm(p => ({ ...p, assetCode: e.target.value }))} placeholder="e.g. FA-001" /></div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
        <div><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} /></div>
        <div><Label>Purchase Cost</Label><Input type="number" value={form.purchaseCost} onChange={e => setForm(p => ({ ...p, purchaseCost: e.target.value }))} /></div>
        <div><Label>Salvage / Residual Value</Label><Input type="number" value={form.salvageValue} onChange={e => setForm(p => ({ ...p, salvageValue: e.target.value }))} /></div>
        <div><Label>Useful Life (months)</Label><Input type="number" value={form.usefulLifeMonths} onChange={e => setForm(p => ({ ...p, usefulLifeMonths: e.target.value }))} /></div>
        <div>
          <Label>Depreciation Method</Label>
          <Select value={form.depreciationMethod} onValueChange={v => setForm(p => ({ ...p, depreciationMethod: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEP_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Vendor Name</Label><Input value={form.vendorName} onChange={e => setForm(p => ({ ...p, vendorName: e.target.value }))} /></div>
        <div><Label>Invoice Reference</Label><Input value={form.invoiceRef} onChange={e => setForm(p => ({ ...p, invoiceRef: e.target.value }))} /></div>
        {asset && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["active", "disposed", "scrapped", "under_maintenance"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>
      {depAmount && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          Monthly depreciation (SLM): <strong>{fmtCur(Number(depAmount), tenantConfig)}</strong>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => mutation.mutate({ ...form, purchaseCost: Number(form.purchaseCost), usefulLifeMonths: Number(form.usefulLifeMonths), salvageValue: Number(form.salvageValue || 0) })}
          disabled={mutation.isPending || !form.name} data-testid="button-save-asset">
          {mutation.isPending ? "Saving..." : asset ? "Update Asset" : "Add Asset"}
        </Button>
      </div>
    </div>
  );
}

function AssetDetail({ assetId, onBack }: { assetId: number; onBack: () => void }) {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/assets/fixed-assets", assetId] });

  const postMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/assets/asset-depreciation/${id}/post`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets/fixed-assets", assetId] }); toast({ title: "Depreciation period posted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;
  const { asset, schedule } = data || {};
  const totalDep = (schedule || []).filter((s: any) => s.posted).reduce((sum: number, s: any) => sum + Number(s.depreciation), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ChevronRight className="w-4 h-4 rotate-180" /></Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{asset?.name}</h2>
          <p className="text-sm text-muted-foreground">{asset?.category} · {asset?.asset_code || "No code"}</p>
        </div>
        <Badge variant={STATUS_COLORS[asset?.status] as any}>{asset?.status?.replace(/_/g, " ")}</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Purchase Cost", value: fmtCur(Number(asset?.purchase_cost || 0), tenantConfig) },
          { label: "Current Value", value: fmtCur(Number(asset?.current_value || 0), tenantConfig) },
          { label: "Total Depreciation Posted", value: fmtCur(totalDep, tenantConfig) },
          { label: "Useful Life", value: `${asset?.useful_life_months} months` },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Depreciation Schedule</p>
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-muted/50">
              <tr><th className="text-left p-3">Period</th><th className="text-right p-3">Opening</th><th className="text-right p-3">Depreciation</th><th className="text-right p-3">Closing</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {(schedule || []).slice(0, 24).map((s: any) => (
                <tr key={s.id} className={`border-t ${s.posted ? "opacity-60" : ""}`}>
                  <td className="p-3">{String(s.period_month).padStart(2, "0")}/{s.period_year}</td>
                  <td className="p-3 text-right">{fmtCur(Number(s.opening_value), tenantConfig)}</td>
                  <td className="p-3 text-right text-destructive">-{fmtCur(Number(s.depreciation), tenantConfig)}</td>
                  <td className="p-3 text-right font-medium">{fmtCur(Number(s.closing_value), tenantConfig)}</td>
                  <td className="p-3">
                    {s.posted ? (
                      <Badge variant="secondary" className="text-xs"><CheckCircle className="w-3 h-3 mr-1 inline" />Posted</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => postMutation.mutate(s.id)} disabled={postMutation.isPending}>Post</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(schedule || []).length > 24 && <p className="text-xs text-center p-2 text-muted-foreground">Showing first 24 months of {schedule.length}</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}

export default function FixedAssetsPage() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: assets = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/assets/fixed-assets"] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/fixed-assets/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets/fixed-assets"] }); toast({ title: "Asset removed" }); },
  });

  if (selectedId) {
    return <div className="p-4 sm:p-6"><AssetDetail assetId={selectedId} onBack={() => setSelectedId(null)} /></div>;
  }

  const filtered = statusFilter === "all" ? assets : assets.filter((a: any) => a.status === statusFilter);
  const totalCost = assets.reduce((s: number, a: any) => s + Number(a.purchase_cost || 0), 0);
  const totalCurrentValue = assets.reduce((s: number, a: any) => s + Number(a.current_value || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Fixed Assets</h1>
          <p className="text-sm text-muted-foreground">Asset register with depreciation scheduling</p>
        </div>
        <Button onClick={() => { setEditingAsset(null); setDialogOpen(true); }} data-testid="button-new-asset">
          <Plus className="w-4 h-4 mr-1" />Add Asset
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: assets.length },
          { label: "Active Assets", value: assets.filter((a: any) => a.status === "active").length },
          { label: "Gross Block", value: fmtCur(totalCost, tenantConfig) },
          { label: "Net Block", value: fmtCur(totalCurrentValue, tenantConfig) },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "active", "disposed", "scrapped", "under_maintenance"].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : s.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="text-center py-12 text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No assets found</p></div>
      ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Asset</th><th className="text-left p-3">Category</th>
                <th className="text-right p-3">Cost</th><th className="text-right p-3">Current Value</th>
                <th className="text-left p-3">Location</th><th className="text-left p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedId(a.id)} data-testid={`row-asset-${a.id}`}>
                  <td className="p-3">
                    <p className="font-medium">{a.name}</p>
                    {a.asset_code && <p className="text-xs text-muted-foreground">{a.asset_code}</p>}
                  </td>
                  <td className="p-3 text-muted-foreground">{a.category || "—"}</td>
                  <td className="p-3 text-right">{fmtCur(Number(a.purchase_cost || 0), tenantConfig)}</td>
                  <td className="p-3 text-right font-medium">{fmtCur(Number(a.current_value || 0), tenantConfig)}</td>
                  <td className="p-3 text-muted-foreground">{a.location || "—"}</td>
                  <td className="p-3"><Badge variant={STATUS_COLORS[a.status] as any} className="text-xs">{a.status?.replace(/_/g, " ")}</Badge></td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingAsset(a); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAsset ? "Edit Asset" : "Add Fixed Asset"}</DialogTitle></DialogHeader>
          <AssetForm asset={editingAsset} onSave={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
