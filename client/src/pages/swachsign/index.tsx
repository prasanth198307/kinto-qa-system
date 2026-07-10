import { apiFetch } from "@/lib/api-fetch";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Plus, Users, Clock, CheckCircle, XCircle, AlertCircle, LayoutTemplate, Send } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  partial_signed: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-500",
};

const STATUS_ICONS: Record<string, any> = {
  draft: Clock,
  sent: AlertCircle,
  partial_signed: AlertCircle,
  completed: CheckCircle,
  expired: XCircle,
  cancelled: XCircle,
};

const DOC_TYPES = ["contract", "invoice", "nda", "loi", "offer_letter", "demand_letter"];

export default function SwachSignIndex() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", document_type: "contract", description: "", expiry_date: "", message_to_signatories: "" });

  // Template state
  const [tmplOpen, setTmplOpen] = useState(false);
  const [tmplForm, setTmplForm] = useState({ name: "", document_type: "contract", default_message: "" });
  const [bulkOpen, setBulkOpen] = useState<number | null>(null);
  const [bulkRecipients, setBulkRecipients] = useState([{ name: "", email: "", role: "" }]);
  const [bulkPrefix, setBulkPrefix] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["/api/sign/documents"],
    queryFn: () => apiFetch("/api/sign/documents"),
  });

  const { data: templates = [], isLoading: tmplLoading } = useQuery({
    queryKey: ["/api/sign/templates"],
    queryFn: () => apiFetch("/api/sign/templates"),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/sign/documents", body),
    onSuccess: async (res) => {
      const doc = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/sign/documents"] });
      setOpen(false);
      navigate(`/swachsign/${doc.id}`);
    },
    onError: () => toast({ title: "Error", description: "Failed to create document", variant: "destructive" }),
  });

  const createTmplMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/sign/templates", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sign/templates"] });
      setTmplOpen(false);
      setTmplForm({ name: "", document_type: "contract", default_message: "" });
      toast({ title: "Template created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create template", variant: "destructive" }),
  });

  const bulkSendMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/sign/documents/bulk-send", body),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/sign/documents"] });
      setBulkOpen(null);
      setBulkRecipients([{ name: "", email: "", role: "" }]);
      setBulkPrefix("");
      toast({ title: "Bulk sent!", description: `${data.created} document(s) created and sent.` });
    },
    onError: () => toast({ title: "Error", description: "Bulk send failed", variant: "destructive" }),
  });

  const handleBulkSend = (templateId: number) => {
    const valid = bulkRecipients.filter(r => r.name.trim() && r.email.trim());
    if (!valid.length) return toast({ title: "Add at least one recipient", variant: "destructive" });
    bulkSendMut.mutate({ template_id: templateId, recipients: valid, title_prefix: bulkPrefix || undefined });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> SwachSign</h1>
          <p className="text-muted-foreground">Document eSigning Platform</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Service Agreement 2026" /></div>
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              <div><Label>Message to Signatories</Label><Textarea value={form.message_to_signatories} onChange={e => setForm(f => ({ ...f, message_to_signatories: e.target.value }))} rows={2} placeholder="Please review and sign..." /></div>
              <Button className="w-full" onClick={() => createMut.mutate(form)} disabled={!form.title || createMut.isPending}>
                {createMut.isPending ? "Creating..." : "Create Document"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" />Documents</TabsTrigger>
          <TabsTrigger value="templates"><LayoutTemplate className="w-4 h-4 mr-2" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No documents yet. Create your first document to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(docs as any[]).map((doc: any) => {
                const Icon = STATUS_ICONS[doc.status] || Clock;
                return (
                  <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/swachsign/${doc.id}`)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">{doc.title}</CardTitle>
                        <Badge className={`shrink-0 text-xs ${STATUS_COLORS[doc.status] || ""}`}>
                          <Icon className="w-3 h-3 mr-1" />{doc.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{doc.doc_no}</p>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{doc.document_type?.replace(/_/g, " ")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{doc.signed_count ?? 0}/{doc.signatory_count ?? 0} signed</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Reusable document templates for bulk sending</p>
            <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />New Template</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Template Name *</Label><Input value={tmplForm.name} onChange={e => setTmplForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Vendor NDA" /></div>
                  <div>
                    <Label>Document Type</Label>
                    <Select value={tmplForm.document_type} onValueChange={v => setTmplForm(f => ({ ...f, document_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Default Message</Label><Textarea value={tmplForm.default_message} onChange={e => setTmplForm(f => ({ ...f, default_message: e.target.value }))} rows={3} placeholder="Please review and sign this document..." /></div>
                  <Button className="w-full" onClick={() => createTmplMut.mutate(tmplForm)} disabled={!tmplForm.name || createTmplMut.isPending}>
                    {createTmplMut.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tmplLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : (templates as any[]).length === 0 ? (
            <div className="text-center py-16">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No templates yet. Create a template to enable bulk sending.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(templates as any[]).map((tmpl: any) => (
                <Card key={tmpl.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{tmpl.document_type?.replace(/_/g, " ")}</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {tmpl.default_message && <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.default_message}</p>}
                    <Dialog open={bulkOpen === tmpl.id} onOpenChange={v => { setBulkOpen(v ? tmpl.id : null); setBulkRecipients([{ name: "", email: "", role: "" }]); setBulkPrefix(""); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full"><Send className="w-4 h-4 mr-2" />Bulk Send</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Bulk Send — {tmpl.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div><Label>Title Prefix (optional)</Label><Input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="e.g., Q3 Vendor Agreement" /></div>
                          <div>
                            <Label className="mb-2 block">Recipients</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {bulkRecipients.map((r, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2 items-center">
                                  <Input value={r.name} onChange={e => setBulkRecipients(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} placeholder="Name" />
                                  <Input value={r.email} onChange={e => setBulkRecipients(prev => prev.map((p, j) => j === i ? { ...p, email: e.target.value } : p))} placeholder="Email" />
                                  <div className="flex gap-1">
                                    <Input value={r.role} onChange={e => setBulkRecipients(prev => prev.map((p, j) => j === i ? { ...p, role: e.target.value } : p))} placeholder="Role" />
                                    {bulkRecipients.length > 1 && (
                                      <Button size="sm" variant="ghost" onClick={() => setBulkRecipients(prev => prev.filter((_, j) => j !== i))}>×</Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setBulkRecipients(prev => [...prev, { name: "", email: "", role: "" }])}>
                              <Plus className="w-3 h-3 mr-1" />Add Recipient
                            </Button>
                          </div>
                          <Button className="w-full" onClick={() => handleBulkSend(tmpl.id)} disabled={bulkSendMut.isPending}>
                            {bulkSendMut.isPending ? "Sending..." : `Send to ${bulkRecipients.filter(r => r.name && r.email).length} recipient(s)`}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
