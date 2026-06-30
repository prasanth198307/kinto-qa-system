import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Send } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

interface Campaign {
  id: number;
  name: string;
  subject?: string;
  template_id?: number;
  recipients_count?: number;
  sent_count?: number;
  open_rate?: number;
  click_rate?: number;
  status: string;
  scheduled_at?: string;
}

interface Template {
  id: number;
  name: string;
  subject?: string;
  body?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const EMPTY_CAMPAIGN = { name: "", subject: "", template_id: "", segment: "all", scheduled_at: "" };
const EMPTY_TEMPLATE = { name: "", subject: "", body: "" };

export default function EmailCampaignsPage() {
  const qc = useQueryClient();
  const [campaignDialog, setCampaignDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
  const [editTemplate, setEditTemplate] = useState<Partial<Template> | null>(null);

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["crm-campaigns"],
    queryFn: () => api("GET", "/api/crm/campaigns"),
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["crm-email-templates"],
    queryFn: () => api("GET", "/api/crm/email-templates"),
  });

  const createCampaign = useMutation({
    mutationFn: (c: typeof EMPTY_CAMPAIGN) => api("POST", "/api/crm/campaigns", c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-campaigns"] }); setCampaignDialog(false); setCampaignForm(EMPTY_CAMPAIGN); },
  });

  const saveTemplate = useMutation({
    mutationFn: (t: Partial<Template>) =>
      t.id ? api("PUT", `/api/crm/email-templates/${t.id}`, t) : api("POST", "/api/crm/email-templates", t),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-email-templates"] }); setTemplateDialog(false); setEditTemplate(null); },
  });

  const sendCampaign = useMutation({
    mutationFn: (id: number) => api("POST", `/api/crm/campaigns/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-campaigns"] }),
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Email Campaigns</h1>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setCampaignDialog(true)}>
              <Plus size={16} className="mr-1" /> Create Campaign
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-8">No campaigns</TableCell></TableRow>}
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.subject || "—"}</TableCell>
                      <TableCell>{c.recipients_count ?? "—"}</TableCell>
                      <TableCell>{c.sent_count ?? "—"}</TableCell>
                      <TableCell>{c.open_rate != null ? `${c.open_rate}%` : "—"}</TableCell>
                      <TableCell>{c.click_rate != null ? `${c.click_rate}%` : "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}>
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        {c.status === "draft" && (
                          <Button size="sm" variant="ghost" onClick={() => sendCampaign.mutate(c.id)}>
                            <Send size={14} className="mr-1" /> Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditTemplate(EMPTY_TEMPLATE); setTemplateDialog(true); }}>
              <Plus size={16} className="mr-1" /> New Template
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No templates</TableCell></TableRow>}
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">{t.subject || "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate text-gray-500">{t.body?.replace(/<[^>]+>/g, " ").substring(0, 80) || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setEditTemplate(t); setTemplateDialog(true); }}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">Campaign Name</label><Input value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} /></div>
            <div><label className="text-xs font-medium">Subject</label><Input value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} /></div>
            <div>
              <label className="text-xs font-medium">Template</label>
              <Select value={campaignForm.template_id} onValueChange={(v) => setCampaignForm({ ...campaignForm, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Recipient Segment</label>
              <Select value={campaignForm.segment} onValueChange={(v) => setCampaignForm({ ...campaignForm, segment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="tag">By Tag</SelectItem>
                  <SelectItem value="account">By Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium">Schedule (optional)</label><Input type="datetime-local" value={campaignForm.scheduled_at} onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_at: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialog(false)}>Cancel</Button>
            <Button onClick={() => createCampaign.mutate(campaignForm)} disabled={createCampaign.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialog} onOpenChange={(v) => { setTemplateDialog(v); if (!v) setEditTemplate(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editTemplate?.id ? "Edit Template" : "New Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Name</label><Input value={editTemplate?.name || ""} onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })} /></div>
              <div><label className="text-xs font-medium">Subject</label><Input value={editTemplate?.subject || ""} onChange={(e) => setEditTemplate({ ...editTemplate, subject: e.target.value })} /></div>
            </div>
            <div>
              <label className="text-xs font-medium">HTML Body</label>
              <textarea className="w-full border rounded p-2 text-sm font-mono min-h-[200px]" value={editTemplate?.body || ""} onChange={(e) => setEditTemplate({ ...editTemplate, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTemplateDialog(false); setEditTemplate(null); }}>Cancel</Button>
            <Button onClick={() => editTemplate && saveTemplate.mutate(editTemplate)} disabled={saveTemplate.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
