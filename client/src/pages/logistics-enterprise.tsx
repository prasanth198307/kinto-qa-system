import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(body) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const apiFix = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function LogisticsEnterprisePage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [gpsForm, setGpsForm] = useState({ vehicle_id: "", lat: "", lng: "", speed: "" });
  const [reportType, setReportType] = useState("fleet-utilization");
  const [reportData, setReportData] = useState<any[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const { data: vehicles = [] } = useQuery({ queryKey: ['/api/logistics/gps/vehicles'], queryFn: () => apiFix('GET', '/api/logistics/gps/vehicles') });
  const { data: alerts = [] } = useQuery({ queryKey: ['/api/logistics/gps/alerts'], queryFn: () => apiFix('GET', '/api/logistics/gps/alerts') });
  const { data: epodTrips = [] } = useQuery({ queryKey: ['/api/logistics/epod/trips'], queryFn: () => apiFix('GET', '/api/logistics/epod/trips') });
  const { data: fuel = [] } = useQuery({ queryKey: ['/api/logistics/fuel/records'], queryFn: () => apiFix('GET', '/api/logistics/fuel/records') });
  const { data: tyres = [] } = useQuery({ queryKey: ['/api/logistics/tyres'], queryFn: () => apiFix('GET', '/api/logistics/tyres') });
  const { data: maintenance = [] } = useQuery({ queryKey: ['/api/logistics/maintenance/schedule'], queryFn: () => apiFix('GET', '/api/logistics/maintenance/schedule') });
  const { data: breakdowns = [] } = useQuery({ queryKey: ['/api/logistics/maintenance/breakdowns'], queryFn: () => apiFix('GET', '/api/logistics/maintenance/breakdowns') });
  const { data: freightBills = [] } = useQuery({ queryKey: ['/api/logistics/freight-bills'], queryFn: () => apiFix('GET', '/api/logistics/freight-bills') });

  const updateGPS = useMutation({ mutationFn: (d: any) => apiFix('POST', '/api/logistics/gps/location', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/logistics/gps/vehicles'] }); alert('Location updated!'); } });
  const fetchReport = async () => { const r = await apiFix('GET', `/api/logistics/reports/${reportType}?from=${from}&to=${to}`); setReportData(r); };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Logistics & Fleet Enterprise</h1>
      <Tabs defaultValue="gps">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="gps">GPS Tracking</TabsTrigger>
          <TabsTrigger value="epod">ePOD</TabsTrigger>
          <TabsTrigger value="fuel">Fuel & Tyres</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="freight">Freight Billing</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="gps">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Live Fleet Map</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded h-48 flex items-center justify-center text-gray-500 text-sm mb-3">
                🗺️ Live GPS Map — {(vehicles as any[]).length} vehicles tracked
              </div>
              <Table><TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Speed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{(vehicles as any[]).slice(0,5).map((v:any)=><TableRow key={v.vehicle_id||v.id}><TableCell>{v.registration_no||v.vehicle_id}</TableCell><TableCell>{v.driver_name}</TableCell><TableCell>{v.speed||0} km/h</TableCell><TableCell><Badge variant={v.ignition?'default':'secondary'}>{v.ignition?'Running':'Stopped'}</Badge></TableCell></TableRow>)}</TableBody></Table>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Update Location</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Vehicle ID</Label><Input value={gpsForm.vehicle_id} onChange={e=>setGpsForm({...gpsForm,vehicle_id:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Latitude</Label><Input value={gpsForm.lat} onChange={e=>setGpsForm({...gpsForm,lat:e.target.value})} /></div>
                <div><Label>Longitude</Label><Input value={gpsForm.lng} onChange={e=>setGpsForm({...gpsForm,lng:e.target.value})} /></div>
              </div>
              <div><Label>Speed (km/h)</Label><Input type="number" value={gpsForm.speed} onChange={e=>setGpsForm({...gpsForm,speed:e.target.value})} /></div>
              <Button onClick={()=>updateGPS.mutate({...gpsForm,lat:Number(gpsForm.lat),lng:Number(gpsForm.lng),speed:Number(gpsForm.speed)})}>Update Location</Button>
              <h4 className="font-medium mt-3">Alerts</h4>
              {(alerts as any[]).slice(0,3).map((a:any,i:number)=><div key={i} className="text-sm p-2 bg-red-50 rounded">{a.alert_type}: {a.vehicle_id} — {a.message}</div>)}
              {(alerts as any[]).length===0&&<p className="text-sm text-gray-400">No active alerts</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="epod">
          <Card><CardHeader><CardTitle>ePOD — Digital Proof of Delivery</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Trip</TableHead><TableHead>Route</TableHead><TableHead>Driver</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(epodTrips as any[]).map((t:any)=><TableRow key={t.id}><TableCell>#{t.trip_number||t.id?.slice(0,8)}</TableCell><TableCell>{t.route}</TableCell><TableCell>{t.driver_name}</TableCell><TableCell><Badge variant={t.epod_status==='completed'?'default':'secondary'}>{t.epod_status||'pending'}</Badge></TableCell><TableCell><Button size="sm" onClick={()=>apiFix('POST',`/api/logistics/epod/${t.id}/submit`,{receiver_name:'Customer',otp_verified:true,delivery_time:new Date().toISOString()}).then(()=>{qc.invalidateQueries({queryKey:['/api/logistics/epod/trips']});alert('ePOD submitted!');})}>Submit ePOD</Button></TableCell></TableRow>)}</TableBody></Table>
            {(epodTrips as any[]).length===0&&<p className="text-center text-gray-400 py-8">No trips pending ePOD</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fuel">
          <Tabs defaultValue="fuel"><TabsList><TabsTrigger value="fuel">Fuel Records</TabsTrigger><TabsTrigger value="tyres">Tyres</TabsTrigger></TabsList>
          <TabsContent value="fuel"><Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Date</TableHead><TableHead>Liters</TableHead><TableHead>Rate</TableHead><TableHead>Amount</TableHead><TableHead>Odometer</TableHead></TableRow></TableHeader>
            <TableBody>{(fuel as any[]).map((f:any)=><TableRow key={f.id}><TableCell>{f.vehicle_id}</TableCell><TableCell>{f.fill_date?.slice(0,10)}</TableCell><TableCell>{f.liters} L</TableCell><TableCell>{sym}{f.rate_per_liter}</TableCell><TableCell>{sym}{fmt(f.total_amount)}</TableCell><TableCell>{f.odometer} km</TableCell></TableRow>)}</TableBody></Table>
            {(fuel as any[]).length===0&&<p className="text-center text-gray-400 py-8">No fuel records</p>}
          </CardContent></Card></TabsContent>
          <TabsContent value="tyres"><Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Serial No</TableHead><TableHead>Make</TableHead><TableHead>Vehicle</TableHead><TableHead>Position</TableHead><TableHead>Km Run</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{(tyres as any[]).map((t:any)=><TableRow key={t.id}><TableCell>{t.serial_number}</TableCell><TableCell>{t.tyre_make}</TableCell><TableCell>{t.vehicle_id}</TableCell><TableCell>{t.position}</TableCell><TableCell>{t.km_run||0} km</TableCell><TableCell><Badge>{t.status||'active'}</Badge></TableCell></TableRow>)}</TableBody></Table>
            {(tyres as any[]).length===0&&<p className="text-center text-gray-400 py-8">No tyre records</p>}
          </CardContent></Card></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Preventive Maintenance Due</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Service</TableHead><TableHead>Due Date</TableHead><TableHead>Due Km</TableHead></TableRow></TableHeader>
              <TableBody>{(maintenance as any[]).map((m:any)=><TableRow key={m.id}><TableCell>{m.vehicle_id}</TableCell><TableCell>{m.service_type}</TableCell><TableCell>{m.due_date?.slice(0,10)}</TableCell><TableCell>{m.due_km} km</TableCell></TableRow>)}</TableBody></Table>
              {(maintenance as any[]).length===0&&<p className="text-sm text-gray-400 py-4 text-center">No maintenance due</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Breakdowns</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Date</TableHead><TableHead>Issue</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{(breakdowns as any[]).map((b:any)=><TableRow key={b.id}><TableCell>{b.vehicle_id}</TableCell><TableCell>{b.breakdown_date?.slice(0,10)}</TableCell><TableCell>{b.issue_description}</TableCell><TableCell><Badge variant={b.status==='resolved'?'default':'destructive'}>{b.status||'open'}</Badge></TableCell></TableRow>)}</TableBody></Table>
              {(breakdowns as any[]).length===0&&<p className="text-sm text-gray-400 py-4 text-center">No breakdowns</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="freight">
          <Card><CardHeader><CardTitle>Freight Bills</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Bill#</TableHead><TableHead>Trip</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{(freightBills as any[]).map((b:any)=><TableRow key={b.id}><TableCell>{b.bill_number}</TableCell><TableCell>{b.trip_id}</TableCell><TableCell>{b.customer_name}</TableCell><TableCell>{sym}{fmt(b.amount)}</TableCell><TableCell><Badge>{b.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
            {(freightBills as any[]).length===0&&<p className="text-center text-gray-400 py-8">No freight bills generated</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>Fleet Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['fleet-utilization','fuel-expense','maintenance-cost','driver-performance','freight-revenue'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label>From</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-36" /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-36" /></div>
              <Button onClick={fetchReport}>Generate</Button>
            </div>
            {reportData.length>0&&<div className="overflow-auto max-h-96">
              <Table><TableHeader><TableRow>{Object.keys(reportData[0]).map(k=><TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{reportData.map((row,i)=><TableRow key={i}>{Object.values(row).map((v:any,j)=><TableCell key={j}>{String(v??'')}</TableCell>)}</TableRow>)}</TableBody></Table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
