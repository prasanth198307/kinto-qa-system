import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Undo2, X, Ban } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TABS = ["near_expiry", "expired", "supplier_returns", "recalls"] as const;
type Tab = typeof TABS[number];
const LABELS: Record<Tab, string> = { near_expiry: "Near Expiry", expired: "Expired", supplier_returns: "Supplier Returns", recalls: "CDSCO Recalls" };

export default function ExpiryPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [tab, setTab] = useState<Tab>("near_expiry");
  const [returning, setReturning] = useState<any>(null);
  const [retForm, setRetForm] = useState({ supplier_name: "", credit_expected: "" });

  const { data: nearExpiry = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/batches/near-expiry"], queryFn: () => api("GET", "/api/pharmacy/batches/near-expiry") });
  const { data: expired = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/batches/expired"], queryFn: () => api("GET", "/api/pharmacy/batches/expired") });
  const { data: returns = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/supplier-returns"], queryFn: () => api("GET", "/api/pharmacy/supplier-returns") });
  const { data: recalls = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drug-recalls"], queryFn: () => api("GET", "/api/pharmacy/drug-recalls"), enabled: tab === "recalls" });
  const { data: affectedStock = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drug-recalls/affected-stock"], queryFn: () => api("GET", "/api/pharmacy/drug-recalls/affected-stock"), enabled: tab === "recalls" });

  const createReturn = useMutation({ mutationFn: (b: any) => api("POST", "/api/pharmacy/supplier-returns", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/supplier-returns"] }); setReturning(null); } });
  const approveReturn = useMutation({ mutationFn: (id: number) => api("PUT", `/api/pharmacy/supplier-returns/${id}/approve`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/supplier-returns"] }) });
  const writeOff = useMutation({ mutationFn: (id: number) => api("POST", `/api/pharmacy/batches/${id}/write-off`, {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/pharmacy/batches/expired"] }); qc.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); } });
  const syncCdsco = useMutation({ mutationFn: () => api("POST", "/api/pharmacy/drug-recalls/sync-cdsco", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pharmacy/drug-recalls"] }) });

  const neArr = Array.isArray(nearExpiry) ? nearExpiry : [];
  const exArr = Array.isArray(expired) ? expired : [];
  const retArr = Array.isArray(returns) ? returns : [];
  const recArr = Array.isArray(recalls) ? recalls : [];
  const affArr = Array.isArray(affectedStock) ? affectedStock : [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Expiry Management</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-orange-500" /><div><p className="text-sm text-gray-500">Near Expiry (90d)</p><p className="text-xl font-bold text-orange-600">{neArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-2"><Ban className="w-6 h-6 text-red-500" /><div><p className="text-sm text-gray-500">Expired</p><p className="text-xl font-bold text-red-600">{exArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Returns Raised</p><p className="text-xl font-bold">{retArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Active Recalls</p><p className="text-xl font-bold text-purple-600">{recArr.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{LABELS[t]}</button>)}
      </div>

      {tab === "near_expiry" && (
        <div className="space-y-2">
          {neArr.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{b.drug_name ?? b.name}</p>
                  <p className="text-sm text-gray-500">Batch {b.batch_number} · Expires {b.expiry_date?.slice(0, 10)} · Qty {b.quantity}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setReturning(b); setRetForm({ supplier_name: "", credit_expected: ((b.purchase_rate || 0) * (b.quantity || 0)).toString() }); }}>
                  <Undo2 className="w-3 h-3 mr-1" />Return to Supplier
                </Button>
              </CardContent>
              {returning?.id === b.id && (
                <CardContent className="border-t pt-3 grid grid-cols-3 gap-2 items-end">
                  <div><Label className="text-xs">Distributor / Supplier</Label><Input value={retForm.supplier_name} onChange={e => setRetForm(p => ({ ...p, supplier_name: e.target.value }))} /></div>
                  <div><Label className="text-xs">Expected Credit (${sym})</Label><Input type="number" value={retForm.credit_expected} onChange={e => setRetForm(p => ({ ...p, credit_expected: e.target.value }))} /></div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => createReturn.mutate({ stock_id: b.id, drug_id: b.drug_id, batch_number: b.batch_number, quantity: b.quantity, supplier_name: retForm.supplier_name, credit_expected: parseFloat(retForm.credit_expected) })}>Raise Return</Button>
                    <Button size="sm" variant="ghost" onClick={() => setReturning(null)}><X className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          {neArr.length === 0 && <p className="text-center text-gray-400 py-8">No batches expiring within 90 days.</p>}
        </div>
      )}

      {tab === "expired" && (
        <div className="space-y-2">
          {exArr.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{b.drug_name ?? b.name}</p>
                  <p className="text-sm text-gray-500">Batch {b.batch_number} · Expired {b.expiry_date?.slice(0, 10)} · Qty {b.quantity}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => writeOff.mutate(b.id)}>Write Off</Button>
                  <p className="text-xs text-gray-400">GL: DR Stock Loss · CR Inventory</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {exArr.length === 0 && <p className="text-center text-gray-400 py-8">No expired batches in stock.</p>}
        </div>
      )}

      {tab === "supplier_returns" && (
        <div className="space-y-2">
          {retArr.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{r.drug_name ?? `Drug #${r.drug_id}`} — Batch {r.batch_number}</p>
                  <p className="text-sm text-gray-500">{r.supplier_name} · Qty {r.quantity} · Credit {sym}{r.credit_expected}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={r.status === "approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{r.status ?? "pending"}</Badge>
                  {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => approveReturn.mutate(r.id)}>Approve</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {retArr.length === 0 && <p className="text-center text-gray-400 py-8">No supplier returns raised.</p>}
        </div>
      )}

      {tab === "recalls" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button size="sm" variant="outline" onClick={() => syncCdsco.mutate()}>Sync CDSCO Alerts</Button></div>
          {recArr.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{r.drug_name}</p>
                    <p className="text-sm text-gray-500">Batch {r.batch_number ?? "All"} · {r.reason}</p>
                    <p className="text-xs text-gray-400">Source: {r.source ?? "CDSCO"} · {r.recall_date?.slice(0, 10)}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">Recall</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {affArr.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-red-600">⚠ Affected Stock In Hand</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {affArr.map((a: any, i: number) => <p key={i} className="text-sm">{a.drug_name} — Batch {a.batch_number} · Qty {a.quantity}</p>)}
              </CardContent>
            </Card>
          )}
          {recArr.length === 0 && <p className="text-center text-gray-400 py-8">No drug recalls. CDSCO alerts sync from the official recall list (data.gov.in feed / manual sync).</p>}
        </div>
      )}
    </div>
  );
}
