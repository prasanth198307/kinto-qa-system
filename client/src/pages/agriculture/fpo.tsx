import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY_MEMBER = { member_code: "", farmer_name: "", village: "", area_acres: "", crops: "", share_count: "", joining_date: "" };
const EMPTY_MEETING = { meeting_date: "", agenda: "", attendees: "", decisions: "", next_meeting: "" };

export default function FpoPage() {
  const qc = useQueryClient();
  const [memberOpen, setMemberOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ ...EMPTY_MEMBER });
  const [meetingForm, setMeetingForm] = useState({ ...EMPTY_MEETING });

  const { data: members = [] } = useQuery({ queryKey: ["ag-fpo-members"], queryFn: () => api("GET", "/api/agriculture/fpo/members") });
  const { data: meetings = [] } = useQuery({ queryKey: ["ag-fpo-meetings"], queryFn: () => api("GET", "/api/agriculture/fpo/meetings") });

  const saveMember = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/fpo/members", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-fpo-members"] }); setMemberOpen(false); },
  });

  const saveMeeting = useMutation({
    mutationFn: (f: any) => api("POST", "/api/agriculture/fpo/meetings", f),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ag-fpo-meetings"] }); setMeetingOpen(false); },
  });

  const setM = (k: string, v: string) => setMemberForm(p => ({ ...p, [k]: v }));
  const setMt = (k: string, v: string) => setMeetingForm(p => ({ ...p, [k]: v }));

  const activeCount = members.filter((m: any) => m.active).length;
  const totalShares = members.reduce((s: number, m: any) => s + Number(m.share_count || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">FPO Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setMeetingForm({ ...EMPTY_MEETING }); setMeetingOpen(true); }}>Add Meeting</Button>
          <Button onClick={() => { setMemberForm({ ...EMPTY_MEMBER }); setMemberOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Member</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />Total Members</p><p className="text-3xl font-bold mt-1">{members.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Active Members</p><p className="text-3xl font-bold mt-1">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Shares</p><p className="text-3xl font-bold mt-1">{totalShares}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Farmer Name</TableHead><TableHead>Village</TableHead>
                    <TableHead>Area (acres)</TableHead><TableHead>Crops</TableHead><TableHead>Shares</TableHead>
                    <TableHead>Joining Date</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono">{m.member_code}</TableCell>
                      <TableCell className="font-medium">{m.farmer_name}</TableCell>
                      <TableCell>{m.village}</TableCell>
                      <TableCell>{m.area_acres}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.crops}</TableCell>
                      <TableCell>{m.share_count}</TableCell>
                      <TableCell>{m.joining_date}</TableCell>
                      <TableCell><Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No members found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Agenda</TableHead><TableHead>Attendees</TableHead>
                    <TableHead>Decisions</TableHead><TableHead>Next Meeting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.meeting_date}</TableCell>
                      <TableCell>{m.agenda}</TableCell>
                      <TableCell>{m.attendees}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.decisions}</TableCell>
                      <TableCell>{m.next_meeting}</TableCell>
                    </TableRow>
                  ))}
                  {meetings.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No meetings recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><label className="text-sm font-medium mb-1 block">Member Code</label><Input value={memberForm.member_code} onChange={e => setM("member_code", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Farmer Name</label><Input value={memberForm.farmer_name} onChange={e => setM("farmer_name", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Village</label><Input value={memberForm.village} onChange={e => setM("village", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Area (acres)</label><Input type="number" value={memberForm.area_acres} onChange={e => setM("area_acres", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Crops (comma separated)</label><Input value={memberForm.crops} onChange={e => setM("crops", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Share Count</label><Input type="number" value={memberForm.share_count} onChange={e => setM("share_count", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Joining Date</label><Input type="date" value={memberForm.joining_date} onChange={e => setM("joining_date", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMember.mutate(memberForm)} disabled={saveMember.isPending}>{saveMember.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Meeting Record</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1 block">Meeting Date</label><Input type="date" value={meetingForm.meeting_date} onChange={e => setMt("meeting_date", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Agenda</label><Input value={meetingForm.agenda} onChange={e => setMt("agenda", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Attendees</label><Input value={meetingForm.attendees} onChange={e => setMt("attendees", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Decisions</label><Input value={meetingForm.decisions} onChange={e => setMt("decisions", e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Next Meeting Date</label><Input type="date" value={meetingForm.next_meeting} onChange={e => setMt("next_meeting", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMeeting.mutate(meetingForm)} disabled={saveMeeting.isPending}>{saveMeeting.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
