import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Send, Download } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const TEMPLATES = ["Management", "Technical", "Internship"];
const EMPTY = { candidate_name: "", email: "", designation: "", ctc: "", joining_date: "", template: "Technical", department: "" };

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "secondary",
  Sent: "outline",
  Viewed: "outline",
  Signed: "default",
  Declined: "destructive",
};

export default function OfferLettersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [preview, setPreview] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: letters = [] } = useQuery({ queryKey: ["offer-letters"], queryFn: () => api("GET", "/api/hr/offer-letters") });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/hr/offer-letters", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offer-letters"] }); setOpen(false); setForm({ ...EMPTY }); },
  });

  const sendESignMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/hr/offer-letters/${id}/send-esign`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offer-letters"] }),
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(letters) ? letters : [];

  const mockRows = [
    { id: 1, candidate_name: "Vikas Mehta", designation: "Sr. Engineer", ctc: "12 LPA", joining_date: "2026-07-15", template: "Technical", status: "Signed" },
    { id: 2, candidate_name: "Anjali Gupta", designation: "HR Manager", ctc: "8 LPA", joining_date: "2026-08-01", template: "Management", status: "Sent" },
    { id: 3, candidate_name: "Rohit Joshi", designation: "Intern", ctc: "15,000/mo", joining_date: "2026-07-01", template: "Internship", status: "Draft" },
  ];

  const displayRows = rows.length ? rows : mockRows;

  const offerHtml = `
    <div style="font-family: serif; padding: 40px; max-width: 700px; margin: auto; border: 1px solid #ccc;">
      <h2 style="text-align:center;">KINTO ENTERPRISES PVT. LTD.</h2>
      <p style="text-align:center; color:#666;">Offer Letter</p>
      <p>Date: ${new Date().toLocaleDateString("en-IN")}</p>
      <p>Dear <strong>${form.candidate_name || "[Candidate Name]"}</strong>,</p>
      <p>We are pleased to offer you the position of <strong>${form.designation || "[Designation]"}</strong>
      in the ${form.department || "[Department]"} department.</p>
      <p>Your CTC will be <strong>${form.ctc || "[CTC]"}</strong> per annum.</p>
      <p>Your joining date is <strong>${form.joining_date || "[Date]"}</strong>.</p>
      <br/>
      <p>Kindly sign this letter as an acceptance of our offer.</p>
      <br/><br/>
      <div style="display:flex; justify-content:space-between;">
        <div>HR Signature: ___________</div>
        <div>Candidate Signature: ___________</div>
      </div>
    </div>
  `;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offer Letter E-Signing</h1>
          <p className="text-muted-foreground">Generate, send and track offer letters</p>
        </div>
        <Button onClick={() => { setOpen(true); setPreview(false); }}><Plus className="h-4 w-4 mr-2" />New Offer Letter</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Offer Letters</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>CTC</TableHead>
                <TableHead>Joining</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((r: Record<string, unknown>, i) => (
                <TableRow key={i}>
                  <TableCell>{String(r.candidate_name)}</TableCell>
                  <TableCell>{String(r.designation)}</TableCell>
                  <TableCell>{String(r.ctc)}</TableCell>
                  <TableCell>{String(r.joining_date)}</TableCell>
                  <TableCell><Badge variant="outline">{String(r.template)}</Badge></TableCell>
                  <TableCell><Badge variant={STATUS_COLOR[String(r.status)] || "outline"}>{String(r.status)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status === "Draft" && (
                        <Button size="sm" variant="outline" onClick={() => sendESignMut.mutate(Number(r.id))}>
                          <Send className="h-3 w-3 mr-1" />E-Sign
                        </Button>
                      )}
                      {r.status === "Signed" && (
                        <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" />PDF</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Generate Offer Letter</DialogTitle></DialogHeader>
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">Details</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="form">
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Template</label>
                  <Select value={form.template} onValueChange={v => setForm(p => ({ ...p, template: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TEMPLATES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {(["candidate_name", "email", "designation", "department", "ctc", "joining_date"] as const).map(f => (
                  <div key={f}>
                    <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                    <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded p-2 max-h-96 overflow-y-auto mt-3">
                <div dangerouslySetInnerHTML={{ __html: offerHtml }} />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)}>Save & Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
