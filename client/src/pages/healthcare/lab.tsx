import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function HealthcareLabPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [resultId, setResultId] = useState<number|null>(null);
  const [form, setForm] = useState({ patient_id: "", test_name: "", ordered_by: "", priority: "routine" });
  const [result, setResult] = useState({ result_value: "", reference_range: "", interpretation: "normal" });

  const { data: orders = [] } = useQuery({ queryKey: ["/api/healthcare/lab-orders"], queryFn: () => api("GET", "/api/healthcare/lab-orders") });

  const add = useMutation({
    mutationFn: (d: any) => api("POST", "/api/healthcare/lab-orders", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab-orders"] }); setShowForm(false); toast({ title: "Lab order created" }); }
  });

  const enterResult = useMutation({
    mutationFn: ({ id, data }: any) => api("PUT", "/api/healthcare/lab-orders/" + id + "/result", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/healthcare/lab-orders"] }); setResultId(null); toast({ title: "Result entered" }); }
  });

  const INTERP_COLORS: Record<string,any> = { normal: "secondary", abnormal: "outline", critical: "destructive" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lab & Diagnostics</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Lab Order</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Lab Order</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["patient_id","Patient ID"],["test_name","Test Name"],["ordered_by","Ordered By"]].map(([k,l]) => (
              <div key={k}><label className="text-sm font-medium">{l}</label>
                <Input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="routine">Routine</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="stat">STAT</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => add.mutate(form)}>Order</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      {resultId && (
        <Card><CardHeader><CardTitle>Enter Result</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[["result_value","Result Value"],["reference_range","Reference Range"]].map(([k,l]) => (
              <div key={k}><label className="text-sm font-medium">{l}</label>
                <Input value={(result as any)[k]} onChange={e => setResult(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Interpretation</label>
              <Select value={result.interpretation} onValueChange={v => setResult(p => ({ ...p, interpretation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="abnormal">Abnormal</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => enterResult.mutate({ id: resultId, data: result })}>Save Result</Button>
              <Button variant="outline" onClick={() => setResultId(null)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Order No</TableHead><TableHead>Patient</TableHead><TableHead>Test</TableHead>
            <TableHead>Ordered By</TableHead><TableHead>Date</TableHead><TableHead>Priority</TableHead>
            <TableHead>Result</TableHead><TableHead>Ref Range</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">{o.order_no}</TableCell>
                <TableCell>{o.patient_name}</TableCell>
                <TableCell className="font-medium">{o.test_name}</TableCell>
                <TableCell>{o.ordered_by}</TableCell>
                <TableCell>{o.ordered_at ? new Date(o.ordered_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell><Badge variant={o.priority==="stat"?"destructive":o.priority==="urgent"?"outline":"secondary"}>{o.priority}</Badge></TableCell>
                <TableCell>{o.result_value || "—"}</TableCell>
                <TableCell>{o.reference_range || "—"}</TableCell>
                <TableCell>{o.interpretation && <Badge variant={INTERP_COLORS[o.interpretation]||"secondary"}>{o.interpretation}</Badge>}</TableCell>
                <TableCell>{o.status !== "completed" && <Button size="sm" variant="outline" onClick={() => setResultId(o.id)}>Enter Result</Button>}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No lab orders</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
