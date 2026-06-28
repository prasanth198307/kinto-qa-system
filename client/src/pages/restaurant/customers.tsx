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
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const TIER_COLORS: Record<string, string> = { bronze: "bg-amber-100 text-amber-800", silver: "bg-gray-200 text-gray-700", gold: "bg-yellow-100 text-yellow-800" };
const BLANK_FORM = { name: "", phone: "", email: "", date_of_birth: "", anniversary_date: "", gstin: "" };

export default function RestaurantCustomersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"customers" | "loyalty">("customers");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [loyaltyForm, setLoyaltyForm] = useState<any>(null);

  const { data: customers = [] } = useQuery({ queryKey: ["/api/restaurant/customers", search], queryFn: () => api("GET", `/api/restaurant/customers?search=${encodeURIComponent(search)}`), enabled: tab === "customers" });
  const { data: history = [] } = useQuery({ queryKey: ["/api/restaurant/customers", selectedId, "history"], queryFn: () => api("GET", `/api/restaurant/customers/${selectedId}/history`), enabled: !!selectedId });
  const { data: loyaltyConfig, isSuccess: loyaltyLoaded } = useQuery({ queryKey: ["/api/restaurant/loyalty/config"], queryFn: () => api("GET", "/api/restaurant/loyalty/config"), enabled: tab === "loyalty" });

  if (loyaltyLoaded && loyaltyConfig && !loyaltyForm) setLoyaltyForm({ ...loyaltyConfig });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/customers"] });

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api("PUT", `/api/restaurant/customers/${editId}`, d) : api("POST", "/api/restaurant/customers", d),
    onSuccess: () => { invalidate(); setShowForm(false); setEditId(null); setForm({ ...BLANK_FORM }); toast({ title: editId ? "Customer updated" : "Customer added" }); }
  });

  const loyaltySaveMut = useMutation({
    mutationFn: (d: any) => api("PUT", "/api/restaurant/loyalty/config", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/loyalty/config"] }); toast({ title: "Loyalty config saved" }); }
  });

  const openEdit = (c: any) => { setForm({ name: c.name, phone: c.phone, email: c.email || "", date_of_birth: c.date_of_birth || "", anniversary_date: c.anniversary_date || "", gstin: c.gstin || "" }); setEditId(c.id); setShowForm(true); };

  const tiers = ["bronze", "silver", "gold"];
  const tierStats = tiers.map(t => ({ tier: t, count: customers.filter((c: any) => c.tier === t).length }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 border-b pb-2">
        {(["customers", "loyalty"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => { setTab(t); setSelectedId(null); setShowForm(false); }}>
            {t === "customers" ? "Customers" : "Loyalty Program"}
          </Button>
        ))}
      </div>

      {tab === "customers" && (
        <>
          <div className="flex gap-3 items-center">
            <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...BLANK_FORM }); }}>+ Add Customer</Button>
          </div>

          {showForm && (
            <Card><CardHeader><CardTitle>{editId ? "Edit Customer" : "New Customer"}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[["name", "Name *", "text"], ["phone", "Phone *", "text"], ["email", "Email", "email"], ["date_of_birth", "Date of Birth", "date"], ["anniversary_date", "Anniversary", "date"], ["gstin", "GSTIN", "text"]].map(([k, label, type]) => (
                  <div key={k}><label className="text-sm font-medium">{label}</label>
                    <Input type={type} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
                </div>
              </CardContent></Card>
          )}

          <div className="flex gap-3">
            {tierStats.map(({ tier, count }) => (
              <Card key={tier} className="flex-1"><CardContent className="pt-4 text-center">
                <Badge className={TIER_COLORS[tier]}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </CardContent></Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>{["Name", "Phone", "Email", "Tier", "Points", "Visits", "Spend", "Last Visit", ""].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {customers.map((c: any) => (
                      <TableRow key={c.id} className={selectedId === c.id ? "bg-blue-50" : "cursor-pointer hover:bg-gray-50"} onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>{c.email || "—"}</TableCell>
                        <TableCell><Badge className={TIER_COLORS[c.tier] || ""}>{c.tier || "bronze"}</Badge></TableCell>
                        <TableCell>{c.loyalty_points || 0}</TableCell>
                        <TableCell>{c.total_visits || 0}</TableCell>
                        <TableCell>₹{fmt(c.total_spend)}</TableCell>
                        <TableCell>{c.last_visit ? c.last_visit.split("T")[0] : "—"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEdit(c); }}>Edit</Button></TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No customers found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>

            {selectedId && (
              <Card><CardHeader><CardTitle className="text-sm">Visit History</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {history.length === 0 ? <p className="text-gray-400 text-sm">No history</p> : history.map((h: any, i: number) => (
                    <div key={i} className="border-b pb-2 text-sm">
                      <div className="font-medium">{h.date?.split("T")[0]}</div>
                      <div className="text-gray-600">₹{fmt(h.amount)} · {h.items} items</div>
                      {h.points_earned && <div className="text-green-600">+{h.points_earned} pts</div>}
                    </div>
                  ))}
                </CardContent></Card>
            )}
          </div>
        </>
      )}

      {tab === "loyalty" && loyaltyForm && (
        <div className="space-y-4 max-w-lg">
          <Card><CardHeader><CardTitle>Loyalty Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[["points_per_100_rupees", "Points per ₹100", "number"], ["redemption_rate", "₹ per Point (redemption)", "number"], ["silver_threshold", "Silver Threshold (₹ spend)", "number"], ["gold_threshold", "Gold Threshold (₹ spend)", "number"], ["expiry_days", "Points Expiry (days)", "number"]].map(([k, label, type]) => (
                <div key={k}><label className="text-sm font-medium">{label}</label>
                  <Input type={type} value={loyaltyForm[k] ?? ""} onChange={e => setLoyaltyForm((f: any) => ({ ...f, [k]: e.target.value }))} /></div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Active</label>
                <button type="button" onClick={() => setLoyaltyForm((f: any) => ({ ...f, is_active: !f.is_active }))}
                  className={`w-10 h-6 rounded-full transition-colors ${loyaltyForm.is_active ? "bg-green-500" : "bg-gray-300"} relative`}>
                  <span className={`block w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${loyaltyForm.is_active ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              <Button onClick={() => loyaltySaveMut.mutate(loyaltyForm)} disabled={loyaltySaveMut.isPending}>Save Config</Button>
            </CardContent></Card>

          <Card><CardHeader><CardTitle>Tier Summary</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {tiers.map(t => (
                <div key={t} className="text-center">
                  <Badge className={TIER_COLORS[t]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Badge>
                  <div className="text-2xl font-bold mt-1">{tierStats.find(s => s.tier === t)?.count ?? 0}</div>
                  <div className="text-xs text-gray-500">members</div>
                </div>
              ))}
            </CardContent></Card>
        </div>
      )}
    </div>
  );
}
