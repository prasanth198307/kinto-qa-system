import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Search, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Drug { id: number; drug_name: string; mrp: number; gst_rate: number; batch_number?: string; expiry_date?: string; }
interface BillItem { drug: Drug; qty: number; mrp: number; }
interface Bill { id: number; bill_number: string; patient_name: string; total: number; payment_mode: string; created_at: string; }

export default function PharmacyBilling() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [patientName, setPatientName] = useState("");
  const [prescriptionBy, setPrescriptionBy] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [discount, setDiscount] = useState(0);

  const { data: drugs = [], isFetching: searchLoading } = useQuery<Drug[]>({
    queryKey: ["pharmacy-drugs-search", search],
    queryFn: () => api("GET", `/api/pharmacy/drugs?search=${encodeURIComponent(search)}`),
    enabled: search.length > 1,
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["pharmacy-bills"],
    queryFn: () => api("GET", "/api/pharmacy/bills"),
  });

  const createBill = useMutation({
    mutationFn: (data: any) => api("POST", "/api/pharmacy/bills", data),
    onSuccess: () => {
      toast({ title: "Bill created successfully" });
      qc.invalidateQueries({ queryKey: ["pharmacy-bills"] });
      setItems([]);
      setPatientName("");
      setPrescriptionBy("");
      setPrescriptionNumber("");
      setDiscount(0);
    },
    onError: () => toast({ title: "Failed to create bill", variant: "destructive" }),
  });

  const addDrug = (drug: Drug) => {
    const existing = items.find((i) => i.drug.id === drug.id);
    if (existing) {
      setItems(items.map((i) => i.drug.id === drug.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { drug, qty: 1, mrp: drug.mrp }]);
    }
    setSearch("");
  };

  const removeItem = (id: number) => setItems(items.filter((i) => i.drug.id !== id));
  const updateQty = (id: number, qty: number) => setItems(items.map((i) => i.drug.id === id ? { ...i, qty } : i));

  const subtotal = items.reduce((s, i) => s + i.mrp * i.qty, 0);
  const gstAmount = items.reduce((s, i) => s + i.mrp * i.qty * (i.drug.gst_rate / 100), 0);
  const total = subtotal + gstAmount - discount;

  const handlePay = () => {
    if (!patientName) { toast({ title: "Patient name required", variant: "destructive" }); return; }
    if (items.length === 0) { toast({ title: "Add at least one drug", variant: "destructive" }); return; }
    createBill.mutate({
      patient_name: patientName,
      prescription_by: prescriptionBy,
      prescription_number: prescriptionNumber,
      payment_mode: paymentMode,
      discount,
      items: items.map((i) => ({ drug_id: i.drug.id, qty: i.qty, mrp: i.mrp })),
      subtotal,
      gst_amount: gstAmount,
      total,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pharmacy Billing</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Add Drugs</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input placeholder="Search drug by name..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {searchLoading && <span className="absolute right-3 top-2 text-xs text-muted-foreground">Searching...</span>}
              </div>
              {Array.isArray(drugs) && drugs.length > 0 && search.length > 1 && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {drugs.map((d) => (
                    <div key={d.id} className="flex justify-between items-center px-3 py-2 hover:bg-muted cursor-pointer" onClick={() => addDrug(d)}>
                      <div>
                        <span className="font-medium">{d.drug_name}</span>
                        {d.batch_number && <span className="text-xs text-muted-foreground ml-2">Batch: {d.batch_number}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">₹{d.mrp}</span>
                        <Plus className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead><TableHead>Batch</TableHead><TableHead>Expiry</TableHead>
                      <TableHead>MRP</TableHead><TableHead>Qty</TableHead><TableHead>Amount</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.drug.id}>
                        <TableCell className="font-medium">{item.drug.drug_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.drug.batch_number || "-"}</TableCell>
                        <TableCell className="text-sm">{item.drug.expiry_date || "-"}</TableCell>
                        <TableCell>₹{item.mrp}</TableCell>
                        <TableCell>
                          <Input type="number" min={1} value={item.qty} onChange={(e) => updateQty(item.drug.id, Number(e.target.value))} className="w-16 h-8" />
                        </TableCell>
                        <TableCell className="font-medium">₹{(item.mrp * item.qty).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(item.drug.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Patient Name *</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter patient name" />
              </div>
              <div className="space-y-1">
                <Label>Prescribed By</Label>
                <Input value={prescriptionBy} onChange={(e) => setPrescriptionBy(e.target.value)} placeholder="Doctor name" />
              </div>
              <div className="space-y-1">
                <Label>Prescription No.</Label>
                <Input value={prescriptionNumber} onChange={(e) => setPrescriptionNumber(e.target.value)} placeholder="Rx number" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Bill Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span>GST</span><span>₹{gstAmount.toFixed(2)}</span></div>
              <div className="flex justify-between items-center text-sm">
                <span>Discount</span>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 h-8" />
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
              <div className="space-y-1">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handlePay} disabled={createBill.isPending}>
                {createBill.isPending ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead>
                <TableHead>Total</TableHead><TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(bills) && bills.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No bills yet</TableCell></TableRow>
              )}
              {Array.isArray(bills) && bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">{b.bill_number}</TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{b.patient_name}</TableCell>
                  <TableCell>₹{Number(b.total).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{b.payment_mode}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
