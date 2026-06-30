import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, CheckCircle, Pause } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type WO = { id: number; wo_no: string; product: string; planned_qty: number; start_date: string; end_date: string; status: string };

const MOCK_WOS: WO[] = [
  { id: 1, wo_no: "WO-2026-001", product: "Water Purifier X1", planned_qty: 50, start_date: "2026-07-01", end_date: "2026-07-10", status: "Planned" },
  { id: 2, wo_no: "WO-2026-002", product: "Filter Housing Assembly", planned_qty: 50, start_date: "2026-06-28", end_date: "2026-07-05", status: "In Progress" },
  { id: 3, wo_no: "WO-2026-003", product: "Water Purifier Pro", planned_qty: 30, start_date: "2026-07-05", end_date: "2026-07-15", status: "Planned" },
  { id: 4, wo_no: "WO-2026-004", product: "UV Module", planned_qty: 80, start_date: "2026-06-20", end_date: "2026-06-30", status: "Completed" },
];

const STATUS_COLS = ["Planned", "In Progress", "On Hold", "Completed"];
const STATUS_COLOR: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Planned: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "On Hold": "destructive",
};

const EMPTY_WO = { product: "", planned_qty: "", start_date: "", end_date: "" };

export default function WorkOrdersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_WO });
  const [view, setView] = useState<"list" | "kanban">("list");
  const [qcDialog, setQCDialog] = useState<WO | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [rejQty, setRejQty] = useState("");

  const { data: wos = [] } = useQuery({ queryKey: ["work-orders"], queryFn: () => api("GET", "/api/manufacturing/work-orders") });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/manufacturing/work-orders", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-orders"] }); setOpen(false); setForm({ ...EMPTY_WO }); },
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/manufacturing/work-orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });

  const rows: WO[] = (Array.isArray(wos) && wos.length ? wos : MOCK_WOS) as WO[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Floor / Work Orders</h1>
          <p className="text-muted-foreground">Manage production work orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "list" ? "kanban" : "list")}>
            {view === "list" ? "Kanban View" : "List View"}
          </Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
        </div>
      </div>

      {view === "list" ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO No</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-mono">{wo.wo_no}</TableCell>
                    <TableCell>{wo.product}</TableCell>
                    <TableCell>{wo.planned_qty}</TableCell>
                    <TableCell>{wo.start_date}</TableCell>
                    <TableCell>{wo.end_date}</TableCell>
                    <TableCell><Badge variant={STATUS_COLOR[wo.status] || "outline"}>{wo.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {wo.status === "Planned" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatusMut.mutate({ id: wo.id, status: "In Progress" })}>
                            <Play className="h-3 w-3 mr-1" />Start
                          </Button>
                        )}
                        {wo.status === "In Progress" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatusMut.mutate({ id: wo.id, status: "On Hold" })}>
                              <Pause className="h-3 w-3 mr-1" />Pause
                            </Button>
                            <Button size="sm" onClick={() => setQCDialog(wo)}>
                              <CheckCircle className="h-3 w-3 mr-1" />Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLS.map(col => (
            <div key={col}>
              <div className="font-medium text-sm mb-2 text-muted-foreground">{col} ({rows.filter(w => w.status === col).length})</div>
              <div className="space-y-2">
                {rows.filter(w => w.status === col).map(wo => (
                  <Card key={wo.id} className="p-3 cursor-pointer">
                    <p className="font-mono text-xs text-muted-foreground">{wo.wo_no}</p>
                    <p className="font-medium text-sm mt-1">{wo.product}</p>
                    <p className="text-xs text-muted-foreground">Qty: {wo.planned_qty}</p>
                    <p className="text-xs text-muted-foreground">{wo.start_date} → {wo.end_date}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["product", "planned_qty", "start_date", "end_date"] as const).map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input
                  type={f.includes("date") ? "date" : f === "planned_qty" ? "number" : "text"}
                  value={form[f]}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qcDialog} onOpenChange={() => setQCDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>QC Check — {qcDialog?.product}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Actual Qty Produced</label>
              <Input type="number" value={actualQty} onChange={e => setActualQty(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rejection Qty</label>
              <Input type="number" value={rejQty} onChange={e => setRejQty(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">Good Qty: {Math.max(0, Number(actualQty) - Number(rejQty))}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQCDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (qcDialog) updateStatusMut.mutate({ id: qcDialog.id, status: "Completed" });
              setQCDialog(null);
            }}>Approve & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
