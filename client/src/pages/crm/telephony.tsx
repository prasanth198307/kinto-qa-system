import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, PhoneIncoming, PhoneMissed, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const DIRECTIONS = ["outbound", "inbound"];
const OUTCOMES = ["connected", "no_answer", "busy", "voicemail", "callback_requested", "converted"];
const EMPTY = { contact_id: "", phone: "", direction: "outbound", notes: "", outcome: "" };

export default function CRMTelephonyPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: calls = [] } = useQuery<any[]>({ queryKey: ["/api/crm/calls"], queryFn: () => api("GET", "/api/crm/calls") });
  const { data: stats } = useQuery({ queryKey: ["/api/crm/calls/stats"], queryFn: () => api("GET", "/api/crm/calls/stats") });
  const { data: todayCalls = [] } = useQuery<any[]>({ queryKey: ["/api/crm/calls/today"], queryFn: () => api("GET", "/api/crm/calls/today") });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const logCall = useMutation({
    mutationFn: (b: any) => api("POST", "/api/crm/calls", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/calls"] }); qc.invalidateQueries({ queryKey: ["/api/crm/calls/stats"] }); qc.invalidateQueries({ queryKey: ["/api/crm/calls/today"] }); setShowForm(false); setForm({ ...EMPTY }); },
  });

  const clickToCall = useMutation({
    mutationFn: (phone: string) => api("POST", "/api/crm/calls", { phone, direction: "outbound", outcome: "initiated", notes: "Click-to-call initiated via Exotel" }),
    onSuccess: () => { alert("Exotel click-to-call initiated. Your phone will ring first, then connect to the customer."); qc.invalidateQueries({ queryKey: ["/api/crm/calls"] }); },
  });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const callsArr = Array.isArray(calls) ? calls : [];
  const todayArr = Array.isArray(todayCalls) ? todayCalls : [];
  const contactsArr = Array.isArray(contacts) ? contacts : [];
  const s = (stats as any) ?? {};

  const DIR_ICON: Record<string, any> = { outbound: PhoneCall, inbound: PhoneIncoming, missed: PhoneMissed };
  const OUT_COLOR: Record<string, string> = { connected: "bg-green-100 text-green-800", no_answer: "bg-gray-100 text-gray-700", busy: "bg-yellow-100 text-yellow-800", voicemail: "bg-blue-100 text-blue-800", callback_requested: "bg-orange-100 text-orange-800", converted: "bg-purple-100 text-purple-800", initiated: "bg-cyan-100 text-cyan-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Phone className="w-6 h-6 text-blue-600" />Telephony CTI</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Log Call</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Calls</p><p className="text-2xl font-bold">{s.total_calls ?? callsArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Today</p><p className="text-2xl font-bold">{s.today_calls ?? todayArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Connected</p><p className="text-2xl font-bold text-green-600">{s.connected_calls ?? callsArr.filter((c: any) => c.outcome === "connected").length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Converted</p><p className="text-2xl font-bold text-purple-600">{s.converted_calls ?? callsArr.filter((c: any) => c.outcome === "converted").length}</p></CardContent></Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1"><PhoneCall className="w-4 h-4" />Click-to-Call (Exotel)</p>
        <div className="flex gap-2">
          <Input placeholder="Enter phone number..." className="w-64 bg-white" id="ctc-phone" />
          <Button onClick={() => { const phone = (document.getElementById("ctc-phone") as HTMLInputElement)?.value; if (phone) clickToCall.mutate(phone); }}>Call Now</Button>
          <p className="text-xs text-blue-600 self-center">Exotel bridges your phone → customer. Configure Exotel API key in Integration Credentials.</p>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Log Call Manually</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Contact</Label>
              <Select value={form.contact_id} onValueChange={v => { f("contact_id", v); const c = contactsArr.find((c: any) => c.id.toString() === v); if (c?.phone) f("phone", c.phone); }}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contactsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="+91..." /></div>
            <div><Label>Direction</Label>
              <Select value={form.direction} onValueChange={v => f("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIRECTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Outcome</Label>
              <Select value={form.outcome} onValueChange={v => f("outcome", v)}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>{OUTCOMES.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => logCall.mutate({ ...form, contact_id: form.contact_id ? parseInt(form.contact_id) : undefined })}>Log</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Call Log</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {callsArr.map((c: any) => {
              const Icon = DIR_ICON[c.direction] ?? Phone;
              return (
                <div key={c.id} className="flex items-center gap-3 p-2 border rounded-lg">
                  <Icon className={`w-4 h-4 ${c.direction === "inbound" ? "text-blue-500" : "text-green-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.contact_name ?? c.phone}</p>
                    {c.notes && <p className="text-xs text-gray-500">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={OUT_COLOR[c.outcome] ?? "bg-gray-100"}>{c.outcome?.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-gray-400">{c.direction}</span>
                    <span className="text-xs text-gray-400">{c.created_at?.slice(0, 16)?.replace("T", " ")}</span>
                  </div>
                </div>
              );
            })}
            {callsArr.length === 0 && <p className="text-center text-gray-400 py-6">No calls logged.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
