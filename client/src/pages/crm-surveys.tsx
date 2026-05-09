import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Star, MessageSquare, Users, BarChart3, Pencil, Trash2, Send } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN");

export default function CRMSurveysPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showDetails, setShowDetails] = useState<any>(null);
  const [editingSurvey, setEditingSurvey] = useState<any>(null);
  const [surveyForm, setSurveyForm] = useState<any>({ status: "active", target_audience: "all" });
  const [questions, setQuestions] = useState<any[]>([{ question: "", question_type: "rating", is_required: true }]);
  const [responseForm, setResponseForm] = useState<any>({});

  const { data: surveys = [] } = useQuery<any[]>({ queryKey: ["/api/crm/surveys"] });
  const { data: detailQuestions = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/survey-questions", showDetails?.id],
    queryFn: () => showDetails ? fetch(`/api/crm/survey-questions?survey_id=${showDetails.id}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!showDetails,
  });
  const { data: responses = [] } = useQuery<any[]>({
    queryKey: ["/api/crm/survey-responses", showDetails?.id],
    queryFn: () => showDetails ? fetch(`/api/crm/survey-responses?survey_id=${showDetails.id}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!showDetails,
  });

  const saveSurveyMutation = useMutation({
    mutationFn: async (data: any) => {
      const resp = editingSurvey
        ? await apiRequest("PUT", `/api/crm/surveys/${editingSurvey.id}`, data.survey)
        : await apiRequest("POST", "/api/crm/surveys", data.survey);
      const survey = await resp.json();
      if (!editingSurvey && data.questions?.length) {
        const sid = survey.id;
        for (const q of data.questions) {
          if (q.question?.trim()) {
            await apiRequest("POST", "/api/crm/survey-questions", { ...q, survey_id: sid })
              .catch(() => {});
          }
        }
      }
      return survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/surveys"] });
      setShowSurveyForm(false); setEditingSurvey(null);
      setSurveyForm({ status: "active", target_audience: "all" });
      setQuestions([{ question: "", question_type: "rating", is_required: true }]);
      toast({ title: "Survey saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveResponseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/crm/survey-responses", { ...data, survey_id: showDetails.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crm/survey-responses", showDetails?.id] });
      setShowResponseForm(false); setResponseForm({});
      toast({ title: "Response recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/crm/surveys/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/crm/surveys"] }); toast({ title: "Deleted" }); },
  });

  const filtered = surveys.filter((s: any) => s.title?.toLowerCase().includes(search.toLowerCase()));

  const addQuestion = () => setQuestions(p => [...p, { question: "", question_type: "rating", is_required: true }]);
  const updateQ = (i: number, k: string, v: any) => setQuestions(p => p.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  const removeQ = (i: number) => setQuestions(p => p.filter((_, idx) => idx !== i));

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`h-6 w-6 cursor-pointer ${n <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} onClick={() => onChange(n)} />
      ))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Feedback & Survey Hub</h1>
          <p className="text-sm text-muted-foreground">Create surveys, collect customer feedback and NPS scores</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-48" placeholder="Search surveys…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => { setEditingSurvey(null); setSurveyForm({ status: "active", target_audience: "all" }); setQuestions([{ question: "", question_type: "rating", is_required: true }]); setShowSurveyForm(true); }} size="sm" data-testid="button-add-survey">
            <Plus className="h-4 w-4 mr-1" />New Survey
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s: any) => (
          <Card key={s.id} className="cursor-pointer hover-elevate" onClick={() => setShowDetails(s)} data-testid={`card-survey-${s.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.survey_code}</p>
                </div>
                <Badge className={s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{s.status}</Badge>
              </div>
              {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" />{fmt(s.response_count)} responses</div>
                <span className="text-xs text-muted-foreground capitalize">{s.target_audience}</span>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setShowDetails(s); setShowResponseForm(true); }}>
                  <Send className="h-3 w-3 mr-1" />Record Response
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingSurvey(s); setSurveyForm(s); setShowSurveyForm(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No surveys yet. Create your first survey to collect feedback.</p>}
      </div>

      {/* Survey detail & responses */}
      <Dialog open={!!showDetails && !showResponseForm} onOpenChange={v => !v && setShowDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle><BarChart3 className="inline h-4 w-4 mr-2" />{showDetails?.title} — Responses ({fmt(showDetails?.response_count)})</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {(detailQuestions as any[]).map((q: any) => (
                <div key={q.id} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{q.question_type} question</p>
                </div>
              ))}
              {detailQuestions.length === 0 && <p className="text-sm text-muted-foreground">No questions added to this survey.</p>}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Recent Responses</p>
              {(responses as any[]).slice(0, 5).map((r: any) => (
                <div key={r.id} className="border rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{r.respondent_name || "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground">{r.submitted_at?.slice(0, 10)}</span>
                  </div>
                  {r.respondent_phone && <p className="text-xs text-muted-foreground">{r.respondent_phone}</p>}
                </div>
              ))}
              {responses.length === 0 && <p className="text-sm text-muted-foreground">No responses yet.</p>}
            </div>
            <Button className="w-full" onClick={() => setShowResponseForm(true)}><Send className="h-4 w-4 mr-2" />Record New Response</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record response */}
      <Dialog open={showResponseForm} onOpenChange={v => { setShowResponseForm(v); if (!v) setResponseForm({}); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Response — {showDetails?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Customer Name</Label><Input value={responseForm.respondent_name || ""} onChange={e => setResponseForm((p: any) => ({ ...p, respondent_name: e.target.value }))} data-testid="input-response-name" /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={responseForm.respondent_phone || ""} onChange={e => setResponseForm((p: any) => ({ ...p, respondent_phone: e.target.value }))} data-testid="input-response-phone" /></div>
            </div>
            {(detailQuestions as any[]).map((q: any, i: number) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-xs">{i + 1}. {q.question}</Label>
                {q.question_type === "rating" ? (
                  <StarRating value={responseForm.answers?.[q.id] || 0} onChange={v => setResponseForm((p: any) => ({ ...p, answers: { ...p.answers, [q.id]: v } }))} />
                ) : q.question_type === "yes_no" ? (
                  <Select value={responseForm.answers?.[q.id] || ""} onValueChange={v => setResponseForm((p: any) => ({ ...p, answers: { ...p.answers, [q.id]: v } }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                ) : (
                  <Textarea value={responseForm.answers?.[q.id] || ""} onChange={e => setResponseForm((p: any) => ({ ...p, answers: { ...p.answers, [q.id]: e.target.value } }))} rows={2} />
                )}
              </div>
            ))}
            {detailQuestions.length === 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Overall Rating</Label>
                <StarRating value={responseForm.overall_rating || 0} onChange={v => setResponseForm((p: any) => ({ ...p, overall_rating: v, answers: { overall: v } }))} />
                <div className="space-y-1"><Label className="text-xs">Comments</Label><Textarea value={responseForm.answers?.comments || ""} onChange={e => setResponseForm((p: any) => ({ ...p, answers: { ...p.answers, comments: e.target.value } }))} rows={3} /></div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowResponseForm(false)}>Cancel</Button>
              <Button onClick={() => saveResponseMutation.mutate(responseForm)} disabled={saveResponseMutation.isPending} data-testid="button-submit-response">Submit Response</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey form */}
      <Dialog open={showSurveyForm} onOpenChange={v => { setShowSurveyForm(v); if (!v) setEditingSurvey(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingSurvey ? "Edit Survey" : "New Survey"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Survey Title *</Label><Input value={surveyForm.title || ""} onChange={e => setSurveyForm((p: any) => ({ ...p, title: e.target.value }))} data-testid="input-survey-title" /></div>
            <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={surveyForm.description || ""} onChange={e => setSurveyForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} data-testid="textarea-survey-desc" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Target Audience</Label>
                <Select value={surveyForm.target_audience || "all"} onValueChange={v => setSurveyForm((p: any) => ({ ...p, target_audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Customers</SelectItem><SelectItem value="new">New Customers</SelectItem><SelectItem value="existing">Existing Customers</SelectItem><SelectItem value="leads">Leads</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={surveyForm.status || "active"} onValueChange={v => setSurveyForm((p: any) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {!editingSurvey && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Questions</Label><Button size="sm" variant="outline" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                {questions.map((q, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input className="flex-1" placeholder="Question text" value={q.question} onChange={e => updateQ(i, "question", e.target.value)} data-testid={`input-question-${i}`} />
                      <Button size="icon" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Select value={q.question_type} onValueChange={v => updateQ(i, "question_type", v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="rating">Star Rating</SelectItem><SelectItem value="text">Text</SelectItem><SelectItem value="yes_no">Yes / No</SelectItem></SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowSurveyForm(false)}>Cancel</Button>
              <Button onClick={() => saveSurveyMutation.mutate({ survey: surveyForm, questions })} disabled={saveSurveyMutation.isPending} data-testid="button-save-survey">Save Survey</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
