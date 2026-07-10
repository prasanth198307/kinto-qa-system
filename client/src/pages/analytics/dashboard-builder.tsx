import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, LayoutDashboard, Share2, GripVertical, X } from "lucide-react";

function NewDashboardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "" });
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/analytics/dashboards", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards"] }); toast({ title: "Dashboard created" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Dashboard</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddReportToDashboardDialog({ dashboardId, open, onClose }: { dashboardId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [reportId, setReportId] = useState("");
  const [pos, setPos] = useState({ x: "0", y: "0", w: "4", h: "3" });
  const { data: reports } = useQuery({ queryKey: ["/api/analytics/reports"], queryFn: () => fetch("/api/analytics/reports").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const arr: Record<string, unknown>[] = Array.isArray(reports) ? reports : [];
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", `/api/analytics/dashboards/${dashboardId}/add-report`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", dashboardId] }); toast({ title: "Report added" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Report to Dashboard</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Report</Label>
            <Select value={reportId} onValueChange={setReportId}>
              <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
              <SelectContent>{arr.map(r => <SelectItem key={r.id as string} value={String(r.id)}>{r.name as string}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["x","y","w","h"] as const).map(k => (
              <div key={k}><Label>{k.toUpperCase()}</Label><Input type="number" value={pos[k]} onChange={e => setPos(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ report_id: Number(reportId), position: { x: Number(pos.x), y: Number(pos.y), w: Number(pos.w), h: Number(pos.h) } })} disabled={mutation.isPending || !reportId}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardDetail({ dashboard, onClose }: { dashboard: Record<string, unknown>; onClose: () => void }) {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const dashId = dashboard.id as number;

  // Live layout state for drag-and-drop reordering
  const { data: dashDetail } = useQuery({
    queryKey: ["/api/analytics/dashboards", dashId],
    queryFn: () => fetch(`/api/analytics/dashboards/${dashId}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  const { data: widgetData } = useQuery({
    queryKey: ["/api/analytics/dashboards", dashId, "data"],
    queryFn: () => fetch(`/api/analytics/dashboards/${dashId}/data`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  const [layout, setLayout] = useState<any[] | null>(null);
  const serverLayout: any[] = Array.isArray((dashDetail as any)?.layout) ? (dashDetail as any).layout : [];
  const items = layout ?? serverLayout;
  const reportById: Record<number, any> = {};
  for (const r of ((widgetData as any)?.reports || [])) reportById[r.id] = r.data;

  const dragIdx = useRef<number | null>(null);
  const onDrop = (targetIdx: number) => {
    if (dragIdx.current === null || dragIdx.current === targetIdx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(targetIdx, 0, moved);
    setLayout(next);
    dragIdx.current = null;
  };
  const removeWidget = (idx: number) => setLayout(items.filter((_, i) => i !== idx));

  const saveLayout = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/analytics/dashboards/${dashId}/layout`, { layout: items }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", dashId] }); setLayout(null); toast({ title: "Layout saved" }); },
  });
  const shareMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/analytics/dashboards/${dashId}/share`, { method: "POST", headers: { "Content-Type": "application/json" } });
      return r.json();
    },
    onSuccess: (d: any) => {
      navigator.clipboard?.writeText(d.share_url).catch(() => {});
      toast({ title: "Public link copied to clipboard", description: `Expires ${String(d.expires_at).slice(0, 10)} — anyone with the link can view (read-only).` });
    },
  });
  const revokeMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/analytics/dashboards/${dashId}/share`),
    onSuccess: () => toast({ title: "Share link revoked" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-background shadow-xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{dashboard.name as string}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => shareMut.mutate()} disabled={shareMut.isPending}><Share2 className="h-3 w-3 mr-1" />Share</Button>
            <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate()}>Revoke Link</Button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3 w-3 mr-1" />Add Report</Button>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Drag widgets to reorder{layout ? " — unsaved changes" : ""}</p>
        {layout && (
          <Button size="sm" className="mb-3" onClick={() => saveLayout.mutate()} disabled={saveLayout.isPending}>
            {saveLayout.isPending ? "Saving..." : "Save Layout"}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-4">
          {items.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No widgets yet — click Add Report</p>}
          {items.map((w: any, i: number) => {
            const data = reportById[w.report_id];
            return (
              <Card
                key={`${w.report_id}-${i}`}
                draggable
                onDragStart={() => { dragIdx.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className="cursor-grab active:cursor-grabbing border-dashed hover:border-primary"
              >
                <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm flex items-center gap-1"><GripVertical className="h-3 w-3 text-muted-foreground" />Report #{w.report_id}</CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeWidget(i)}><X className="h-3 w-3" /></Button>
                </CardHeader>
                <CardContent className="p-3">
                  {data?.error ? (
                    <div className="text-xs text-red-600">{data.error}</div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground mb-1">{data?.rows?.length ?? 0} rows · {(data?.columns || []).join(", ").slice(0, 60)}</div>
                      {(data?.rows || []).slice(0, 3).map((row: any, ri: number) => (
                        <div key={ri} className="text-xs font-mono truncate">{Object.values(row).slice(0, 4).join(" · ")}</div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {showAdd && <AddReportToDashboardDialog dashboardId={dashId} open={showAdd} onClose={() => setShowAdd(false)} />}
      </div>
    </div>
  );
}

export default function DashboardBuilderPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const { data: dashboards } = useQuery({ queryKey: ["/api/analytics/dashboards"], queryFn: () => fetch("/api/analytics/dashboards").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const arr: Record<string, unknown>[] = Array.isArray(dashboards) ? dashboards : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Builder</h1>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3 w-3 mr-1" />New Dashboard</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {arr.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">No dashboards yet</p>}
        {arr.map((d) => (
          <Card key={d.id as string} className="cursor-pointer hover:border-primary" onClick={() => setSelected(d)}>
            <CardContent className="p-4 flex items-center gap-3">
              <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
              <div>
                <div className="font-medium">{d.name as string}</div>
                <div className="text-xs text-muted-foreground">{d.description as string}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showNew && <NewDashboardDialog open={showNew} onClose={() => setShowNew(false)} />}
      {selected && <DashboardDetail dashboard={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
