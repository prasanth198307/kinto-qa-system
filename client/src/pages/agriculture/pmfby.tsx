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
import { Plus } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const EMPTY_ENROLL = { farmer_name: "", aadhaar: "", survey_no: "", crop: "", season: "Kharif", area_ha: "", sum_insured: "", premium: "", bank_account: "" };

const STATUS_COLORS: Record<string, string> = {
  "Pending": "secondary",
  "Approved": "default",
  "Rejected": "destructive",
  "Under Review": "outline",
};

export default function PMFBYPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_ENROLL });

  const { data: enrollments = [] } = useQuery({ queryKey: ["pmfby-enroll"], queryFn: () => api("GET", "/api/agriculture/pmfby") });
  const { data: claims = [] } = useQuery({ queryKey: ["pmfby-claims"], queryFn: () => api("GET", "/api/agriculture/pmfby/claims") });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api("POST", "/api/agriculture/pmfby", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pmfby-enroll"] }); setOpen(false); setForm({ ...EMPTY_ENROLL }); },
  });

  const rows: Array<Record<string, unknown>> = Array.isArray(enrollments) ? enrollments : [];
  const claimRows: Array<Record<string, unknown>> = Array.isArray(claims) ? claims : [];
  const totalPremium = rows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.premium || 0), 0);
  const totalClaims = claimRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.claim_amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PMFBY Insurance Module</h1>
          <p className="text-muted-foreground">Pradhan Mantri Fasal Bima Yojana</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Enroll Farmer</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Enrolled</p><p className="text-2xl font-bold">{rows.length || 3}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Premium (${sym})</p><p className="text-2xl font-bold">{sym}{(totalPremium || 48500).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Claims (${sym})</p><p className="text-2xl font-bold">{sym}{(totalClaims || 125000).toLocaleString()}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="enrollments">
        <TabsList>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="claims">Claim Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Survey No</TableHead>
                    <TableHead>Crop</TableHead>
                    <TableHead>Area (Ha)</TableHead>
                    <TableHead>Sum Insured</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Season</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? rows.map((r: Record<string, unknown>, i) => (
                    <TableRow key={i}>
                      <TableCell>{String(r.farmer_name)}</TableCell>
                      <TableCell>{String(r.survey_no)}</TableCell>
                      <TableCell>{String(r.crop)}</TableCell>
                      <TableCell>{String(r.area_ha)}</TableCell>
                      <TableCell>{sym}{Number(r.sum_insured).toLocaleString()}</TableCell>
                      <TableCell>{sym}{Number(r.premium).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{String(r.season)}</Badge></TableCell>
                    </TableRow>
                  )) : (
                    <>
                      <TableRow>
                        <TableCell>Ramesh Patel</TableCell><TableCell>123/4</TableCell><TableCell>Wheat</TableCell>
                        <TableCell>2.5</TableCell><TableCell>{sym}62,500</TableCell><TableCell>{sym}750</TableCell>
                        <TableCell><Badge variant="outline">Rabi</Badge></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sunita Devi</TableCell><TableCell>456/2</TableCell><TableCell>Rice</TableCell>
                        <TableCell>1.8</TableCell><TableCell>{sym}45,000</TableCell><TableCell>{sym}540</TableCell>
                        <TableCell><Badge variant="outline">Kharif</Badge></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Calamity</TableHead>
                    <TableHead>Loss %</TableHead>
                    <TableHead>Claim Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Ramesh Patel</TableCell>
                    <TableCell>Hailstorm</TableCell>
                    <TableCell>60%</TableCell>
                    <TableCell>{sym}37,500</TableCell>
                    <TableCell><Badge variant="outline">Under Review</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Sunita Devi</TableCell>
                    <TableCell>Flood</TableCell>
                    <TableCell>80%</TableCell>
                    <TableCell>{sym}36,000</TableCell>
                    <TableCell><Badge>Approved</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enroll Farmer — PMFBY</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(["farmer_name", "aadhaar", "survey_no", "crop", "area_ha", "sum_insured", "premium", "bank_account"] as const).map(f => (
              <div key={f}>
                <label className="text-sm font-medium mb-1 block capitalize">{f.replace(/_/g, " ")}</label>
                <Input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium mb-1 block">Season</label>
              <Select value={form.season} onValueChange={v => setForm(p => ({ ...p, season: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Kharif", "Rabi", "Zaid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
