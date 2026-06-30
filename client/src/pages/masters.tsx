import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const SECTIONS = [
  ["hsn","HSN Codes"],["sac","SAC Codes"],["tax","Tax Config"],["states","States"],
  ["banks","Banks"],["branches","Branches"],["docnum","Doc Numbering"],
  ["email","Email Templates"],["sms","SMS Templates"],["approval","Approval Matrix"],
  ["flags","Feature Flags"],["print","Print Templates"],["webhooks","Webhooks"]
];

function SimpleTable({ cols, rows }: { cols: string[], rows: any[] }) {
  if (!rows.length) return <div className="text-gray-400 text-sm py-4">No records found</div>;
  return (
    <Table><TableHeader><TableRow>{cols.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((r, i) => <TableRow key={i}>{cols.map(c => <TableCell key={c}>{typeof r[c] === "boolean" ? (r[c] ? "Yes" : "No") : String(r[c] ?? "")}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  );
}

function HSNSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/hsn"], queryFn: () => apiRequest("GET", "/api/masters/hsn") });
  const [f, setF] = useState({ hsn_code: "", description: "", gst_rate: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/hsn", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/hsn"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="HSN Code" value={f.hsn_code} onChange={e => setF({ ...f, hsn_code: e.target.value })} /><Input placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /><Input placeholder="GST%" value={f.gst_rate} onChange={e => setF({ ...f, gst_rate: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["hsn_code","description","gst_rate"]} rows={items} /></div>);
}

function SACSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/sac"], queryFn: () => apiRequest("GET", "/api/masters/sac") });
  const [f, setF] = useState({ sac_code: "", description: "", gst_rate: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/sac", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/sac"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="SAC Code" value={f.sac_code} onChange={e => setF({ ...f, sac_code: e.target.value })} /><Input placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /><Input placeholder="GST%" value={f.gst_rate} onChange={e => setF({ ...f, gst_rate: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["sac_code","description","gst_rate"]} rows={items} /></div>);
}

function TaxSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/tax-config"], queryFn: () => apiRequest("GET", "/api/masters/tax-config") });
  const [f, setF] = useState({ tax_name: "", tax_type: "", rate: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/tax-config", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/tax-config"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Tax Name" value={f.tax_name} onChange={e => setF({ ...f, tax_name: e.target.value })} /><Input placeholder="Type" value={f.tax_type} onChange={e => setF({ ...f, tax_type: e.target.value })} /><Input placeholder="Rate%" value={f.rate} onChange={e => setF({ ...f, rate: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["tax_name","tax_type","rate","is_active"]} rows={items} /></div>);
}

function StatesSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/states"], queryFn: () => apiRequest("GET", "/api/masters/states") });
  const [f, setF] = useState({ state_name: "", state_code: "", country: "India" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/states", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/states"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="State Name" value={f.state_name} onChange={e => setF({ ...f, state_name: e.target.value })} /><Input placeholder="Code" value={f.state_code} onChange={e => setF({ ...f, state_code: e.target.value })} /><Input placeholder="Country" value={f.country} onChange={e => setF({ ...f, country: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["state_name","state_code","country"]} rows={items} /></div>);
}

function BanksSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/banks"], queryFn: () => apiRequest("GET", "/api/masters/banks") });
  const [f, setF] = useState({ bank_name: "", ifsc_prefix: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/banks", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/banks"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Bank Name" value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} /><Input placeholder="IFSC Prefix" value={f.ifsc_prefix} onChange={e => setF({ ...f, ifsc_prefix: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["bank_name","ifsc_prefix","is_active"]} rows={items} /></div>);
}

function BranchesSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/branches"], queryFn: () => apiRequest("GET", "/api/masters/branches") });
  const [f, setF] = useState({ branch_name: "", city: "", state: "", bank_name: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/branches", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/branches"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Branch" value={f.branch_name} onChange={e => setF({ ...f, branch_name: e.target.value })} /><Input placeholder="City" value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /><Input placeholder="State" value={f.state} onChange={e => setF({ ...f, state: e.target.value })} /><Input placeholder="Bank" value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["branch_name","city","state","bank_name"]} rows={items} /></div>);
}

function DocNumSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/doc-numbering"], queryFn: () => apiRequest("GET", "/api/masters/doc-numbering") });
  const [f, setF] = useState({ doc_type: "", prefix: "", suffix: "", current_number: "", reset_yearly: false });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/doc-numbering", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/doc-numbering"] }) });
  const preview = async (doc_type: string) => { try { const r = await apiRequest("GET", `/api/masters/doc-numbering/preview/${doc_type}`); alert(r.preview); } catch {} };
  return (<div className="space-y-3"><div className="flex gap-2 flex-wrap"><Input placeholder="Doc Type" value={f.doc_type} onChange={e => setF({ ...f, doc_type: e.target.value })} /><Input placeholder="Prefix" value={f.prefix} onChange={e => setF({ ...f, prefix: e.target.value })} /><Input placeholder="Suffix" value={f.suffix} onChange={e => setF({ ...f, suffix: e.target.value })} /><Input placeholder="Start No." value={f.current_number} onChange={e => setF({ ...f, current_number: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div>
    <Table><TableHeader><TableRow><TableHead>Doc Type</TableHead><TableHead>Prefix</TableHead><TableHead>Suffix</TableHead><TableHead>Current No.</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{items.map((i: any) => <TableRow key={i.id}><TableCell>{i.doc_type}</TableCell><TableCell>{i.prefix}</TableCell><TableCell>{i.suffix}</TableCell><TableCell>{i.current_number}</TableCell><TableCell><Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => preview(i.doc_type)}>Preview</Button></TableCell></TableRow>)}</TableBody></Table>
  </div>);
}

function EmailTemplatesSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/email-templates"], queryFn: () => apiRequest("GET", "/api/masters/email-templates") });
  const [f, setF] = useState({ template_name: "", subject: "", template_type: "", body: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/email-templates", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/email-templates"] }) });
  return (<div className="space-y-3"><div className="grid grid-cols-2 gap-2"><Input placeholder="Template Name" value={f.template_name} onChange={e => setF({ ...f, template_name: e.target.value })} /><Input placeholder="Subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} /><Input placeholder="Type" value={f.template_type} onChange={e => setF({ ...f, template_type: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button><div className="col-span-2"><Textarea placeholder="Body" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} rows={3} /></div></div><SimpleTable cols={["template_name","subject","template_type"]} rows={items} /></div>);
}

function SMSSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/sms-templates"], queryFn: () => apiRequest("GET", "/api/masters/sms-templates") });
  const [f, setF] = useState({ template_name: "", content: "", dlt_template_id: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/sms-templates", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/sms-templates"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Name" value={f.template_name} onChange={e => setF({ ...f, template_name: e.target.value })} /><Input placeholder="DLT ID" value={f.dlt_template_id} onChange={e => setF({ ...f, dlt_template_id: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><Textarea placeholder="Content" value={f.content} onChange={e => setF({ ...f, content: e.target.value })} rows={2} /><SimpleTable cols={["template_name","dlt_template_id"]} rows={items} /></div>);
}

function ApprovalSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/approval-matrix"], queryFn: () => apiRequest("GET", "/api/masters/approval-matrix") });
  const [f, setF] = useState({ doc_type: "", min_amount: "", max_amount: "", approver_role: "", approval_level: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/approval-matrix", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/approval-matrix"] }) });
  return (<div className="space-y-3"><div className="flex gap-2 flex-wrap"><Input placeholder="Doc Type" value={f.doc_type} onChange={e => setF({ ...f, doc_type: e.target.value })} /><Input placeholder="Min Amt" value={f.min_amount} onChange={e => setF({ ...f, min_amount: e.target.value })} /><Input placeholder="Max Amt" value={f.max_amount} onChange={e => setF({ ...f, max_amount: e.target.value })} /><Input placeholder="Role" value={f.approver_role} onChange={e => setF({ ...f, approver_role: e.target.value })} /><Input placeholder="Level" value={f.approval_level} onChange={e => setF({ ...f, approval_level: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["doc_type","min_amount","max_amount","approver_role","approval_level"]} rows={items} /></div>);
}

function FeatureFlagsSection() {
  const qc = useQueryClient();
  const { data: flags = [] } = useQuery({ queryKey: ["/api/masters/feature-flags"], queryFn: () => apiRequest("GET", "/api/masters/feature-flags") });
  const toggle = useMutation({ mutationFn: ({ key, val }: any) => apiRequest("PUT", `/api/masters/feature-flags/${key}`, { is_enabled: val }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/feature-flags"] }) });
  return (<Table><TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Description</TableHead><TableHead>Enabled</TableHead></TableRow></TableHeader><TableBody>{flags.map((f: any) => <TableRow key={f.flag_key}><TableCell className="font-mono text-xs">{f.flag_key}</TableCell><TableCell>{f.description}</TableCell><TableCell><button onClick={() => toggle.mutate({ key: f.flag_key, val: !f.is_enabled })}><Badge variant={f.is_enabled ? "default" : "secondary"}>{f.is_enabled ? "ON" : "OFF"}</Badge></button></TableCell></TableRow>)}</TableBody></Table>);
}

function PrintTemplatesSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/print-templates"], queryFn: () => apiRequest("GET", "/api/masters/print-templates") });
  const [f, setF] = useState({ template_name: "", doc_type: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/print-templates", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/print-templates"] }) });
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Name" value={f.template_name} onChange={e => setF({ ...f, template_name: e.target.value })} /><Input placeholder="Doc Type" value={f.doc_type} onChange={e => setF({ ...f, doc_type: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div><SimpleTable cols={["template_name","doc_type","is_default"]} rows={items} /></div>);
}

function WebhooksSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["/api/masters/webhooks"], queryFn: () => apiRequest("GET", "/api/masters/webhooks") });
  const [f, setF] = useState({ webhook_name: "", url: "", events: "" });
  const add = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/masters/webhooks", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/masters/webhooks"] }) });
  const test = async (id: any) => { try { await apiRequest("POST", `/api/masters/webhooks/${id}/test`, {}); alert("Test sent!"); } catch { alert("Test failed"); } };
  return (<div className="space-y-3"><div className="flex gap-2"><Input placeholder="Name" value={f.webhook_name} onChange={e => setF({ ...f, webhook_name: e.target.value })} /><Input placeholder="URL" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /><Input placeholder="Events (comma)" value={f.events} onChange={e => setF({ ...f, events: e.target.value })} /><Button onClick={() => add.mutate(f)}>Add</Button></div>
    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>URL</TableHead><TableHead>Events</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{items.map((w: any) => <TableRow key={w.id}><TableCell>{w.webhook_name}</TableCell><TableCell className="text-xs truncate max-w-40">{w.url}</TableCell><TableCell className="text-xs">{Array.isArray(w.events) ? w.events.join(", ") : String(w.events || "")}</TableCell><TableCell>{w.is_active ? "Yes" : "No"}</TableCell><TableCell><Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => test(w.id)}>Test</Button></TableCell></TableRow>)}</TableBody></Table>
  </div>);
}

