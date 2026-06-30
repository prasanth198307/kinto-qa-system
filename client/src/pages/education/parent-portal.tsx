import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Bell } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const NOTICE_EMPTY = { class: "all", subject: "", message: "", send_mode: "both" };

export default function ParentPortalPage() {
  const qc = useQueryClient();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState<any>(NOTICE_EMPTY);

  const { data: notices = [] } = useQuery({ queryKey: ["edu-notices"], queryFn: () => api("GET", "/api/education/notices") });
  const { data: classes = [] } = useQuery({ queryKey: ["edu-classes"], queryFn: () => api("GET", "/api/education/classes") });

  const sendNotice = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/notices", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-notices"] }); setNoticeOpen(false); setNoticeForm(NOTICE_EMPTY); },
  });

  const sendFeeReminders = useMutation({
    mutationFn: () => api("POST", "/api/education/fees/reminders", { send_mode: "both" }),
    onSuccess: () => alert("Fee reminders sent to all defaulters."),
  });

  const noticeList = Array.isArray(notices) ? notices : [];
  const classList = Array.isArray(classes) ? classes : [];
  const set = (k: string, v: string) => setNoticeForm((f: any) => ({ ...f, [k]: v }));

  const modeColor: Record<string, any> = { sms: "outline", email: "secondary", both: "default" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parent Communication</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => sendFeeReminders.mutate()} disabled={sendFeeReminders.isPending}>
            <Bell className="w-4 h-4 mr-2" />Send Fee Reminders
          </Button>
          <Button onClick={() => { setNoticeForm(NOTICE_EMPTY); setNoticeOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Send Notice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Notices</p><p className="text-2xl font-bold">{noticeList.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">SMS Sent</p><p className="text-2xl font-bold">{noticeList.filter((n: any) => n.send_mode === "sms" || n.send_mode === "both").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Email Sent</p><p className="text-2xl font-bold">{noticeList.filter((n: any) => n.send_mode === "email" || n.send_mode === "both").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Notice History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
              <TableHead>Message</TableHead><TableHead>Mode</TableHead><TableHead>Sent By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {noticeList.map((n: any) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs">{n.sent_at ? new Date(n.sent_at).toLocaleString() : n.created_at}</TableCell>
                  <TableCell>{n.class === "all" ? <Badge variant="outline">All Classes</Badge> : `Class ${n.class}`}</TableCell>
                  <TableCell className="font-medium">{n.subject}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{n.message}</TableCell>
                  <TableCell><Badge variant={modeColor[n.send_mode] || "secondary"}>{n.send_mode?.toUpperCase()}</Badge></TableCell>
                  <TableCell>{n.sent_by || "Staff"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Notice to Parents</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={noticeForm.class} onValueChange={(v) => set("class", v)}>
              <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classList.map((c: any) => <SelectItem key={c.id} value={c.class_name}>Class {c.class_name}{c.section}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={noticeForm.subject} onChange={(e) => set("subject", e.target.value)} />
            <textarea
              className="w-full border rounded p-2 text-sm h-28 resize-none bg-background"
              placeholder="Message to parents..."
              value={noticeForm.message}
              onChange={(e) => set("message", e.target.value)}
            />
            <Select value={noticeForm.send_mode} onValueChange={(v) => set("send_mode", v)}>
              <SelectTrigger><SelectValue placeholder="Send Via" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS Only</SelectItem>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="both">SMS + Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoticeOpen(false)}>Cancel</Button>
            <Button onClick={() => sendNotice.mutate(noticeForm)} disabled={sendNotice.isPending}><Send className="w-4 h-4 mr-2" />Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
