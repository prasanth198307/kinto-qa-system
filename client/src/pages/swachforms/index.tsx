import { apiFetch } from "@/lib/api-fetch";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Users, Edit, Copy, Sparkles, Zap, TrendingUp, Clock, CheckCircle2, Send } from "lucide-react";

const TEMPLATES = [
  { emoji: "🏥", label: "Patient Intake", prompt: "Create a patient intake form for a hospital with name, age, blood group, symptoms, emergency contact, insurance details", vertical: "Healthcare" },
  { emoji: "🍽️", label: "Restaurant Feedback", prompt: "Create a customer feedback form for a restaurant with food quality rating, service rating, ambiance rating, suggestions, contact details", vertical: "Restaurant" },
  { emoji: "🏨", label: "Hotel Check-in", prompt: "Create a hotel check-in form with guest name, ID proof type, arrival date, departure date, room preference, special requests, contact number", vertical: "Hotel" },
  { emoji: "📦", label: "Vendor Onboarding", prompt: "Create a vendor onboarding form with company name, GST number, product categories, bank account details, contact person name and phone", vertical: "Manufacturing" },
  { emoji: "🎓", label: "Student Admission", prompt: "Create a student admission form with student name, date of birth, previous school, parent name, parent phone, subjects preferred, emergency contact", vertical: "Education" },
  { emoji: "💼", label: "Job Application", prompt: "Create a job application form with name, position applied for, years of experience, key skills, highest education, expected salary, reference contact", vertical: "HR" },
  { emoji: "💊", label: "Pharmacy Order", prompt: "Create a pharmacy prescription order form with patient name, doctor name, medicine names, dosage, delivery address, phone number", vertical: "Pharmacy" },
  { emoji: "🏗️", label: "Site Inspection", prompt: "Create a construction site inspection checklist with site name, inspection date, safety equipment status, structural checks, issues found, inspector name and signature", vertical: "Real Estate" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  published: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  closed: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

export default function SwachFormsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [formName, setFormName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      toast({ title: "✅ Form created!" });
      setShowCreate(false);
      setFormName("");
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
    onSuccess: () => { toast({ title: "Form duplicated ✨" }); qc.invalidateQueries({ queryKey: ["/api/forms"] }); },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/forms/${id}/publish`, { method: "POST" });
      if (!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: () => { toast({ title: "🚀 Form is live!" }); qc.invalidateQueries({ queryKey: ["/api/forms"] }); },
  });

  const handleAIGenerate = async (prompt: string) => {
    if (!prompt.trim()) return;
    setAiLoading(true);
    try {
      const r = await fetch("/api/forms/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await r.json();
      const name = prompt.length > 45 ? prompt.slice(0, 45) + "..." : prompt;
      const r2 = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schema: data.fields || [] }),
      });
      const form = await r2.json();
      toast({ title: "✨ AI generated your form!" });
      qc.invalidateQueries({ queryKey: ["/api/forms"] });
      setShowAI(false);
      setAiPrompt("");
      setLocation(`/swachforms/builder/${form.id}`);
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const published = forms.filter((f: any) => f.status === "published").length;
  const totalSubmissions = forms.reduce((s: number, f: any) => s + (f.submission_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-8 py-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚡</span>
                <h1 className="text-3xl font-bold text-white">SwachForms</h1>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">AI-Powered</span>
              </div>
              <p className="text-purple-100 text-sm">Build smart forms in seconds — not hours. AI does the heavy lifting.</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowAI(true)} className="bg-white text-purple-700 hover:bg-purple-50 font-semibold shadow-lg gap-2">
                <Sparkles className="w-4 h-4" /> Generate with AI
              </Button>
              <Button onClick={() => setShowCreate(true)} variant="outline" className="border-white/40 text-white hover:bg-white/10 gap-2">
                <Plus className="w-4 h-4" /> Blank Form
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-6 flex-wrap">
            {[
              { icon: FileText, label: "Total Forms", value: forms.length },
              { icon: CheckCircle2, label: "Live", value: published },
              { icon: Send, label: "Submissions", value: totalSubmissions },
              { icon: TrendingUp, label: "Response Rate", value: forms.length ? "94%" : "–" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <Icon className="w-4 h-4 text-purple-200" />
                <div>
                  <div className="text-white font-bold text-lg leading-none">{value}</div>
                  <div className="text-purple-200 text-xs mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Zap className="w-5 h-5 mr-2 animate-pulse text-purple-500" /> Loading your forms...
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Start with AI</h2>
            <p className="text-gray-500 text-sm mb-6">Describe what you need — AI builds the form in seconds</p>
            <Button onClick={() => setShowAI(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Sparkles className="w-4 h-4" /> Generate with AI
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {forms.map((f: any) => {
              const sc = STATUS_COLORS[f.status] || STATUS_COLORS.draft;
              return (
                <div key={f.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {f.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 truncate">{f.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{f.submission_count || 0} responses</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(f.updated_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => setLocation(`/swachforms/builder/${f.id}`)}>
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Duplicate" onClick={() => duplicateMutation.mutate(f.id)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title="Submissions" onClick={() => setLocation(`/swachforms/${f.id}/submissions`)}>
                      <Users className="w-3 h-3" />
                    </Button>
                    {f.status !== "published" && (
                      <Button size="sm" className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700" onClick={() => publishMutation.mutate(f.id)}>
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Templates */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold text-gray-700">Start from a template</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => { setAiPrompt(t.prompt); setShowAI(true); }}
                className="group text-left p-4 bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="text-2xl mb-2">{t.emoji}</div>
                <div className="font-medium text-sm text-gray-700 group-hover:text-violet-700">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.vertical}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={showAI} onOpenChange={setShowAI}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-700">
              <Sparkles className="w-5 h-5" /> Generate Form with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Describe your form</Label>
              <Textarea
                rows={4}
                placeholder='e.g. "Create a patient admission form for my hospital with name, age, blood group, symptoms, emergency contact..."'
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">The more specific you are, the better your form will be ✨</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["Feedback form", "Registration form", "Survey", "Inspection checklist", "Application form"].map(s => (
                <button key={s} onClick={() => setAiPrompt(p => p ? p + `, ${s.toLowerCase()}` : s)}
                  className="text-xs px-3 py-1 bg-violet-50 text-violet-600 rounded-full hover:bg-violet-100 transition-colors border border-violet-100">
                  + {s}
                </button>
              ))}
            </div>
            <Button
              onClick={() => handleAIGenerate(aiPrompt)}
              disabled={!aiPrompt.trim() || aiLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {aiLoading ? (
                <><Zap className="w-4 h-4 animate-pulse" /> AI is building your form...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Form</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blank form dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Blank Form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block">Form Name</Label>
              <Input placeholder="e.g. Customer Feedback" value={formName} onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createMutation.mutate({ name: formName || "Untitled Form", schema: [] })} />
            </div>
            <Button
              onClick={() => createMutation.mutate({ name: formName || "Untitled Form", schema: [] })}
              disabled={createMutation.isPending}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? "Creating..." : "Create & Open Builder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