const SECTION_MAP: Record<string, React.ReactNode> = {
  hsn: <HSNSection />, sac: <SACSection />, tax: <TaxSection />, states: <StatesSection />,
  banks: <BanksSection />, branches: <BranchesSection />, docnum: <DocNumSection />,
  email: <EmailTemplatesSection />, sms: <SMSSection />, approval: <ApprovalSection />,
  flags: <FeatureFlagsSection />, print: <PrintTemplatesSection />, webhooks: <WebhooksSection />
};

export default function MastersPage() {
  const [active, setActive] = useState("hsn");
  const label = SECTIONS.find(s => s[0] === active)?.[1] || "";
  return (
    <div className="flex h-full">
      <div className="w-48 border-r pr-2 space-y-1 shrink-0">
        <div className="font-semibold text-sm text-gray-500 px-2 py-1 uppercase tracking-wide">Masters</div>
        {SECTIONS.map(([key, lbl]) => (
          <button key={key} onClick={() => setActive(key)} className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${active === key ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}>{lbl}</button>
        ))}
      </div>
      <div className="flex-1 pl-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{label}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => alert("Feature coming soon")}>Import</Button>
            <Button variant="outline" size="sm" onClick={() => alert("Feature coming soon")}>Export</Button>
          </div>
        </div>
        {SECTION_MAP[active]}
      </div>
    </div>
  );
}
