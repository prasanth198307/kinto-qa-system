import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  silver: "bg-gray-100 text-gray-700",
  gold: "bg-yellow-100 text-yellow-800",
};
const TIER_ICON: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

const emptyForm = { customer_name: "", customer_phone: "", email: "", date_of_birth: "", anniversary_date: "", gstin: "", address: "" };

export default function RestaurantCustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"customers" | "loyalty">("customers");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [pointsAction, setPointsAction] = useState<"earn" | "redeem" | null>(null);
  const [pointsAmount, setPointsAmount] = useState("");
  const [loyaltyConfig, setLoyaltyConfigState] = useState<any>(null);
  const [configForm, setConfigForm] = useState<any>({});

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/restaurant/customers", debouncedSearch],
    queryFn: () => api("GET", `/api/restaurant/customers?search=${debouncedSearch}`),
  });

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["/api/restaurant/loyalty/config"],
    queryFn: () => api("GET", "/api/restaurant/loyalty/config"),
    enabled: tab === "loyalty",
    onSuccess: (d: any) => { setConfigForm(d); },
  });

  const { data: customerHistory = [] } = useQuery({
    queryKey: ["/api/restaurant/customers", selectedCustomer?.id, "history"],
    queryFn: () => api("GET", `/api/restaurant/customers/${selectedCustomer.id}/history`),
    enabled: !!selectedCustomer?.id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/customers"] });

  const saveMut = useMutation({
    mutationFn: (data: any) => editId
      ? api("PUT", `/api/restaurant/customers/${editId}`, data)
      : api("POST", "/api/restaurant/customers", data),
    onSuccess: () => { toast({ title: editId ? "Customer updated" : "Customer added" }); invalidate(); resetForm(); },
    onError: () => toast({ title: "Error saving customer", variant: "destructive" }),
  });

  const loyaltyMut = useMutation({
    mutationFn: ({ action, customer_id, points }: any) =>
      api("POST", `/api/restaurant/loyalty/${action}`, { customer_id, points: parseInt(points) }),
    onSuccess: () => { toast({ title: "Points updated" }); invalidate(); setPointsAction(null); setPointsAmount(""); },
    onError: () => toast({ title: "Error updating points", variant: "destructive" }),
  });

  const configMut = useMutation({
    mutationFn: (data: any) => api("PUT", "/api/restaurant/loyalty/config", data),
    onSuccess: () => { toast({ title: "Loyalty config updated" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/loyalty/config"] }); },
    onError: () => toast({ title: "Error updating config", variant: "destructive" }),
  });

  const resetForm = () => { setForm({ ...emptyForm }); setShowForm(false); setEditId(null); };

  const startEdit = (c: any) => {
    setForm({
      customer_name: c.customer_name || "", customer_phone: c.customer_phone || "",
      email: c.email || "", date_of_birth: c.date_of_birth?.split("T")[0] || "",
      anniversary_date: c.anniversary_date?.split("T")[0] || "", gstin: c.gstin || "", address: c.address || "",
    });
    setEditId(c.id); setShowForm(true); setSelectedCustomer(null);
  };

  const validatePhone = (p: string) => /^\d{10}$/.test(p);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const counts = {
    total: customers.length,
    bronze: customers.filter((c: any) => c.loyalty_tier === "bronze").length,
    silver: customers.filter((c: any) => c.loyalty_tier === "silver").length,
    gold: customers.filter((c: any) => c.loyalty_tier === "gold").length,
    avgPoints: customers.length ? Math.round(customers.reduce((s: number, c: any) => s + (c.loyalty_points || 0), 0) / customers.length) : 0,
  };

  const effectiveConfig = configForm.id ? configForm : (config || {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <Button variant={tab === "customers" ? "default" : "outline"} onClick={() => setTab("customers")}>Customers</Button>
          <Button variant={tab === "loyalty" ? "default" : "outline"} onClick={() => setTab("loyalty")}>Loyalty Program</Button>
        </div>
      </div>

      {tab === "customers" && (
        <>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Total Members", value: counts.total },
              { label: "🥉 Bronze", value: counts.bronze },
              { label: "🥈 Silver", value: counts.silver },
              { label: "🥇 Gold", value: counts.gold },
              { label: "Avg Points", value: counts.avgPoints },
            ].map(c => (
              <Card key={c.label}><CardContent className="pt-4"><p className="text-sm text-gray-500">{c.label}</p><p className="text-2xl font-bold">{c.value}</p></CardContent></Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Input placeholder="Search by name or phone..." value={search} onChange={e => handleSearchChange(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Add Customer</Button>
          </div>

          {showForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader><CardTitle>{editId ? "Edit Customer" : "Add Customer"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Name *</label>
                    <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Phone * (10 digits)</label>
                    <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} maxLength={10} /></div>
                  <div><label className="text-sm font-medium">Email</label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Date of Birth</label>
                    <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Anniversary</label>
                    <Input type="date" value={form.anniversary_date} onChange={e => setForm(f => ({ ...f, anniversary_date: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">GSTIN</label>
                    <Input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} maxLength={15} /></div>
                  <div className="col-span-2"><label className="text-sm font-medium">Address</label>
                    <textarea className="w-full border rounded p-2 text-sm" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => {
                    if (!form.customer_name) return toast({ title: "Name required", variant: "destructive" });
                    if (!validatePhone(form.customer_phone)) return toast({ title: "Enter valid 10-digit phone", variant: "destructive" });
                    saveMut.mutate(form);
                  }} disabled={saveMut.isPending}>{saveMut.isPending ? "Saving..." : editId ? "Update" : "Add Customer"}</Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedCustomer && (
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  {selectedCustomer.customer_name}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(selectedCustomer)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>✕</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-400">Phone</span><p>{selectedCustomer.customer_phone}</p></div>
                  <div><span className="text-gray-400">Email</span><p>{selectedCustomer.email || "—"}</p></div>
                  <div><span className="text-gray-400">Tier</span>
                    <span className={`px-2 py-1 rounded text-xs ml-1 ${TIER_STYLES[selectedCustomer.loyalty_tier] || "bg-gray-100"}`}>
                      {TIER_ICON[selectedCustomer.loyalty_tier] || ""} {selectedCustomer.loyalty_tier || "none"}
                    </span>
                  </div>
                  <div><span className="text-gray-400">Points</span><p className="font-bold text-purple-700">{selectedCustomer.loyalty_points || 0}</p></div>
                  <div><span className="text-gray-400">Total Visits</span><p>{selectedCustomer.total_visits || 0}</p></div>
                  <div><span className="text-gray-400">Total Spend</span><p>{fmt(selectedCustomer.total_spend)}</p></div>
                  <div><span className="text-gray-400">Last Visit</span><p>{selectedCustomer.last_visit?.split("T")[0] || "—"}</p></div>
                  <div><span className="text-gray-400">GSTIN</span><p>{selectedCustomer.gstin || "—"}</p></div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-green-700" onClick={() => setPointsAction("earn")}>+ Add Points</Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => setPointsAction("redeem")}>- Deduct Points</Button>
                </div>

                {pointsAction && (
                  <div className="flex gap-2 items-center">
                    <Input type="number" placeholder={`Points to ${pointsAction}`} value={pointsAmount} onChange={e => setPointsAmount(e.target.value)} className="w-36" />
                    <Button size="sm" onClick={() => loyaltyMut.mutate({ action: pointsAction, customer_id: selectedCustomer.id, points: pointsAmount })} disabled={!pointsAmount || loyaltyMut.isPending}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setPointsAction(null); setPointsAmount(""); }}>Cancel</Button>
                  </div>
                )}

                {customerHistory.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Visit History (last 10)</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Bill</TableHead><TableHead>Items</TableHead><TableHead>Points Earned</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {customerHistory.slice(0, 10).map((h: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{h.visit_date?.split("T")[0] || h.created_at?.split("T")[0]}</TableCell>
                            <TableCell>{fmt(h.total_amount || h.grand_total)}</TableCell>
                            <TableCell>{h.item_count || "—"}</TableCell>
                            <TableCell>{h.points_earned || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Customer List ({customers.length})</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <p className="text-center text-gray-400 py-8">Loading...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                      <TableHead>DOB</TableHead><TableHead>Tier</TableHead><TableHead>Points</TableHead>
                      <TableHead>Visits</TableHead><TableHead>Total Spend</TableHead><TableHead>Last Visit</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-gray-400">No customers found</TableCell></TableRow>
                    ) : customers.map((c: any) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedCustomer(c)}>
                        <TableCell className="font-medium">{c.customer_name}</TableCell>
                        <TableCell>{c.customer_phone}</TableCell>
                        <TableCell>{c.email || "—"}</TableCell>
                        <TableCell>{c.date_of_birth?.split("T")[0] || "—"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-xs ${TIER_STYLES[c.loyalty_tier] || "bg-gray-100 text-gray-600"}`}>
                            {TIER_ICON[c.loyalty_tier] || ""} {c.loyalty_tier || "none"}
                          </span>
                        </TableCell>
                        <TableCell>{c.loyalty_points || 0}</TableCell>
                        <TableCell>{c.total_visits || 0}</TableCell>
                        <TableCell>{fmt(c.total_spend)}</TableCell>
                        <TableCell>{c.last_visit?.split("T")[0] || "—"}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "loyalty" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { tier: "bronze", label: "Bronze", desc: `Spend ₹0 – ₹${(effectiveConfig.silver_threshold || 5000).toLocaleString()}`, color: "bg-amber-50 border-amber-200" },
              { tier: "silver", label: "Silver", desc: `Spend ₹${(effectiveConfig.silver_threshold || 5000).toLocaleString()} – ₹${(effectiveConfig.gold_threshold || 15000).toLocaleString()}`, color: "bg-gray-50 border-gray-200" },
              { tier: "gold", label: "Gold", desc: `Spend ₹${(effectiveConfig.gold_threshold || 15000).toLocaleString()}+`, color: "bg-yellow-50 border-yellow-200" },
            ].map(t => (
              <Card key={t.tier} className={`border-2 ${t.color}`}>
                <CardContent className="pt-4">
                  <p className="text-lg font-bold">{TIER_ICON[t.tier]} {t.label}</p>
                  <p className="text-sm text-gray-600">{t.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">Earn {effectiveConfig.points_per_100_rupees || 1} pt per ₹100</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm text-blue-800">
              <strong>Points Example:</strong> Spend ₹500 → earn {Math.floor(5 * (effectiveConfig.points_per_100_rupees || 1))} points → worth {fmt(Math.floor(5 * (effectiveConfig.points_per_100_rupees || 1)) * (effectiveConfig.redemption_rate || 1))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Loyalty Configuration</CardTitle></CardHeader>
            <CardContent>
              {loadingConfig ? <p className="text-center text-gray-400">Loading config...</p> : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "points_per_100_rupees", label: "Points per ₹100 spent", type: "number" },
                    { key: "redemption_rate", label: "₹ value per point", type: "number" },
                    { key: "bronze_threshold", label: "Bronze min spend (₹)", type: "number" },
                    { key: "silver_threshold", label: "Silver threshold (₹)", type: "number" },
                    { key: "gold_threshold", label: "Gold threshold (₹)", type: "number" },
                    { key: "expiry_days", label: "Points expiry (days)", type: "number" },
                  ].map(f => (
                    <div key={f.key}><label className="text-sm font-medium">{f.label}</label>
                      <Input type="number" value={configForm[f.key] ?? ""} onChange={e => setConfigForm((c: any) => ({ ...c, [f.key]: parseFloat(e.target.value) }))} /></div>
                  ))}
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="loyalty_active" checked={configForm.is_active ?? true}
                      onChange={e => setConfigForm((c: any) => ({ ...c, is_active: e.target.checked }))} />
                    <label htmlFor="loyalty_active" className="text-sm font-medium">Loyalty program active</label>
                  </div>
                  <div className="col-span-2">
                    <Button onClick={() => configMut.mutate(configForm)} disabled={configMut.isPending}>
                      {configMut.isPending ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
