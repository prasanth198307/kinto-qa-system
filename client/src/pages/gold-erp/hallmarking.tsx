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
import { Plus, FileText } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const PURITIES = ["24K (999)", "22K (916)", "18K (750)", "14K (585)"];
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Submitted": "outline",
  "At Lab": "secondary",
  "Certified": "default",
  "Rejected": "destructive",
};

const EMPTY_ITEM = { description: "", weight: "", purity: "22K (916)", article_no: "" };

export default function HallmarkingPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_ITEM });

  const { data: items = [] } = useQuery({ queryKey: ["hallmarking-items"], queryFn: () => api("GET", "/api/gold-erp/hallmarking") });
  const { data: huidItems = [] } = useQuery({ queryKey: ["huid-items"], queryFn: () => api("GET", "/api/gold-erp/hallmarking/certified") });

  const addMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/gold-erp/hallmarking", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hallmarking-items"] }); setOpen(false); setForm({ ...EMPTY_ITEM }); },
  });

  const submitBatch = () => api("POST", "/api/gold-erp/hallmarking/batch", { items: rows.map((r: Record<string, unknown>) => r.id) });

  const genReport = () => api("POST", "/api/gold-erp/bis-report", {});

  const rows: Array<Record<string, unknown>> = Array.isArray(items) ? items : [];
  const huidRows: Array<Record<string, unknown>> = Array.isArray(huidItems) ? huidItems : [];

  const mockRows = [
    { description: "Gold Ring 22K", weight: "5.2g", purity: "22K (916)", article_no: "GR-001", status: "At Lab" },
    { description: "Necklace 18K", weight: "12.5g", purity: "18K (750)", article_no: "NC-002", status: "Submitted" },
    { description: "Bangles Set 22K", weight: "32.0g", purity: "22K (916)", article_no: "BG-003", status: "Certified" },
  ];

  const displayRows = rows.length ? rows : mockRows;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BIS Hallmarking Compliance</h1>
          <p className="text-muted-foreground">Manage hallmarking submissions and HUID tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={genReport}><FileText className="h-4 w-4 mr-2" />Generate BIS Report</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items for Hallmarking</TabsTrigger>
          <TabsTrigger value="huid">HUID Records</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Batch Submission</CardTitle>
                <Button size="sm" onClick={submitBatch}>Submit Batch to AHC</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Article No</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((r: Record<string, unknown>, i) => (
                    <TableRow key={i}>
                      <TableCell>{String(r.description)}</TableCell>
                      <TableCell>{String(r.weight)}</TableCell>
                      <TableCell>{String(r.purity)}</TableCell>
                      <TableCell>{String(r.article_no)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[String(r.status)] || "outline"}>{String(r.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="huid">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HUID Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Purity Certified</TableHead>
                    <TableHead>Certification Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {huidRows.length ? huidRows.map((r: Record<string, unknown>, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono">{String(r.huid)}</TableCell>
                      <TableCell>{String(r.description)}</TableCell>
                      <TableCell>{String(r.purity)}</TableCell>
                      <TableCell>{String(r.cert_date)}</TableCell>
                      <TableCell><Badge>Certified</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <>
                      <TableRow>
                        <TableCell className="font-mono">AA123456</TableCell>
                        <TableCell>Bangles Set 22K</TableCell>
                        <TableCell>22K (916)</TableCell>
                        <TableCell>2026-06-20</TableCell>
                        <TableCell><Badge>Certified</Badge></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Item for Hallmarking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(["description", "weight", "article_no"] as const).map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium mb-1 block">Purity</label>
              <Select value={form.purity} onValueChange={v => setForm(p => ({ ...p, purity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate(form)}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
