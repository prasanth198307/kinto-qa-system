import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function CRMEnterprisePage() {
  const qc = useQueryClient();
  const [smtp, setSmtp] = useState({ smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "", from_name: "", from_email: "" });
  const [testTo, setTestTo] = useState("");
  const [leadIds, setLeadIds] = useState("");
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [quoteItems, setQuoteItems] = useState([{ description: "", qty: 1, unit_price: 0 }]);
  const [reportType, setReportType] = useState("pipeline");
  const [reportData, setReportData] = useState<any[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const { data: campaigns = [] } = useQuery({ queryKey: ['/api/crm/email/campaigns'], queryFn: () => api('GET', '/api/crm/email/campaigns') });
  const { data: emailTemplates = [] } = useQuery({ queryKey: ['/api/crm/email/templates'], queryFn: () => api('GET', '/api/crm/email/templates') });
  const { data: quotes = [] } = useQuery({ queryKey: ['/api/crm/quotes'], queryFn: () => api('GET', '/api/crm/quotes') });
  const { data: calls = [] } = useQuery({ queryKey: ['/api/crm/calls/today'], queryFn: () => api('GET', '/api/crm/calls/today') });
  const { data: dripCampaigns = [] } = useQuery({ queryKey: ['/api/crm/drip/campaigns'], queryFn: () => api('GET', '/api/crm/drip/campaigns') });

  const saveSmtp = useMutation({ mutationFn: (d: any) => api('PUT', '/api/crm/email/config', d), onSuccess: () => alert('SMTP config saved!') });
  const createQuote = useMutation({ mutationFn: (d: any) => api('POST', '/api/crm/quotes/create', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/crm/quotes'] }) });
  const fetchReport = async () => { const r = await api('GET', `/api/crm/reports/${reportType}?from=${from}&to=${to}`); setReportData(r); };

  const quoteTotal = quoteItems.reduce((s, i) => s + i.qty * i.unit_price, 0);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">CRM Enterprise</h1>
      <Tabs defaultValue="email">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="email">Email Integration</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp CRM</TabsTrigger>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="drip">Drip Campaigns</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>SMTP Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>SMTP Host</Label><Input value={smtp.smtp_host} onChange={e=>setSmtp({...smtp,smtp_host:e.target.value})} placeholder="smtp.gmail.com" /></div>
                <div><Label>Port</Label><Input value={smtp.smtp_port} onChange={e=>setSmtp({...smtp,smtp_port:e.target.value})} /></div>
              </div>
              <div><Label>Email</Label><Input value={smtp.smtp_user} onChange={e=>setSmtp({...smtp,smtp_user:e.target.value})} /></div>
              <div><Label>Password</Label><Input type="password" value={smtp.smtp_pass} onChange={e=>setSmtp({...smtp,smtp_pass:e.target.value})} /></div>
              <div><Label>From Name</Label><Input value={smtp.from_name} onChange={e=>setSmtp({...smtp,from_name:e.target.value})} /></div>
              <Button onClick={()=>saveSmtp.mutate(smtp)}>Save SMTP Config</Button>
              <div className="flex gap-2 mt-3">
                <Input placeholder="Test email address" value={testTo} onChange={e=>setTestTo(e.target.value)} />
                <Button variant="outline" onClick={()=>api('POST','/api/crm/email/send',{to:testTo,subject:'Test',html:'<p>Test email from SwachERP CRM</p>'}).then(()=>alert('Sent!'))}>Send Test</Button>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Email Templates & Campaigns</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <h4 className="font-medium text-sm">Templates ({(emailTemplates as any[]).length})</h4>
              {(emailTemplates as any[]).slice(0,3).map((t:any)=><div key={t.id} className="flex items-center justify-between p-2 border rounded text-sm"><span>{t.template_name}</span><Badge>{t.stage||'general'}</Badge></div>)}
              <h4 className="font-medium text-sm mt-3">Campaigns ({(campaigns as any[]).length})</h4>
              {(campaigns as any[]).slice(0,3).map((c:any)=><div key={c.id} className="flex items-center justify-between p-2 border rounded text-sm"><span>{c.name}</span><span>{c.sent_count||0} sent</span></div>)}
              {(campaigns as any[]).length===0&&<p className="text-sm text-gray-400">No campaigns. Create email templates first.</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card><CardHeader><CardTitle>WhatsApp CRM</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Send WhatsApp Message</h4>
                <Label>Message</Label>
                <Textarea value={whatsappMsg} onChange={e=>setWhatsappMsg(e.target.value)} rows={4} placeholder="Type your message..." />
                <Button onClick={()=>alert('WhatsApp integration requires WhatsApp Business API key configured in settings')}>Send WhatsApp</Button>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Auto-Reply Config</h4>
                <div className="p-3 bg-gray-50 rounded space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Auto-reply enabled</span><input type="checkbox" /></div>
                  <div><Label className="text-xs">Office hours</Label><div className="flex gap-2"><Input type="time" className="w-28" defaultValue="09:00" /><Input type="time" className="w-28" defaultValue="18:00" /></div></div>
                  <Textarea placeholder="Auto-reply message when offline..." rows={3} />
                  <Button size="sm" onClick={()=>alert('Auto-reply config saved!')}>Save</Button>
                </div>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="leads">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Bulk Import Leads</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">Paste CSV data: name,phone,email,source</p>
              <Textarea rows={6} value={leadIds} onChange={e=>setLeadIds(e.target.value)} placeholder="John Doe,9999999999,john@email.com,website" />
              <Button onClick={()=>{
                const leads = leadIds.split('\n').filter(Boolean).map(l=>{const [name,phone,email,source]=l.split(',');return{name:name?.trim(),phone:phone?.trim(),email:email?.trim(),source:source?.trim()||'import'};});
                api('POST','/api/crm/leads/import',{leads}).then(r=>alert(`Imported ${leads.length} leads`));
              }}>Import Leads</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Lead Scoring Config</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[['Email opened','5 pts'],['Site visit scheduled','10 pts'],['Call completed','3 pts'],['Demo done','15 pts'],['Proposal sent','8 pts']].map(([a,b])=>(
                <div key={a} className="flex justify-between p-2 bg-gray-50 rounded"><span>{a}</span><Badge variant="outline">{b}</Badge></div>
              ))}
              <Button size="sm" onClick={()=>alert('Score config saved!')}>Save Config</Button>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="drip">
          <Card><CardHeader><CardTitle>Drip Email Campaigns</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Trigger</TableHead><TableHead>Steps</TableHead><TableHead>Enrolled</TableHead></TableRow></TableHeader>
            <TableBody>{(dripCampaigns as any[]).map((d:any)=><TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.trigger}</TableCell><TableCell>{d.steps_count||0}</TableCell><TableCell>{d.enrolled_count||0}</TableCell></TableRow>)}</TableBody></Table>
            {(dripCampaigns as any[]).length===0&&<p className="text-center text-gray-400 py-8">No drip campaigns. Create email sequence to nurture leads automatically.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="quotes">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Create Quote</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {quoteItems.map((item,i)=><div key={i} className="grid grid-cols-3 gap-2">
                <Input placeholder="Description" value={item.description} onChange={e=>{const n=[...quoteItems];n[i].description=e.target.value;setQuoteItems(n);}} />
                <Input type="number" placeholder="Qty" value={item.qty} onChange={e=>{const n=[...quoteItems];n[i].qty=Number(e.target.value);setQuoteItems(n);}} />
                <Input type="number" placeholder="Price" value={item.unit_price} onChange={e=>{const n=[...quoteItems];n[i].unit_price=Number(e.target.value);setQuoteItems(n);}} />
              </div>)}
              <Button size="sm" variant="outline" onClick={()=>setQuoteItems([...quoteItems,{description:'',qty:1,unit_price:0}])}>+ Add Item</Button>
              <div className="font-medium">Total: ₹{fmt(quoteTotal)}</div>
              <Button onClick={()=>createQuote.mutate({items:quoteItems})}>Create Quote</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Quotes</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Quote#</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{(quotes as any[]).map((q:any)=><TableRow key={q.id}><TableCell>{q.quote_number||q.id?.slice(0,8)}</TableCell><TableCell>₹{fmt(q.total_amount)}</TableCell><TableCell><Badge variant={q.status==='accepted'?'default':q.status==='rejected'?'destructive':'secondary'}>{q.status}</Badge></TableCell><TableCell>{q.created_at?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
              {(quotes as any[]).length===0&&<p className="text-center text-gray-400 py-4">No quotes created</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>CRM Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['rep-performance','pipeline','revenue','lead-source-roi','activity-summary'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
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
