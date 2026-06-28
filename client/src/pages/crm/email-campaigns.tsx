import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

export default function CRMEmailCampaignsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"send"|"campaigns">("send");
  const [emailForm, setEmailForm] = useState({ to: "", template_id: "", subject: "", body: "", schedule: "" });
  const [campaignForm, setCampaignForm] = useState({ name: "", type: "", target_list: "", template_id: "", schedule: "" });

  const { data: templates = [] } = useQuery({ queryKey: ["/api/crm/email/templates"], queryFn: () => api("GET", "/api/crm/email/templates") });
  const { data: campaigns = [] } = useQuery({ queryKey: ["/api/crm/drip/campaigns"], queryFn: () => api("GET", "/api/crm/drip/campaigns") });

  const sendMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/email/send", data),
    onSuccess: () => { toast({ title: "Email sent" }); setEmailForm({ to: "", template_id: "", subject: "", body: "", schedule: "" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const campaignMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/crm/drip/campaigns", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/drip/campaigns"] }); toast({ title: "Campaign created" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Email Campaigns</h1>
      <div className="flex gap-2">
        <Button variant={tab === "send" ? "default" : "outline"} onClick={() => setTab("send")}>Send Email</Button>
        <Button variant={tab === "campaigns" ? "default" : "outline"} onClick={() => setTab("campaigns")}>Campaigns</Button>
      </div>

      {tab === "send" && (
        <Card>
          <CardHeader><CardTitle>Send Email</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm">To (contact or list)</label>
                <Input value={emailForm.to} onChange={e => setEmailForm(p => ({...p, to: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm">Template</label>
                <Select value={emailForm.template_id} onValueChange={v => setEmailForm(p => ({...p, template_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
                  <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Schedule (optional)</label>
                <Input type="datetime-local" value={emailForm.schedule} onChange={e => setEmailForm(p => ({...p, schedule: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm">Subject</label>
                <Input value={emailForm.subject} onChange={e => setEmailForm(p => ({...p, subject: e.target.value}))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm">Body</label>
                <textarea className="w-full border rounded p-2 text-sm min-h-[100px]" value={emailForm.body} onChange={e => setEmailForm(p => ({...p, body: e.target.value}))} />
              </div>
            </div>
            <Button className="mt-3" onClick={() => sendMutation.mutate(emailForm)}>Send</Button>
          </CardContent>
        </Card>
      )}

      {tab === "campaigns" && (
        <>
          <Card>
            <CardHeader><CardTitle>Create Campaign</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Campaign Name</label>
                  <Input value={campaignForm.name} onChange={e => setCampaignForm(p => ({...p, name: e.target.value}))} />
                </div>
                <div>
                  <label className="text-sm">Type</label>
                  <Select value={campaignForm.type} onValueChange={v => setCampaignForm(p => ({...p, type: v}))}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent><SelectItem value="drip">Drip</SelectItem><SelectItem value="blast">Blast</SelectItem></SelectContent>
                  </Select>
                </div>
                {["target_list","template_id","schedule"].map(k => (
                  <div key={k}>
                    <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                    <Input value={(campaignForm as any)[k]} onChange={e => setCampaignForm(p => ({...p,[k]:e.target.value}))} />
                  </div>
                ))}
              </div>
              <Button className="mt-3" onClick={() => campaignMutation.mutate(campaignForm)}>Create Campaign</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Contacts</TableHead>
                    <TableHead>Sent</TableHead><TableHead>Opened</TableHead><TableHead>Clicked</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.campaign_name || c.name}</TableCell>
                      <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                      <TableCell>{c.contacts_count}</TableCell>
                      <TableCell>{c.sent}</TableCell>
                      <TableCell>{c.opened}</TableCell>
                      <TableCell>{c.clicked}</TableCell>
                      <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {campaigns.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No campaigns</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
