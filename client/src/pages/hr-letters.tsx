import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Download, Pencil } from "lucide-react";

const LETTER_TYPES = [
  "Offer Letter",
  "Appointment Letter",
  "Confirmation Letter",
  "Increment Letter",
  "Promotion Letter",
  "Experience Letter",
  "Relieving Letter",
  "Warning Letter",
  "Show Cause Notice",
  "Salary Certificate",
  "NOC Letter",
  "Transfer Letter",
];

const LETTER_TEMPLATES: Record<string, string> = {
  "Offer Letter": `Dear [Employee Name],

We are pleased to offer you the position of [Designation] at [Company Name].

Your employment will commence on [Joining Date].

Salary: ₹[Salary] per month (CTC)
Location: [Location]

Please confirm your acceptance by signing and returning this letter.

Regards,
HR Department`,
  "Experience Letter": `To Whom It May Concern,

This is to certify that [Employee Name] was employed with us as [Designation] from [Start Date] to [End Date].

During their tenure, they demonstrated excellent work ethics and professionalism.

We wish them all the best in their future endeavors.

Regards,
HR Department`,
  "Appointment Letter": `Dear [Employee Name],

We are pleased to appoint you as [Designation] with effect from [Date].

Terms & Conditions:
- Probation Period: 6 months
- Notice Period: 1 month
- Salary: ₹[Salary] per month

Regards,
HR Department`,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function HRLettersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [form, setForm] = useState<any>({ letter_type: "Offer Letter", status: "draft", issued_date: new Date().toISOString().slice(0, 10) });

  const { data: letters = [] } = useQuery<any[]>({ queryKey: ["/api/hr/letters"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hr/letters/${editing.id}`, data)
      : apiRequest("POST", "/api/hr/letters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/letters"] });
      setShowForm(false); setEditing(null);
      setForm({ letter_type: "Offer Letter", status: "draft", issued_date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Letter saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = letters.filter((l: any) => l.employee_name?.toLowerCase().includes(search.toLowerCase()) || l.letter_type?.toLowerCase().includes(search.toLowerCase()));

  const useTemplate = (type: string) => {
    const t = LETTER_TEMPLATES[type];
    if (t) set("content", t);
  };

  const printLetter = (letter: any) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${letter.letter_type}</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto;line-height:1.6;}h2{text-align:center;}pre{white-space:pre-wrap;font-family:inherit;}</style></head><body><h2>${letter.letter_type}</h2><p><strong>To:</strong> ${letter.employee_name}</p><p><strong>Date:</strong> ${letter.issued_date}</p><hr/><pre>${letter.content}</pre></body></html>`);
    win.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">HR Letters & Documents</h1>
          <p className="text-sm text-muted-foreground">Generate and manage employee letters</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-48" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => { setEditing(null); setForm({ letter_type: "Offer Letter", status: "draft", issued_date: new Date().toISOString().slice(0, 10) }); setShowForm(true); }} size="sm" data-testid="button-add-letter">
            <Plus className="h-4 w-4 mr-1" />New Letter
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Employee", "Letter Type", "Subject", "Date", "Status", ""].map(h => (
                <th key={h} className="px-4 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30" data-testid={`row-letter-${l.id}`}>
                <td className="px-4 py-2 font-medium">{l.employee_name}</td>
                <td className="px-4 py-2"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{l.letter_type}</div></td>
                <td className="px-4 py-2 text-muted-foreground">{l.subject}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.issued_date}</td>
                <td className="px-4 py-2"><Badge className={STATUS_COLORS[l.status] || ""}>{l.status}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => setShowPreview(l)} title="Preview & Print"><Download className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setForm(l); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No letters yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Letter" : "New HR Letter"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Letter Type *</Label>
                <Select value={form.letter_type || ""} onValueChange={v => { set("letter_type", v); if (!editing) useTemplate(v); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LETTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => set("employee_name", e.target.value)} data-testid="input-letter-employee" /></div>
              <div className="space-y-1"><Label className="text-xs">Subject *</Label><Input value={form.subject || ""} onChange={e => set("subject", e.target.value)} placeholder="Re: Appointment as Software Engineer" /></div>
              <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={form.issued_date || ""} onChange={e => set("issued_date", e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status || "draft"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="issued">Issued</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Letter Content *</Label>
                <Button size="sm" variant="ghost" onClick={() => useTemplate(form.letter_type)} className="text-xs h-6">Use Template</Button>
              </div>
              <Textarea value={form.content || ""} onChange={e => set("content", e.target.value)} rows={12} className="font-mono text-xs" data-testid="input-letter-content" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-letter">Save Letter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!showPreview} onOpenChange={v => !v && setShowPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showPreview?.letter_type} — {showPreview?.employee_name}</DialogTitle></DialogHeader>
          <div className="border rounded-lg p-6 space-y-4 font-mono text-sm whitespace-pre-wrap bg-white text-black dark:bg-gray-900 dark:text-white">
            {showPreview?.content}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => printLetter(showPreview)}><Download className="h-4 w-4 mr-2" />Print / Download</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
