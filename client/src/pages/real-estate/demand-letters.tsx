import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Send, CheckCircle, Download } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const MILESTONES = [
  { id: 1, name: "Foundation", pct: 10, completed: true, demand_pct: 15 },
  { id: 2, name: "Plinth Level", pct: 20, completed: true, demand_pct: 10 },
  { id: 3, name: "Ground Floor Slab", pct: 35, completed: false, demand_pct: 15 },
  { id: 4, name: "First Floor Slab", pct: 50, completed: false, demand_pct: 10 },
  { id: 5, name: "Top Floor Slab", pct: 70, completed: false, demand_pct: 15 },
  { id: 6, name: "Brick Work Complete", pct: 80, completed: false, demand_pct: 10 },
  { id: 7, name: "Possession", pct: 100, completed: false, demand_pct: 25 },
];

const SAMPLE_LETTERS = [
  { id: 1, buyer: "Rahul Verma", unit: "A-301", milestone: "Foundation", amount: 375000, due_date: "2026-05-30", status: "Paid" },
  { id: 2, buyer: "Sunita Patel", unit: "B-102", milestone: "Foundation", amount: 225000, due_date: "2026-05-30", status: "Pending" },
  { id: 3, buyer: "Ajay Singh", unit: "C-205", milestone: "Plinth Level", amount: 150000, due_date: "2026-06-15", status: "Overdue" },
];

export default function DemandLettersPage() {
  const qc = useQueryClient();
  const [milestones, setMilestones] = useState(MILESTONES);
  const [preview, setPreview] = useState<any>(null);

  const { data: letters = [] } = useQuery<any[]>({
    queryKey: ["real-estate-demand-letters"],
    queryFn: () => api("GET", "/api/real-estate/demand-letters").catch(() => []),
  });

  const generateMutation = useMutation({
    mutationFn: (milestoneId: number) => api("POST", "/api/real-estate/demand-letters/generate", { milestone_id: milestoneId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["real-estate-demand-letters"] }),
  });

  const markComplete = (id: number) => {
    setMilestones(ms => ms.map(m => m.id === id ? { ...m, completed: true } : m));
    generateMutation.mutate(id);
  };

  const rows = letters.length ? letters : SAMPLE_LETTERS;

  const printLetter = (letter: any) => {
    const html = `<html><body style="font-family:Arial;padding:40px">
      <h2>DEMAND LETTER</h2>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <p>To: <strong>${letter.buyer}</strong></p>
      <p>Unit: <strong>${letter.unit}</strong></p>
      <p>Milestone: <strong>${letter.milestone}</strong></p>
      <p>Amount Due: <strong>₹${Number(letter.amount).toLocaleString()}</strong></p>
      <p>Due Date: <strong>${letter.due_date}</strong></p>
      <br/><p>Authorised Signatory</p></body></html>`;
    const w = window.open("", "_blank"); if (w) { w.document.write(html); w.print(); }
  };

  const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Paid: "outline", Pending: "secondary", Overdue: "destructive",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Demand Letter Generator</h1>

      {/* Milestone List */}
      <Card>
        <CardHeader><CardTitle>Construction Milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between border rounded p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${m.completed ? "bg-green-500 text-white" : "bg-muted"}`}>
                    {m.completed ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.demand_pct}% payment due · {m.pct}% construction</div>
                  </div>
                </div>
                {!m.completed ? (
                  <Button size="sm" onClick={() => markComplete(m.id)}>
                    Mark Complete & Generate Letters
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-green-600">Completed</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Letters Table */}
      <Card>
        <CardHeader><CardTitle>Demand Letters</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.buyer}</TableCell>
                  <TableCell>{l.unit}</TableCell>
                  <TableCell>{l.milestone}</TableCell>
                  <TableCell>₹{Number(l.amount).toLocaleString()}</TableCell>
                  <TableCell>{l.due_date}</TableCell>
                  <TableCell><Badge variant={STATUS_BADGE[l.status]}>{l.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Download PDF" onClick={() => window.open(`/api/real-estate/demand-letters/${l.id}/pdf`, "_blank")}><Download className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => printLetter(l)}><Printer className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => alert(`Sent to ${l.buyer}`)}><Send className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => alert("Email sent to all buyers")}>
              <Send className="w-4 h-4 mr-2" />Bulk Email
            </Button>
            <Button variant="outline" onClick={() => alert("SMS sent to all buyers")}>
              <Send className="w-4 h-4 mr-2" />Bulk SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
