import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function FrontDeskTab() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: kpi = {} } = useQuery({ queryKey: ["/api/hotel/kpi"], queryFn: () => apiRequest("GET", "/api/hotel/kpi") });
  const cards = [
    { label: "Rooms Occupied", value: kpi.rooms_occupied || 0 },
    { label: "Occupancy %", value: `${fmt(kpi.occupancy_pct)}%` },
    { label: "ADR", value: `${sym}${fmt(kpi.adr)}` },
    { label: "RevPAR", value: `${sym}${fmt(kpi.revpar)}` },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {cards.map(c => <Card key={c.label}><CardContent className="pt-4"><div className="text-xs text-gray-500">{c.label}</div><div className="text-2xl font-bold">{c.value}</div></CardContent></Card>)}
      </div>
      <div className="flex gap-3">
        <Badge variant="secondary">Arrivals Today: {kpi.arrivals_today || 0}</Badge>
        <Badge variant="outline">Departures Today: {kpi.departures_today || 0}</Badge>
      </div>
      <Button>+ New Reservation</Button>
      <Card><CardContent className="pt-4 text-sm text-gray-400">No alerts</CardContent></Card>
    </div>
  );
}

function RatePlansTab() {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["/api/hotel/rate-plans"], queryFn: () => apiRequest("GET", "/api/hotel/rate-plans") });
  const [f, setF] = useState({ plan_name: "", plan_code: "", plan_type: "standard", meal_plan: "ro", is_refundable: true });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/hotel/rate-plans", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/rate-plans"] }) });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Add Rate Plan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Plan Name" value={f.plan_name} onChange={e => setF({ ...f, plan_name: e.target.value })} />
          <Input placeholder="Plan Code" value={f.plan_code} onChange={e => setF({ ...f, plan_code: e.target.value })} />
          <Select value={f.plan_type} onValueChange={v => setF({ ...f, plan_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["standard","corporate","ota","package"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <Select value={f.meal_plan} onValueChange={v => setF({ ...f, meal_plan: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["ro","ep","cp","map","ap"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => add.mutate(f)}>Add Plan</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Meal</TableHead><TableHead>Refundable</TableHead></TableRow></TableHeader>
        <TableBody>{plans.map((p: any) => <TableRow key={p.id}><TableCell>{p.plan_name}</TableCell><TableCell>{p.plan_type}</TableCell><TableCell>{p.meal_plan?.toUpperCase()}</TableCell><TableCell>{p.is_refundable ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function PackagesTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const qc = useQueryClient();
  const { data: pkgs = [] } = useQuery({ queryKey: ["/api/hotel/packages"], queryFn: () => apiRequest("GET", "/api/hotel/packages") });
  const [f, setF] = useState({ package_name: "", room_type_id: "", rate_plan_id: "", package_price: "", valid_from: "", valid_to: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/hotel/packages", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/packages"] }) });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Add Package</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Package Name" value={f.package_name} onChange={e => setF({ ...f, package_name: e.target.value })} />
          <Input placeholder="Price" value={f.package_price} onChange={e => setF({ ...f, package_price: e.target.value })} />
          <Input type="date" value={f.valid_from} onChange={e => setF({ ...f, valid_from: e.target.value })} />
          <Input type="date" value={f.valid_to} onChange={e => setF({ ...f, valid_to: e.target.value })} />
          <Button onClick={() => add.mutate(f)}>Add Package</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Valid From</TableHead><TableHead>Valid To</TableHead></TableRow></TableHeader>
        <TableBody>{pkgs.map((p: any) => <TableRow key={p.id}><TableCell>{p.package_name}</TableCell><TableCell>{sym}{fmt(p.package_price)}</TableCell><TableCell>{p.valid_from}</TableCell><TableCell>{p.valid_to}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function NightAuditTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const qc = useQueryClient();
  const { data: history = [] } = useQuery({ queryKey: ["/api/hotel/night-audit/history"], queryFn: () => apiRequest("GET", "/api/hotel/night-audit/history") });
  const run = useMutation({ mutationFn: () => apiRequest("POST", "/api/hotel/night-audit/run", {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/night-audit/history"] }) });
  return (
    <div className="space-y-4">
      <Button onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Running..." : "Run Night Audit"}</Button>
      <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Rooms</TableHead><TableHead>Occ%</TableHead><TableHead>Revenue</TableHead><TableHead>ADR</TableHead><TableHead>RevPAR</TableHead></TableRow></TableHeader>
        <TableBody>{history.map((h: any) => <TableRow key={h.id}><TableCell>{h.audit_date}</TableCell><TableCell>{h.rooms_occupied}</TableCell><TableCell>{fmt(h.occupancy_pct)}%</TableCell><TableCell>{sym}{fmt(h.room_revenue)}</TableCell><TableCell>{sym}{fmt(h.adr)}</TableCell><TableCell>{sym}{fmt(h.revpar)}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function CorporateTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const qc = useQueryClient();
  const { data: corps = [] } = useQuery({ queryKey: ["/api/hotel/corporate-accounts"], queryFn: () => apiRequest("GET", "/api/hotel/corporate-accounts") });
  const { data: agents = [] } = useQuery({ queryKey: ["/api/hotel/travel-agents"], queryFn: () => apiRequest("GET", "/api/hotel/travel-agents") });
  const [cf, setCf] = useState({ company_name: "", gstin: "", credit_limit: "", credit_days: "" });
  const [af, setAf] = useState({ agent_name: "", agent_code: "", commission_pct: "", iata_number: "" });
  const addCorp = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/hotel/corporate-accounts", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/corporate-accounts"] }) });
  const addAgent = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/hotel/travel-agents", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/travel-agents"] }) });
  return (
    <Tabs defaultValue="corporate">
      <TabsList><TabsTrigger value="corporate">Corporate</TabsTrigger><TabsTrigger value="agents">Travel Agents</TabsTrigger></TabsList>
      <TabsContent value="corporate" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Company" value={cf.company_name} onChange={e => setCf({ ...cf, company_name: e.target.value })} /><Input placeholder="GSTIN" value={cf.gstin} onChange={e => setCf({ ...cf, gstin: e.target.value })} /><Input placeholder="Credit Limit" value={cf.credit_limit} onChange={e => setCf({ ...cf, credit_limit: e.target.value })} /><Button onClick={() => addCorp.mutate(cf)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>GSTIN</TableHead><TableHead>Credit Limit</TableHead></TableRow></TableHeader><TableBody>{corps.map((c: any) => <TableRow key={c.id}><TableCell>{c.company_name}</TableCell><TableCell>{c.gstin}</TableCell><TableCell>{sym}{fmt(c.credit_limit)}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
      <TabsContent value="agents" className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Agent Name" value={af.agent_name} onChange={e => setAf({ ...af, agent_name: e.target.value })} /><Input placeholder="Code" value={af.agent_code} onChange={e => setAf({ ...af, agent_code: e.target.value })} /><Input placeholder="Commission%" value={af.commission_pct} onChange={e => setAf({ ...af, commission_pct: e.target.value })} /><Button onClick={() => addAgent.mutate(af)}>Add</Button></div>
        <Table><TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Code</TableHead><TableHead>Commission%</TableHead><TableHead>IATA</TableHead></TableRow></TableHeader><TableBody>{agents.map((a: any) => <TableRow key={a.id}><TableCell>{a.agent_name}</TableCell><TableCell>{a.agent_code}</TableCell><TableCell>{a.commission_pct}%</TableCell><TableCell>{a.iata_number}</TableCell></TableRow>)}</TableBody></Table>
      </TabsContent>
    </Tabs>
  );
}

function LostFoundTab() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/hotel/lost-found"], queryFn: () => apiRequest("GET", "/api/hotel/lost-found") });
  const [f, setF] = useState({ item_description: "", found_location: "", found_by: "", room_number: "", guest_name: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/hotel/lost-found", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/lost-found"] }) });
  const statusColor: Record<string, any> = { "In Custody": "secondary", "Claimed": "default", "Disposed": "destructive" };
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Report Item</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Description" value={f.item_description} onChange={e => setF({ ...f, item_description: e.target.value })} />
          <Input placeholder="Location Found" value={f.found_location} onChange={e => setF({ ...f, found_location: e.target.value })} />
          <Input placeholder="Found By" value={f.found_by} onChange={e => setF({ ...f, found_by: e.target.value })} />
          <Input placeholder="Room No." value={f.room_number} onChange={e => setF({ ...f, room_number: e.target.value })} />
          <Input placeholder="Guest Name" value={f.guest_name} onChange={e => setF({ ...f, guest_name: e.target.value })} />
          <Button onClick={() => add.mutate(f)}>Add</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Location</TableHead><TableHead>Room</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{items.map((i: any) => <TableRow key={i.id}><TableCell>{i.item_description}</TableCell><TableCell>{i.found_location}</TableCell><TableCell>{i.room_number}</TableCell><TableCell><Badge variant={statusColor[i.status] || "secondary"}>{i.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function OnlineBookingsTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const { data: bookings = [] } = useQuery({ queryKey: ["/api/hotel/online-booking"], queryFn: () => apiRequest("GET", "/api/hotel/online-booking") });
  const qc = useQueryClient();
  const confirm = useMutation({ mutationFn: (id: any) => apiRequest("POST", "/api/hotel/online-booking/confirm", { booking_id: id }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/online-booking"] }) });
  const statusColor: Record<string, any> = { confirmed: "default", pending: "secondary", cancelled: "destructive" };
  return (
    <Table><TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Room Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>{bookings.map((b: any) => <TableRow key={b.id}><TableCell>{b.guest_name}</TableCell><TableCell>{b.check_in_date}</TableCell><TableCell>{b.check_out_date}</TableCell><TableCell>{b.room_type}</TableCell><TableCell>{sym}{fmt(b.total_amount)}</TableCell><TableCell><Badge variant={statusColor[b.status] || "secondary"}>{b.status}</Badge></TableCell><TableCell>{b.status === "pending" && <Button size="sm" onClick={() => confirm.mutate(b.id)}>Confirm</Button>}</TableCell></TableRow>)}</TableBody>
    </Table>
  );
}

function HotelReportsTab() {
  const [type, setType] = useState("occupancy"); const [date, setDate] = useState(""); const [data, setData] = useState<any[]>([]);
  const fetch = async () => { try { const r = await apiRequest("GET", `/api/hotel/reports/${type}?date=${date}`); setData(Array.isArray(r) ? r : r.data || []); } catch { setData([]); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{["occupancy","revenue","arrivals-departures","night-audit-report","corporate-billing","agent-commission"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36" />
        <Button onClick={fetch}>Fetch</Button>
      </div>
      {data.length > 0 && <Table><TableHeader><TableRow>{Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row, i) => <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j}>{String(v)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </div>
  );
}

export default function HotelEnterprisePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Hotel Enterprise</h1>
      <Tabs defaultValue="frontdesk">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          {[["frontdesk","Front Desk"],["rateplans","Rate Plans"],["packages","Packages"],["nightaudit","Night Audit"],["corporate","Corporate"],["lostandfound","Lost & Found"],["onlinebookings","Online Bookings"],["reports","Reports"]].map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="frontdesk"><FrontDeskTab /></TabsContent>
        <TabsContent value="rateplans"><RatePlansTab /></TabsContent>
        <TabsContent value="packages"><PackagesTab /></TabsContent>
        <TabsContent value="nightaudit"><NightAuditTab /></TabsContent>
        <TabsContent value="corporate"><CorporateTab /></TabsContent>
        <TabsContent value="lostandfound"><LostFoundTab /></TabsContent>
        <TabsContent value="onlinebookings"><OnlineBookingsTab /></TabsContent>
        <TabsContent value="reports"><HotelReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
