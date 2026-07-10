import { apiFetch } from "@/lib/api-fetch";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Users, Edit, Copy, ExternalLink, Code } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

interface EmbedSnippet {
  script_tag: string; inline_embed: string; direct_url: string; iframe: string;
}

export default function SwachFormsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedSnippet, setEmbedSnippet] = useState<EmbedSnippet | null>(null);
  const [embedTab, setEmbedTab] = useState<"script_tag" | "inline_embed" | "direct_url" | "iframe">("script_tag");

  const { data: forms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/forms"],
    queryFn: () => apiFetch("/api/forms"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to create form");
      return r.json();
    },
    onSuccess: (form) => {
      toast({ title: "Form created" });
      setShowCreate(false);
      setFormName(""); setFormDesc("");
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
      setLocation(`/swachforms/builder/${form.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/forms/${id}/duplicate`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to duplicate");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Form duplicated" });
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/forms/${id}/publish`, { method: "POST" });
      if (!r.ok) throw new Error("Failed to publish");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Form published" });
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEmbed = async (formId: number) => {
    const r = await fetch(`/api/forms/${formId}/embed-snippet`);
    if (r.ok) { setEmbedSnippet(await r.json()); setEmbedTab("script_tag"); setShowEmbed(true); }
    else toast({ title: "Error loading embed code", variant: "destructive" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied to clipboard" }));
  };

  const embedTabKeys: Array<"script_tag" | "inline_embed" | "direct_url" | "iframe"> = ["script_tag", "inline_embed", "direct_url", "iframe"];
  const embedTabLabels: Record<string, string> = { script_tag: "Script Tag", inline_embed: "Inline Embed", direct_url: "Direct URL", iframe: "iFrame" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SwachForms</h1>
          <p className="text-muted-foreground">Low-code Form Builder & Workflow Engine</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Create Form</Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-16 border rounded-lg text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No forms yet</p>
          <p className="text-sm">Create your first form to get started</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Create Form</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form: any) => (
            <div key={form.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm truncate flex-1 mr-2">{form.name}</h3>
                <Badge className={`text-xs shrink-0 ${STATUS_COLORS[form.status] || ""}`}>{form.status}</Badge>
              </div>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">{form.submission_count || 0}</Badge>
                  submissions
                </span>
                <span>Updated {new Date(form.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation(`/swachforms/builder/${form.id}`)}>
                  <Edit className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLocation(`/swachforms/${form.id}/submissions`)}>
                  <Users className="w-3 h-3 mr-1" />Submissions
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => duplicateMutation.mutate(form.id)}>
                  <Copy className="w-3 h-3 mr-1" />Duplicate
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEmbed(form.id)}>
                  <Code className="w-3 h-3 mr-1" />Embed
                </Button>
                {form.status === "draft" && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => publishMutation.mutate(form.id)}>Publish</Button>
                )}
                {form.status === "published" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => window.open(`/api/public/forms/${form.slug}`, "_blank")}>
                    <ExternalLink className="w-3 h-3 mr-1" />Preview
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Form Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Customer Feedback" /></div>
            <div><Label>Description</Label><Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ name: formName, description: formDesc })} disabled={!formName.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create & Open Builder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
