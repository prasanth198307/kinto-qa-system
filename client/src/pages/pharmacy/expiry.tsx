import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface StockItem { id: number; drug_name: string; batch_number: string; expiry_date: string; quantity: number; stock_value: number; }

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function PharmacyExpiry() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [reason, setReason] = useState("");

  const useStock = (days: number) => useQuery<StockItem[]>({
    queryKey: ["pharmacy-expiry", days],
    queryFn: () => api("GET", `/api/pharmacy/stock?expiry_before=${addDays(days)}`),
  });

  const { data: stock30 = [] } = useStock(30);
  const { data: stock60 = [] } = useStock(60);
  const { data: stock90 = [] } = useStock(90);

  const writeOff = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/stock/adjust", data),
    onSuccess: () => {
      toast({ title: "Written off successfully" });
      qc.invalidateQueries({ queryKey: ["pharmacy-expiry"] });
      setWriteOffOpen(false);
      setReason("");
      setSelectedItem(null);
    },
    onError: () => toast({ title: "Failed to write off", variant: "destructive" }),
  });

  const returnToSupplier = (item: StockItem) => {
    api("POST", "/api/pharmacy/stock/adjust", { stock_id: item.id, type: "return_supplier", quantity: item.quantity, reason: "Return to supplier — expiring" })
      .then(() => { toast({ title: "Marked for return to supplier" }); qc.invalidateQueries({ queryKey: ["pharmacy-expiry"] }); })
      .catch(() => toast({ title: "Failed", variant: "destructive" }));
  };

  const openWriteOff = (item: StockItem) => { setSelectedItem(item); setWriteOffOpen(true); };

  const StockTable = ({ data }: { data: StockItem[] }) => {
    const arr = Array.isArray(data) ? data : [];
    const totalRisk = arr.reduce((s, i) => s + (i.stock_value || 0), 0);
    return (
      <div className="space-y-3">
        {arr.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
            <AlertTriangle className="h-4 w-4" />
            Total expiry risk value: <strong>₹{totalRisk.toFixed(2)}</strong>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug Name</TableHead><TableHead>Batch</TableHead><TableHead>Expiry Date</TableHead>
              <TableHead>Qty</TableHead><TableHead>Stock Value</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arr.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No items</TableCell></TableRow>}
            {arr.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.drug_name}</TableCell>
                <TableCell>{item.batch_number}</TableCell>
                <TableCell className="text-red-600 font-medium">{new Date(item.expiry_date).toLocaleDateString()}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>₹{(item.stock_value || 0).toFixed(2)}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => returnToSupplier(item)}>Return to Supplier</Button>
                  <Button variant="destructive" size="sm" onClick={() => openWriteOff(item)}>Write-off</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Expiry Management</h1>

      <Tabs defaultValue="30">
        <TabsList>
          <TabsTrigger value="30">Expiring in 30 days {Array.isArray(stock30) && stock30.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{stock30.length}</span>}</TabsTrigger>
          <TabsTrigger value="60">60 days {Array.isArray(stock60) && stock60.length > 0 && <span className="ml-1 bg-orange-400 text-white rounded-full px-1.5 text-xs">{stock60.length}</span>}</TabsTrigger>
          <TabsTrigger value="90">90 days {Array.isArray(stock90) && stock90.length > 0 && <span className="ml-1 bg-yellow-500 text-white rounded-full px-1.5 text-xs">{stock90.length}</span>}</TabsTrigger>
        </TabsList>
        <TabsContent value="30"><Card className="mt-4"><CardContent className="pt-4"><StockTable data={stock30} /></CardContent></Card></TabsContent>
        <TabsContent value="60"><Card className="mt-4"><CardContent className="pt-4"><StockTable data={stock60} /></CardContent></Card></TabsContent>
        <TabsContent value="90"><Card className="mt-4"><CardContent className="pt-4"><StockTable data={stock90} /></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Write-off — {selectedItem?.drug_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Batch: {selectedItem?.batch_number} | Expiry: {selectedItem?.expiry_date} | Qty: {selectedItem?.quantity}</p>
            <div className="space-y-1"><Label>Reason *</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for write-off" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason || writeOff.isPending}
              onClick={() => selectedItem && writeOff.mutate({ stock_id: selectedItem.id, type: "write_off", quantity: selectedItem.quantity, reason })}>
              {writeOff.isPending ? "Processing..." : "Confirm Write-off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
