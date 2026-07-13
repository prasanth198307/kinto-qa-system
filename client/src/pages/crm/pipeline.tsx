import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Plus, X, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY_PIPE = { name: "", description: "" };
const EMPTY_STAGE = { name: "", pipeline_id: "", order_no: "1", probability: "50" };
const EMPTY_OPP = { title: "", contact_id: "", pipeline_id: "", stage_id: "", value: "", probability: "", expected_close: "", notes: "" };

export default function CRMPipelinePage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"overview" | "pipelines" | "stages">("overview");
  const [showPipeForm, setShowPipeForm] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [showOppForm, setShowOppForm] = useState(false);
  const [pipeForm, setPipeForm] = useState({ ...EMPTY_PIPE });
  const [stageForm, setStageForm] = useState({ ...EMPTY_STAGE });
  const [oppForm, setOppForm] = useState({ ...EMPTY_OPP });

  const { data: pipelines = [] } = useQuery<any[]>({ queryKey: ["/api/crm/pipelines"], queryFn: () => api("GET", "/api/crm/pipelines") });
  const { data: stages = [] } = useQuery<any[]>({ queryKey: ["/api/crm/stages"], queryFn: () => api("GET", "/api/crm/stages") });
  const { data: opps = [] } = useQuery<any[]>({ queryKey: ["/api/crm/opportunities"], queryFn: () => api("GET", "/api/crm/opportunities") });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const createPipe = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/pipelines", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/pipelines"] }); setShowPipeForm(false); setPipeForm({ ...EMPTY_PIPE }); } });
  const deletePipe = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/pipelines/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/pipelines"] }) });
  const createStage = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/stages", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/stages"] }); setShowStageForm(false); setStageForm({ ...EMPTY_STAGE }); } });
  const deleteStage = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/stages/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/stages"] }) });
  const createOpp = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/opportunities", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/opportunities"] }); setShowOppForm(false); setOppForm({ ...EMPTY_OPP }); } });
  const deleteOpp = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/opportunities/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/opportunities"] }) });

  const pf = (k: string, v: string) => setPipeForm(p => ({ ...p, [k]: v }));
  const sf = (k: string, v: string) => setStageForm(p => ({ ...p, [k]: v }));
  const of2 = (k: string, v: string) => setOppForm(p => ({ ...p, [k]: v }));

  const pipesArr = Array.isArray(pipelines) ? pipelines : [];
  const stagesArr = Array.isArray(stages) ? stages : [];
  const oppsArr = Array.isArray(opps) ? opps : [];
  const contactsArr = Array.isArray(contacts) ? contacts : [];

  const totalValue = oppsArr.reduce((s: number, o: any) => s + Number(o.value || 0), 0);
  const weightedValue = oppsArr.reduce((s: number, o: any) => s + Number(o.value || 0) * Number(o.probability || 0) / 100, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-600" />Pipeline Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/crm/pipeline-board")}><Target className="w-4 h-4 mr-1" />Kanban Board</Button>
          <Button onClick={() => setShowOppForm(true)}><Plus className="w-4 h-4 mr-1" />Add Deal</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Deals</p><p className="text-2xl font-bold">{oppsArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Pipeline Value</p><p className="text-xl font-bold">{sym}{(totalValue/100000).toFixed(1)}L</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Weighted Value</p><p className="text-xl font-bold">{sym}{(weightedValue/100000).toFixed(1)}L</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Pipelines</p><p className="text-2xl font-bold">{pipesArr.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "overview" ? "default" : "outline"} onClick={() => setTab("overview")}>Deals ({oppsArr.length})</Button>
        <Button variant={tab === "pipelines" ? "default" : "outline"} onClick={() => setTab("pipelines")}>Pipelines</Button>
        <Button variant={tab === "stages" ? "default" : "outline"} onClick={() => setTab("stages")}>Stages</Button>
      </div>

      {showOppForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Deal</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowOppForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Title *</Label><Input value={oppForm.title} onChange={e => of2("title", e.target.value)} /></div>
            <div><Label>Contact</Label>
              <Select value={oppForm.contact_id} onValueChange={v => of2("contact_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contactsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pipeline</Label>
              <Select value={oppForm.pipeline_id} onValueChange={v => of2("pipeline_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select pipeline" /></SelectTrigger>
                <SelectContent>{pipesArr.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Stage</Label>
              <Select value={oppForm.stage_id} onValueChange={v => of2("stage_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>{stagesArr.filter((s: any) => !oppForm.pipeline_id || s.pipeline_id?.toString() === oppForm.pipeline_id).map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Value (${sym})</Label><Input type="number" value={oppForm.value} onChange={e => of2("value", e.target.value)} /></div>
            <div><Label>Probability (%)</Label><Input type="number" value={oppForm.probability} onChange={e => of2("probability", e.target.value)} /></div>
            <div><Label>Expected Close</Label><Input type="date" value={oppForm.expected_close} onChange={e => of2("expected_close", e.target.value)} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={oppForm.notes} onChange={e => of2("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowOppForm(false)}>Cancel</Button>
              <Button onClick={() => createOpp.mutate({ ...oppForm, contact_id: oppForm.contact_id ? parseInt(oppForm.contact_id) : undefined, pipeline_id: parseInt(oppForm.pipeline_id), stage_id: parseInt(oppForm.stage_id), value: parseFloat(oppForm.value || "0"), probability: parseInt(oppForm.probability || "50") })}>Create Deal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "overview" && (
        <div className="space-y-2">
          {oppsArr.map((o: any) => (
            <Card key={o.id}>
              <CardContent className="pt-4 flex items-start justify-between">
                <div>
                  <p className="font-semibold">{o.title}</p>
                  <p className="text-sm text-gray-600">{o.contact_name ?? `Contact #${o.contact_id}`} · {o.stage_name ?? `Stage #${o.stage_id}`}</p>
                  <p className="text-xs text-gray-400">Close: {o.expected_close?.slice(0, 10)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-bold">{sym}{Number(o.value ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-500">{o.probability}% probability</p>
                  <Button size="sm" variant="ghost" className="text-red-500 text-xs" onClick={() => deleteOpp.mutate(o.id)}>Del</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {oppsArr.length === 0 && <p className="text-center text-gray-400 py-8">No deals. Add your first opportunity.</p>}
        </div>
      )}

      {tab === "pipelines" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setShowPipeForm(true)}><Plus className="w-4 h-4 mr-1" />New Pipeline</Button></div>
          {showPipeForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Pipeline</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPipeForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={pipeForm.name} onChange={e => pf("name", e.target.value)} placeholder="Sales, Enterprise, SMB..." /></div>
                <div><Label>Description</Label><Input value={pipeForm.description} onChange={e => pf("description", e.target.value)} /></div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowPipeForm(false)}>Cancel</Button>
                  <Button onClick={() => createPipe.mutate(pipeForm)}>Create</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {pipesArr.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div><p className="font-semibold">{p.name}</p><p className="text-sm text-gray-500">{stagesArr.filter((s: any) => s.pipeline_id === p.id).length} stages · {oppsArr.filter((o: any) => o.pipeline_id === p.id).length} deals</p></div>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePipe.mutate(p.id)}>Del</Button>
              </CardContent>
            </Card>
          ))}
          {pipesArr.length === 0 && <p className="text-gray-400 text-sm py-6 text-center">No pipelines. Create one first.</p>}
        </div>
      )}

      {tab === "stages" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => setShowStageForm(true)}><Plus className="w-4 h-4 mr-1" />New Stage</Button></div>
          {showStageForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Stage</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowStageForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-3">
                <div><Label>Pipeline</Label>
                  <Select value={stageForm.pipeline_id} onValueChange={v => sf("pipeline_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{pipesArr.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Stage Name</Label><Input value={stageForm.name} onChange={e => sf("name", e.target.value)} placeholder="Qualified, Proposal..." /></div>
                <div><Label>Order</Label><Input type="number" value={stageForm.order_no} onChange={e => sf("order_no", e.target.value)} /></div>
                <div><Label>Probability (%)</Label><Input type="number" value={stageForm.probability} onChange={e => sf("probability", e.target.value)} /></div>
                <div className="col-span-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowStageForm(false)}>Cancel</Button>
                  <Button onClick={() => createStage.mutate({ ...stageForm, pipeline_id: parseInt(stageForm.pipeline_id), order_no: parseInt(stageForm.order_no), probability: parseInt(stageForm.probability) })}>Create</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {stagesArr.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div><p className="font-medium">{s.name}</p><p className="text-xs text-gray-500">{pipesArr.find((p: any) => p.id === s.pipeline_id)?.name} · Order #{s.order_no} · {s.probability}%</p></div>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteStage.mutate(s.id)}>Del</Button>
            </div>
          ))}
          {stagesArr.length === 0 && <p className="text-gray-400 text-sm py-6 text-center">No stages. Create a pipeline first.</p>}
        </div>
      )}
    </div>
  );
}
