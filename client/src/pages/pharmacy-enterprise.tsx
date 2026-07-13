import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const _fmtNum = (n: any) => Number(n||0).toLocaleString(undefined, {maximumFractionDigits:2});

export default function PharmacyEnterprisePage() {
  const qc = useQueryClient();
  const [regType, setRegType] = useState("schedule-h");
  const [showCC, setShowCC] = useState(false);
  const [cc, setCC] = useState({ name: "", phone: "", credit_limit: "", payment_terms_days: "30" });
  const [reportType, setReportType] = useState("expiry");
  const [reportData, setReportData] = useState<any[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const { data: register = [] } = useQuery({ queryKey: [`/api/pharmacy/registers/${regType}`], queryFn: () => api('GET', `/api/pharmacy/registers/${regType}`) });
  const { data: prescriptions = [] } = useQuery({ queryKey: ['/api/pharmacy/prescriptions'], queryFn: () => api('GET', '/api/pharmacy/prescriptions') });
  const { data: creditCustomers = [] } = useQuery({ queryKey: ['/api/pharmacy/credit-customers'], queryFn: () => api('GET', '/api/pharmacy/credit-customers') });
  const { data: branches = [] } = useQuery({ queryKey: ['/api/pharmacy/branches'], queryFn: () => api('GET', '/api/pharmacy/branches') });

  const addCC = useMutation({ mutationFn: (d: any) => api('POST', '/api/pharmacy/credit-customers', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/pharmacy/credit-customers'] }); setShowCC(false); } });
  const fetchReport = async () => { const r = await api('GET', `/api/pharmacy/reports/${reportType}?from=${from}&to=${to}`); setReportData(r); };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Pharmacy Enterprise</h1>
      <Tabs defaultValue="registers">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="registers">Compliance Registers</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="credit">Credit Billing</TabsTrigger>
          <TabsTrigger value="stocktake">Stocktake</TabsTrigger>
          <TabsTrigger value="branches">Multi-Branch</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="registers">
          <Card><CardHeader><CardTitle>Drug Compliance Registers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <select className="border rounded px-2 py-1" value={regType} onChange={e=>setRegType(e.target.value)}>
                <option value="schedule-h">Schedule H</option>
                <option value="schedule-h1">Schedule H1</option>
                <option value="schedule-x">Schedule X (Narcotic)</option>
              </select>
              <Button size="sm" variant="outline" onClick={()=>api('GET',`/api/pharmacy/registers/${regType}/export`).then(()=>alert('Exported!'))}>Export</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Drug</TableHead><TableHead>Patient</TableHead><TableHead>Qty</TableHead><TableHead>Prescription No</TableHead></TableRow></TableHeader>
            <TableBody>{(register as any[]).map((r:any,i:number)=><TableRow key={i}><TableCell>{r.sale_date?.slice(0,10)}</TableCell><TableCell>{r.drug_name||r.product_name}</TableCell><TableCell>{r.patient_name}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.prescription_no}</TableCell></TableRow>)}</TableBody></Table>
            {(register as any[]).length===0&&<p className="text-center text-gray-400 py-8">No {regType.replace(/-/g,' ')} records found</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <Card><CardHeader><CardTitle>Prescription Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead>Patient</TableHead><TableHead>Drugs</TableHead><TableHead>Image</TableHead></TableRow></TableHeader>
            <TableBody>{(prescriptions as any[]).map((p:any)=><TableRow key={p.id}><TableCell>{p.created_at?.slice(0,10)}</TableCell><TableCell>{p.doctor_name}</TableCell><TableCell>{p.patient_name}</TableCell><TableCell>{p.drug_count} drugs</TableCell><TableCell>{p.image_url?<a href={p.image_url} target="_blank" className="text-blue-600 text-sm">View</a>:'—'}</TableCell></TableRow>)}</TableBody></Table>
            {(prescriptions as any[]).length===0&&<p className="text-center text-gray-400 py-8">No prescriptions found. Upload prescription images when creating sales.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Credit Customers</CardTitle><Button size="sm" onClick={()=>setShowCC(true)}>+ Add Credit Customer</Button></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Credit Limit</TableHead><TableHead>Payment Terms</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(creditCustomers as any[]).map((c:any)=><TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.phone}</TableCell><TableCell>₹{fmt(c.credit_limit)}</TableCell><TableCell>{c.payment_terms_days} days</TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>api('GET',`/api/pharmacy/credit-customers/${c.id}/outstanding`).then(d=>alert(JSON.stringify(d,null,2)))}>Outstanding</Button></TableCell></TableRow>)}</TableBody></Table>
            {(creditCustomers as any[]).length===0&&<p className="text-center text-gray-400 py-8">No credit customers. Add hospitals/clinics with credit accounts.</p>}
          </CardContent></Card>
          <Dialog open={showCC} onOpenChange={setShowCC}><DialogContent><DialogHeader><DialogTitle>Add Credit Customer</DialogTitle></DialogHeader>
            <div className="space-y-3"><div><Label>Name</Label><Input value={cc.name} onChange={e=>setCC({...cc,name:e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={cc.phone} onChange={e=>setCC({...cc,phone:e.target.value})} /></div>
            <div><Label>Credit Limit (₹)</Label><Input type="number" value={cc.credit_limit} onChange={e=>setCC({...cc,credit_limit:e.target.value})} /></div>
            <div><Label>Payment Terms (days)</Label><Input type="number" value={cc.payment_terms_days} onChange={e=>setCC({...cc,payment_terms_days:e.target.value})} /></div>
            <Button onClick={()=>addCC.mutate({...cc,credit_limit:Number(cc.credit_limit),payment_terms_days:Number(cc.payment_terms_days)})}>Save</Button></div>
          </DialogContent></Dialog>
        </TabsContent>

        <TabsContent value="stocktake">
          <Card><CardHeader><CardTitle>Stocktake / Physical Audit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={()=>api('POST','/api/pharmacy/stocktake/start').then(r=>alert(`Stocktake started: ${r.id}`))}>Start New Stocktake</Button>
            <div className="p-4 bg-gray-50 rounded text-sm">
              <p className="font-medium mb-2">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Start a new stocktake session</li>
                <li>Physical count each product and enter counted quantity</li>
                <li>System compares expected vs counted quantity</li>
                <li>Finalize to generate variance report and adjust stock</li>
              </ol>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card><CardHeader><CardTitle>Multi-Branch Management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Table><TableHeader><TableRow><TableHead>Branch</TableHead><TableHead>City</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(branches as any[]).map((b:any)=><TableRow key={b.id}><TableCell>{b.branch_name}</TableCell><TableCell>{b.city}</TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>api('GET',`/api/pharmacy/branches/${b.id}/stock`).then(d=>alert(`${d.length} products in stock`))}>View Stock</Button></TableCell></TableRow>)}</TableBody></Table>
            {(branches as any[]).length===0&&<p className="text-center text-gray-400 py-4">No branches configured</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['gst','expiry','margin','doctor-wise','purchase-vs-sales','dead-stock'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label>From</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-36" /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-36" /></div>
              <Button onClick={fetchReport}>Generate</Button>
            </div>
            {reportData.length > 0 && <div className="overflow-auto max-h-96">
              <Table><TableHeader><TableRow>{Object.keys(reportData[0]).map(k=><TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{reportData.map((row,i)=><TableRow key={i}>{Object.values(row).map((v:any,j)=><TableCell key={j}>{String(v??'')}</TableCell>)}</TableRow>)}</TableBody></Table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
