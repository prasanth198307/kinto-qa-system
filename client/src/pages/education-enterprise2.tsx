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
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function EducationEnterprise2Page() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [lmsForm, setLmsForm] = useState({ title: "", course_id: "", content_type: "video", content_url: "" });
  const [budgetForm, setBudgetForm] = useState({ head: "", allocated_amount: "", fy: "2025-26" });
  const [biometricForm, setBiometricForm] = useState({ device_type: "fingerprint", device_id: "", location: "" });
  const [alertForm, setAlertForm] = useState({ student_id: "", message: "", channel: "sms" });

  const { data: lmsContent = [] } = useQuery({ queryKey: ['/api/education/lms/content'], queryFn: () => api('GET', '/api/education/lms/content') });
  const { data: budgets = [] } = useQuery({ queryKey: ['/api/education/budget/heads'], queryFn: () => api('GET', '/api/education/budget/heads') });
  const { data: devices = [] } = useQuery({ queryKey: ['/api/education/biometric/devices'], queryFn: () => api('GET', '/api/education/biometric/devices') });
  const { data: logs = [] } = useQuery({ queryKey: ['/api/education/biometric/logs/today'], queryFn: () => api('GET', '/api/education/biometric/logs/today') });
  const { data: attendance = {} as any } = useQuery({ queryKey: ['/api/education/attendance/dashboard'], queryFn: () => api('GET', '/api/education/attendance/dashboard') });
  const { data: alerts = [] } = useQuery({ queryKey: ['/api/education/alerts/sent'], queryFn: () => api('GET', '/api/education/alerts/sent') });

  const addLms = useMutation({ mutationFn: (d: any) => api('POST', '/api/education/lms/content', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/education/lms/content'] }) });
  const addBudget = useMutation({ mutationFn: (d: any) => api('POST', '/api/education/budget/heads', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/education/budget/heads'] }) });
  const addDevice = useMutation({ mutationFn: (d: any) => api('POST', '/api/education/biometric/devices', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/education/biometric/devices'] }) });
  const sendAlert = useMutation({ mutationFn: (d: any) => api('POST', '/api/education/alerts/send', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/education/alerts/sent'] }); alert('Alert sent!'); } });

  const att = attendance as any;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Education — Advanced Features</h1>
      <Tabs defaultValue="lms">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="lms">LMS</TabsTrigger>
          <TabsTrigger value="budget">Budget Control</TabsTrigger>
          <TabsTrigger value="biometric">Biometric Attendance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="lms">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Add Learning Content</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={lmsForm.title} onChange={e=>setLmsForm({...lmsForm,title:e.target.value})} /></div>
              <div><Label>Course ID</Label><Input value={lmsForm.course_id} onChange={e=>setLmsForm({...lmsForm,course_id:e.target.value})} /></div>
              <div><Label>Content Type</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={lmsForm.content_type} onChange={e=>setLmsForm({...lmsForm,content_type:e.target.value})}>
                  <option value="video">Video</option><option value="pdf">PDF</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="link">External Link</option>
                </select>
              </div>
              <div><Label>Content URL</Label><Input value={lmsForm.content_url} onChange={e=>setLmsForm({...lmsForm,content_url:e.target.value})} placeholder="https://..." /></div>
              <Button onClick={()=>addLms.mutate(lmsForm)}>Add Content</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>LMS Content Library</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Course</TableHead></TableRow></TableHeader>
              <TableBody>{(lmsContent as any[]).map((c:any)=><TableRow key={c.id}><TableCell>{c.title}</TableCell><TableCell><Badge>{c.content_type}</Badge></TableCell><TableCell>{c.course_id}</TableCell></TableRow>)}</TableBody></Table>
              {(lmsContent as any[]).length===0&&<p className="text-gray-400 text-center py-4">No LMS content. Upload study materials for students.</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="budget">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Add Budget Head</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Budget Head</Label><Input value={budgetForm.head} onChange={e=>setBudgetForm({...budgetForm,head:e.target.value})} placeholder="e.g. Salary, Infrastructure" /></div>
              <div><Label>Allocated Amount (${sym})</Label><Input type="number" value={budgetForm.allocated_amount} onChange={e=>setBudgetForm({...budgetForm,allocated_amount:e.target.value})} /></div>
              <div><Label>Financial Year</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={budgetForm.fy} onChange={e=>setBudgetForm({...budgetForm,fy:e.target.value})}>
                  {['2024-25','2025-26','2026-27'].map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <Button onClick={()=>addBudget.mutate({...budgetForm,allocated_amount:Number(budgetForm.allocated_amount)})}>Add Budget Head</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Budget vs Actual</CardTitle></CardHeader>
            <CardContent>
              {(budgets as any[]).length===0?<p className="text-gray-400 text-center py-4">No budget heads defined</p>:
              (budgets as any[]).map((b:any)=>{
                const pct = Math.min(100, Math.round(((b.actual||0)/b.allocated_amount)*100));
                return <div key={b.id} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{b.head}</span><span>{sym}{fmt(b.actual||0)} / {sym}{fmt(b.allocated_amount)}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct>90?'bg-red-500':pct>70?'bg-yellow-500':'bg-green-500'}`} style={{width:`${pct}%`}}></div></div>
                </div>;
              })}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="biometric">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Today's Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-green-50 rounded"><div className="text-2xl font-bold text-green-700">{att.present||0}</div><div className="text-xs text-gray-500">Present</div></div>
                <div className="text-center p-3 bg-red-50 rounded"><div className="text-2xl font-bold text-red-700">{att.absent||0}</div><div className="text-xs text-gray-500">Absent</div></div>
                <div className="text-center p-3 bg-blue-50 rounded"><div className="text-2xl font-bold text-blue-700">{att.total||0}</div><div className="text-xs text-gray-500">Total</div></div>
              </div>
              <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
              <TableBody>{(logs as any[]).slice(0,8).map((l:any)=><TableRow key={l.id}><TableCell>{l.person_id}</TableCell><TableCell>{l.punch_time?.slice(11,16)}</TableCell><TableCell><Badge variant={l.punch_type==='in'?'default':'secondary'}>{l.punch_type==='in'?'IN':'OUT'}</Badge></TableCell></TableRow>)}</TableBody></Table>
              {(logs as any[]).length===0&&<p className="text-gray-400 text-center py-2 text-sm">No logs today</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Biometric Devices</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(devices as any[]).map((d:any)=><div key={d.id} className="flex items-center justify-between p-2 border rounded text-sm"><div><div className="font-medium">{d.device_id}</div><div className="text-xs text-gray-500">{d.location}</div></div><Badge>{d.device_type}</Badge></div>)}
              <div className="space-y-2 border-t pt-2">
                <select className="border rounded px-2 py-1 w-full text-sm" value={biometricForm.device_type} onChange={e=>setBiometricForm({...biometricForm,device_type:e.target.value})}>
                  <option value="fingerprint">Fingerprint</option><option value="face">Face Recognition</option><option value="rfid">RFID Card</option>
                </select>
                <Input placeholder="Device ID" value={biometricForm.device_id} onChange={e=>setBiometricForm({...biometricForm,device_id:e.target.value})} />
                <Input placeholder="Location (e.g. Main Gate)" value={biometricForm.location} onChange={e=>setBiometricForm({...biometricForm,location:e.target.value})} />
                <Button size="sm" onClick={()=>addDevice.mutate(biometricForm)}>Add Device</Button>
              </div>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Send Alert / Notification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Student / Parent ID</Label><Input value={alertForm.student_id} onChange={e=>setAlertForm({...alertForm,student_id:e.target.value})} /></div>
              <div><Label>Message</Label><Textarea value={alertForm.message} onChange={e=>setAlertForm({...alertForm,message:e.target.value})} rows={3} placeholder="Dear parent, your ward..." /></div>
              <div><Label>Channel</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={alertForm.channel} onChange={e=>setAlertForm({...alertForm,channel:e.target.value})}>
                  <option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="app">App Notification</option>
                </select>
              </div>
              <Button onClick={()=>sendAlert.mutate(alertForm)}>Send Alert</Button>
              <Button variant="outline" className="ml-2" onClick={()=>api('POST','/api/education/alerts/bulk',{type:'absent_today',channel:alertForm.channel}).then(r=>alert(`Bulk alert sent to ${r.count||0} parents`))}>Bulk Alert Absent Students</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Sent Alerts</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Channel</TableHead><TableHead>Message</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{(alerts as any[]).slice(0,8).map((a:any)=><TableRow key={a.id}><TableCell>{a.student_id}</TableCell><TableCell><Badge variant="outline">{a.channel}</Badge></TableCell><TableCell className="max-w-xs truncate text-xs">{a.message}</TableCell><TableCell>{a.sent_at?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
              {(alerts as any[]).length===0&&<p className="text-gray-400 text-center py-4">No alerts sent</p>}
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
