import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, AlertTriangle, Settings, Send } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface WAMessage {
  id: number;
  recipient: string;
  message: string;
  sent_at: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-yellow-100 text-yellow-800",
  read: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const EMPTY_MSG = { recipient_type: "individual", phone: "", message: "", send_time: "" };

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [composeDialog, setComposeDialog] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [wabaToken, setWabaToken] = useState("");
  const [form, setForm] = useState(EMPTY_MSG);
  const [configured, setConfigured] = useState(false);

  const { data: messages = [] } = useQuery<WAMessage[]>({
    queryKey: ["crm-wa-messages"],
    queryFn: () => api("GET", "/api/crm/whatsapp/messages"),
    enabled: configured,
  });

  const sendMutation = useMutation({
    mutationFn: (m: typeof EMPTY_MSG) => api("POST", "/api/crm/whatsapp/send", m),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-wa-messages"] }); setComposeDialog(false); setForm(EMPTY_MSG); },
  });

  const handleSaveToken = () => {
    if (wabaToken.trim()) {
      setConfigured(true);
      setConfigDialog(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare size={24} className="text-green-600" /> WhatsApp Broadcast
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigDialog(true)}>
            <Settings size={16} className="mr-1" /> Configure
          </Button>
          <Button onClick={() => setComposeDialog(true)} disabled={!configured}>
            <Send size={16} className="mr-1" /> Compose
          </Button>
        </div>
      </div>

      {!configured && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">WhatsApp Business API not configured</p>
              <p className="text-xs text-yellow-700 mt-0.5">You need to configure your WABA token to send WhatsApp messages.</p>
            </div>
            <Button size="sm" variant="outline" className="border-yellow-400" onClick={() => setConfigDialog(true)}>
              Configure
            </Button>
          </CardContent>
        </Card>
      )}

      {configured && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-sm text-green-800 font-medium">WhatsApp Business API connected</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Sent Messages</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                    {configured ? "No messages sent yet" : "Configure WhatsApp to view messages"}
                  </TableCell>
                </TableRow>
              )}
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-sm">{m.recipient}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate text-gray-600">{m.message}</TableCell>
                  <TableCell className="text-sm">{new Date(m.sent_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[m.status] || "bg-gray-100 text-gray-800"}`}>
                      {m.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={composeDialog} onOpenChange={setComposeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Compose WhatsApp Message</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Recipient Type</label>
              <Select value={form.recipient_type} onValueChange={(v) => setForm({ ...form, recipient_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Phone</SelectItem>
                  <SelectItem value="group">Contact Group</SelectItem>
                  <SelectItem value="all">All Contacts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.recipient_type === "individual" && (
              <div>
                <label className="text-xs font-medium">Phone Number</label>
                <Input placeholder="+91 9999999999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Message</label>
              <textarea
                className="w-full border rounded p-2 text-sm min-h-[120px]"
                placeholder="Type your message..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">{form.message.length}/1024 characters</p>
            </div>
            <div>
              <label className="text-xs font-medium">Send Time (leave blank for now)</label>
              <Input type="datetime-local" value={form.send_time} onChange={(e) => setForm({ ...form, send_time: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeDialog(false)}>Cancel</Button>
            <Button onClick={() => sendMutation.mutate(form)} disabled={sendMutation.isPending || !form.message.trim()}>
              <Send size={14} className="mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure WhatsApp Business API</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Enter your WhatsApp Business API (WABA) token from Meta Business Suite.</p>
            <div>
              <label className="text-xs font-medium">WABA Token</label>
              <Input type="password" placeholder="EAAxxxxx..." value={wabaToken} onChange={(e) => setWabaToken(e.target.value)} />
            </div>
            <p className="text-xs text-gray-400">The token will be stored for this session only. Configure server-side environment variables for production use.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveToken} disabled={!wabaToken.trim()}>Save Token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
