import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Eye, BookOpen, FileText, FolderOpen, Edit2, Trash2, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
};

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", icon: "ti-book" });
  const [articleForm, setArticleForm] = useState({
    title: "", content: "", category_id: "", tags: [] as string[], tagInput: "",
    seo_title: "", seo_description: "", is_public: true,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/desk/kb/categories"],
    queryFn: async () => (await fetch("/api/desk/kb/categories")).json(),
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery<any[]>({
    queryKey: ["/api/desk/kb/articles", selectedCatId, search],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedCatId) p.set("category_id", String(selectedCatId));
      if (search) p.set("search", search);
      return (await fetch(`/api/desk/kb/articles?${p}`)).json();
    },
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/desk/kb/stats"],
    queryFn: async () => {
      const all = await (await fetch("/api/desk/kb/articles")).json();
      if (!Array.isArray(all)) return { total: 0, published: 0, drafts: 0, views: 0 };
      return {
        total: all.length,
        published: all.filter((a: any) => a.status === "published").length,
        drafts: all.filter((a: any) => a.status === "draft").length,
        views: all.reduce((s: number, a: any) => s + (a.views || 0), 0),
      };
    },
  });

  const createCatMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/desk/kb/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Category created" }); setShowNewCat(false); setCatForm({ name: "", description: "", icon: "ti-book" }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/categories"] }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/desk/kb/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/desk/kb/categories"] }); if (selectedCatId) setSelectedCatId(null); },
  });

  const saveArticleMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingArticle ? `/api/desk/kb/articles/${editingArticle.id}` : "/api/desk/kb/articles";
      const method = editingArticle ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: editingArticle ? "Saved" : "Article created" }); setShowEditor(false); setEditingArticle(null); resetArticleForm(); qc.invalidateQueries({ queryKey: ["/api/desk/kb/articles"] }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/stats"] }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/desk/kb/articles/${id}/publish`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Published" }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/articles"] }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/stats"] }); },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/desk/kb/articles/${id}/archive`, { method: "POST" }),
    onSuccess: () => { toast({ title: "Archived" }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/articles"] }); },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => fetch(`/api/desk/kb/articles/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/desk/kb/articles"] }); qc.invalidateQueries({ queryKey: ["/api/desk/kb/stats"] }); },
  });

  function resetArticleForm() {
    setArticleForm({ title: "", content: "", category_id: "", tags: [], tagInput: "", seo_title: "", seo_description: "", is_public: true });
  }

  function openNewArticle() {
    setEditingArticle(null);
    resetArticleForm();
    if (selectedCatId) setArticleForm(f => ({ ...f, category_id: String(selectedCatId) }));
    setShowEditor(true);
  }

  function openEditArticle(a: any) {
    setEditingArticle(a);
    setArticleForm({
      title: a.title || "", content: a.content || "",
      category_id: a.category_id ? String(a.category_id) : "",
      tags: Array.isArray(a.tags) ? a.tags : [],
      tagInput: "",
      seo_title: a.seo_title || "", seo_description: a.seo_description || "",
      is_public: a.is_public !== false,
    });
    setShowEditor(true);
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && articleForm.tagInput.trim()) {
      e.preventDefault();
      const tag = articleForm.tagInput.trim();
      if (!articleForm.tags.includes(tag)) {
        setArticleForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: "" }));
      } else {
        setArticleForm(f => ({ ...f, tagInput: "" }));
      }
    }
  }

  function removeTag(tag: string) {
    setArticleForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  }

  function handleSave(status?: string) {
    const payload: any = {
      title: articleForm.title,
      content: articleForm.content,
      category_id: articleForm.category_id ? parseInt(articleForm.category_id) : null,
      tags: articleForm.tags,
      is_public: articleForm.is_public,
      seo_title: articleForm.seo_title || null,
      seo_description: articleForm.seo_description || null,
    };
    if (status) payload.status = status;
    saveArticleMutation.mutate(payload);
  }

  const autoSlug = articleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/20 p-4 space-y-1 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Categories</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowNewCat(true)}><Plus className="h-4 w-4" /></Button>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm ${selectedCatId === null ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          onClick={() => setSelectedCatId(null)}
        >
          <BookOpen className="w-4 h-4" /> All Articles
        </div>
        {(categories as any[]).map((cat: any) => (
          <div
            key={cat.id}
            className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm group ${selectedCatId === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setSelectedCatId(cat.id)}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span className="truncate">{cat.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs ${selectedCatId === cat.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{cat.article_count || 0}</span>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); if (confirm("Delete category?")) deleteCatMutation.mutate(cat.id); }}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <Button onClick={openNewArticle}><Plus className="w-4 h-4 mr-2" />New Article</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Articles", value: stats?.total ?? 0, color: "blue" },
            { label: "Published", value: stats?.published ?? 0, color: "green" },
            { label: "Drafts", value: stats?.drafts ?? 0, color: "yellow" },
            { label: "Total Views", value: stats?.views ?? 0, color: "purple" },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-lg p-4`}>
              <div className={`text-sm text-${s.color}-700`}>{s.label}</div>
              <div className={`text-2xl font-bold text-${s.color}-800`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Articles table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Views</th>
                <th className="text-left px-4 py-3 font-medium">Author</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articlesLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : (articles as any[]).length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No articles found</td></tr>
              ) : (articles as any[]).map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{a.title}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{a.category_name || "-"}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground"><div className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views || 0}</div></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{a.author_name || "-"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditArticle(a)}><Edit2 className="w-3 h-3" /></Button>
                      {a.status !== "published" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700" onClick={() => publishMutation.mutate(a.id)}>Publish</Button>
                      )}
                      {a.status === "published" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500" onClick={() => archiveMutation.mutate(a.id)}>Archive</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete article?")) deleteArticleMutation.mutate(a.id); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Icon class</Label><Input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCat(false)}>Cancel</Button>
            <Button onClick={() => createCatMutation.mutate(catForm)} disabled={!catForm.name || createCatMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={v => { setShowEditor(v); if (!v) { setEditingArticle(null); resetArticleForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={articleForm.title} onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))} />
              {articleForm.title && <p className="text-xs text-muted-foreground mt-1">Slug: <span className="font-mono">{autoSlug}</span></p>}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={articleForm.category_id} onValueChange={v => setArticleForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(categories as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={12} value={articleForm.content} onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your article content here (HTML or Markdown supported)..." className="font-mono text-sm" />
            </div>
            <div>
              <Label>Tags (press Enter to add)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {articleForm.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    {t}<button onClick={() => removeTag(t)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <Input
                value={articleForm.tagInput}
                onChange={e => setArticleForm(f => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={addTag}
                placeholder="Type tag and press Enter..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SEO Title</Label><Input value={articleForm.seo_title} onChange={e => setArticleForm(f => ({ ...f, seo_title: e.target.value }))} /></div>
              <div><Label>SEO Description</Label><Input value={articleForm.seo_description} onChange={e => setArticleForm(f => ({ ...f, seo_description: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowEditor(false); setEditingArticle(null); resetArticleForm(); }}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={!articleForm.title || saveArticleMutation.isPending}>
              <FileText className="w-4 h-4 mr-1" />Save Draft
            </Button>
            <Button onClick={() => handleSave("published")} disabled={!articleForm.title || saveArticleMutation.isPending}>
              {saveArticleMutation.isPending ? "Saving..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
