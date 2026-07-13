import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import {
  Plus, Search, Briefcase, Users, Clock, CheckCircle2,
  XCircle, Star, Phone, Mail, Building2, Calendar, Trash2, ChevronRight
} from "lucide-react";

const STAGES = [
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "screening", label: "Screening", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "interview", label: "Interview", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "offer", label: "Offer Sent", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { value: "selected", label: "Selected", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "joined", label: "Joined", color: "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100" },
];

const SOURCES = ["Direct", "Referral", "LinkedIn", "Naukri", "Indeed", "Walk-in", "Campus", "Consultant", "Other"];
const JOB_TYPES = [{ value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }];

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN");
const getStage = (v: string) => STAGES.find(s => s.value === v) || STAGES[0];

// ── Job Opening Form ────────────────────────────────────────────────────────────
function JobOpeningForm({ editing, depts, onSave, onCancel }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: editing?.title || "",
    departmentId: editing?.department_id ? String(editing.department_id) : "__none__",
    positions: editing?.positions || "1",
    experienceMin: editing?.experience_min || "0",
    experienceMax: editing?.experience_max || "0",
    salaryMin: editing?.salary_min || "",
    salaryMax: editing?.salary_max || "",
    jobType: editing?.job_type || "full_time",
    location: editing?.location || "",
    skills: editing?.skills || "",
    description: editing?.description || "",
    status: editing?.status || "open",
    closingDate: editing?.closing_date || "",
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, departmentId: form.departmentId === "__none__" ? null : form.departmentId };
      return editing
        ? apiRequest("PUT", `/api/hr/job-openings/${editing.id}`, payload)
        : apiRequest("POST", "/api/hr/job-openings", payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/job-openings"] }); toast({ title: editing ? "Job updated" : "Job opening created" }); onSave(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Job Title <span className="text-destructive">*</span></Label>
          <Input className="h-9" value={form.title} onChange={f("title")} placeholder="e.g. CNC Machine Operator" />
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={form.departmentId} onValueChange={s("departmentId")}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select dept" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {depts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>No. of Positions</Label>
          <Input className="h-9" type="number" min="1" value={form.positions} onChange={f("positions")} />
        </div>
        <div className="space-y-1.5">
          <Label>Experience (Min years)</Label>
          <Input className="h-9" type="number" min="0" value={form.experienceMin} onChange={f("experienceMin")} />
        </div>
        <div className="space-y-1.5">
          <Label>Experience (Max years)</Label>
          <Input className="h-9" type="number" min="0" value={form.experienceMax} onChange={f("experienceMax")} />
        </div>
        <div className="space-y-1.5">
          <Label>Salary Range (Min ${sym})</Label>
          <Input className="h-9" type="number" min="0" value={form.salaryMin} onChange={f("salaryMin")} placeholder="e.g. 300000" />
        </div>
        <div className="space-y-1.5">
          <Label>Salary Range (Max ${sym})</Label>
          <Input className="h-9" type="number" min="0" value={form.salaryMax} onChange={f("salaryMax")} placeholder="e.g. 600000" />
        </div>
        <div className="space-y-1.5">
          <Label>Job Type</Label>
          <Select value={form.jobType} onValueChange={s("jobType")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input className="h-9" value={form.location} onChange={f("location")} placeholder="e.g. Pune, Maharashtra" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={s("status")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Closing Date</Label>
          <Input className="h-9" type="date" value={form.closingDate} onChange={f("closingDate")} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Required Skills</Label>
          <Input className="h-9" value={form.skills} onChange={f("skills")} placeholder="e.g. CNC, AutoCAD, Quality Control" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Job Description</Label>
          <Textarea value={form.description} onChange={f("description")} placeholder="Roles, responsibilities, requirements..." className="min-h-[80px]" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
          {saveMutation.isPending ? "Saving..." : editing ? "Update Job" : "Create Job Opening"}
        </Button>
      </div>
    </div>
  );
}

// ── Application Form ────────────────────────────────────────────────────────────
function ApplicationForm({ openings, editing, preOpeningId, onSave, onCancel }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    openingId: editing?.opening_id ? String(editing.opening_id) : (preOpeningId ? String(preOpeningId) : ""),
    candidateName: editing?.candidate_name || "",
    phone: editing?.phone || "",
    email: editing?.email || "",
    currentCompany: editing?.current_company || "",
    currentCtc: editing?.current_ctc || "",
    expectedCtc: editing?.expected_ctc || "",
    noticePeriodDays: editing?.notice_period_days || "0",
    source: editing?.source || "direct",
    stage: editing?.stage || "applied",
    rating: editing?.rating || "0",
    interviewDate: editing?.interview_date || "",
    notes: editing?.notes || "",
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? apiRequest("PUT", `/api/hr/job-applications/${editing.id}`, form)
      : apiRequest("POST", "/api/hr/job-applications", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/job-applications"] });
      toast({ title: editing ? "Application updated" : "Application added" });
      onSave();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Job Opening <span className="text-destructive">*</span></Label>
          <Select value={form.openingId} onValueChange={s("openingId")}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select job opening" /></SelectTrigger>
            <SelectContent>{openings.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.title} {o.department_name ? `(${o.department_name})` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Candidate Name <span className="text-destructive">*</span></Label>
          <Input className="h-9" value={form.candidateName} onChange={f("candidateName")} placeholder="Full name" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input className="h-9" value={form.phone} onChange={f("phone")} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input className="h-9" type="email" value={form.email} onChange={f("email")} placeholder="candidate@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Current Company</Label>
          <Input className="h-9" value={form.currentCompany} onChange={f("currentCompany")} />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source} onValueChange={s("source")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCES.map(src => <SelectItem key={src} value={src.toLowerCase()}>{src}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Current CTC (${sym}/year)</Label>
          <Input className="h-9" type="number" value={form.currentCtc} onChange={f("currentCtc")} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Expected CTC (${sym}/year)</Label>
          <Input className="h-9" type="number" value={form.expectedCtc} onChange={f("expectedCtc")} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Notice Period (days)</Label>
          <Input className="h-9" type="number" min="0" value={form.noticePeriodDays} onChange={f("noticePeriodDays")} />
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage} onValueChange={s("stage")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Rating (1-5)</Label>
          <Select value={String(form.rating)} onValueChange={s("rating")}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Not rated</SelectItem>
              {[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? "s" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Interview Date</Label>
          <Input className="h-9" type="date" value={form.interviewDate} onChange={f("interviewDate")} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={f("notes")} placeholder="Interview feedback, remarks..." className="min-h-[60px]" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.openingId || !form.candidateName}>
          {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Add Application"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function HrRecruitment() {
  const { toast } = useToast();
  const [tab, setTab] = useState("openings");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [openingFilter, setOpeningFilter] = useState("all");
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [preOpeningId, setPreOpeningId] = useState<any>(null);

  const { data: openings = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/job-openings"],
    queryFn: async () => { const r = await fetch("/api/hr/job-openings", { credentials: "include" }); return r.json(); },
  });
  const { data: applications = [] } = useQuery<any[]>({
    queryKey: ["/api/hr/job-applications"],
    queryFn: async () => { const r = await fetch("/api/hr/job-applications", { credentials: "include" }); return r.json(); },
  });
  const { data: depts = [] } = useQuery<any[]>({ queryKey: ["/api/hr/departments"] });

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/job-openings/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/job-openings"] }); toast({ title: "Job opening removed" }); },
  });
  const deleteAppMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/hr/job-applications/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hr/job-applications"] }); toast({ title: "Application removed" }); },
  });

  const filteredOpenings = (openings as any[]).filter((o: any) => !search || o.title.toLowerCase().includes(search.toLowerCase()));
  const filteredApps = (applications as any[]).filter((a: any) => {
    const matchSearch = !search || `${a.candidate_name} ${a.opening_title}`.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || a.stage === stageFilter;
    const matchOpening = openingFilter === "all" || String(a.opening_id) === openingFilter;
    return matchSearch && matchStage && matchOpening;
  });

  const totalOpen = (openings as any[]).filter((o: any) => o.status === "open").length;
  const totalApps = (applications as any[]).length;
  const totalSelected = (applications as any[]).filter((a: any) => a.stage === "selected" || a.stage === "joined").length;
  const totalInterview = (applications as any[]).filter((a: any) => a.stage === "interview").length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Manage job openings and candidate applications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingApp(null); setPreOpeningId(null); setShowAppForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />Add Application
          </Button>
          <Button onClick={() => { setEditingJob(null); setShowJobForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />New Job Opening
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Positions", value: totalOpen, icon: Briefcase, color: "bg-blue-500/10", iconColor: "text-blue-600" },
          { label: "Total Applications", value: totalApps, icon: Users, color: "bg-purple-500/10", iconColor: "text-purple-600" },
          { label: "In Interview", value: totalInterview, icon: Clock, color: "bg-orange-500/10", iconColor: "text-orange-600" },
          { label: "Selected / Joined", value: totalSelected, icon: CheckCircle2, color: "bg-green-500/10", iconColor: "text-green-600" },
        ].map(item => (
          <Card key={item.label}><CardContent className="pt-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full ${item.color} flex items-center justify-center`}>
              <item.icon className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab === "applications" && <>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={openingFilter} onValueChange={setOpeningFilter}>
            <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Openings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Openings</SelectItem>
              {(openings as any[]).map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="openings">Job Openings ({(openings as any[]).length})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({(applications as any[]).length})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="openings" className="mt-4">
          {filteredOpenings.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No job openings yet</p>
              <Button className="mt-3" onClick={() => setShowJobForm(true)}>Create First Opening</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOpenings.map((job: any) => (
                <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{job.title}</p>
                          <Badge variant={job.status === "open" ? "default" : job.status === "on_hold" ? "outline" : "secondary"} className="capitalize">
                            {job.status.replace("_", " ")}
                          </Badge>
                          {JOB_TYPES.find(t => t.value === job.job_type) && (
                            <Badge variant="outline">{JOB_TYPES.find(t => t.value === job.job_type)?.label}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          {job.department_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.department_name}</span>}
                          {job.location && <span>{job.location}</span>}
                          <span>{job.positions} position{Number(job.positions) > 1 ? "s" : ""}</span>
                          <span>{job.experience_min}–{job.experience_max} yrs exp</span>
                          {job.salary_min && <span>{sym}{fmt(job.salary_min)}–{fmt(job.salary_max)}/yr</span>}
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{job.application_count || 0} applications</span>
                        </div>
                        {job.skills && <p className="text-xs text-muted-foreground mt-1.5">Skills: {job.skills}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => { setPreOpeningId(job.id); setEditingApp(null); setShowAppForm(true); }}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Add Applicant
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditingJob(job); setShowJobForm(true); }}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteJobMutation.mutate(job.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No applications found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50"><tr>
                  {["Candidate", "Job Opening", "Source", "CTC (Expected)", "Notice", "Interview", "Stage", "Rating", ""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredApps.map((app: any) => {
                    const stage = getStage(app.stage);
                    return (
                      <tr key={app.id} className="border-t hover-elevate" data-testid={`row-app-${app.id}`}>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{app.candidate_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {app.phone && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Phone className="h-3 w-3" />{app.phone}</span>}
                            {app.email && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Mail className="h-3 w-3" />{app.email}</span>}
                          </div>
                          {app.current_company && <p className="text-xs text-muted-foreground">{app.current_company}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{app.opening_title}</td>
                        <td className="px-3 py-2.5 capitalize text-muted-foreground">{app.source}</td>
                        <td className="px-3 py-2.5">{app.expected_ctc ? `${sym}${fmt(app.expected_ctc)}` : "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{app.notice_period_days ? `${app.notice_period_days}d` : "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{app.interview_date || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stage.color}`}>{stage.label}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {Number(app.rating) > 0 ? (
                            <span className="flex items-center gap-0.5 text-yellow-500">
                              <Star className="h-3.5 w-3.5 fill-current" />{app.rating}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingApp(app); setShowAppForm(true); }}>Edit</Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteAppMutation.mutate(app.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t bg-muted/30 text-sm text-muted-foreground">{filteredApps.length} application{filteredApps.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.filter(st => st.value !== "rejected").map(stage => {
              const stageApps = (applications as any[]).filter((a: any) => a.stage === stage.value);
              return (
                <div key={stage.value} className="flex-shrink-0 w-56">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage.label}</p>
                    <Badge variant="outline" className="text-xs">{stageApps.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {stageApps.length === 0 && (
                      <div className="rounded-md border border-dashed p-3 text-center">
                        <p className="text-xs text-muted-foreground">No candidates</p>
                      </div>
                    )}
                    {stageApps.map((app: any) => (
                      <Card key={app.id} className="hover-elevate cursor-pointer" onClick={() => { setEditingApp(app); setShowAppForm(true); }}>
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm font-medium leading-tight">{app.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.opening_title}</p>
                          {Number(app.rating) > 0 && (
                            <span className="flex items-center gap-0.5 text-yellow-500 text-xs">
                              <Star className="h-3 w-3 fill-current" />{app.rating}
                            </span>
                          )}
                          {app.interview_date && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />{app.interview_date}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex-shrink-0 w-56">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rejected</p>
                <Badge variant="outline" className="text-xs">{(applications as any[]).filter((a: any) => a.stage === "rejected").length}</Badge>
              </div>
              <div className="space-y-2">
                {(applications as any[]).filter((a: any) => a.stage === "rejected").map((app: any) => (
                  <Card key={app.id} className="opacity-60">
                    <CardContent className="p-3 space-y-1">
                      <p className="text-sm font-medium">{app.candidate_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.opening_title}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobForm} onOpenChange={v => { if (!v) { setShowJobForm(false); setEditingJob(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingJob ? "Edit Job Opening" : "Create Job Opening"}</DialogTitle></DialogHeader>
          <JobOpeningForm editing={editingJob} depts={depts} onSave={() => { setShowJobForm(false); setEditingJob(null); }} onCancel={() => { setShowJobForm(false); setEditingJob(null); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={showAppForm} onOpenChange={v => { if (!v) { setShowAppForm(false); setEditingApp(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingApp ? "Edit Application" : "Add Application"}</DialogTitle></DialogHeader>
          <ApplicationForm openings={openings} editing={editingApp} preOpeningId={preOpeningId} onSave={() => { setShowAppForm(false); setEditingApp(null); }} onCancel={() => { setShowAppForm(false); setEditingApp(null); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
