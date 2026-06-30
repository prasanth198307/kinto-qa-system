import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, AlertCircle, Clock, CheckCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function CollectionsPage() {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payOpen, setPayOpen] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payRef, setPayRef] = useState("");

  const { data: projects } = useQuery({ queryKey: ["re-projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const projectList = Array.isArray(projects) ? projects : [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-collections", projectFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectFilter !== "all") params.set("project_id", projectFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      return api("GET", `/api/real-estate/collections?${params}`);
    },
  });

  const demands = Array.isArray(data) ? data : [];
  const totalCollected = demands.reduce((a: number, d: any) => a + Number(d.paid_amount || 0), 0);
  const totalDue = demands.reduce((a: number, d: any) => a + Number(d.due_amount || 0), 0);
  const totalOverdue = demands.filter((d: any) => d.status === "overdue").reduce((a: number, d: any) => a + Number(d.balance || 0), 0);

  const generateDemand = useMutation({
    mutationFn: () => api("POST", "/api/real-estate/collections/generate-demand", { project_id: projectFilter !== "all" ? Number(projectFilter) : undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["re-collections"] }),
  });

  const recordPayment = useMutation({
    mutationFn: (payload: any) => api("POST", `/api/real-estate/collections/${payOpen?.id}/payment`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-collections"] }); setPayOpen(null); setPayAmount(""); setPayDate(""); setPayRef(""); },
  });

  function isOverdue(d: any) { return d.status === "overdue" || (d.balance > 0 && d.due_date && new Date(d.due_date) < new Date()); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button onClick={() => generateDemand.mutate()} disabled={generateDemand.isPending}>
          {generateDemand.isPending ? "Generating..." : "Generate Demand"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Collected", value: totalCollected, icon: CheckCircle, color: "text-green-600" },
          { label: "Total Due", value: totalDue, icon: IndianRupee, color: "text-yellow-600" },
          { label: "Overdue Balance", value: totalOverdue, icon: AlertCircle, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${color}`}>₹{value.toLocaleString()}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load collections.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Demand #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Due Amt</TableHead>
                  <TableHead className="text-right">Paid Amt</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {demands.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No demands found.</TableCell></TableRow>}
                {demands.map((d: any) => (
                  <TableRow key={d.id} className={isOverdue(d) ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-medium">{d.demand_number}</TableCell>
                    <TableCell>{d.customer_name}</TableCell>
                    <TableCell>{d.unit_number}</TableCell>
                    <TableCell className={isOverdue(d) ? "text-red-600 font-medium" : ""}>{d.due_date}</TableCell>
                    <TableCell className="text-right">₹{Number(d.due_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{Number(d.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">₹{Number(d.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "paid" ? "outline" : d.status === "overdue" ? "destructive" : "secondary"}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => { setPayOpen(d); setPayDate(new Date().toISOString().split("T")[0]); }}>
                          <Clock className="w-3 h-3 mr-1" />Pay
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
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{payOpen?.demand_number} — {payOpen?.customer_name} — Balance: ₹{Number(payOpen?.balance || 0).toLocaleString()}</p>
          <div className="space-y-3">
            <Input type="number" placeholder="Amount Paid" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <Input type="date" placeholder="Payment Date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <Input placeholder="Reference / UTR" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={() => recordPayment.mutate({ amount: Number(payAmount), payment_date: payDate, reference: payRef })} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
