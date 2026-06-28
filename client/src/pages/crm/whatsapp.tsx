import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function CRMWhatsAppPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);

  const { data: messages = [] } = useQuery({ queryKey: ["/api/crm/whatsapp/messages"], queryFn: () => api("GET", "/api/crm/whatsapp/messages") });

  const sendMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/whatsapp/send", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/whatsapp/messages"] }); setPhone(""); setMessage(""); toast({ title: "Message sent" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const statusColor: Record<string,string> = { sent: "secondary", delivered: "outline", read: "default", failed: "destructive" };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">WhatsApp CRM</h1>

      <Card>
        <CardHeader><CardTitle>Send WhatsApp Message</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm">Phone Number</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
          </div>
          <div>
            <label className="text-sm">Message</label>
            <textarea className="w-full border rounded p-2 text-sm min-h-[80px]" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="template" checked={useTemplate} onChange={e => setUseTemplate(e.target.checked)} />
            <label htmlFor="template" className="text-sm">Use Template</label>
          </div>
          <Button onClick={() => sendMutation.mutate({ phone, message, use_template: useTemplate })}>Send</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Message Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>To Phone</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.date || m.created_at}</TableCell>
                  <TableCell>{m.to_phone}</TableCell>
                  <TableCell className="max-w-xs truncate">{m.message_preview || m.message}</TableCell>
                  <TableCell><Badge variant={(statusColor[m.status] as any) || "secondary"}>{m.status}</Badge></TableCell>
                </TableRow>
              ))}
              {messages.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No messages sent yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
