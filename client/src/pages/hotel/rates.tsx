import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MEAL_PLANS = [
  { code: "EP", label: "EP — European Plan (No meals)" },
  { code: "CP", label: "CP — Continental Plan (Breakfast)" },
  { code: "MAP", label: "MAP — Modified American Plan (Breakfast + Dinner)" },
  { code: "AP", label: "AP — American Plan (All meals)" },
];

const EMPTY_PLAN = { name: "", meal_plan: "EP", base_rate: "", weekend_rate: "", valid_from: "", valid_to: "", description: "" };
const EMPTY_CHANNEL = { channel_name: "", room_type_id: "", base_rate: "", commission_pct: "", valid_from: "", valid_to: "" };

export default function HotelRatesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"plans" | "channels">("plans");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ ...EMPTY_PLAN });
  const [channelForm, setChannelForm] = useState({ ...EMPTY_CHANNEL });

  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rate-plans"], queryFn: () => api("GET", "/api/hotel/rate-plans") });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/channel-rates"], queryFn: () => api("GET", "/api/hotel/channel-rates") });
  const { data: roomTypes = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/room-types"], queryFn: () => api("GET", "/api/hotel/room-types") });

  const createPlan = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/rate-plans", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/rate-plans"] }); setShowPlanForm(false); setPlanForm({ ...EMPTY_PLAN }); } });
  const updatePlan = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/hotel/rate-plans/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/rate-plans"] }); setEditingPlan(null); setShowPlanForm(false); } });
  const deletePlan = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/rate-plans/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/rate-plans"] }) });
  const createChannel = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/channel-rates", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/channel-rates"] }); setShowChannelForm(false); setChannelForm({ ...EMPTY_CHANNEL }); } });
  const deleteChannel = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/channel-rates/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/channel-rates"] }) });

  const pf = (k: string, v: string) => setPlanForm(p => ({ ...p, [k]: v }));
  const chf = (k: string, v: string) => setChannelForm(p => ({ ...p, [k]: v }));

  const plansArr = Array.isArray(plans) ? plans : [];
  const channelsArr = Array.isArray(channels) ? channels : [];
  const typesArr = Array.isArray(roomTypes) ? roomTypes : [];

  const openEditPlan = (p: any) => { setEditingPlan(p); setPlanForm({ name: p.name || "", meal_plan: p.meal_plan || "EP", base_rate: String(p.base_rate || ""), weekend_rate: String(p.weekend_rate || ""), valid_from: p.valid_from?.slice(0, 10) || "", valid_to: p.valid_to?.slice(0, 10) || "", description: p.description || "" }); setShowPlanForm(true); };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6 text-blue-600" />Rates Management</h1>

      <div className="flex gap-2">
        <Button variant={tab === "plans" ? "default" : "outline"} onClick={() => setTab("plans")}>Rate Plans ({plansArr.length})</Button>
        <Button variant={tab === "channels" ? "default" : "outline"} onClick={() => setTab("channels")}>Channel Rates ({channelsArr.length})</Button>
      </div>

      {tab === "plans" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPlan(null); setPlanForm({ ...EMPTY_PLAN }); setShowPlanForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Rate Plan</Button>
          </div>

          {showPlanForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{editingPlan ? "Edit Rate Plan" : "New Rate Plan"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowPlanForm(false); setEditingPlan(null); }}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Plan Name</Label><Input value={planForm.name} onChange={e => pf("name", e.target.value)} placeholder="Summer Special, Weekend..." /></div>
                <div><Label>Meal Plan</Label>
                  <Select value={planForm.meal_plan} onValueChange={v => pf("meal_plan", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MEAL_PLANS.map(m => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Base Rate (₹/night)</Label><Input type="number" value={planForm.base_rate} onChange={e => pf("base_rate", e.target.value)} /></div>
                <div><Label>Weekend Rate (₹/night)</Label><Input type="number" value={planForm.weekend_rate} onChange={e => pf("weekend_rate", e.target.value)} /></div>
                <div><Label>Valid From</Label><Input type="date" value={planForm.valid_from} onChange={e => pf("valid_from", e.target.value)} /></div>
                <div><Label>Valid To</Label><Input type="date" value={planForm.valid_to} onChange={e => pf("valid_to", e.target.value)} /></div>
                <div className="col-span-3"><Label>Description</Label><Input value={planForm.description} onChange={e => pf("description", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowPlanForm(false); setEditingPlan(null); }}>Cancel</Button>
                  <Button onClick={() => { const b = { ...planForm, base_rate: parseFloat(planForm.base_rate || "0"), weekend_rate: parseFloat(planForm.weekend_rate || "0") }; editingPlan ? updatePlan.mutate({ id: editingPlan.id, b }) : createPlan.mutate(b); }}>{editingPlan ? "Save" : "Create"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            {plansArr.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-600">{MEAL_PLANS.find(m => m.code === p.meal_plan)?.label ?? p.meal_plan}</p>
                    <p className="text-sm font-medium mt-1">Base: ₹{Number(p.base_rate ?? 0).toLocaleString("en-IN")}/night · Weekend: ₹{Number(p.weekend_rate ?? 0).toLocaleString("en-IN")}/night</p>
                    {p.valid_from && <p className="text-xs text-gray-400">{p.valid_from?.slice(0, 10)} → {p.valid_to?.slice(0, 10)}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditPlan(p)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePlan.mutate(p.id)}>Del</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {plansArr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No rate plans defined.</p>}
          </div>
        </div>
      )}

      {tab === "channels" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">OTA channel rates with commission. Live sync requires commercial OTA partnership (MakeMyTrip, Booking.com).</p>
            <Button onClick={() => setShowChannelForm(true)}><Plus className="w-4 h-4 mr-1" />Add Channel Rate</Button>
          </div>

          {showChannelForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Channel Rate</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowChannelForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Channel</Label><Input value={channelForm.channel_name} onChange={e => chf("channel_name", e.target.value)} placeholder="MakeMyTrip, Booking.com..." /></div>
                <div><Label>Room Type</Label>
                  <Select value={channelForm.room_type_id} onValueChange={v => chf("room_type_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{typesArr.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Rate (₹/night)</Label><Input type="number" value={channelForm.base_rate} onChange={e => chf("base_rate", e.target.value)} /></div>
                <div><Label>Commission (%)</Label><Input type="number" value={channelForm.commission_pct} onChange={e => chf("commission_pct", e.target.value)} /></div>
                <div><Label>Valid From</Label><Input type="date" value={channelForm.valid_from} onChange={e => chf("valid_from", e.target.value)} /></div>
                <div><Label>Valid To</Label><Input type="date" value={channelForm.valid_to} onChange={e => chf("valid_to", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowChannelForm(false)}>Cancel</Button>
                  <Button onClick={() => createChannel.mutate({ ...channelForm, room_type_id: parseInt(channelForm.room_type_id), base_rate: parseFloat(channelForm.base_rate || "0"), commission_pct: parseFloat(channelForm.commission_pct || "0") })}>Add</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">{["Channel", "Room Type", "Rate/Night", "Commission %", "Net Rate", "Valid", ""].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>
              {channelsArr.map((c: any) => (
                <tr key={c.id} className="border-b">
                  <td className="p-2 font-medium">{c.channel_name}</td>
                  <td className="p-2">{c.room_type_name ?? `Type ${c.room_type_id}`}</td>
                  <td className="p-2">₹{Number(c.base_rate ?? 0).toLocaleString("en-IN")}</td>
                  <td className="p-2">{c.commission_pct}%</td>
                  <td className="p-2 font-medium text-green-700">₹{Math.round(Number(c.base_rate ?? 0) * (1 - (c.commission_pct ?? 0) / 100)).toLocaleString("en-IN")}</td>
                  <td className="p-2 text-xs text-gray-500">{c.valid_from?.slice(0, 10)} → {c.valid_to?.slice(0, 10)}</td>
                  <td className="p-2"><Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteChannel.mutate(c.id)}>Del</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {channelsArr.length === 0 && <p className="text-center text-gray-400 py-6">No channel rates defined.</p>}
        </div>
      )}
    </div>
  );
}
