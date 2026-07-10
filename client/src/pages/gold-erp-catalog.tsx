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
import { Plus, Share2, Eye, Pencil, Link, MessageSquare, BarChart2 } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}

// ── E-Catalog ─────────────────────────────────────────────────────────────────
export function ECatalogSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<any>(null);
  const [tab, setTab] = useState<"catalogs" | "shares" | "enquiries" | "analytics">("catalogs");
  const [shareForm, setShareForm] = useState<any>({ expires_hours: 72 });
  const [showShareForm, setShowShareForm] = useState(false);
  const [form, setForm] = useState<any>({ access_type: "link", show_prices: "hide" });
  const { data: catalogs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/catalogs"] });
  const { data: shares = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/catalogs", selectedCatalog?.id, "shares"],
    queryFn: () => selectedCatalog ? fetch(`/api/gold-erp/catalogs/${selectedCatalog.id}/shares`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedCatalog,
  });
  const { data: enquiries = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/catalog-enquiries"] });
  const { data: analytics = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/catalog-analytics"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/catalogs/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/catalogs", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/catalogs"] });
      setShowForm(false); setEditing(null); setForm({ access_type: "link", show_prices: "hide" });
      toast({ title: "Catalog saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const shareMut = useMutation({
    mutationFn: (d: any) => fetch(`/api/gold-erp/catalogs/${selectedCatalog.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/catalogs", selectedCatalog?.id, "shares"] });
      setShowShareForm(false); setShareForm({ expires_hours: 72 });
      toast({ title: "Catalog shared — link generated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active, catalog_name, show_prices }: any) => apiRequest("PUT", `/api/gold-erp/catalogs/${id}`, { catalog_name, is_active, show_prices }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/catalogs"] }),
  });

  const analyticsGroups = (analytics as any[]).reduce((acc: any, row: any) => {
    const key = row.catalog_id;
    if (!acc[key]) acc[key] = { views: 0, enquiries: 0, shares: 0 };
    if (row.event_type === "view") acc[key].views += Number(row.cnt);
    if (row.event_type === "enquiry") acc[key].enquiries += Number(row.cnt);
    if (row.event_type === "share") acc[key].shares += Number(row.cnt);
    return acc;
  }, {});

  return (
    <>
      <SH title="E-Catalog Management" action={
        <Button size="sm" onClick={() => { setEditing(null); setForm({ access_type: "link", show_prices: "hide" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Catalog
        </Button>
      } />
      <div className="flex border-b mb-4 gap-0">
        {[["catalogs","Catalogs"],["shares","Shares"],["enquiries","Enquiries"],["analytics","Analytics"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 text-sm flex items-center gap-1 ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "catalogs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(catalogs as any[]).map((c: any) => (
            <Card key={c.id} className={!c.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.catalog_name}</p>
                    <p className="text-xs text-muted-foreground">{c.brand_name || "No brand set"}</p>
                  </div>
                  <Badge className={`text-xs ${c.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "Active" : "Draft"}</Badge>
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="flex gap-3">
                    <span><span className="text-muted-foreground">Access: </span><span className="capitalize">{c.access_type}</span></span>
                    <span><span className="text-muted-foreground">Prices: </span><span className="capitalize">{c.show_prices}</span></span>
                  </div>
                  {analyticsGroups[c.id] && (
                    <div className="flex gap-3 mt-1">
                      <span><Eye className="h-3 w-3 inline mr-0.5" />{analyticsGroups[c.id].views} views</span>
                      <span><MessageSquare className="h-3 w-3 inline mr-0.5" />{analyticsGroups[c.id].enquiries} enquiries</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(c); setForm(c); setShowForm(true); }}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedCatalog(c); setShowShareForm(true); }}><Share2 className="h-3 w-3 mr-1" />Share</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleMut.mutate({ id: c.id, catalog_name: c.catalog_name, is_active: c.is_active ? 0 : 1, show_prices: c.show_prices })}>
                    {c.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {catalogs.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No catalogs created yet</p>}
        </div>
      )}

      {tab === "shares" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Select value={selectedCatalog?.id?.toString() || ""} onValueChange={v => setSelectedCatalog((catalogs as any[]).find(c => c.id.toString() === v))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select catalog" /></SelectTrigger>
              <SelectContent>{(catalogs as any[]).map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.catalog_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Customer", "Phone", "Shared By", "Share Link", "Views", "Expires", "Shared At"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {(shares as any[]).map((s: any) => (
                  <tr key={s.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2">{s.customer_name || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.customer_phone || "—"}</td>
                    <td className="px-4 py-2 text-xs">{s.shared_by || "—"}</td>
                    <td className="px-4 py-2">
                      <button className="text-blue-600 underline text-xs flex items-center gap-1" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/catalog/${s.share_token}`); toast({ title: "Link copied!" }); }}>
                        <Link className="h-3 w-3" />Copy Link
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">{s.views || 0}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{s.expires_at ? new Date(s.expires_at).toLocaleString("en-IN") : "Never"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{s.shared_at?.slice(0, 10)}</td>
                  </tr>
                ))}
                {shares.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No shares yet{selectedCatalog ? "" : " — select a catalog"}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "enquiries" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Catalog", "Customer", "Phone", "Item Interest", "Message", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(enquiries as any[]).map((e: any) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs">{e.catalog_name}</td>
                  <td className="px-4 py-2 font-medium">{e.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{e.customer_phone || "—"}</td>
                  <td className="px-4 py-2 text-xs">{e.item_code || e.item_id || "—"}</td>
                  <td className="px-4 py-2 text-xs">{e.message?.slice(0, 40) || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{e.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {enquiries.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No enquiries yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(catalogs as any[]).map((c: any) => {
              const g = analyticsGroups[c.id] || { views: 0, enquiries: 0, shares: 0 };
              return (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <p className="text-xs font-medium mb-2 truncate">{c.catalog_name}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-muted-foreground">Views</span><span className="font-semibold">{g.views}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Enquiries</span><span className="font-semibold">{g.enquiries}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Shares</span><span className="font-semibold">{g.shares}</span></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {catalogs.length === 0 && <p className="col-span-4 text-center text-muted-foreground py-8">No catalog analytics yet</p>}
          </div>
        </div>
      )}

      {/* New Catalog Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Catalog" : "New E-Catalog"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Catalog Name *"><Input value={form.catalog_name || ""} onChange={e => set("catalog_name", e.target.value)} /></FL>
            <FL label="Brand Name"><Input value={form.brand_name || ""} onChange={e => set("brand_name", e.target.value)} /></FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Access Type">
                <Select value={form.access_type || "link"} onValueChange={v => set("access_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="link">Link Only</SelectItem><SelectItem value="password">Password Protected</SelectItem><SelectItem value="public">Public</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Show Prices">
                <Select value={form.show_prices || "hide"} onValueChange={v => set("show_prices", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="hide">Hide Prices</SelectItem><SelectItem value="show">Show Prices</SelectItem><SelectItem value="on_request">On Request</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            <FL label="Watermark Text"><Input value={form.watermark_text || ""} onChange={e => set("watermark_text", e.target.value)} placeholder="Confidential — XYZ Jewellers" /></FL>
            <FL label="Footer Text"><Textarea value={form.footer_text || ""} onChange={e => set("footer_text", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save Catalog</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareForm} onOpenChange={setShowShareForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Share Catalog — {selectedCatalog?.catalog_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Customer Name"><Input value={shareForm.customer_name || ""} onChange={e => setShareForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FL>
            <FL label="Phone"><Input value={shareForm.customer_phone || ""} onChange={e => setShareForm((p: any) => ({ ...p, customer_phone: e.target.value }))} /></FL>
            <FL label="Shared By"><Input value={shareForm.shared_by || ""} onChange={e => setShareForm((p: any) => ({ ...p, shared_by: e.target.value }))} /></FL>
            <FL label="Link Expires After (hours)">
              <Select value={shareForm.expires_hours?.toString() || "72"} onValueChange={v => setShareForm((p: any) => ({ ...p, expires_hours: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="24">24 hours</SelectItem><SelectItem value="48">48 hours</SelectItem><SelectItem value="72">72 hours</SelectItem><SelectItem value="168">1 week</SelectItem><SelectItem value="0">Never</SelectItem></SelectContent>
              </Select>
            </FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowShareForm(false)}>Cancel</Button><Button onClick={() => shareMut.mutate(shareForm)} disabled={shareMut.isPending}><Share2 className="h-4 w-4 mr-1" />Generate Link</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
