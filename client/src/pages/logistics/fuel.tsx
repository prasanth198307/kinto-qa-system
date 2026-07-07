import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const EMPTY_FUEL = { vehicle_id: "", date: new Date().toISOString().slice(0, 10), liters: "", rate_per_liter: "", odometer_km: "", fuel_station: "", fuel_type: "diesel" };
const EMPTY_RECHARGE = { amount: "" };

export default function FuelPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"fuel" | "fastag">("fuel");
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [editingFuel, setEditingFuel] = useState<any>(null);
  const [fuelForm, setFuelForm] = useState<any>(EMPTY_FUEL);
  const [rechargeId, setRechargeId] = useState<number | null>(null);
  const [rechargeAmt, setRechargeAmt] = useState("");

  const { data: fuelRecords = [] } = useQuery({ queryKey: ["/api/logistics/fuel-records"], queryFn: () => api("GET", "/api/logistics/fuel-records") });
  const { data: vehicles = [] } = useQuery({ queryKey: ["/api/logistics/vehicles"], queryFn: () => api("GET", "/api/logistics/vehicles") });
  const { data: fastagAccounts = [] } = useQuery({ queryKey: ["/api/logistics/fastag/accounts"], queryFn: () => api("GET", "/api/logistics/fastag/accounts") });
  const { data: fastagTx = [] } = useQuery({ queryKey: ["/api/logistics/fastag/transactions"], queryFn: () => api("GET", "/api/logistics/fastag/transactions"), enabled: tab === "fastag" });
  const { data: fastagSummary } = useQuery({ queryKey: ["/api/logistics/fastag/summary"], queryFn: () => api("GET", "/api/logistics/fastag/summary"), enabled: tab === "fastag" });

  const saveFuelMut = useMutation({
    mutationFn: (data: any) => editingFuel
      ? api("PUT", `/api/logistics/fuel-records/${editingFuel.id}`, data)
      : api("POST", "/api/logistics/fuel-records", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/fuel-records"] }); setShowFuelForm(false); toast({ title: "Fuel record saved" }); },
  });

  const syncMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/logistics/fastag/accounts/${id}/sync`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/fastag/accounts"] }); toast({ title: "FASTag synced" }); },
  });

  const rechargeMut = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: string }) => api("POST", `/api/logistics/fastag/accounts/${id}/recharge`, { amount: Number(amount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/fastag/accounts"] }); setRechargeId(null); setRechargeAmt(""); toast({ title: "Recharge initiated" }); },
  });

  function openAddFuel() { setEditingFuel(null); setFuelForm(EMPTY_FUEL); setShowFuelForm(true); }
  function openEditFuel(r: any) { setEditingFuel(r); setFuelForm({ ...r }); setShowFuelForm(true); }
  const setF = (k: string) => (e: any) => setFuelForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const vehicleMap = Object.fromEntries((Array.isArray(vehicles) ? vehicles : []).map((v: any) => [v.id, v.reg_no]));
  const fuelList = Array.isArray(fuelRecords) ? fuelRecords : [];
  const totalFuelCost = fuelList.reduce((s: number, r: any) => s + (Number(r.liters) * Number(r.rate_per_liter) || 0), 0);

  // km/liter per vehicle
  const vehicleEfficiency: Record<string, { totalKm: number; totalLiters: number }> = {};
  fuelList.forEach((r: any) => {
    if (!vehicleEfficiency[r.vehicle_id]) vehicleEfficiency[r.vehicle_id] = { totalKm: 0, totalLiters: 0 };
    vehicleEfficiency[r.vehicle_id].totalLiters += Number(r.liters) || 0;
  });

  const accts = Array.isArray(fastagAccounts) ? fastagAccounts : [];
  const txList = Array.isArray(fastagTx) ? fastagTx : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fuel & FASTag</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant={tab === "fuel" ? "default" : "outline"} onClick={() => setTab("fuel")}>Fuel Records</Button>
          <Button variant={tab === "fastag" ? "default" : "outline"} onClick={() => setTab("fastag")}>FASTag</Button>
        </div>
      </div>

      {tab === "fuel" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fuelList.length}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Fill-ups</div></CardContent></Card>
            <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fuelList.reduce((s: number, r: any) => s + (Number(r.liters) || 0), 0).toFixed(1)} L</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Liters</div></CardContent></Card>
            <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalFuelCost)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Cost</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fuel Records ({fuelList.length})</CardTitle>
                <Button size="sm" onClick={openAddFuel}>+ Add Record</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                      {["Date", "Vehicle", "Liters", "Rate/L", "Total", "Odometer", "Fuel Station", "Actions"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fuelList.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px 12px" }}>{r.date}</td>
                        <td style={{ padding: "8px 12px" }}>{vehicleMap[r.vehicle_id] || r.vehicle_id}</td>
                        <td style={{ padding: "8px 12px" }}>{Number(r.liters).toFixed(2)} L</td>
                        <td style={{ padding: "8px 12px" }}>₹{Number(r.rate_per_liter).toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmt(Number(r.liters) * Number(r.rate_per_liter))}</td>
                        <td style={{ padding: "8px 12px" }}>{r.odometer_km ? `${r.odometer_km} km` : "—"}</td>
                        <td style={{ padding: "8px 12px" }}>{r.fuel_station || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <Button size="sm" variant="outline" onClick={() => openEditFuel(r)}>Edit</Button>
                        </td>
                      </tr>
                    ))}
                    {fuelList.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No fuel records.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "fastag" && (
        <>
          {fastagSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(fastagSummary.total_balance || 0)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Balance</div></CardContent></Card>
              <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(fastagSummary.total_spend || 0)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Spend (Month)</div></CardContent></Card>
              <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{accts.length}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Active Accounts</div></CardContent></Card>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>FASTag Accounts</CardTitle></CardHeader>
            <CardContent>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                    {["Vehicle", "Tag ID", "Balance", "Bank", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accts.map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{vehicleMap[a.vehicle_id] || a.vehicle_id}</td>
                      <td style={{ padding: "8px 12px" }}>{a.tag_id}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: (a.balance || 0) < 200 ? "#ef4444" : "#22c55e" }}>{fmt(a.balance || 0)}</td>
                      <td style={{ padding: "8px 12px" }}>{a.bank_name || "—"}</td>
                      <td style={{ padding: "8px 12px" }}><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="outline" onClick={() => syncMut.mutate(a.id)} disabled={syncMut.isPending}>Sync</Button>
                          <Button size="sm" variant="outline" onClick={() => { setRechargeId(a.id); setRechargeAmt(""); }}>Recharge</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {accts.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No FASTag accounts.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
            <CardContent>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                    {["Date", "Vehicle", "Plaza", "Amount", "Type"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txList.slice(0, 30).map((t: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px" }}>{t.date || t.transaction_date}</td>
                      <td style={{ padding: "8px 12px" }}>{vehicleMap[t.vehicle_id] || t.vehicle_id || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{t.plaza_name || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{fmt(t.amount || 0)}</td>
                      <td style={{ padding: "8px 12px" }}><Badge variant={t.type === "debit" ? "destructive" : "default"}>{t.type}</Badge></td>
                    </tr>
                  ))}
                  {txList.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No transactions.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Fuel Record Form */}
      <Dialog open={showFuelForm} onOpenChange={setShowFuelForm}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader><DialogTitle>{editingFuel ? "Edit Fuel Record" : "Add Fuel Record"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Vehicle</Label>
              <Select value={String(fuelForm.vehicle_id || "")} onValueChange={v => setFuelForm((f: any) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(Array.isArray(vehicles) ? vehicles : []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.reg_no}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={fuelForm.date} onChange={setF("date")} /></div>
            <div><Label>Liters</Label><Input type="number" value={fuelForm.liters} onChange={setF("liters")} /></div>
            <div><Label>Rate/Liter (₹)</Label><Input type="number" value={fuelForm.rate_per_liter} onChange={setF("rate_per_liter")} /></div>
            <div><Label>Odometer (km)</Label><Input type="number" value={fuelForm.odometer_km} onChange={setF("odometer_km")} /></div>
            <div><Label>Fuel Station</Label><Input value={fuelForm.fuel_station} onChange={setF("fuel_station")} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowFuelForm(false)}>Cancel</Button>
            <Button onClick={() => saveFuelMut.mutate(fuelForm)} disabled={saveFuelMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={rechargeId !== null} onOpenChange={open => !open && setRechargeId(null)}>
        <DialogContent style={{ maxWidth: 360 }}>
          <DialogHeader><DialogTitle>Recharge FASTag</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gap: 12 }}>
            <div><Label>Recharge Amount (₹)</Label><Input type="number" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)} placeholder="Enter amount" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setRechargeId(null)}>Cancel</Button>
            <Button onClick={() => rechargeMut.mutate({ id: rechargeId!, amount: rechargeAmt })} disabled={rechargeMut.isPending || !rechargeAmt}>Recharge</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
