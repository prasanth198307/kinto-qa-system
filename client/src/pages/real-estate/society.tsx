import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CreditCard } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function SocietyPage() {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [payOpen, setPayOpen] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payRef, setPayRef] = useState("");

  const { data: projects } = useQuery({ queryKey: ["re-projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const projectList = Array.isArray(projects) ? projects : [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["re-society", projectFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectFilter !== "all") params.set("project_id", projectFilter);
      return api("GET", `/api/real-estate/society?${params}`);
    },
  });

  const units = Array.isArray(data) ? data : [];

  const generateBills = useMutation({
    mutationFn: () => api("POST", "/api/real-estate/society/generate-bills", { project_id: projectFilter !== "all" ? Number(projectFilter) : undefined }),
    onSuccess: () => refetch(),
  });

  const recordPayment = useMutation({
    mutationFn: (payload: any) => api("POST", `/api/real-estate/society/${payOpen?.id}/payment`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-society"] }); setPayOpen(null); setPayAmount(""); setPayDate(""); setPayRef(""); },
  });

  function isOverdue(u: any) { return u.balance > 0 && u.due_date && new Date(u.due_date) < new Date(); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Society / Maintenance</h1>
        <Button onClick={() => generateBills.mutate()} disabled={generateBills.isPending}>
          <FileText className="w-4 h-4 mr-2" />{generateBills.isPending ? "Generating..." : "Generate Maintenance Bills"}
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load maintenance records.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit #</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Maintenance Amt</TableHead>
                  <TableHead>Last Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No maintenance records found.</TableCell></TableRow>}
                {units.map((u: any) => (
                  <TableRow key={u.id} className={isOverdue(u) ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-medium">{u.unit_number}</TableCell>
                    <TableCell>{u.owner_name}</TableCell>
                    <TableCell className="text-right">₹{Number(u.maintenance_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{u.last_paid || "—"}</TableCell>
                    <TableCell className={isOverdue(u) ? "text-red-600 font-medium" : ""}>{u.due_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(u.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={u.balance <= 0 ? "outline" : isOverdue(u) ? "destructive" : "secondary"}>
                        {u.balance <= 0 ? "paid" : isOverdue(u) ? "overdue" : "due"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.balance > 0 && (
                        <Button size="sm" variant="outline" onClick={() => { setPayOpen(u); setPayDate(new Date().toISOString().split("T")[0]); }}>
                          <CreditCard className="w-3 h-3 mr-1" />Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Maintenance Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Unit: {payOpen?.unit_number} — {payOpen?.owner_name} — Balance: ₹{Number(payOpen?.balance || 0).toLocaleString()}</p>
          <div className="space-y-3">
            <Input type="number" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <Input placeholder="Reference" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={() => recordPayment.mutate({ amount: Number(payAmount), payment_date: payDate, reference: payRef })} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
