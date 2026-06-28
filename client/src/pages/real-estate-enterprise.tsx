import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const LEAD_STAGES = ["New", "Contacted", "Site Visit", "Negotiation", "Booking", "Lost"];

function DashboardTab() {
  const { data: kpi = {} } = useQuery({ queryKey: ["/api/real-estate/reports/unit-status-inventory"], queryFn: () => apiRequest("GET", "/api/real-estate/reports/unit-status-inventory") });
  const cards = [["Total Units", kpi.total_units], ["Sold", kpi.sold], ["Booked", kpi.booked], ["Available", kpi.available], ["Revenue", `₹${fmt(kpi.revenue_collected)}`]];
  const funnel = [["Leads", kpi.leads], ["Site Visits", kpi.site_visits], ["Negotiations", kpi.negotiations], ["Bookings", kpi.bookings], ["Possessed", kpi.possessed]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">{cards.map(([l, v]) => <Card key={l as string}><CardContent className="pt-4"><div className="text-xs text-gray-500">{l}</div><div className="text-xl font-bold">{v ?? 0}</div></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle className="text-sm">Sales Funnel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funnel.map(([label, count]) => <div key={label as string} className="flex items-center gap-2"><span className="w-28 text-sm">{label}</span><div className="bg-blue-500 h-5 rounded" style={{ width: `${Math.min((Number(count || 0) / (Number(funnel[0][1] || 1))) * 300, 300)}px` }} /><span className="text-sm">{count ?? 0}</span></div>)}
        </CardContent>
      </Card>
    </div>
  );
}

