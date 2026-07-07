import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Download } from "lucide-react";

const DATA_SOURCES = [
  "gl_monthly","invoices_by_customer","hr_headcount","crm_pipeline",
  "pharmacy_sales","hotel_occupancy","ecommerce_channel","vertical_revenue",
];

function NewReportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", data_source: "gl_monthly", custom_sql: "" });
  const mutation = useMutation({
    mutationFn: (d: unknown) => apiRequest("POST", "/api/analytics/reports", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] }); toast({ title: "Report created" }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Report</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div>
            <Label>Data Source</Label>
            <Select value={form.data_source} onValueChange={v => setForm(p => ({ ...p, data_source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DATA_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Custom SQL (optional)</Label><Textarea value={form.custom_sql} onChange={e => setForm(p => ({ ...p, custom_sql: e.target.value }))} rows={4} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportsTab() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [reportResult, setReportResult] = useState<{ id: number; rows: Record<string, unknown>[] } | null>(null);
  const { data: reports } = useQuery({ queryKey: ["/api/analytics/reports"], queryFn: () => fetch("/api/analytics/reports").then(r => r.json()) });

  const runMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/analytics/reports/${id}/run`, {}),
    onSuccess: (d: unknown, id: number) => {
      const rows = Array.isArray(d) ? d : ((d as Record<string, unknown>)?.rows as Record<string, unknown>[]) || [];
      setReportResult({ id, rows });
      toast({ title: "Report run complete" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const arr: Record<string, unknown>[] = Array.isArray(reports) ? reports : [];
  const cols = reportResult?.rows?.length ? Object.keys(reportResult.rows[0]) : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3 w-3 mr-1" />New Report</Button>
      </div>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-muted"><tr>{["Name","Data Source",""].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead>
        <tbody>
          {arr.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No reports</td></tr>}
          {arr.map((r) => (
            <tr key={r.id as string} className="border-t">
              <td className="p-3 font-medium">{r.name as string}</td>
              <td className="p-3">{r.data_source as string}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => runMutation.mutate(r.id as number)} disabled={runMutation.isPending}>
                    <Play className="h-3 w-3 mr-1" />Run
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/api/analytics/reports/${r.id}/export?format=csv`} download><Download className="h-3 w-3 mr-1" />CSV</a>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/api/analytics/reports/${r.id}/export?format=pdf`} download><Download className="h-3 w-3 mr-1" />PDF</a>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reportResult && reportResult.rows.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted"><tr>{cols.map(c => <th key={c} className="text-left p-2 text-xs">{c}</th>)}</tr></thead>
              <tbody>
                {reportResult.rows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {cols.map(c => <td key={c} className="p-2 text-xs">{String(row[c] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showNew && <NewReportDialog open={showNew} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function KPICanvasTab() {
  const { data: canvas } = useQuery({ queryKey: ["/api/analytics/kpi/canvas"], queryFn: () => fetch("/api/analytics/kpi/canvas").then(r => r.json()) });
  const arr: Record<string, unknown>[] = Array.isArray(canvas) ? canvas : [];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {arr.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">No KPI canvas data</p>}
      {arr.map((m, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{m.metric_name as string}</div>
            <div className="text-xl font-bold mt-1">{(m.current_value as number)?.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Target: {(m.target_value as number)?.toLocaleString()}</div>
            <div className={`text-xs mt-1 font-medium ${(m.vs_target_pct as number) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {((m.vs_target_pct as number) || 0).toFixed(1)}% vs target
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AnalyticsStudioPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">BI Report Studio</h1>
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="kpi">KPI Canvas</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="kpi" className="mt-4"><KPICanvasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
