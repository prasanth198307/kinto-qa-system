import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Search, Package, AlertTriangle, Wrench, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import type { SparePartCatalog, SparePartEntry, SparePartIssuance } from "@shared/schema";

export default function SparePartsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedPart, setSelectedPart] = useState<SparePartCatalog | null>(null);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");

  const { data: parts = [], isLoading } = useQuery<SparePartCatalog[]>({ queryKey: ["/api/spare-parts"] });
  const { data: allIssuances = [] } = useQuery<SparePartIssuance[]>({ queryKey: ["/api/spare-part-issuances"] });
  const { data: machines = [] } = useQuery<any[]>({ queryKey: ["/api/machines"] });
  const { data: vendors = [] } = useQuery<any[]>({ queryKey: ["/api/vendors"] });

  const { data: partEntries = [], isLoading: entriesLoading } = useQuery<SparePartEntry[]>({
    queryKey: ["/api/spare-parts", selectedPart?.id, "entries"],
    queryFn: async () => {
      if (!selectedPart) return [];
      const res = await fetch(`/api/spare-parts/${selectedPart.id}/entries`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedPart,
  });

  const { data: partIssuances = [] } = useQuery<SparePartIssuance[]>({
    queryKey: ["/api/spare-parts", selectedPart?.id, "issuances"],
    queryFn: async () => {
      if (!selectedPart) return [];
      const res = await fetch(`/api/spare-parts/${selectedPart.id}/issuances`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedPart,
  });

  const [partForm, setPartForm] = useState({ partName: "", partNumber: "", category: "", machineId: "", unitPrice: "", reorderThreshold: "" });
  const [entryForm, setEntryForm] = useState({ purchaseDate: format(new Date(), "yyyy-MM-dd"), quantity: "", unitPrice: "", gstPercent: "18", vendorId: "", remarks: "" });
  const [issueForm, setIssueForm] = useState({ issueDate: format(new Date(), "yyyy-MM-dd"), quantity: "", machineId: "", purpose: "", workOrderNumber: "", remarks: "" });

  const addPartMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/spare-parts", { ...data, unitPrice: data.unitPrice ? Math.round(parseFloat(data.unitPrice) * 100) : null, reorderThreshold: data.reorderThreshold ? parseInt(data.reorderThreshold) : null });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] }); toast({ title: "Spare part added" }); setAddPartOpen(false); setPartForm({ partName: "", partNumber: "", category: "", machineId: "", unitPrice: "", reorderThreshold: "" }); },
    onError: (e: any) => toast({ title: "Failed to add part", description: e.message, variant: "destructive" }),
  });

  const addEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const qty = parseInt(data.quantity);
      const price = Math.round(parseFloat(data.unitPrice) * 100);
      const gst = parseInt(data.gstPercent || "0");
      const gstAmt = Math.round(price * qty * gst / 100);
      const res = await apiRequest("POST", `/api/spare-parts/${selectedPart!.id}/entries`, { ...data, quantity: qty, unitPrice: price, gstPercent: gst, gstAmount: gstAmt, totalAmount: price * qty + gstAmt });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/spare-parts", selectedPart?.id, "entries"] }); queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] }); toast({ title: "Stock entry recorded" }); setAddEntryOpen(false); },
    onError: (e: any) => toast({ title: "Failed to add entry", description: e.message, variant: "destructive" }),
  });

  const issueMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/spare-part-issuances", { ...data, sparePartId: selectedPart!.id, quantity: parseInt(data.quantity) });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/spare-parts", selectedPart?.id, "issuances"] }); queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] }); toast({ title: "Part issued" }); setIssueOpen(false); },
    onError: (e: any) => toast({ title: "Failed to issue part", description: e.message, variant: "destructive" }),
  });

  const filtered = parts.filter(p => !search || p.partName.toLowerCase().includes(search.toLowerCase()) || (p.partNumber ?? "").toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase()));
  const lowStock = parts.filter(p => p.reorderThreshold && (p.currentStock ?? 0) <= p.reorderThreshold);

  const fmt = (paise: number | null | undefined) => paise != null ? `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />Spare Parts Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track spare parts catalog, stock, and issuances</p>
        </div>
        <Button onClick={() => setAddPartOpen(true)} data-testid="button-add-spare-part"><Plus className="h-4 w-4 mr-2" />Add Part</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300"><span className="font-medium">{lowStock.length} part{lowStock.length > 1 ? "s" : ""} at or below reorder level:</span> {lowStock.map(p => p.partName).join(", ")}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Parts", value: parts.length, icon: <Package className="h-5 w-5" /> },
          { label: "Low Stock", value: lowStock.length, icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
          { label: "Total Issuances", value: allIssuances.length, icon: <ArrowUpFromLine className="h-5 w-5 text-blue-500" /> },
          { label: "Stock Value", value: parts.reduce((sum, p) => sum + (p.currentStock ?? 0) * (p.unitPrice ?? 0), 0), isAmount: true, icon: <Package className="h-5 w-5 text-green-500" /> },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.isAmount ? fmt(s.value as number) : s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog" data-testid="tab-catalog">Catalog</TabsTrigger>
          <TabsTrigger value="issuances" data-testid="tab-issuances">All Issuances</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base">Parts Catalog</CardTitle>
                <div className="ml-auto relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 w-56" placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-parts" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm"><Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" /><p>No spare parts yet. Add your first part.</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part Name</TableHead>
                      <TableHead>Part No.</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(part => {
                      const atReorder = part.reorderThreshold != null && (part.currentStock ?? 0) <= part.reorderThreshold;
                      const machine = machines.find((m: any) => m.id === part.machineId);
                      return (
                        <TableRow key={part.id} data-testid={`row-part-${part.id}`}>
                          <TableCell className="font-medium">{part.partName}</TableCell>
                          <TableCell className="text-muted-foreground">{part.partNumber || "-"}</TableCell>
                          <TableCell>{part.category || "-"}</TableCell>
                          <TableCell>{machine?.name || "-"}</TableCell>
                          <TableCell className="text-right font-medium">{part.currentStock ?? 0}</TableCell>
                          <TableCell className="text-right">{fmt(part.unitPrice)}</TableCell>
                          <TableCell>
                            {atReorder ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedPart(part); setAddEntryOpen(true); }} data-testid={`button-add-stock-${part.id}`}>
                                <ArrowDownToLine className="h-3 w-3 mr-1" />Stock In
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedPart(part); setIssueOpen(true); }} data-testid={`button-issue-${part.id}`}>
                                <ArrowUpFromLine className="h-3 w-3 mr-1" />Issue
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issuances" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">All Issuances</CardTitle></CardHeader>
            <CardContent className="p-0">
              {allIssuances.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No issuances recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allIssuances.map((iss: any) => {
                      const part = parts.find(p => p.id === iss.sparePartId);
                      const machine = machines.find((m: any) => m.id === iss.machineId);
                      return (
                        <TableRow key={iss.id} data-testid={`row-issuance-${iss.id}`}>
                          <TableCell>{iss.issueDate ? format(new Date(iss.issueDate), "dd MMM yyyy") : "-"}</TableCell>
                          <TableCell className="font-medium">{part?.partName || iss.sparePartId}</TableCell>
                          <TableCell>{machine?.name || "-"}</TableCell>
                          <TableCell className="text-right">{iss.quantity}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{iss.purpose || "-"}</TableCell>
                          <TableCell>{iss.workOrderNumber || "-"}</TableCell>
                          <TableCell><Badge variant={iss.status === "returned" ? "secondary" : iss.status === "consumed" ? "outline" : "default"} className="capitalize">{iss.status || "issued"}</Badge></TableCell>
                          <TableCell className="text-right">{iss.returnedQuantity || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Part Dialog */}
      <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
        <DialogContent data-testid="dialog-add-part">
          <DialogHeader><DialogTitle>Add Spare Part</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Part Name *</Label>
              <Input placeholder="e.g. V-Belt A45" value={partForm.partName} onChange={e => setPartForm(f => ({ ...f, partName: e.target.value }))} data-testid="input-part-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Part Number</Label>
                <Input placeholder="e.g. VB-A45-001" value={partForm.partNumber} onChange={e => setPartForm(f => ({ ...f, partNumber: e.target.value }))} data-testid="input-part-number" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input placeholder="e.g. Belts, Bearings" value={partForm.category} onChange={e => setPartForm(f => ({ ...f, category: e.target.value }))} data-testid="input-part-category" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Machine</Label>
              <Select value={partForm.machineId} onValueChange={v => setPartForm(f => ({ ...f, machineId: v }))}>
                <SelectTrigger data-testid="select-part-machine"><SelectValue placeholder="Select machine..." /></SelectTrigger>
                <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price (₹)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={partForm.unitPrice} onChange={e => setPartForm(f => ({ ...f, unitPrice: e.target.value }))} data-testid="input-part-price" />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder At (qty)</Label>
                <Input type="number" min="0" placeholder="e.g. 5" value={partForm.reorderThreshold} onChange={e => setPartForm(f => ({ ...f, reorderThreshold: e.target.value }))} data-testid="input-reorder-threshold" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPartOpen(false)}>Cancel</Button>
            <Button onClick={() => addPartMutation.mutate(partForm)} disabled={!partForm.partName || addPartMutation.isPending} data-testid="button-save-part">
              {addPartMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock In Dialog */}
      <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
        <DialogContent data-testid="dialog-add-entry">
          <DialogHeader><DialogTitle>Stock In — {selectedPart?.partName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Date *</Label>
                <Input type="date" value={entryForm.purchaseDate} onChange={e => setEntryForm(f => ({ ...f, purchaseDate: e.target.value }))} data-testid="input-entry-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min="1" placeholder="0" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} data-testid="input-entry-qty" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryForm.unitPrice} onChange={e => setEntryForm(f => ({ ...f, unitPrice: e.target.value }))} data-testid="input-entry-price" />
              </div>
              <div className="space-y-1.5">
                <Label>GST %</Label>
                <Input type="number" min="0" max="28" value={entryForm.gstPercent} onChange={e => setEntryForm(f => ({ ...f, gstPercent: e.target.value }))} data-testid="input-entry-gst" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select value={entryForm.vendorId} onValueChange={v => setEntryForm(f => ({ ...f, vendorId: v }))}>
                <SelectTrigger data-testid="select-entry-vendor"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea rows={2} value={entryForm.remarks} onChange={e => setEntryForm(f => ({ ...f, remarks: e.target.value }))} data-testid="input-entry-remarks" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEntryOpen(false)}>Cancel</Button>
            <Button onClick={() => addEntryMutation.mutate(entryForm)} disabled={!entryForm.quantity || !entryForm.unitPrice || addEntryMutation.isPending} data-testid="button-save-entry">
              {addEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent data-testid="dialog-issue-part">
          <DialogHeader><DialogTitle>Issue Part — {selectedPart?.partName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground px-1">Current stock: <span className="font-semibold">{selectedPart?.currentStock ?? 0}</span></p>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Issue Date *</Label>
                <Input type="date" value={issueForm.issueDate} onChange={e => setIssueForm(f => ({ ...f, issueDate: e.target.value }))} data-testid="input-issue-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" min="1" max={selectedPart?.currentStock ?? 999} placeholder="0" value={issueForm.quantity} onChange={e => setIssueForm(f => ({ ...f, quantity: e.target.value }))} data-testid="input-issue-qty" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Machine</Label>
              <Select value={issueForm.machineId} onValueChange={v => setIssueForm(f => ({ ...f, machineId: v }))}>
                <SelectTrigger data-testid="select-issue-machine"><SelectValue placeholder="Select machine..." /></SelectTrigger>
                <SelectContent>{machines.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work Order No.</Label>
              <Input placeholder="e.g. WO-2026-001" value={issueForm.workOrderNumber} onChange={e => setIssueForm(f => ({ ...f, workOrderNumber: e.target.value }))} data-testid="input-work-order" />
            </div>
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Textarea rows={2} placeholder="Reason for issuance..." value={issueForm.purpose} onChange={e => setIssueForm(f => ({ ...f, purpose: e.target.value }))} data-testid="input-issue-purpose" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={() => issueMutation.mutate(issueForm)} disabled={!issueForm.quantity || issueMutation.isPending} data-testid="button-save-issuance">
              {issueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Issue Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
