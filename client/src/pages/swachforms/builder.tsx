import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Globe, Eye, EyeOff, Trash2, GripVertical, Plus, Code, CreditCard, Sparkles, Wand2, Zap } from "lucide-react";

const FIELD_TYPES = [
  { type: "text", label: "Text" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Phone" },
  { type: "number", label: "Number" },
  { type: "date", label: "Date" },
  { type: "textarea", label: "Textarea" },
  { type: "select", label: "Dropdown" },
  { type: "multiselect", label: "Multi Select" },
  { type: "checkbox", label: "Checkbox" },
  { type: "radio", label: "Radio" },
  { type: "file", label: "File Upload" },
  { type: "signature", label: "Signature" },
  { type: "payment", label: "Payment", icon: "credit-card" },
  { type: "heading", label: "Heading" },
  { type: "divider", label: "Divider" },
];

function generateId() {
  return "f_" + Math.random().toString(36).slice(2, 10);
}

function createField(type: string) {
  const base: any = {
    id: generateId(), type, label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
    placeholder: "", required: false, options: [],
  };
  if (type === "select" || type === "multiselect" || type === "radio") base.options = ["Option 1", "Option 2"];
  if (type === "payment") { base.label = "Registration Fee"; base.amount = 500; base.currency = "INR"; base.description = ""; }
  if (type === "heading") { base.label = "Section Heading"; }
  if (type === "divider") { base.label = "Divider"; }
  return base;
}

interface FieldConditionRule {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';
  value: string;
}

interface FieldCondition {
  action: 'show' | 'hide';
  logic: 'all' | 'any';
  rules: FieldConditionRule[];
}

interface Field {
  id: string; type: string; label: string; placeholder: string; required: boolean; options: string[];
  amount?: number; currency?: string; description?: string;
  conditions?: FieldCondition | null;
  hidden_by_default?: boolean;
}

interface EmbedSnippet {
  script_tag: string; inline_embed: string; direct_url: string; iframe: string;
}

export default function SwachFormsBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [fields, setFields] = useState<Field[]>([]);
  const [formName, setFormName] = useState("");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedSnippet, setEmbedSnippet] = useState<EmbedSnippet | null>(null);
  const [embedTab, setEmbedTab] = useState<"script_tag" | "inline_embed" | "direct_url" | "iframe">("script_tag");
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [notifConfig, setNotifConfig] = useState<any>({});
  const [notifSaved, setNotifSaved] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetch(`/api/forms/${id}/notifications`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).then(setNotifConfig).catch(() => {});
    }
  }, [id]);

  const saveNotifications = async () => {
    if (!id) { toast({ title: "Save the form first", variant: "destructive" }); return; }
    await fetch(`/api/forms/${id}/notifications`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifConfig)
    });
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const testWhatsApp = async () => {
    if (!id) return;
    const resp = await fetch(`/api/forms/${id}/notifications/test`, { method: 'POST' });
    const data = await resp.json();
    alert(data.message || (data.sent ? 'Test sent!' : 'Could not send'));
  };

  const { data: form } = useQuery<any>({
    queryKey: [`/api/forms/${id}`],
    enabled: !!id,
    queryFn: async () => {
      const r = await fetch(`/api/forms/${id}`);
      return r.json();
    },
    select: (data) => {
      if (!loaded) {
        setFormName(data.name || "");
        setFields(Array.isArray(data.schema) ? data.schema : []);
        setLoaded(true);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = id ? `/api/forms/${id}` : "/api/forms";
      const method = id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formName, schema: fields }) });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: "Form saved" });
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
      if (!id) setLocation(`/swachforms/builder/${data.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      if (!id) return;
      const r = await fetch(`/api/forms/${id}/publish`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to publish");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Form published" }); qc.invalidateQueries({ queryKey: ["/api/forms"] }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEmbed = async () => {
    if (!id) { toast({ title: "Save the form first", variant: "destructive" }); return; }
    const r = await fetch(`/api/forms/${id}/embed-snippet`);
    if (r.ok) { setEmbedSnippet(await r.json()); setShowEmbed(true); }
    else toast({ title: "Error loading embed code", variant: "destructive" });
  };

  const addField = (type: string) => {
    const f = createField(type);
    setFields(prev => [...prev, f]);
    setSelectedField(f.id);
  };

  const updateField = (fid: string, updates: Partial<Field>) => {
    setFields(prev => prev.map(f => f.id === fid ? { ...f, ...updates } : f));
  };

  const removeField = (fid: string) => {
    setFields(prev => prev.filter(f => f.id !== fid));
    if (selectedField === fid) setSelectedField(null);
  };

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); dragOverIdx.current = i; };
  const onDrop = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return;
    const updated = [...fields];
    const [moved] = updated.splice(dragIdx.current, 1);
    updated.splice(dragOverIdx.current, 0, moved);
    setFields(updated);
    dragIdx.current = null; dragOverIdx.current = null;
  };

  const runAIImprove = async (instruction: string) => {
    if (!fields.length) { toast({ title: "Add some fields first", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const r = await fetch("/api/forms/ai-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, instruction }),
      });
      const data = await r.json();
      if (data.fields?.length) {
        setFields(data.fields);
        setSelectedField(null);
        toast({ title: "✨ AI improved your form!" });
      }
    } catch (e: any) {
      toast({ title: "AI error", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
      setAiInstruction("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied to clipboard" }));
  };

  const sel = fields.find(f => f.id === selectedField);
  const embedTabKeys: Array<"script_tag" | "inline_embed" | "direct_url" | "iframe"> = ["script_tag", "inline_embed", "direct_url", "iframe"];
  const embedTabLabels: Record<string, string> = { script_tag: "Script Tag", inline_embed: "Inline Embed", direct_url: "Direct URL", iframe: "iFrame" };

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="border-b px-4 py-2 flex items-center gap-3 bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/swachforms")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <Input className="max-w-xs h-8 text-sm" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Form name..." />
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setPreview(p => !p)}>
          {preview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}{preview ? "Edit" : "Preview"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setShowAIPanel(p => !p); setShowNotifPanel(false); }}
          className={showAIPanel ? "border-violet-400 text-violet-700 bg-violet-50" : ""}>
          <Sparkles className="w-4 h-4 mr-1 text-violet-500" /> AI Assist
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowNotifPanel(p => !p)}>
          📱 Notifications
        </Button>
        <Button variant="outline" size="sm" onClick={openEmbed}>
          <Code className="w-4 h-4 mr-1" />Embed
        </Button>
        <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-1" />{saveMutation.isPending ? "Saving..." : "Save Draft"}
        </Button>
        <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
          <Globe className="w-4 h-4 mr-1" />{publishMutation.isPending ? "Publishing..." : "Publish"}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field palette */}
        {!preview && (
          <div className="w-48 border-r overflow-y-auto p-3 space-y-1 bg-muted/20 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Field Types</p>
            {FIELD_TYPES.map(ft => (
              <button key={ft.type} onClick={() => addField(ft.type)}
                className="w-full text-left text-sm px-3 py-2 rounded hover:bg-primary hover:text-primary-foreground transition-colors flex items-center gap-2">
                {ft.type === "payment" ? <CreditCard className="w-3 h-3" /> : <Plus className="w-3 h-3" />}{ft.label}
              </button>
            ))}
          </div>
        )}

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">{formName || "Untitled Form"}</h2>
            {fields.length === 0 && !preview && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm">Click a field type on the left to add it here</p>
              </div>
            )}
            {fields.map((f, i) => (
              <div key={f.id} draggable={!preview} onDragStart={() => onDragStart(i)} onDragOver={e => onDragOver(e, i)} onDrop={onDrop}
                className={`border rounded-lg p-3 ${!preview && selectedField === f.id ? "border-primary ring-1 ring-primary" : "border-border"} ${!preview ? "cursor-pointer" : ""}`}
                onClick={() => !preview && setSelectedField(f.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!preview && <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />}
                    {f.type !== "heading" && f.type !== "divider" && (
                      <Label className="text-sm font-medium">
                        {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                        {f.conditions && <span style={{fontSize:10,background:'#dbeafe',color:'#1d4ed8',padding:'1px 4px',borderRadius:3,marginLeft:4}}>conditional</span>}
                      </Label>
                    )}
                  </div>
                  {!preview && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); removeField(f.id); }}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>}
                </div>
                {f.type === "heading" ? <h3 className="text-base font-semibold">{f.label}</h3>
                  : f.type === "divider" ? <hr />
                  : f.type === "payment" ? (
                    <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">{f.label}</span>
                      </div>
                      <div className="text-green-700 font-semibold">
                        {f.currency === "USD" ? "$" : f.currency === "EUR" ? "€" : "₹"}{f.amount}
                      </div>
                      {f.description && <p className="text-xs text-green-600 mt-1">{f.description}</p>}
                      <button className="mt-2 bg-green-600 text-white text-xs px-3 py-1 rounded" disabled>Pay Now</button>
                    </div>
                  )
                  : f.type === "textarea" ? <Textarea rows={3} placeholder={f.placeholder || f.label} disabled />
                  : f.type === "select" || f.type === "multiselect" ? (
                    <select className="border rounded px-2 py-1 text-sm w-full" disabled>
                      <option>{f.placeholder || `Select ${f.label}`}</option>
                      {(f.options || []).map((o, idx) => <option key={idx}>{o}</option>)}
                    </select>
                  ) : f.type === "radio" ? (
                    <div className="space-y-1">{(f.options || []).map((o, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm"><input type="radio" disabled />{o}</label>
                    ))}</div>
                  ) : f.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled />{f.label}</label>
                  ) : f.type === "file" ? <div className="border-2 border-dashed rounded p-3 text-center text-sm text-muted-foreground">Click to upload</div>
                  : f.type === "signature" ? <div className="border rounded h-16 bg-gray-50 flex items-center justify-center text-sm text-muted-foreground">Signature area</div>
                  : <Input type={f.type === "email" ? "email" : f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} placeholder={f.placeholder || f.label} disabled />}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Properties */}
        {!preview && sel && (
          <div className="w-64 border-l overflow-y-auto p-4 space-y-4 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Field Properties</p>
            <div><Label className="text-xs">Label</Label><Input className="h-8 text-sm mt-1" value={sel.label} onChange={e => updateField(sel.id, { label: e.target.value })} /></div>
            {!["heading", "divider"].includes(sel.type) && (
              <div><Label className="text-xs">Placeholder</Label><Input className="h-8 text-sm mt-1" value={sel.placeholder} onChange={e => updateField(sel.id, { placeholder: e.target.value })} /></div>
            )}
            {!["heading", "divider"].includes(sel.type) && (
              <div className="flex items-center justify-between">
                <Label className="text-xs">Required</Label>
                <Switch checked={sel.required} onCheckedChange={v => updateField(sel.id, { required: v })} />
              </div>
            )}
            {["select", "multiselect", "radio"].includes(sel.type) && (
              <div>
                <Label className="text-xs">Options (one per line)</Label>
                <Textarea className="text-sm mt-1" rows={5}
                  value={(sel.options || []).join("\n")}
                  onChange={e => updateField(sel.id, { options: e.target.value.split("\n").filter(Boolean) })} />
              </div>
            )}
            {sel.type === "payment" && (
              <>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input className="h-8 text-sm mt-1" type="number" value={sel.amount ?? 0}
                    onChange={e => updateField(sel.id, { amount: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <select className="border rounded px-2 py-1 text-sm w-full mt-1" value={sel.currency || "INR"}
                    onChange={e => updateField(sel.id, { currency: e.target.value })}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input className="h-8 text-sm mt-1" value={sel.description || ""}
                    onChange={e => updateField(sel.id, { description: e.target.value })} placeholder="Optional note" />
                </div>
              </>
            )}
            <div className="text-xs text-muted-foreground">Type: <span className="font-mono">{sel.type}</span></div>
            <div className="text-xs text-muted-foreground">ID: <span className="font-mono">{sel.id}</span></div>

            {/* Conditions section */}
            <div style={{marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
                <span style={{fontSize: 13, fontWeight: 500}}>Show/Hide Conditions</span>
                {sel.conditions && (
                  <button onClick={() => updateField(sel.id, { conditions: null, hidden_by_default: false })} style={{fontSize:11,color:'#6b7280',background:'none',border:'none',cursor:'pointer'}}>Remove</button>
                )}
              </div>

              {!sel.conditions ? (
                <button onClick={() => updateField(sel.id, { conditions: { action: 'show', logic: 'all', rules: [] }, hidden_by_default: true })} style={{fontSize:12,padding:'6px 12px',border:'1px dashed #d1d5db',borderRadius:6,background:'none',cursor:'pointer',width:'100%'}}>
                  + Add Condition
                </button>
              ) : (
                <div>
                  <div style={{display:'flex',gap:8,marginBottom:8}}>
                    <select value={sel.conditions.action} onChange={e => updateField(sel.id, { conditions: { ...sel.conditions!, action: e.target.value as 'show' | 'hide' } })} style={{flex:1,fontSize:12,padding:'4px 8px',borderRadius:4,border:'1px solid #d1d5db'}}>
                      <option value="show">Show this field</option>
                      <option value="hide">Hide this field</option>
                    </select>
                    <select value={sel.conditions.logic} onChange={e => updateField(sel.id, { conditions: { ...sel.conditions!, logic: e.target.value as 'all' | 'any' } })} style={{fontSize:12,padding:'4px 8px',borderRadius:4,border:'1px solid #d1d5db'}}>
                      <option value="all">when ALL</option>
                      <option value="any">when ANY</option>
                    </select>
                  </div>

                  {sel.conditions.rules.map((rule, rIdx) => (
                    <div key={rIdx} style={{display:'flex',gap:4,marginBottom:6,alignItems:'center'}}>
                      <select value={rule.field_id} onChange={e => { const nr = [...sel.conditions!.rules]; nr[rIdx] = { ...rule, field_id: e.target.value }; updateField(sel.id, { conditions: { ...sel.conditions!, rules: nr } }); }} style={{flex:2,fontSize:11,padding:'3px',borderRadius:4,border:'1px solid #d1d5db'}}>
                        <option value="">Select field</option>
                        {fields.filter(f => f.id !== sel.id && f.type !== 'heading' && f.type !== 'divider').map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      <select value={rule.operator} onChange={e => { const nr = [...sel.conditions!.rules]; nr[rIdx] = { ...rule, operator: e.target.value as FieldConditionRule['operator'] }; updateField(sel.id, { conditions: { ...sel.conditions!, rules: nr } }); }} style={{flex:2,fontSize:11,padding:'3px',borderRadius:4,border:'1px solid #d1d5db'}}>
                        <option value="equals">equals</option>
                        <option value="not_equals">not equals</option>
                        <option value="contains">contains</option>
                        <option value="not_contains">not contains</option>
                        <option value="is_empty">is empty</option>
                        <option value="is_not_empty">is not empty</option>
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                      </select>
                      {!['is_empty','is_not_empty'].includes(rule.operator) && (
                        <input value={rule.value} onChange={e => { const nr = [...sel.conditions!.rules]; nr[rIdx] = { ...rule, value: e.target.value }; updateField(sel.id, { conditions: { ...sel.conditions!, rules: nr } }); }} placeholder="value" style={{flex:2,fontSize:11,padding:'3px 6px',borderRadius:4,border:'1px solid #d1d5db'}} />
                      )}
                      <button onClick={() => { const nr = sel.conditions!.rules.filter((_, i) => i !== rIdx); updateField(sel.id, { conditions: { ...sel.conditions!, rules: nr } }); }} style={{padding:'2px 6px',background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:14}}>×</button>
                    </div>
                  ))}

                  <button onClick={() => { const nr = [...sel.conditions!.rules, { field_id: '', operator: 'equals' as const, value: '' }]; updateField(sel.id, { conditions: { ...sel.conditions!, rules: nr } }); }} style={{fontSize:11,padding:'4px 10px',border:'1px dashed #d1d5db',borderRadius:4,background:'none',cursor:'pointer',marginTop:4}}>
                    + Add rule
                  </button>

                  {sel.conditions.rules.length > 0 && (
                    <div style={{fontSize:11,color:'#6b7280',marginTop:6,padding:'6px 8px',background:'#f9fafb',borderRadius:4}}>
                      {sel.conditions.action === 'show' ? 'Show' : 'Hide'} when {sel.conditions.logic === 'all' ? 'all' : 'any'} of {sel.conditions.rules.length} condition(s) match
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assist panel */}
        {!preview && showAIPanel && (
          <div className="w-72 border-l overflow-y-auto shrink-0 bg-gradient-to-b from-violet-50 to-white">
            <div style={{ padding: 16, borderBottom: '1px solid #ede9fe', fontWeight: 600, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}>
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Assist</span>
              <button onClick={() => setShowAIPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#e9d5ff' }}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: '#6d28d9', marginBottom: 12, fontWeight: 500 }}>Tell AI what to improve:</p>
              <textarea
                value={aiInstruction}
                onChange={e => setAiInstruction(e.target.value)}
                placeholder='e.g. "Make all labels more professional" or "Add missing fields for a hospital form"'
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #ddd6fe', fontSize: 12, resize: 'vertical', outline: 'none', marginBottom: 10 }}
              />
              <button
                onClick={() => runAIImprove(aiInstruction)}
                disabled={aiLoading || !aiInstruction.trim()}
                style={{ width: '100%', padding: '9px', background: aiLoading ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: aiLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}
              >
                {aiLoading ? <><Zap style={{ width: 14, height: 14 }} /> Improving...</> : <><Wand2 style={{ width: 14, height: 14 }} /> Improve with AI</>}
              </button>
              <div style={{ borderTop: '1px solid #ede9fe', paddingTop: 12 }}>
                <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 8 }}>Quick actions</p>
                {[
                  { label: "✨ Improve all labels", action: "Make all field labels more professional and clear" },
                  { label: "➕ Add missing fields", action: "Add any important fields that are missing for this type of form" },
                  { label: "📋 Add validation hints", action: "Add helpful placeholder text to all fields" },
                  { label: "🔀 Reorder logically", action: "Reorder fields in the most logical flow for a user filling this form" },
                  { label: "✅ Mark required fields", action: "Set the most important fields as required" },
                ].map(({ label, action }) => (
                  <button key={label} onClick={() => runAIImprove(action)} disabled={aiLoading}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 6, background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: '#5b21b6', fontWeight: 500 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications panel */}
        {!preview && showNotifPanel && (
          <div className="w-72 border-l overflow-y-auto shrink-0" style={{background:'#fff'}}>
            <div style={{padding:16,borderBottom:'1px solid #e5e7eb',fontWeight:600,fontSize:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>📱 Notifications</span>
              <button onClick={() => setShowNotifPanel(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#6b7280'}}>×</button>
            </div>

            <div style={{padding:16,borderBottom:'1px solid #e5e7eb'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer'}}>
                <input type="checkbox" checked={!!notifConfig.submitter_whatsapp?.enabled} onChange={e => setNotifConfig((p: any) => ({ ...p, submitter_whatsapp: { ...p.submitter_whatsapp, enabled: e.target.checked } }))} />
                <span style={{fontSize:13,fontWeight:500}}>Notify submitter via WhatsApp</span>
              </label>
              {notifConfig.submitter_whatsapp?.enabled && (
                <>
                  <label style={{fontSize:12,display:'block',marginBottom:4}}>Phone field (which field has their number?)</label>
                  <select value={notifConfig.submitter_whatsapp?.phone_field_id || ''} onChange={e => setNotifConfig((p: any) => ({ ...p, submitter_whatsapp: { ...p.submitter_whatsapp, phone_field_id: e.target.value } }))} style={{width:'100%',padding:'6px 8px',borderRadius:4,border:'1px solid #d1d5db',fontSize:12,marginBottom:8}}>
                    <option value="">Select phone field</option>
                    {fields.filter((f: Field) => ['phone', 'tel', 'text'].includes(f.type)).map((f: Field) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <label style={{fontSize:12,display:'block',marginBottom:4}}>Message template</label>
                  <textarea value={notifConfig.submitter_whatsapp?.message_template || 'Thank you {{name}}! Your submission to "{{form_name}}" has been received. Ref: {{submission_id}}'} onChange={e => setNotifConfig((p: any) => ({ ...p, submitter_whatsapp: { ...p.submitter_whatsapp, message_template: e.target.value } }))} rows={3} style={{width:'100%',padding:'6px 8px',borderRadius:4,border:'1px solid #d1d5db',fontSize:12,resize:'vertical'}} />
                  <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>Variables: {'{{name}}'} {'{{form_name}}'} {'{{submission_id}}'} {'{{email}}'}</div>
                </>
              )}
            </div>

            <div style={{padding:16,borderBottom:'1px solid #e5e7eb'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,cursor:'pointer'}}>
                <input type="checkbox" checked={!!notifConfig.owner_whatsapp?.enabled} onChange={e => setNotifConfig((p: any) => ({ ...p, owner_whatsapp: { ...p.owner_whatsapp, enabled: e.target.checked } }))} />
                <span style={{fontSize:13,fontWeight:500}}>Notify me via WhatsApp</span>
              </label>
              {notifConfig.owner_whatsapp?.enabled && (
                <>
                  <input value={notifConfig.owner_whatsapp?.phone || ''} onChange={e => setNotifConfig((p: any) => ({ ...p, owner_whatsapp: { ...p.owner_whatsapp, phone: e.target.value } }))} placeholder="+919876543210" style={{width:'100%',padding:'6px 8px',borderRadius:4,border:'1px solid #d1d5db',fontSize:12,marginBottom:8}} />
                  <textarea value={notifConfig.owner_whatsapp?.message_template || 'New submission on "{{form_name}}" from {{name}}. Ref: {{submission_id}}'} onChange={e => setNotifConfig((p: any) => ({ ...p, owner_whatsapp: { ...p.owner_whatsapp, message_template: e.target.value } }))} rows={2} style={{width:'100%',padding:'6px 8px',borderRadius:4,border:'1px solid #d1d5db',fontSize:12,resize:'vertical'}} />
                </>
              )}
            </div>

            <div style={{padding:16,display:'flex',gap:8}}>
              <button onClick={saveNotifications} style={{flex:1,padding:'8px',background:'#4F46E5',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontSize:13}}>
                {notifSaved ? '✓ Saved' : 'Save Notifications'}
              </button>
              <button onClick={testWhatsApp} style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:6,background:'#fff',cursor:'pointer',fontSize:13}}>
                Test
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Embed modal */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Embed This Form</DialogTitle></DialogHeader>
          {embedSnippet && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {embedTabKeys.map(k => (
                  <button key={k} onClick={() => setEmbedTab(k)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${embedTab === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                    {embedTabLabels[k]}
                  </button>
                ))}
              </div>
              <div>
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {embedSnippet[embedTab]}
                </pre>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(embedSnippet[embedTab])}>
                    Copy
                  </Button>
                  {embedTab === "direct_url" && (
                    <Button size="sm" variant="outline" onClick={() => window.open(embedSnippet.direct_url, "_blank")}>
                      Preview in New Tab
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
