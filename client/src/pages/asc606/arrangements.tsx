import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Send } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
}

function NewArrangementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ arrangement_no: "", customer_name: "", contract_date: "", total_arrangement_value: "", standard: "ASC606" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/asc606/arrangements", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/asc606/arrangements"] }); toast({ title: "Arrangement created" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Arrangement</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Arrangement No</Label><Input value={form.arrangement_no} onChange={set("arrangement_no")} /></div>
          <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={set("customer_name")} /></div>
          <div><Label>Contract Date</Label><Input type="date" value={form.contract_date} onChange={set("contract_date")} /></div>
          <div><Label>Total Value</Label><Input type="number" value={form.total_arrangement_value} onChange={set("total_arrangement_value")} /></div>
          <div className="col-span-2">
            <Label>Standard</Label>
            <Select value={form.standard} onValueChange={v => setForm(p => ({ ...p, standard: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC606">ASC 606</SelectItem>
                <SelectItem value="IFRS15">IFRS 15</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPOBDialog({ arrangementId, open, onClose }: { arrangementId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", pob_type: "", standalone_selling_price: "", recognition_method: "straight_line", start_date: "", end_date: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const mutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/asc606/arrangements/${arrangementId}/pobs`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/asc606/arrangements", arrangementId] }); toast({ title: "POB added" }); onClose(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Performance Obligation</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={set("name")} /></div>
          <div><Label>POB Type</Label><Input value={form.pob_type} onChange={set("pob_type")} /></div>
          <div><Label>Standalone Selling Price</Label><Input type="number" value={form.standalone_selling_price} onChange={set("standalone_selling_price")} /></div>
          <div>
            <Label>Recognition Method</Label>
            <Select value={form.recognition_method} onValueChange={v => setForm(p => ({ ...p, recognition_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="straight_line">Straight Line</SelectItem>
                <SelectItem value="percentage_complete">% Complete</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={set("start_date")} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={set("end_date")} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>Add POB</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArrangementDrawer({ arrangement, onClose }: { arrangement: any; onClose: () => void }) {
  const { toast } = useToast();
  const [showAddPOB, setShowAddPOB] = useState(false);
  const [recognizePOB, setRecognizePOB] = useState<any>(null);
  const [pctComplete, setPctComplete] = useState("");

  const { data: detail } = useQuery({
    queryKey: ["/api/asc606/arrangements", arrangement.id],
    queryFn: () => fetch(`/api/asc606/arrangements/${arrangement.id}`).then(r => r.json()),
  });

  const allocateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/asc606/arrangements/${arrangement.id}/allocate`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/asc606/arrangements", arrangement.id] }); toast({ title: "Allocation done" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recognizeMutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/asc606/pobs/${recognizePOB?.id}/recognize`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/asc606/arrangements", arrangement.id] }); toast({ title: "Revenue recognized" }); setRecognizePOB(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pobs = Array.isArray(detail?.pobs) ? detail.pobs : [];
  const history = Array.isArray(detail?.recognition_history) ? detail.recognition_history : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background shadow-xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{arrangement.arrangement_no}</h2>
            <p className="text-sm text-muted-foreground">{arrangement.customer_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <Tabs defaultValue="pobs">
          <TabsList><TabsTrigger value="pobs">Performance Obligations</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
          <TabsContent value="pobs" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAddPOB(true)}><Plus className="h-3 w-3 mr-1" /> Add POB</Button>
              <Button size="sm" variant="outline" onClick={() => allocateMutation.mutate()} disabled={allocateMutation.isPending}>Allocate</Button>
            </div>
            {pobs.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.pob_type} · {p.recognition_method}</div>
                      <div className="text-sm mt-1">Allocated: {fmt(p.allocated_price)} · {p.completion_pct ?? 0}% complete</div>
                    </div>
                    <Button size="sm" onClick={() => setRecognizePOB(p)}>Recognize</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="history">
            <table className="w-full text-sm mt-3">
              <thead className="bg-muted"><tr>{["Date","POB","Amount","Method"].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
              <tbody>
                {history.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No history</td></tr>}
                {history.map((h: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{h.recognized_date?.split("T")[0]}</td>
                    <td className="p-2">{h.pob_name}</td>
                    <td className="p-2">{fmt(h.amount)}</td>
                    <td className="p-2">{h.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
        </Tabs>
        {showAddPOB && <AddPOBDialog arrangementId={arrangement.id} open={showAddPOB} onClose={() => setShowAddPOB(false)} />}
        {recognizePOB && (
          <Dialog open={!!recognizePOB} onOpenChange={() => setRecognizePOB(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Recognize Revenue — {recognizePOB.name}</DialogTitle></DialogHeader>
              <div>
                <Label>% Complete</Label>
                <Input type="number" value={pctComplete} onChange={e => setPctComplete(e.target.value)} placeholder="0-100" />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setRecognizePOB(null)}>Cancel</Button>
                <Button onClick={() => recognizeMutation.mutate({ pct_complete: pctComplete })} disabled={recognizeMutation.isPending}><Send className="h-3 w-3 mr-1" /> Recognize</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

export default function ASC606Arrangements() {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: dashboard } = useQuery({ queryKey: ["/api/asc606/dashboard"], queryFn: () => fetch("/api/asc606/dashboard").then(r => r.json()) });
  const { data: arrangements } = useQuery({ queryKey: ["/api/asc606/arrangements"], queryFn: () => fetch("/api/asc606/arrangements").then(r => r.json()) });
  const { data: waterfall } = useQuery({ queryKey: ["/api/asc606/deferred-revenue/waterfall"], queryFn: () => fetch("/api/asc606/deferred-revenue/waterfall?months=12").then(r => r.json()) });

  const postScheduleMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/asc606/post-schedule", {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/asc606/dashboard"] }); toast({ title: "Scheduled revenue posted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const arr = Array.isArray(arrangements) ? arrangements : [];
  const wf = Array.isArray(waterfall) ? waterfall : [];

  const kpis = [
    { label: "Total Backlog", value: fmt(dashboard?.total_backlog) },
    { label: "Recognized This Month", value: fmt(dashboard?.recognized_this_month) },
    { label: "Deferred Revenue", value: fmt(dashboard?.deferred_revenue) },
    { label: "Contract Assets", value: fmt(dashboard?.contract_assets) },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ASC 606 Revenue Recognition</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => postScheduleMutation.mutate()} disabled={postScheduleMutation.isPending}>
            <Send className="h-3 w-3 mr-1" /> Post Scheduled Revenue
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3 w-3 mr-1" /> New Arrangement</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-xl font-bold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>{["Contract No","Customer","Total Value","Recognized","Deferred","Status",""].map(h => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {arr.length === 0 && <tr><td colSpan={7} className="text-center p-4 text-muted-foreground">No arrangements</td></tr>}
            {arr.map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(a)}>
                <td className="p-3 font-medium">{a.arrangement_no}</td>
                <td className="p-3">{a.customer_name}</td>
                <td className="p-3">{fmt(a.total_arrangement_value)}</td>
                <td className="p-3">{fmt(a.recognized_amount)}</td>
                <td className="p-3">{fmt(a.deferred_amount)}</td>
                <td className="p-3"><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></td>
                <td className="p-3 text-primary text-xs">View →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {wf.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Deferred Revenue Waterfall</h2>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={wf}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {showNew && <NewArrangementDialog open={showNew} onClose={() => setShowNew(false)} />}
      {selected && <ArrangementDrawer arrangement={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
