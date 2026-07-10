import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Send, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const PURITIES = ["999 (24K)", "958 (23K)", "916 (22K)", "875 (21K)", "750 (18K)", "585 (14K)"];
const ARTICLE_TYPES = ["ring", "necklace", "bangle", "chain", "earring", "pendant", "bracelet", "anklet", "brooch", "coin"];
const METALS = ["gold", "silver", "platinum"];

const STATUS_COLOR: Record<string, string> = {
  pending:          "bg-gray-100 text-gray-700",
  submitted_to_ahc: "bg-blue-100 text-blue-700",
  under_testing:    "bg-amber-100 text-amber-700",
  certified:        "bg-green-100 text-green-700",
  rejected:         "bg-red-100 text-red-700",
};

const EMPTY_FORM = { article_no: "", article_type: "ring", metal: "gold", purity: "916 (22K)", gross_weight: "", net_weight: "", hallmarking_centre: "", ahc_licence_no: "", notes: "" };
const EMPTY_UPDATE = { status: "certified", huid: "", certification_no: "", hallmarking_date: "", rejection_reason: "", bis_portal_ref: "" };

export default function HallmarkingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [updateId, setUpdateId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [upd, setUpd] = useState({ ...EMPTY_UPDATE });
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchCentre, setBatchCentre] = useState("");
  const [batchAhc, setBatchAhc] = useState("");

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["hallmarking-items", statusFilter],
    queryFn: () => fetch(`/api/gold-erp/hallmarking${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  const { data: certified = [] } = useQuery<any[]>({ queryKey: ["huid-certified"], queryFn: () => fetch("/api/gold-erp/hallmarking/certified").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: batches = [] } = useQuery<any[]>({ queryKey: ["hallmarking-batches"], queryFn: () => fetch("/api/gold-erp/hallmarking/batches").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => []) });

  const addMut = useMutation({
    mutationFn: (b: typeof form) => api("POST", "/api/gold-erp/hallmarking", { ...b, gross_weight: Number(b.gross_weight), net_weight: Number(b.net_weight) }),
    onSuccess: () => { toast({ title: "Item added for hallmarking" }); qc.invalidateQueries({ queryKey: ["hallmarking-items"] }); setOpen(false); setForm({ ...EMPTY_FORM }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api("PUT", `/api/gold-erp/hallmarking/${id}`, data),
    onSuccess: () => { toast({ title: "Status updated" }); qc.invalidateQueries({ queryKey: ["hallmarking-items", "huid-certified"] }); setUpdateId(null); },
  });

  const batchMut = useMutation({
    mutationFn: (data: any) => api("POST", "/api/gold-erp/hallmarking/batch", data),
    onSuccess: (d) => { toast({ title: `Batch ${d.batch_no} submitted — ${selectedIds.length} articles` }); qc.invalidateQueries({ queryKey: ["hallmarking-items", "hallmarking-batches"] }); setSelectedIds([]); },
  });

  const toggleSelect = (id: number) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const rows: any[] = Array.isArray(items) ? items : [];
  const certRows: any[] = Array.isArray(certified) ? certified : [];

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const certifiedCount = certRows.length;
  const inProgressCount = rows.filter(r => r.status === "submitted_to_ahc" || r.status === "under_testing").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BIS Hallmarking Compliance</h1>
          <p className="text-sm text-muted-foreground">HUID tracking · AHC batch submission · BIS portal integration · Status workflow: pending → AHC → certified/rejected</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("https://huidonline.bis.gov.in", "_blank")} className="text-xs">BIS Portal ↗</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Article</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-gray-600">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">At AHC / Testing</p><p className="text-2xl font-bold text-amber-600">{inProgressCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">HUID Certified</p><p className="text-2xl font-bold text-green-600">{certifiedCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Batches Submitted</p><p className="text-2xl font-bold">{Array.isArray(batches) ? batches.length : 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">Articles ({rows.length})</TabsTrigger>
          <TabsTrigger value="huid">HUID Registry ({certRows.length})</TabsTrigger>
          <TabsTrigger value="batches">Batch Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <Label className="text-xs">Filter:</Label>
              {["all", "pending", "submitted_to_ahc", "under_testing", "certified", "rejected"].map(s => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} className="text-xs h-7" onClick={() => setStatusFilter(s)}>
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
            {selectedIds.length > 0 && (
              <div className="flex gap-2 items-center">
                <Input placeholder="AHC Name" value={batchCentre} onChange={e => setBatchCentre(e.target.value)} className="h-7 text-xs w-40" />
                <Input placeholder="AHC Licence No" value={batchAhc} onChange={e => setBatchAhc(e.target.value)} className="h-7 text-xs w-36" />
                <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => batchMut.mutate({ article_ids: selectedIds, hallmarking_centre: batchCentre, ahc_licence_no: batchAhc })} disabled={!batchCentre || batchMut.isPending}>
                  <Send className="h-3 w-3 mr-1" />Submit Batch ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>
          <Table>
            <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Article No</TableHead><TableHead>Type</TableHead><TableHead>Metal</TableHead><TableHead>Purity</TableHead><TableHead className="text-right">Gross (g)</TableHead><TableHead className="text-right">Net (g)</TableHead><TableHead>AHC</TableHead><TableHead>HUID</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={11} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id} className={selectedIds.includes(r.id) ? "bg-blue-50" : ""}>
                  <TableCell><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} className="rounded" /></TableCell>
                  <TableCell className="font-mono text-xs">{r.article_no}</TableCell>
                  <TableCell className="text-xs capitalize">{r.article_type}</TableCell>
                  <TableCell className="text-xs capitalize">{r.metal}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.purity}</Badge></TableCell>
                  <TableCell className="text-right text-xs">{Number(r.gross_weight || 0).toFixed(3)}</TableCell>
                  <TableCell className="text-right text-xs">{Number(r.net_weight || 0).toFixed(3)}</TableCell>
                  <TableCell className="text-xs">{r.hallmarking_centre?.slice(0, 20) || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-green-700">{r.huid || "—"}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLOR[r.status] || "bg-gray-100"}`}>{r.status?.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setUpdateId(r.id); setUpd({ status: r.status, huid: r.huid || "", certification_no: r.certification_no || "", hallmarking_date: r.hallmarking_date || "", rejection_reason: r.rejection_reason || "", bis_portal_ref: r.bis_portal_ref || "" }); }}>
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">No articles. Add items to begin hallmarking workflow.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="huid">
          <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-800 mb-3">
            BIS Hallmark Unique ID (HUID) is a 6-character alphanumeric code assigned by the Assaying & Hallmarking Centre (AHC). Mandatory for all gold jewellery sold in India under BIS order 2021.
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>HUID</TableHead><TableHead>Article No</TableHead><TableHead>Type</TableHead><TableHead>Metal / Purity</TableHead><TableHead className="text-right">Net Wt (g)</TableHead><TableHead>AHC</TableHead><TableHead>Cert No</TableHead><TableHead>Hallmarked Date</TableHead><TableHead>BIS Portal Ref</TableHead></TableRow></TableHeader>
            <TableBody>
              {certRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-bold text-green-700">{r.huid}</TableCell>
                  <TableCell className="font-mono text-xs">{r.article_no}</TableCell>
                  <TableCell className="text-xs capitalize">{r.article_type}</TableCell>
                  <TableCell className="text-xs">{r.metal} / {r.purity}</TableCell>
                  <TableCell className="text-right text-xs">{Number(r.net_weight || 0).toFixed(3)}</TableCell>
                  <TableCell className="text-xs">{r.hallmarking_centre || "—"}</TableCell>
                  <TableCell className="text-xs">{r.certification_no || "—"}</TableCell>
                  <TableCell className="text-xs">{r.hallmarking_date ? new Date(r.hallmarking_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.bis_portal_ref || "—"}</TableCell>
                </TableRow>
              ))}
              {certRows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No certified articles with HUID yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="batches">
          <Table>
            <TableHeader><TableRow><TableHead>Batch No</TableHead><TableHead>Submitted Date</TableHead><TableHead>AHC Name</TableHead><TableHead>AHC Licence</TableHead><TableHead>Total Articles</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {Array.isArray(batches) && batches.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.batch_no}</TableCell>
                  <TableCell className="text-xs">{b.submitted_date ? new Date(b.submitted_date).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{b.hallmarking_centre}</TableCell>
                  <TableCell className="font-mono text-xs">{b.ahc_licence_no}</TableCell>
                  <TableCell className="text-center">{b.total_articles}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLOR[b.status] || "bg-gray-100"}`}>{b.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!Array.isArray(batches) || batches.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No batches submitted</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Article for Hallmarking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Article No</Label><Input value={form.article_no} onChange={e => setForm(f => ({ ...f, article_no: e.target.value }))} placeholder="JW-2026-001" /></div>
            <div><Label>Article Type</Label>
              <Select value={form.article_type} onValueChange={v => setForm(f => ({ ...f, article_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ARTICLE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Metal</Label>
              <Select value={form.metal} onValueChange={v => setForm(f => ({ ...f, metal: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METALS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Purity</Label>
              <Select value={form.purity} onValueChange={v => setForm(f => ({ ...f, purity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Gross Weight (g)</Label><Input type="number" step="0.001" value={form.gross_weight} onChange={e => setForm(f => ({ ...f, gross_weight: e.target.value }))} /></div>
            <div><Label>Net Weight (g)</Label><Input type="number" step="0.001" value={form.net_weight} onChange={e => setForm(f => ({ ...f, net_weight: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Hallmarking Centre (AHC Name)</Label><Input value={form.hallmarking_centre} onChange={e => setForm(f => ({ ...f, hallmarking_centre: e.target.value }))} placeholder="BIS Assaying & Hallmarking Centre, Delhi" /></div>
            <div><Label>AHC Licence No</Label><Input value={form.ahc_licence_no} onChange={e => setForm(f => ({ ...f, ahc_licence_no: e.target.value }))} className="font-mono" /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate(form)} disabled={!form.article_no || !form.gross_weight || addMut.isPending}>
              {addMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {updateId !== null && (
        <Dialog open onOpenChange={() => setUpdateId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Hallmarking Status</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Status</Label>
                <Select value={upd.status} onValueChange={v => setUpd(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted_to_ahc">Submitted to AHC</SelectItem>
                    <SelectItem value="under_testing">Under Testing</SelectItem>
                    <SelectItem value="certified">Certified ✓</SelectItem>
                    <SelectItem value="rejected">Rejected ✗</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {upd.status === "certified" && <>
                <div><Label>HUID (6-char BIS code)</Label><Input value={upd.huid} onChange={e => setUpd(f => ({ ...f, huid: e.target.value }))} className="font-mono" maxLength={20} placeholder="AA1234" /></div>
                <div><Label>Certification No</Label><Input value={upd.certification_no} onChange={e => setUpd(f => ({ ...f, certification_no: e.target.value }))} /></div>
                <div><Label>Hallmarking Date</Label><Input type="date" value={upd.hallmarking_date} onChange={e => setUpd(f => ({ ...f, hallmarking_date: e.target.value }))} /></div>
                <div><Label>BIS Portal Ref</Label><Input value={upd.bis_portal_ref} onChange={e => setUpd(f => ({ ...f, bis_portal_ref: e.target.value }))} className="font-mono" placeholder="Optional BIS online ref no" /></div>
              </>}
              {upd.status === "rejected" && <div><Label>Rejection Reason</Label><Textarea value={upd.rejection_reason} onChange={e => setUpd(f => ({ ...f, rejection_reason: e.target.value }))} rows={2} /></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateId(null)}>Cancel</Button>
              <Button onClick={() => updateMut.mutate({ id: updateId, ...upd })} disabled={updateMut.isPending}>
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}<CheckCircle className="h-4 w-4 mr-1" />Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
