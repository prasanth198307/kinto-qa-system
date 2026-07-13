import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Plus, Download } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const CHARGE_CATEGORIES = ["room", "minibar", "laundry", "fnb", "spa", "telephone", "transport", "misc"];
const STATUS_COLOR: Record<string, string> = { open: "bg-blue-100 text-blue-800", settled: "bg-green-100 text-green-800", void: "bg-red-100 text-red-800" };
const EMPTY_CHARGE = { description: "", category: "room", quantity: "1", rate: "", amount: "" };

export default function HotelFolioPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedFolioId, setSelectedFolioId] = useState<number | null>(null);
  const [chargeForm, setChargeForm] = useState({ ...EMPTY_CHARGE });

  const { data: folios = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/folios"], queryFn: () => api("GET", "/api/hotel/folios") });
  const { data: folioItems = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/folios/items", selectedFolioId], queryFn: () => api("GET", `/api/hotel/folios/${selectedFolioId}/items`), enabled: !!selectedFolioId });

  const addCharge = useMutation({
    mutationFn: (b: any) => api("POST", `/api/hotel/folios/${selectedFolioId}/add-charge`, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/folios/items", selectedFolioId] }); qc.invalidateQueries({ queryKey: ["/api/hotel/folios"] }); setChargeForm({ ...EMPTY_CHARGE }); },
  });

  const settle = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/folios/${id}`, { status: "settled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/folios"] }),
  });

  const cf = (k: string, v: string) => {
    setChargeForm(p => {
      const u = { ...p, [k]: v };
      if (k === "rate" || k === "quantity") u.amount = (parseFloat(u.quantity || "1") * parseFloat(u.rate || "0")).toFixed(2);
      return u;
    });
  };

  const foliosArr = Array.isArray(folios) ? folios : [];
  const itemsArr = Array.isArray(folioItems) ? folioItems : [];
  const selectedFolio = foliosArr.find((f: any) => f.id === selectedFolioId) ?? null;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6 text-green-600" />Guest Folio</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Folios</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Open</p>
              {foliosArr.filter((f: any) => f.status === "open").map((f: any) => (
                <div key={f.id} className={`p-3 border rounded cursor-pointer mb-1 transition-colors ${selectedFolioId === f.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`} onClick={() => setSelectedFolioId(f.id)}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{f.guest_name ?? `Guest #${f.guest_id}`}</p>
                    <Badge className={STATUS_COLOR[f.status]}>{f.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">Folio #{f.folio_number} · Room {f.room_number ?? f.room_id}</p>
                  <p className="text-xs font-medium text-green-700 mt-1">Total: {sym}{Number(f.total_amount ?? 0).toLocaleString("en-IN")} · Balance: {sym}{Number(f.balance_amount ?? 0).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 pt-2 border-t">Settled (recent 5)</p>
              {foliosArr.filter((f: any) => f.status === "settled").slice(0, 5).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded mb-1 cursor-pointer hover:bg-gray-50" onClick={() => setSelectedFolioId(f.id)}>
                  <div>
                    <p className="text-sm">{f.guest_name ?? `Guest #${f.guest_id}`}</p>
                    <p className="text-xs text-gray-500">Folio #{f.folio_number}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <p className="text-sm font-medium">{sym}{Number(f.total_amount ?? 0).toLocaleString("en-IN")}</p>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={e => { e.stopPropagation(); window.open(`/api/hotel/folios/${f.id}/pdf`, "_blank"); }}><Download className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedFolio && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Folio #{selectedFolio.folio_number}</CardTitle>
                <p className="text-xs text-gray-500">{selectedFolio.guest_name} · Room {selectedFolio.room_number}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => window.open(`/api/hotel/folios/${selectedFolio.id}/pdf`, "_blank")}><Download className="w-3 h-3 mr-1" />PDF</Button>
                {selectedFolio.status === "open" && (
                  <Button size="sm" onClick={() => settle.mutate(selectedFolio.id)}>Settle + GL</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-50">{["Description", "Cat", "Qty", "Rate", "Amount"].map(h => <th key={h} className="text-left p-2 border text-xs">{h}</th>)}</tr></thead>
                <tbody>
                  {itemsArr.map((it: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{it.description}</td>
                      <td className="p-2 text-xs"><Badge variant="outline">{it.category}</Badge></td>
                      <td className="p-2">{it.quantity}</td>
                      <td className="p-2">{sym}{Number(it.rate ?? 0).toLocaleString("en-IN")}</td>
                      <td className="p-2 font-medium">{sym}{Number(it.amount ?? 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {itemsArr.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No charges yet.</p>}

              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-sm font-medium">Total</p>
                <p className="font-bold">{sym}{Number(selectedFolio.total_amount ?? 0).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Paid</p>
                <p className="text-green-600">{sym}{Number(selectedFolio.paid_amount ?? 0).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Balance Due</p>
                <p className="text-red-600 font-bold">{sym}{Number(selectedFolio.balance_amount ?? 0).toLocaleString("en-IN")}</p>
              </div>

              {selectedFolio.status === "open" && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium mb-2">Add Charge</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-xs">Description</Label><Input value={chargeForm.description} onChange={e => cf("description", e.target.value)} placeholder="Minibar, Laundry..." className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Category</Label>
                      <Select value={chargeForm.category} onValueChange={v => cf("category", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{CHARGE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Qty</Label><Input type="number" value={chargeForm.quantity} onChange={e => cf("quantity", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Rate (₹)</Label><Input type="number" value={chargeForm.rate} onChange={e => cf("rate", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={chargeForm.amount} onChange={e => cf("amount", e.target.value)} className="h-8 text-sm" /></div>
                    <div className="flex items-end">
                      <Button size="sm" className="w-full" onClick={() => addCharge.mutate({ description: chargeForm.description, category: chargeForm.category, quantity: parseFloat(chargeForm.quantity || "1"), rate: parseFloat(chargeForm.rate || "0"), amount: parseFloat(chargeForm.amount || "0") })}><Plus className="w-3 h-3 mr-1" />Add</Button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400">Settle GL: DR Cash/Card · CR Room Revenue (fire-and-forget)</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
