import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, TrendingDown, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface StockItem { id: number; drug_name: string; batch_number: string; expiry_date: string; quantity: number; mrp: number; stock_value: number; reorder_level: number; branch_id: number; }
interface Branch { id: number; name: string; }

export default function PharmacyStock() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({ stock_id: "", type: "add", quantity: 0, reason: "" });

  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ["pharmacy-branches"], queryFn: () => api("GET", "/api/pharmacy/branches") });
  const { data: stock = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["pharmacy-stock", search, branchId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (branchId !== "all") p.set("branch_id", branchId);
      return api("GET", `/api/pharmacy/stock?${p}`);
    },
  });

  const adjust = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/stock/adjust", data),
    onSuccess: () => {
      toast({ title: "Stock adjusted" });
      qc.invalidateQueries({ queryKey: ["pharmacy-stock"] });
      setAdjOpen(false);
      setAdjForm({ stock_id: "", type: "add", quantity: 0, reason: "" });
    },
    onError: () => toast({ title: "Failed to adjust stock", variant: "destructive" }),
  });

  const stockArr = Array.isArray(stock) ? stock : [];
  const today = new Date();
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const totalSKUs = stockArr.length;
  const totalValue = stockArr.reduce((s, i) => s + (i.stock_value || 0), 0);
  const lowStock = stockArr.filter((i) => i.quantity <= i.reorder_level).length;
  const expiryAlerts = stockArr.filter((i) => i.expiry_date && new Date(i.expiry_date) <= ninetyDays).length;

  const isExpiringSoon = (date: string) => date && new Date(date) <= ninetyDays;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stock Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">Total SKUs</p><p className="text-2xl font-bold">{totalSKUs}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><TrendingDown className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Stock Value</p><p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-orange-500" /><div><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-2xl font-bold text-orange-600">{lowStock}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Calendar className="h-8 w-8 text-red-500" /><div><p className="text-sm text-muted-foreground">Expiry Alerts</p><p className="text-2xl font-bold text-red-600">{expiryAlerts}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="all">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList>
            {Array.isArray(branches) && [{ id: "all", name: "All Branches" }, ...branches].map((b) => (
              <TabsTrigger key={b.id} value={String(b.id)} onClick={() => setBranchId(String(b.id))}>{b.name}</TabsTrigger>
            ))}
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-60" placeholder="Search drug..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setAdjOpen(true)}>Adjust Stock</Button>
          </div>
        </div>

        <TabsContent value={branchId} forceMount>
          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug Name</TableHead><TableHead>Batch</TableHead><TableHead>Expiry</TableHead>
                    <TableHead>Qty</TableHead><TableHead>MRP</TableHead><TableHead>Stock Value</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>}
                  {!isLoading && stockArr.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No stock found</TableCell></TableRow>}
                  {stockArr.map((item) => (
                    <TableRow key={item.id} className={item.quantity <= item.reorder_level ? "bg-orange-50" : ""}>
                      <TableCell className="font-medium">{item.drug_name}</TableCell>
                      <TableCell>{item.batch_number}</TableCell>
                      <TableCell className={isExpiringSoon(item.expiry_date) ? "text-red-600 font-medium" : ""}>
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.mrp}</TableCell>
                      <TableCell>₹{(item.stock_value || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {item.quantity <= item.reorder_level && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Reorder</span>}
                        {isExpiringSoon(item.expiry_date) && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full ml-1">Expiring</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Adjustment Type</Label>
              <Select value={adjForm.type} onValueChange={(v) => setAdjForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="write_off">Write-off Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Stock Item ID</Label><Input value={adjForm.stock_id} onChange={(e) => setAdjForm((p) => ({ ...p, stock_id: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={adjForm.quantity} onChange={(e) => setAdjForm((p) => ({ ...p, quantity: Number(e.target.value) }))} /></div>
            <div className="space-y-1"><Label>Reason</Label><Input value={adjForm.reason} onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <Button onClick={() => adjust.mutate(adjForm)} disabled={adjust.isPending}>
              {adjust.isPending ? "Saving..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
