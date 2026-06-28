import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function NGOEnterprisePage() {
  const qc = useQueryClient();
  const [fcra, setFcra] = useState({ registration_no: "", validity_date: "", account_no: "" });
  const [fcontrib, setFcontrib] = useState({ donor_name: "", country: "", currency: "USD", amount: "", inr_amount: "", receipt_date: "" });
  const [donationForm, setDonationForm] = useState({ amount: "", donor_name: "", email: "", phone: "", purpose: "" });
  const [fundForm, setFundForm] = useState({ name: "", type: "unrestricted", purpose: "" });
  const [reportType, setReportType] = useState("80g-summary");
  const [reportData, setReportData] = useState<any[]>([]);
  const [fy, setFy] = useState("2025-26");

  const { data: receipts = [] } = useQuery({ queryKey: ['/api/ngo/receipts/80g'], queryFn: () => api('GET', '/api/ngo/receipts/80g') });
  const { data: fcontribs = [] } = useQuery({ queryKey: ['/api/ngo/fcra/foreign-contributions'], queryFn: () => api('GET', '/api/ngo/fcra/foreign-contributions') });
  const { data: onlineDons = [] } = useQuery({ queryKey: ['/api/ngo/donations/online/list'], queryFn: () => api('GET', '/api/ngo/donations/online/list') });
  const { data: segments = {} } = useQuery({ queryKey: ['/api/ngo/donors/segments'], queryFn: () => api('GET', '/api/ngo/donors/segments') });
  const { data: funds = [] } = useQuery({ queryKey: ['/api/ngo/funds'], queryFn: () => api('GET', '/api/ngo/funds') });

  const addFund = useMutation({ mutationFn: (d: any) => api('POST', '/api/ngo/funds', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/ngo/funds'] }) });
  const addFcontrib = useMutation({ mutationFn: (d: any) => api('POST', '/api/ngo/fcra/foreign-contributions', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/ngo/fcra/foreign-contributions'] }) });
  const fetchReport = async () => { const r = await api('GET', `/api/ngo/reports/${reportType}?fy=${fy}`); setReportData(Array.isArray(r)?r:[r]); };

  const s = segments as any;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">NGO / Trust Enterprise</h1>
      <Tabs defaultValue="receipts">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="receipts">80G Receipts</TabsTrigger>
          <TabsTrigger value="fcra">FCRA</TabsTrigger>
          <TabsTrigger value="online">Online Donations</TabsTrigger>
          <TabsTrigger value="donors">Donors</TabsTrigger>
          <TabsTrigger value="funds">Fund Accounting</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts">
          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>80G Receipts</CardTitle>
            <Button size="sm" onClick={()=>api('POST','/api/ngo/receipts/80g/bulk-generate',{fy}).then(r=>alert(`Generated ${r.count||0} receipts for ${fy}`))}>Bulk Generate {fy}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center"><Label>FY:</Label>
              <select className="border rounded px-2 py-1 text-sm" value={fy} onChange={e=>setFy(e.target.value)}>
                {['2024-25','2025-26','2026-27'].map(f=><option key={f} value={f}>{f}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={()=>api('GET','/api/ngo/form-10bd/data').then(r=>alert(`Form 10BD: ${r.total_donations||0} donations`))}>Form 10BD Data</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>Receipt#</TableHead><TableHead>Donor</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(receipts as any[]).map((r:any)=><TableRow key={r.id}><TableCell>{r.receipt_number}</TableCell><TableCell>{r.donor_name}</TableCell><TableCell>₹{fmt(r.amount)}</TableCell><TableCell>{r.donation_date?.slice(0,10)}</TableCell><TableCell><Button size="sm" variant="outline">PDF</Button></TableCell></TableRow>)}</TableBody></Table>
            {(receipts as any[]).length===0&&<p className="text-center text-gray-400 py-8">No 80G receipts. Generate from donation records.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fcra">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>FCRA Registration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Registration No</Label><Input value={fcra.registration_no} onChange={e=>setFcra({...fcra,registration_no:e.target.value})} placeholder="080831234" /></div>
              <div><Label>Validity Date</Label><Input type="date" value={fcra.validity_date} onChange={e=>setFcra({...fcra,validity_date:e.target.value})} /></div>
              <div><Label>FCRA Bank Account No</Label><Input value={fcra.account_no} onChange={e=>setFcra({...fcra,account_no:e.target.value})} /></div>
              <Button onClick={()=>api('PUT','/api/ngo/fcra/registration',fcra).then(()=>alert('FCRA details saved!'))}>Save FCRA Details</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Add Foreign Contribution</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Donor Name</Label><Input value={fcontrib.donor_name} onChange={e=>setFcontrib({...fcontrib,donor_name:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Country</Label><Input value={fcontrib.country} onChange={e=>setFcontrib({...fcontrib,country:e.target.value})} /></div>
                <div><Label>Currency</Label><select className="border rounded px-2 py-1 w-full text-sm" value={fcontrib.currency} onChange={e=>setFcontrib({...fcontrib,currency:e.target.value})}><option>USD</option><option>GBP</option><option>EUR</option><option>AED</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount</Label><Input type="number" value={fcontrib.amount} onChange={e=>setFcontrib({...fcontrib,amount:e.target.value})} /></div>
                <div><Label>INR Amount</Label><Input type="number" value={fcontrib.inr_amount} onChange={e=>setFcontrib({...fcontrib,inr_amount:e.target.value})} /></div>
              </div>
              <div><Label>Receipt Date</Label><Input type="date" value={fcontrib.receipt_date} onChange={e=>setFcontrib({...fcontrib,receipt_date:e.target.value})} /></div>
              <Button onClick={()=>addFcontrib.mutate({...fcontrib,amount:Number(fcontrib.amount),inr_amount:Number(fcontrib.inr_amount)})}>Add Contribution</Button>
            </CardContent></Card>
          </div>
          <Card className="mt-4"><CardHeader><CardTitle>Foreign Contributions</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>Country</TableHead><TableHead>Currency</TableHead><TableHead>Amount</TableHead><TableHead>INR</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>{(fcontribs as any[]).map((f:any)=><TableRow key={f.id}><TableCell>{f.donor_name}</TableCell><TableCell>{f.country}</TableCell><TableCell>{f.currency}</TableCell><TableCell>{fmt(f.amount)}</TableCell><TableCell>₹{fmt(f.inr_amount)}</TableCell><TableCell>{f.receipt_date?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="online">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Create Donation Link</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Donor Name</Label><Input value={donationForm.donor_name} onChange={e=>setDonationForm({...donationForm,donor_name:e.target.value})} /></div>
              <div><Label>Amount (₹)</Label><Input type="number" value={donationForm.amount} onChange={e=>setDonationForm({...donationForm,amount:e.target.value})} /></div>
              <div><Label>Purpose</Label><Input value={donationForm.purpose} onChange={e=>setDonationForm({...donationForm,purpose:e.target.value})} /></div>
              <Button onClick={()=>api('POST','/api/ngo/donations/online/create',{...donationForm,amount:Number(donationForm.amount)}).then(r=>alert(`Payment link: ${r.payment_url||'Created! (Razorpay key needed)'}`))} >Generate Link</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Online Donations</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Donor</TableHead><TableHead>Amount</TableHead><TableHead>Purpose</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{(onlineDons as any[]).map((d:any)=><TableRow key={d.id}><TableCell>{d.donor_name}</TableCell><TableCell>₹{fmt(d.amount)}</TableCell><TableCell>{d.purpose}</TableCell><TableCell>{d.created_at?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
              {(onlineDons as any[]).length===0&&<p className="text-sm text-gray-400 text-center py-4">No online donations yet</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="donors">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[['Major Donors',s.major||0,'bg-purple-50'],['Regular',s.regular||0,'bg-blue-50'],['One-time',s.one_time||0,'bg-green-50'],['Lapsed',s.lapsed||0,'bg-red-50']].map(([l,v,c]:any)=>(
              <Card key={l} className={c}><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{v}</div><div className="text-sm text-gray-600">{l}</div></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle>Donor Actions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">Manage donor relationships and communications</p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={()=>api('GET','/api/ngo/donors/lapsed').then(r=>alert(`${r.length} lapsed donors found`))}>View Lapsed Donors</Button>
              <Button variant="outline" onClick={()=>api('GET','/api/ngo/donors/major').then(r=>alert(`${r.length} major donors`))}>Major Donors</Button>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="funds">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Fund Accounts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(funds as any[]).map((f:any)=><div key={f.id} className="p-3 border rounded">
                <div className="flex justify-between"><span className="font-medium">{f.name}</span><Badge>{f.type}</Badge></div>
                <div className="text-sm text-gray-500 mt-1">{f.purpose}</div>
                <div className="flex gap-4 mt-2 text-sm"><span className="text-green-600">Income: ₹{fmt(f.income)}</span><span className="text-red-600">Expense: ₹{fmt(f.expenditure)}</span><span className="font-medium">Balance: ₹{fmt((f.income||0)-(f.expenditure||0))}</span></div>
              </div>)}
              <div className="space-y-2 pt-2 border-t">
                <Input placeholder="Fund name" value={fundForm.name} onChange={e=>setFundForm({...fundForm,name:e.target.value})} />
                <select className="border rounded px-2 py-1 w-full text-sm" value={fundForm.type} onChange={e=>setFundForm({...fundForm,type:e.target.value})}><option value="restricted">Restricted</option><option value="unrestricted">Unrestricted</option><option value="endowment">Endowment</option></select>
                <Input placeholder="Purpose" value={fundForm.purpose} onChange={e=>setFundForm({...fundForm,purpose:e.target.value})} />
                <Button size="sm" onClick={()=>addFund.mutate(fundForm)}>Create Fund</Button>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>NGO Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['80g-summary','donor-wise','project-budget-actual','fcra-summary','annual-report','csr'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label>FY</Label><select className="border rounded px-2 py-1 text-sm" value={fy} onChange={e=>setFy(e.target.value)}>{['2024-25','2025-26'].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
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
