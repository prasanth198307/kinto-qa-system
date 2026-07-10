import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Users } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TAGS = ["VIP", "Hot Lead", "Cold", "Follow-up", "Customer", "Prospect", "Partner"];
const TEMPLATES = [
  { label: "Follow-up", body: "Hi {{name}}, just checking in on our previous conversation. Would you like to schedule a demo?" },
  { label: "Meeting Reminder", body: "Hi {{name}}, a quick reminder about our meeting. Looking forward to speaking with you!" },
  { label: "New Offer", body: "Hi {{name}}, we have an exclusive offer for you. Reply or call us to know more." },
  { label: "Thank You", body: "Hi {{name}}, thank you for your time today. We'll send you the proposal shortly." },
];

export default function CRMWhatsAppPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [to, setTo] = useState("");
  const [leadId, setLeadId] = useState("");
  const [message, setMessage] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const sendSingle = useMutation({
    mutationFn: (b: any) => api("POST", "/api/crm/whatsapp/send", b),
    onSuccess: () => { setTo(""); setLeadId(""); setMessage(""); alert("WhatsApp message queued."); },
  });

  const sendBulk = useMutation({
    mutationFn: async (b: any) => {
      const arr = Array.isArray(contacts) ? contacts : [];
      const targets = b.tag_filter ? arr.filter((c: any) => c.tag === b.tag_filter) : arr;
      let sent = 0;
      for (const c of targets) {
        if (!c.phone) continue;
        const msg = b.message.replace(/\{\{name\}\}/g, c.name || "");
        await api("POST", "/api/crm/whatsapp/send", { to: c.phone, lead_id: c.id, message: msg });
        sent++;
      }
      return { sent };
    },
    onSuccess: (d: any) => alert(`Queued ${d.sent} WhatsApp messages.`),
  });

  const contactsArr = Array.isArray(contacts) ? contacts : [];

  const applyTemplate = (body: string) => {
    if (leadId) {
      const c = contactsArr.find((c: any) => c.id.toString() === leadId);
      setMessage(body.replace(/\{\{name\}\}/g, c?.name || ""));
    } else {
      setMessage(body);
    }
  };

  const bulkCount = tagFilter
    ? contactsArr.filter((c: any) => c.tag === tagFilter && c.phone).length
    : contactsArr.filter((c: any) => c.phone).length;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6 text-green-500" />WhatsApp CRM</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Contacts</p><p className="text-2xl font-bold">{contactsArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Contacts with Phone</p><p className="text-2xl font-bold">{contactsArr.filter((c: any) => c.phone).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")}>Single Message</Button>
        <Button variant={mode === "bulk" ? "default" : "outline"} onClick={() => setMode("bulk")}><Users className="w-4 h-4 mr-1" />Bulk Campaign</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{mode === "single" ? "Send WhatsApp Message" : "Bulk WhatsApp Campaign"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {mode === "single" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact</Label>
                <Select value={leadId} onValueChange={v => { setLeadId(v); const c = contactsArr.find((c: any) => c.id.toString() === v); if (c?.phone) setTo(c.phone); }}>
                  <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contactsArr.filter((c: any) => c.phone).map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.phone})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Phone Number</Label><Input value={to} onChange={e => setTo(e.target.value)} placeholder="+91 9876543210" /></div>
            </div>
          ) : (
            <div><Label>Send to Tag</Label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-72"><SelectValue placeholder={`All contacts (${contactsArr.filter((c: any) => c.phone).length} with phone)`} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All contacts ({contactsArr.filter((c: any) => c.phone).length} with phone)</SelectItem>
                  {TAGS.map(t => <SelectItem key={t} value={t}>{t} ({contactsArr.filter((c: any) => c.tag === t && c.phone).length})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Quick Templates</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {TEMPLATES.map(t => <Button key={t.label} size="sm" variant="outline" onClick={() => applyTemplate(t.body)}>{t.label}</Button>)}
            </div>
          </div>

          <div>
            <Label>Message (use {"{{name}}"} for personalization)</Label>
            <textarea className="w-full border rounded p-2 text-sm h-24 resize-none mt-1" value={message} onChange={e => setMessage(e.target.value)} placeholder="Hi {{name}}, ..." />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Routes via WhatsApp Business API / Twilio — configure in Integration Credentials.</p>
            <Button
              onClick={() => mode === "single" ? sendSingle.mutate({ to, lead_id: leadId ? parseInt(leadId) : undefined, message }) : sendBulk.mutate({ tag_filter: tagFilter, message })}
              disabled={!message || (mode === "single" && !to)}
            >
              <Send className="w-4 h-4 mr-1" />{mode === "single" ? "Send" : `Send to ${bulkCount} contacts`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
