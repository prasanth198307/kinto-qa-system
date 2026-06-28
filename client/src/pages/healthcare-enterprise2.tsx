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

export default function HealthcareEnterprise2Page() {
  const qc = useQueryClient();
  const [abhaForm, setAbhaForm] = useState({ patient_id: "", aadhaar_last4: "", mobile: "" });
  const [telemForm, setTelemForm] = useState({ patient_id: "", doctor_id: "", scheduled_at: "", platform: "video", chief_complaint: "" });
  const [nabh, setNabh] = useState({ area: "OPD", standard_ref: "", evidence_type: "document", evidence_notes: "" });
  const [biometric, setBiometric] = useState({ device_type: "fingerprint", device_id: "", location: "" });

  const { data: abhaRecords = [] } = useQuery({ queryKey: ['/api/healthcare/abha/records'], queryFn: () => api('GET', '/api/healthcare/abha/records') });
  const { data: telemAppts = [] } = useQuery({ queryKey: ['/api/healthcare/telemedicine/appointments'], queryFn: () => api('GET', '/api/healthcare/telemedicine/appointments') });
  const { data: nabhChecks = [] } = useQuery({ queryKey: ['/api/healthcare/nabh/checklists'], queryFn: () => api('GET', '/api/healthcare/nabh/checklists') });
  const { data: biometrics = [] } = useQuery({ queryKey: ['/api/healthcare/biometric/devices'], queryFn: () => api('GET', '/api/healthcare/biometric/devices') });
  const { data: biometricLogs = [] } = useQuery({ queryKey: ['/api/healthcare/biometric/logs'], queryFn: () => api('GET', '/api/healthcare/biometric/logs') });

  const createAbha = useMutation({ mutationFn: (d: any) => api('POST', '/api/healthcare/abha/enroll', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/healthcare/abha/records'] }); alert('ABHA enrollment initiated!'); } });
  const bookTelem = useMutation({ mutationFn: (d: any) => api('POST', '/api/healthcare/telemedicine/appointments', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/healthcare/telemedicine/appointments'] }) });
  const addNabh = useMutation({ mutationFn: (d: any) => api('POST', '/api/healthcare/nabh/checklists', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/healthcare/nabh/checklists'] }) });
  const addBiometric = useMutation({ mutationFn: (d: any) => api('POST', '/api/healthcare/biometric/devices', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/healthcare/biometric/devices'] }) });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Healthcare — Advanced Features</h1>
      <Tabs defaultValue="abha">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="abha">ABHA / ABDM</TabsTrigger>
          <TabsTrigger value="telemedicine">Telemedicine</TabsTrigger>
          <TabsTrigger value="nabh">NABH Compliance</TabsTrigger>
          <TabsTrigger value="biometric">Biometric Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="abha">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>ABHA Enrollment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">Ayushman Bharat Health Account — patient digital health ID</p>
              <div><Label>Patient ID</Label><Input value={abhaForm.patient_id} onChange={e=>setAbhaForm({...abhaForm,patient_id:e.target.value})} /></div>
              <div><Label>Aadhaar Last 4 Digits</Label><Input value={abhaForm.aadhaar_last4} onChange={e=>setAbhaForm({...abhaForm,aadhaar_last4:e.target.value})} maxLength={4} /></div>
              <div><Label>Registered Mobile</Label><Input value={abhaForm.mobile} onChange={e=>setAbhaForm({...abhaForm,mobile:e.target.value})} /></div>
              <Button onClick={()=>createAbha.mutate(abhaForm)}>Initiate ABHA Enrollment</Button>
              <p className="text-xs text-gray-400">OTP will be sent to patient's Aadhaar-linked mobile</p>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>ABHA Records</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>ABHA ID</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{(abhaRecords as any[]).map((r:any)=><TableRow key={r.id}><TableCell>{r.patient_id}</TableCell><TableCell className="font-mono text-xs">{r.abha_id||'Pending'}</TableCell><TableCell><Badge variant={r.status==='active'?'default':'secondary'}>{r.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
              {(abhaRecords as any[]).length===0&&<p className="text-gray-400 text-center py-4">No ABHA records</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="telemedicine">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Book Telemedicine Appointment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Patient ID</Label><Input value={telemForm.patient_id} onChange={e=>setTelemForm({...telemForm,patient_id:e.target.value})} /></div>
              <div><Label>Doctor ID</Label><Input value={telemForm.doctor_id} onChange={e=>setTelemForm({...telemForm,doctor_id:e.target.value})} /></div>
              <div><Label>Date & Time</Label><Input type="datetime-local" value={telemForm.scheduled_at} onChange={e=>setTelemForm({...telemForm,scheduled_at:e.target.value})} /></div>
              <div><Label>Platform</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={telemForm.platform} onChange={e=>setTelemForm({...telemForm,platform:e.target.value})}>
                  <option value="video">Video Call</option><option value="audio">Audio Only</option><option value="chat">Chat</option>
                </select>
              </div>
              <div><Label>Chief Complaint</Label><Textarea value={telemForm.chief_complaint} onChange={e=>setTelemForm({...telemForm,chief_complaint:e.target.value})} rows={2} /></div>
              <Button onClick={()=>bookTelem.mutate(telemForm)}>Book Appointment</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Telemedicine Appointments</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Platform</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>{(telemAppts as any[]).map((a:any)=><TableRow key={a.id}><TableCell>{a.patient_id}</TableCell><TableCell>{a.doctor_id}</TableCell><TableCell>{a.scheduled_at?.slice(0,16)}</TableCell><TableCell><Badge>{a.platform}</Badge></TableCell><TableCell><Button size="sm" onClick={()=>alert(a.meeting_link||'Meeting link not set')}>Join</Button></TableCell></TableRow>)}</TableBody></Table>
              {(telemAppts as any[]).length===0&&<p className="text-gray-400 text-center py-4">No telemedicine appointments</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="nabh">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Add NABH Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Area / Department</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={nabh.area} onChange={e=>setNabh({...nabh,area:e.target.value})}>
                  {['OPD','IPD','OT','ICU','Laboratory','Pharmacy','Nursing','Admin'].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div><Label>NABH Standard Reference</Label><Input value={nabh.standard_ref} onChange={e=>setNabh({...nabh,standard_ref:e.target.value})} placeholder="e.g. AAC 4, MOM 4" /></div>
              <div><Label>Evidence Type</Label>
                <select className="border rounded px-2 py-1 w-full text-sm" value={nabh.evidence_type} onChange={e=>setNabh({...nabh,evidence_type:e.target.value})}>
                  <option value="document">Document</option><option value="observation">Observation</option><option value="record">Record</option><option value="audit">Audit</option>
                </select>
              </div>
              <div><Label>Notes</Label><Textarea value={nabh.evidence_notes} onChange={e=>setNabh({...nabh,evidence_notes:e.target.value})} rows={3} /></div>
              <Button onClick={()=>addNabh.mutate({...nabh,status:'compliant'})}>Save Evidence</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>NABH Compliance Status</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Area</TableHead><TableHead>Standard</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>{(nabhChecks as any[]).map((c:any)=><TableRow key={c.id}><TableCell>{c.area}</TableCell><TableCell>{c.standard_ref}</TableCell><TableCell><Badge variant={c.status==='compliant'?'default':'destructive'}>{c.status}</Badge></TableCell><TableCell>{c.created_at?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
              {(nabhChecks as any[]).length===0&&<p className="text-gray-400 text-center py-4">No NABH records added</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="biometric">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Biometric Devices</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(biometrics as any[]).map((d:any)=><div key={d.id} className="flex items-center justify-between p-2 border rounded text-sm"><div><div className="font-medium">{d.device_id}</div><div className="text-gray-500">{d.location} — {d.device_type}</div></div><Badge variant={d.is_active?'default':'secondary'}>{d.is_active?'Online':'Offline'}</Badge></div>)}
              <div className="space-y-2 border-t pt-2">
                <select className="border rounded px-2 py-1 w-full text-sm" value={biometric.device_type} onChange={e=>setBiometric({...biometric,device_type:e.target.value})}>
                  <option value="fingerprint">Fingerprint</option><option value="face">Face Recognition</option><option value="rfid">RFID Card</option>
                </select>
                <Input placeholder="Device ID" value={biometric.device_id} onChange={e=>setBiometric({...biometric,device_id:e.target.value})} />
                <Input placeholder="Location (e.g. OPD Gate)" value={biometric.location} onChange={e=>setBiometric({...biometric,location:e.target.value})} />
                <Button size="sm" onClick={()=>addBiometric.mutate(biometric)}>Register Device</Button>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Attendance Logs</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Time</TableHead><TableHead>Device</TableHead></TableRow></TableHeader>
              <TableBody>{(biometricLogs as any[]).slice(0,10).map((l:any)=><TableRow key={l.id}><TableCell>{l.staff_id}</TableCell><TableCell><Badge variant={l.punch_type==='in'?'default':'secondary'}>{l.punch_type==='in'?'IN':'OUT'}</Badge></TableCell><TableCell>{l.punch_time?.slice(11,16)}</TableCell><TableCell>{l.device_id}</TableCell></TableRow>)}</TableBody></Table>
              {(biometricLogs as any[]).length===0&&<p className="text-gray-400 text-center py-4">No attendance logs</p>}
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
