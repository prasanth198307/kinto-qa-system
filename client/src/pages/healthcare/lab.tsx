import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FlaskConical, Plus, CheckCircle, FileText } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json())
    .catch(() => null);

const priorityColor: Record<string, string> = { routine: "secondary", urgent: "default", stat: "destructive" };

export default function LabPage() {
  const qc = useQueryClient();
  const [orderOpen, setOrderOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState<number | null>(null);
  const [resultOpen, setResultOpen] = useState<number | null>(null);

  const [orderForm, setOrderForm] = useState({ patient_id: "", test_name: "", ordered_by: "", priority: "routine" });
  const [collectForm, setCollectForm] = useState({ barcode: "", sample_id: "" });
  const [resultForm, setResultForm] = useState({ result_value: "", unit: "", normal_range: "", interpretation: "normal" });

  const { data: orders } = useQuery({ queryKey: ["lab-orders"], queryFn: () => api("GET", "/api/healthcare/lab/orders/pending") });
  const { data: tests } = useQuery({ queryKey: ["lab-tests"], queryFn: () => api("GET", "/api/healthcare/lab/tests") });

  const addOrder = useMutation({
    mutationFn: (body: any) => api("POST", "/api/healthcare/lab/orders", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-orders"] }); setOrderOpen(false); setOrderForm({ patient_id: "", test_name: "", ordered_by: "", priority: "routine" }); },
  });

  const collectSample = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api("PUT", `/api/healthcare/lab/orders/${id}/collect`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-orders"] }); setCollectOpen(null); },
  });

  const enterResult = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api("PUT", `/api/healthcare/lab/orders/${id}/result`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lab-orders"] }); setResultOpen(null); },
  });

  const pending = Array.isArray(orders) ? orders : [];
  const readyCount = pending.filter((o: any) => o.result_value).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Lab Management</h1>
          {readyCount > 0 && <Badge variant="destructive">{readyCount} Ready</Badge>}
        </div>
        <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />New Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Lab Order</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><Label>Patient ID</Label><Input value={orderForm.patient_id} onChange={(e) => setOrderForm({ ...orderForm, patient_id: e.target.value })} /></div>
              <div>
                <Label>Test Name</Label>
                <Select value={orderForm.test_name} onValueChange={(v) => setOrderForm({ ...orderForm, test_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
                  <SelectContent>
                    {Array.isArray(tests) ? tests.map((t: any) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>) : null}
                    <SelectItem value="CBC">CBC</SelectItem>
                    <SelectItem value="LFT">LFT</SelectItem>
                    <SelectItem value="KFT">KFT</SelectItem>
                    <SelectItem value="Blood Sugar">Blood Sugar</SelectItem>
                    <SelectItem value="Urine R/E">Urine R/E</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ordered By</Label><Input value={orderForm.ordered_by} onChange={(e) => setOrderForm({ ...orderForm, ordered_by: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <Select value={orderForm.priority} onValueChange={(v) => setOrderForm({ ...orderForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => addOrder.mutate(orderForm)} disabled={addOrder.isPending}>Submit Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending Lab Orders</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending orders.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Ordered By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Ordered At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.patient_name ?? o.patient_id}</TableCell>
                    <TableCell>{o.test_name}</TableCell>
                    <TableCell>{o.ordered_by}</TableCell>
                    <TableCell><Badge variant={priorityColor[o.priority] as any ?? "secondary"}>{o.priority}</Badge></TableCell>
                    <TableCell>{o.sample_collected ? <CheckCircle className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground text-xs">Pending</span>}</TableCell>
                    <TableCell className="text-xs">{o.ordered_at ? new Date(o.ordered_at).toLocaleString() : "-"}</TableCell>
                    <TableCell className="flex gap-1">
                      {!o.sample_collected && (
                        <Dialog open={collectOpen === o.id} onOpenChange={(v) => setCollectOpen(v ? o.id : null)}>
                          <DialogTrigger asChild><Button size="sm" variant="outline">Collect</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Sample Collection</DialogTitle></DialogHeader>
                            <div className="space-y-4 mt-2">
                              <div><Label>Barcode</Label><Input value={collectForm.barcode} onChange={(e) => setCollectForm({ ...collectForm, barcode: e.target.value })} /></div>
                              <div><Label>Sample ID</Label><Input value={collectForm.sample_id} onChange={(e) => setCollectForm({ ...collectForm, sample_id: e.target.value })} /></div>
                              <Button className="w-full" onClick={() => collectSample.mutate({ id: o.id, body: collectForm })}>Mark Collected</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {o.sample_collected && !o.result_value && (
                        <Dialog open={resultOpen === o.id} onOpenChange={(v) => setResultOpen(v ? o.id : null)}>
                          <DialogTrigger asChild><Button size="sm"><FileText className="h-3 w-3 mr-1" />Result</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Enter Result — {o.test_name}</DialogTitle></DialogHeader>
                            <div className="space-y-4 mt-2">
                              <div><Label>Result Value</Label><Input value={resultForm.result_value} onChange={(e) => setResultForm({ ...resultForm, result_value: e.target.value })} /></div>
                              <div><Label>Unit</Label><Input value={resultForm.unit} onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })} /></div>
                              <div><Label>Normal Range</Label><Input value={resultForm.normal_range} onChange={(e) => setResultForm({ ...resultForm, normal_range: e.target.value })} /></div>
                              <div>
                                <Label>Interpretation</Label>
                                <Select value={resultForm.interpretation} onValueChange={(v) => setResultForm({ ...resultForm, interpretation: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="abnormal">Abnormal</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button className="w-full" onClick={() => enterResult.mutate({ id: o.id, body: resultForm })}>Save Result</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {o.result_value && <Badge variant="outline" className="text-green-600 border-green-600">Report Ready</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
