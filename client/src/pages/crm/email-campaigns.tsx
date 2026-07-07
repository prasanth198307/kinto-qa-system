import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, X, Send, Settings } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const EMPTY_TEMPLATE = { name: "", subject: "", body: "", tag_filter: "" };
const EMPTY_SEND = { template_id: "", tag_filter: "", subject: "", body: "" };

export default function CRMEmailCampaignsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"campaigns" | "templates" | "config">("campaigns");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ ...EMPTY_TEMPLATE });
  const [sendForm, setSendForm] = useState({ ...EMPTY_SEND });
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ["/api/crm/email/campaigns"], queryFn: () => api("GET", "/api/crm/email/campaigns") });
  const { data: templates = [] } = useQuery<any[]>({ queryKey: ["/api/crm/email/templates"], queryFn: () => api("GET", "/api/crm/email/templates") });
  const { data: config } = useQuery({ queryKey: ["/api/crm/email/config"], queryFn: () => api("GET", "/api/crm/email/config") });

  const createTemplate = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/email/templates", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/email/templates"] }); setShowTemplateForm(false); setTemplateForm({ ...EMPTY_TEMPLATE }); } });
  const sendCampaign = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/email/send", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/email/campaigns"] }); setShowSendForm(false); setSendForm({ ...EMPTY_SEND }); } });
  const saveConfig = useMutation({ mutationFn: (b: any) => api("PUT", "/api/crm/email/config", b), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/email/config"] }) });

  const tf = (k: string, v: string) => setTemplateForm(p => ({ ...p, [k]: v }));
  const sf = (k: string, v: string) => setSendForm(p => ({ ...p, [k]: v }));

  const campaignsArr = Array.isArray(campaigns) ? campaigns : [];
  const templatesArr = Array.isArray(templates) ? templates : [];

  const applyTemplate = (id: string) => {
    const t = templatesArr.find((t: any) => t.id.toString() === id);
    if (t) setSendForm(p => ({ ...p, template_id: id, subject: t.subject || p.subject, body: t.body || p.body, tag_filter: t.tag_filter || p.tag_filter }));
  };

  const STATUS_COLOR: Record<string, string> = { sent: "bg-green-100 text-green-800", draft: "bg-gray-100 text-gray-700", failed: "bg-red-100 text-red-800" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="w-6 h-6 text-blue-600" />Email Campaigns</h1>
        <Button onClick={() => setShowSendForm(true)}><Send className="w-4 h-4 mr-1" />Send Campaign</Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "campaigns" ? "default" : "outline"} onClick={() => setTab("campaigns")}>History ({campaignsArr.length})</Button>
        <Button variant={tab === "templates" ? "default" : "outline"} onClick={() => setTab("templates")}>Templates ({templatesArr.length})</Button>
        <Button variant={tab === "config" ? "default" : "outline"} onClick={() => setTab("config")}><Settings className="w-3 h-3 mr-1" />SMTP Config</Button>
      </div>

      {showSendForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Send Email Campaign</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSendForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Use Template</Label>
                <Select value={sendForm.template_id} onValueChange={v => { sf("template_id", v); applyTemplate(v); }}>
                  <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
                  <SelectContent>{templatesArr.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Send to Tag (blank = all contacts)</Label><Input value={sendForm.tag_filter} onChange={e => sf("tag_filter", e.target.value)} placeholder="VIP, Hot Lead, Customer..." /></div>
              <div className="col-span-2"><Label>Subject</Label><Input value={sendForm.subject} onChange={e => sf("subject", e.target.value)} /></div>
              <div className="col-span-2">
                <Label>Body (HTML or plain text)</Label>
                <textarea className="w-full border rounded p-2 text-sm h-28 resize-none font-mono" value={sendForm.body} onChange={e => sf("body", e.target.value)} placeholder="Hi {{name}}, ..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSendForm(false)}>Cancel</Button>
              <Button onClick={() => sendCampaign.mutate(sendForm)}><Send className="w-4 h-4 mr-1" />Send Now</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "campaigns" && (
        <div className="space-y-2">
          {campaignsArr.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="pt-4 flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-xs text-gray-500">{c.sent_at?.slice(0, 16)?.replace("T", " ")} · {c.recipient_count ?? 0} recipients · {c.tag_filter || "All contacts"}</p>
                </div>
                <Badge className={STATUS_COLOR[c.status] ?? "bg-gray-100"}>{c.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {campaignsArr.length === 0 && <p className="text-center text-gray-400 py-8">No campaigns sent yet.</p>}
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowTemplateForm(true)}><Plus className="w-4 h-4 mr-1" />New Template</Button>
          </div>
          {showTemplateForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Email Template</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTemplateForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Template Name</Label><Input value={templateForm.name} onChange={e => tf("name", e.target.value)} /></div>
                  <div><Label>Default Tag Filter</Label><Input value={templateForm.tag_filter} onChange={e => tf("tag_filter", e.target.value)} placeholder="e.g. Hot Lead" /></div>
                  <div className="col-span-2"><Label>Subject</Label><Input value={templateForm.subject} onChange={e => tf("subject", e.target.value)} /></div>
                  <div className="col-span-2">
                    <Label>Body (use {"{{name}}"} for personalization)</Label>
                    <textarea className="w-full border rounded p-2 text-sm h-28 resize-none" value={templateForm.body} onChange={e => tf("body", e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowTemplateForm(false)}>Cancel</Button>
                  <Button onClick={() => createTemplate.mutate(templateForm)}>Save Template</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            {templatesArr.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="pt-4">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{t.subject}</p>
                  {t.tag_filter && <p className="text-xs text-gray-400 mt-1">Tag: {t.tag_filter}</p>}
                  <Button size="sm" className="mt-2" onClick={() => { setSendForm(p => ({ ...p, template_id: t.id.toString(), subject: t.subject, body: t.body, tag_filter: t.tag_filter || "" })); setShowSendForm(true); setTab("campaigns"); }}>Use Template</Button>
                </CardContent>
              </Card>
            ))}
            {templatesArr.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-6 text-center">No templates yet.</p>}
          </div>
        </div>
      )}

      {tab === "config" && (
        <Card>
          <CardHeader><CardTitle className="text-base">SMTP Configuration</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div><Label>SMTP Host</Label><Input value={smtpHost || (config as any)?.host || ""} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div><Label>SMTP Port</Label><Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} /></div>
            <div><Label>Username</Label><Input value={smtpUser || (config as any)?.user || ""} onChange={e => setSmtpUser(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="App password..." /></div>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button onClick={() => saveConfig.mutate({ host: smtpHost, port: parseInt(smtpPort), user: smtpUser, pass: smtpPass })}>Save Config</Button>
            </div>
            <p className="col-span-2 text-xs text-gray-400">Credentials stored AES-256 encrypted per tenant. Use app passwords for Gmail/Outlook.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