function CRMTab() {
  const qc = useQueryClient();
  const { data: pipeline = {} } = useQuery({ queryKey: ["/api/real-estate/leads/pipeline"], queryFn: () => apiRequest("GET", "/api/real-estate/leads/pipeline") });
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", source: "", interested_in: "", budget_min: "", budget_max: "", configuration: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/leads", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/leads/pipeline"] }); setShowAdd(false); } });
  const move = useMutation({ mutationFn: ({ id, stage }: any) => apiRequest("PUT", `/api/real-estate/leads/${id}/stage`, { stage }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/leads/pipeline"] }) });
  return (
    <div className="space-y-3">
      <Button onClick={() => setShowAdd(true)}>+ Add Lead</Button>
      <div className="grid grid-cols-6 gap-2 overflow-x-auto">
        {LEAD_STAGES.map(stage => {
          const leads = (pipeline[stage] || []);
          return (
            <div key={stage} className="bg-gray-50 rounded p-2 min-h-40">
              <div className="text-xs font-semibold text-gray-600 mb-2">{stage} ({leads.length})</div>
              {leads.map((l: any) => (
                <div key={l.id} className="bg-white border rounded p-2 mb-2 text-xs">
                  <div className="font-medium">{l.name}</div><div>{l.phone}</div><div>₹{fmt(l.budget_min)}-{fmt(l.budget_max)}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">{LEAD_STAGES.filter(s => s !== stage).slice(0,2).map(s => <button key={s} className="text-blue-600 underline text-xs" onClick={() => move.mutate({ id: l.id, stage: s })}>→{s}</button>)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
            <Input placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
            <Input placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
            <Input placeholder="Source" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} />
            <Input placeholder="Budget Min" value={f.budget_min} onChange={e => setF({ ...f, budget_min: e.target.value })} />
            <Input placeholder="Budget Max" value={f.budget_max} onChange={e => setF({ ...f, budget_max: e.target.value })} />
            <Input placeholder="Configuration (2BHK etc)" value={f.configuration} onChange={e => setF({ ...f, configuration: e.target.value })} />
            <Button onClick={() => add.mutate(f)}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SiteVisitsTab() {
  const qc = useQueryClient();
  const { data: visits = [] } = useQuery({ queryKey: ["/api/real-estate/site-visits"], queryFn: () => apiRequest("GET", "/api/real-estate/site-visits") });
  const [f, setF] = useState({ lead_id: "", visit_date: "", visit_time: "", sales_person: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/site-visits", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/site-visits"] }) });
  const outcomeColor: Record<string, any> = { positive: "default", neutral: "secondary", negative: "destructive" };
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Schedule Visit</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Lead ID" value={f.lead_id} onChange={e => setF({ ...f, lead_id: e.target.value })} />
          <Input type="date" value={f.visit_date} onChange={e => setF({ ...f, visit_date: e.target.value })} />
          <Input type="time" value={f.visit_time} onChange={e => setF({ ...f, visit_time: e.target.value })} />
          <Input placeholder="Sales Person" value={f.sales_person} onChange={e => setF({ ...f, sales_person: e.target.value })} />
          <Button onClick={() => add.mutate(f)}>Schedule</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Lead</TableHead><TableHead>Date</TableHead><TableHead>Sales Person</TableHead><TableHead>Outcome</TableHead><TableHead>Follow Up</TableHead></TableRow></TableHeader>
        <TableBody>{visits.map((v: any) => <TableRow key={v.id}><TableCell>{v.lead_name}</TableCell><TableCell>{v.visit_date}</TableCell><TableCell>{v.sales_person}</TableCell><TableCell>{v.outcome && <Badge variant={outcomeColor[v.outcome] || "secondary"}>{v.outcome}</Badge>}</TableCell><TableCell>{v.follow_up_date}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function BookingsTab() {
  const qc = useQueryClient();
  const { data: bookings = [] } = useQuery({ queryKey: ["/api/real-estate/bookings"], queryFn: () => apiRequest("GET", "/api/real-estate/bookings") });
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ lead_id: "", unit_id: "", total_amount: "", broker_id: "", loan_bank: "", loan_amount: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/bookings", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); setShowAdd(false); } });
  const statusColor: Record<string, any> = { active: "default", cancelled: "destructive", completed: "secondary" };
  return (
    <div className="space-y-3">
      <Button onClick={() => setShowAdd(true)}>+ New Booking</Button>
      <Table><TableHeader><TableRow><TableHead>Unit</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{bookings.map((b: any) => <TableRow key={b.id}><TableCell>{b.unit_number}</TableCell><TableCell>{b.customer_name}</TableCell><TableCell>₹{fmt(b.total_cost)}</TableCell><TableCell>₹{fmt(b.paid)}</TableCell><TableCell>₹{fmt(b.outstanding)}</TableCell><TableCell><Badge variant={statusColor[b.status] || "secondary"}>{b.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Lead ID" value={f.lead_id} onChange={e => setF({ ...f, lead_id: e.target.value })} />
            <Input placeholder="Unit ID" value={f.unit_id} onChange={e => setF({ ...f, unit_id: e.target.value })} />
            <Input placeholder="Total Amount" value={f.total_amount} onChange={e => setF({ ...f, total_amount: e.target.value })} />
            <Input placeholder="Broker ID" value={f.broker_id} onChange={e => setF({ ...f, broker_id: e.target.value })} />
            <Input placeholder="Loan Bank" value={f.loan_bank} onChange={e => setF({ ...f, loan_bank: e.target.value })} />
            <Input placeholder="Loan Amount" value={f.loan_amount} onChange={e => setF({ ...f, loan_amount: e.target.value })} />
            <Button onClick={() => add.mutate(f)}>Confirm Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollectionsTab() {
  const qc = useQueryClient();
  const { data: dues = [] } = useQuery({ queryKey: ["/api/real-estate/collections/dues"], queryFn: () => apiRequest("GET", "/api/real-estate/collections/dues") });
  const pay = useMutation({ mutationFn: ({ id, amount }: any) => apiRequest("POST", `/api/real-estate/bookings/${id}/payment`, { amount }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/collections/dues"] }) });
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});
  return (
    <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Unit</TableHead><TableHead>Demand</TableHead><TableHead>Paid</TableHead><TableHead>Due Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>{dues.map((d: any) => <TableRow key={d.id}><TableCell>{d.customer_name}</TableCell><TableCell>{d.unit_number}</TableCell><TableCell>₹{fmt(d.demand_amount)}</TableCell><TableCell>₹{fmt(d.paid_amount)}</TableCell><TableCell>{d.due_date} {d.is_overdue && <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>}</TableCell><TableCell className="flex gap-1"><Input className="w-24 h-7 text-xs" placeholder="Amount" value={payAmt[d.id] || ""} onChange={e => setPayAmt({ ...payAmt, [d.id]: e.target.value })} /><Button size="sm" className="h-7" onClick={() => pay.mutate({ id: d.booking_id, amount: payAmt[d.id] })}>Pay</Button></TableCell></TableRow>)}</TableBody>
    </Table>
  );
}

function ConstructionTab() {
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => apiRequest("GET", "/api/real-estate/projects") });
  const [project, setProject] = useState("");
  const { data: costs = [] } = useQuery({ queryKey: ["/api/real-estate/construction-costs", project], queryFn: () => apiRequest("GET", `/api/real-estate/construction-costs?project_id=${project}`), enabled: !!project });
  const [f, setF] = useState({ project_id: "", cost_category: "", description: "", contractor_name: "", bill_number: "", amount: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/real-estate/construction-costs", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-costs"] }) });
  return (
    <div className="space-y-4">
      <Select value={project} onValueChange={setProject}><SelectTrigger className="w-48"><SelectValue placeholder="Select Project" /></SelectTrigger><SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent></Select>
      <Card><CardHeader><CardTitle className="text-sm">Add Cost</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Category" value={f.cost_category} onChange={e => setF({ ...f, cost_category: e.target.value })} />
          <Input placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <Input placeholder="Contractor" value={f.contractor_name} onChange={e => setF({ ...f, contractor_name: e.target.value })} />
          <Input placeholder="Bill No." value={f.bill_number} onChange={e => setF({ ...f, bill_number: e.target.value })} />
          <Input placeholder="Amount" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
          <Button onClick={() => add.mutate({ ...f, project_id: project })}>Add</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Contractor</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{costs.map((c: any) => <TableRow key={c.id}><TableCell>{c.cost_category}</TableCell><TableCell>{c.description}</TableCell><TableCell>{c.contractor_name}</TableCell><TableCell>₹{fmt(c.amount)}</TableCell><TableCell><Badge>{c.payment_status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function BrokersTab() {
  const qc = useQueryClient();
  const { data: brokers = [] } = useQuery({ queryKey: ["/api/real-estate/brokers"], queryFn: () => apiRequest("GET", "/api/real-estate/brokers") });
  const markPaid = useMutation({ mutationFn: (id: any) => apiRequest("POST", `/api/real-estate/brokers/${id}/mark-commission-paid`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/brokers"] }) });
  return (
    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Commission%</TableHead><TableHead>Bookings</TableHead><TableHead>Commission Due</TableHead><TableHead></TableHead></TableRow></TableHeader>
      <TableBody>{brokers.map((b: any) => <TableRow key={b.id}><TableCell>{b.broker_name}</TableCell><TableCell>{b.broker_code}</TableCell><TableCell>{b.commission_pct}%</TableCell><TableCell>{b.total_bookings}</TableCell><TableCell>₹{fmt(b.commission_payable)}</TableCell><TableCell><Button size="sm" onClick={() => markPaid.mutate(b.id)}>Mark Paid</Button></TableCell></TableRow>)}</TableBody>
    </Table>
  );
}

function SocietyTab() {
  const qc = useQueryClient();
  const [month, setMonth] = useState("");
  const { data: charges = [] } = useQuery({ queryKey: ["/api/real-estate/society/charges", month], queryFn: () => apiRequest("GET", `/api/real-estate/society/charges?month=${month}`) });
  const generate = useMutation({ mutationFn: () => apiRequest("POST", "/api/real-estate/society/charges/generate", { month }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/society/charges"] }) });
  const markPaid = useMutation({ mutationFn: (id: any) => apiRequest("POST", `/api/real-estate/society/charges/${id}/mark-paid`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/real-estate/society/charges"] }) });
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center"><Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" /><Button onClick={() => generate.mutate()}>Generate Charges</Button></div>
      <Table><TableHeader><TableRow><TableHead>Unit</TableHead><TableHead>Maintenance</TableHead><TableHead>Sinking</TableHead><TableHead>Water</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{charges.map((c: any) => <TableRow key={c.id}><TableCell>{c.unit_number}</TableCell><TableCell>₹{fmt(c.maintenance_charge)}</TableCell><TableCell>₹{fmt(c.sinking_fund)}</TableCell><TableCell>₹{fmt(c.water_charge)}</TableCell><TableCell>₹{fmt(c.total)}</TableCell><TableCell><Badge variant={c.status === "paid" ? "default" : "secondary"}>{c.status}</Badge></TableCell><TableCell>{c.status !== "paid" && <Button size="sm" onClick={() => markPaid.mutate(c.id)}>Mark Paid</Button>}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function REReportsTab() {
  const [type, setType] = useState("sales-velocity"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [data, setData] = useState<any[]>([]);
  const fetch = async () => { try { const r = await apiRequest("GET", `/api/real-estate/reports/${type}?from=${from}&to=${to}`); setData(Array.isArray(r) ? r : r.data || []); } catch { setData([]); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{["sales-velocity","inventory-aging","collection-efficiency","broker-performance","project-profitability"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        <Button onClick={fetch}>Fetch</Button>
      </div>
      {data.length > 0 && <Table><TableHeader><TableRow>{Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row, i) => <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j}>{String(v)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </div>
  );
}

export default function RealEstateEnterprisePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Real Estate Enterprise</h1>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          {[["dashboard","Dashboard"],["crm","CRM"],["sitevisits","Site Visits"],["bookings","Bookings"],["collections","Collections"],["construction","Construction"],["brokers","Brokers"],["society","Society"],["reports","Reports"]].map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="crm"><CRMTab /></TabsContent>
        <TabsContent value="sitevisits"><SiteVisitsTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
        <TabsContent value="collections"><CollectionsTab /></TabsContent>
        <TabsContent value="construction"><ConstructionTab /></TabsContent>
        <TabsContent value="brokers"><BrokersTab /></TabsContent>
        <TabsContent value="society"><SocietyTab /></TabsContent>
        <TabsContent value="reports"><REReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
