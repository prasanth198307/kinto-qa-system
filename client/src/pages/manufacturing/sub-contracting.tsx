import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Send, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  challan_sent: "bg-blue-100 text-blue-700",
  partially_received: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SubContractingPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [challanOpen, setChallanOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ vendorName: "", vendorGstin: "", productName: "", plannedQty: "", ratePerUnit: "", gstRate: "18", plannedReturnDate: "" });
  const [challanForm, setChallanForm] = useState({ challanType: "outward", quantitySent: "", quantityReceived: "", vehicleNumber: "" });
  const { data: vendors = [] } = useQuery({ queryKey: ["vendors-list"], queryFn: () => api("GET", "/api/vendors?limit=100").catch(() => []) });
  const { data: jwos = [], isLoading } = useQuery({ queryKey: ["job-work-orders"], queryFn: () => api("GET", "/api/manufacturing/job-work") });

  const createMut = useMutation({
    mutationFn: () => api("POST", "/api/manufacturing/job-work", form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-work-orders"] }); setOpen(false); toast({ title: "Job work order created" }); },
  });
  const challanMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof challanForm }) => api("POST", `/api/manufacturing/job-work/${id}/challan`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-work-orders"] }); setChallanOpen(null); toast({ title: "Challan created (57F)" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sub-contracting / Job Work</h1>
          <p className="text-muted-foreground text-sm">Manage job work orders and GST 57F challans</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Job Work Order</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Job Work Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Vendor / Sub-contractor</label>
                <Select onValueChange={v => { const vendor = (vendors as any[]).find((x: any) => x.id === v); if (vendor) setForm(f => ({ ...f, vendorId: v, vendorName: vendor.name })); }}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{(vendors as any[]).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(["vendorName", "vendorGstin", "productName", "plannedQty", "ratePerUnit", "plannedReturnDate"] as const).map(f => (
                <div key={f}>
                  <label className="text-sm font-medium capitalize">{f.replace(/([A-Z])/g, " $1")}</label>
                  <Input type={f === "plannedReturnDate" ? "date" : f.includes("Qty") || f.includes("Rate") ? "number" : "text"}
                    value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">GST Rate (%)</label>
                <Select value={form.gstRate} onValueChange={v => setForm(f => ({ ...f, gstRate: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["0","5","12","18","28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createMut.mutate()} disabled={!form.vendorName || !form.plannedQty || createMut.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Job Work Orders</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>JW Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Received Qty</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(jwos as any[]).length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No job work orders yet.</TableCell></TableRow>
                ) : (jwos as any[]).map((jw: any) => (
                  <TableRow key={jw.id}>
                    <TableCell className="font-mono text-sm">{jw.jw_number}</TableCell>
                    <TableCell>{jw.vendor_name || jw.vendor_display_name}</TableCell>
                    <TableCell>{jw.product_name || "—"}</TableCell>
                    <TableCell>{jw.planned_qty}</TableCell>
                    <TableCell>{jw.received_qty ?? 0}</TableCell>
                    <TableCell>{jw.total_value ? `${sym}${Number(jw.total_value).toLocaleString("en-IN")}` : "—"}</TableCell>
                    <TableCell>{jw.planned_return_date ? new Date(jw.planned_return_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                    <TableCell><Badge className={STATUS_COLOR[jw.status] || ""}>{jw.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>
                      {jw.status !== "completed" && jw.status !== "cancelled" && (
                        <Dialog open={challanOpen === jw.id} onOpenChange={v => setChallanOpen(v ? jw.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              {jw.status === "open" ? <><Send className="w-3 h-3 mr-1" />Send Challan</> : <><PackageCheck className="w-3 h-3 mr-1" />Receive</>}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader><DialogTitle>Create 57F Challan</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium">Challan Type</label>
                                <Select value={challanForm.challanType} onValueChange={v => setChallanForm(f => ({ ...f, challanType: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="outward">Outward (Send RM)</SelectItem><SelectItem value="inward">Inward (Receive FG)</SelectItem></SelectContent>
                                </Select>
                              </div>
                              {challanForm.challanType === "outward"
                                ? <div><label className="text-sm font-medium">Quantity Sent</label><Input type="number" value={challanForm.quantitySent} onChange={e => setChallanForm(f => ({ ...f, quantitySent: e.target.value }))} /></div>
                                : <div><label className="text-sm font-medium">Quantity Received</label><Input type="number" value={challanForm.quantityReceived} onChange={e => setChallanForm(f => ({ ...f, quantityReceived: e.target.value }))} /></div>
                              }
                              <div><label className="text-sm font-medium">Vehicle Number</label><Input value={challanForm.vehicleNumber} onChange={e => setChallanForm(f => ({ ...f, vehicleNumber: e.target.value }))} /></div>
                              <Button className="w-full" onClick={() => challanMut.mutate({ id: jw.id, data: challanForm })} disabled={challanMut.isPending}>Create Challan</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
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
