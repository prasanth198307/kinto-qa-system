import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const WEIGHTS = [
  { key: "engagement", label: "Engagement", weight: 30, color: "#6366f1" },
  { key: "company_size", label: "Company Size", weight: 20, color: "#8b5cf6" },
  { key: "industry_fit", label: "Industry Fit", weight: 25, color: "#ec4899" },
  { key: "behavior", label: "Behavior", weight: 25, color: "#f59e0b" },
];

const SAMPLE_LEADS = [
  { id: 1, name: "Infosys Ltd", rep: "Suresh", engagement: 80, company_size: 90, industry_fit: 85, behavior: 70 },
  { id: 2, name: "TCS Mumbai", rep: "Anita", engagement: 60, company_size: 70, industry_fit: 55, behavior: 65 },
  { id: 3, name: "Startup XYZ", rep: null, engagement: 30, company_size: 20, industry_fit: 40, behavior: 35 },
  { id: 4, name: "Wipro Tech", rep: "Rajesh", engagement: 75, company_size: 85, industry_fit: 80, behavior: 78 },
  { id: 5, name: "HCL Services", rep: "Meera", engagement: 50, company_size: 60, industry_fit: 45, behavior: 55 },
];

const REPS = ["Suresh", "Anita", "Rajesh", "Meera", "Vikram"];

function computeScore(lead: any) {
  return Math.round(
    (lead.engagement * 0.30) + (lead.company_size * 0.20) + (lead.industry_fit * 0.25) + (lead.behavior * 0.25)
  );
}

function scoreColor(score: number) {
  if (score >= 70) return "destructive";
  if (score >= 40) return "default";
  return "secondary";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-red-100 dark:bg-red-950";
  if (score >= 40) return "bg-yellow-100 dark:bg-yellow-950";
  return "bg-blue-100 dark:bg-blue-950";
}

export default function LeadScoringPage() {
  const [weights, setWeights] = useState({ engagement: 30, company_size: 20, industry_fit: 25, behavior: 25 });
  const [tooltip, setTooltip] = useState<number | null>(null);

  const { data: apiLeads = [] } = useQuery<any[]>({
    queryKey: ["crm-lead-scores"],
    queryFn: () => api("GET", "/api/crm/lead-scores").catch(() => []),
  });

  const computeMutation = useMutation({
    mutationFn: () => api("POST", "/api/crm/compute-scores", { weights }),
  });

  const leads = apiLeads.length ? apiLeads : SAMPLE_LEADS;
  const scored = leads.map(l => ({ ...l, score: computeScore(l) })).sort((a, b) => b.score - a.score);
  const hotLeads = scored.filter(l => l.score >= 70 && !l.rep);

  const [repIdx, setRepIdx] = useState(0);
  const [assigned, setAssigned] = useState<Record<number, string>>({});

  const autoAssign = () => {
    const newAssigned = { ...assigned };
    let idx = repIdx;
    hotLeads.forEach(l => {
      newAssigned[l.id] = REPS[idx % REPS.length];
      idx++;
    });
    setAssigned(newAssigned);
    setRepIdx(idx);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead Scoring</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => computeMutation.mutate()}>Recompute Scores</Button>
          <Button onClick={autoAssign}><Zap className="w-4 h-4 mr-1" />Auto-Assign Hot Leads</Button>
        </div>
      </div>

      {/* Weight Config */}
      <Card>
        <CardHeader><CardTitle>Score Model Weights</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {WEIGHTS.map(w => (
              <div key={w.key}>
                <Label>{w.label} (%)</Label>
                <Input type="number" min={0} max={100}
                  value={weights[w.key as keyof typeof weights]}
                  onChange={e => setWeights(wt => ({ ...wt, [w.key]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Total: {Object.values(weights).reduce((a, b) => a + b, 0)}% (should equal 100%)
          </div>
        </CardContent>
      </Card>

      {/* Top 10 */}
      <Card>
        <CardHeader><CardTitle>Lead Scores (Ranked)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Heat</TableHead>
                <TableHead>Score Bar</TableHead>
                <TableHead>Breakdown</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scored.slice(0, 10).map((lead, i) => (
                <TableRow key={lead.id} className={scoreBg(lead.score)}>
                  <TableCell className="font-bold">#{i + 1}</TableCell>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="font-bold text-lg">{lead.score}</TableCell>
                  <TableCell>
                    <Badge variant={scoreColor(lead.score)}>
                      {lead.score >= 70 ? "Hot" : lead.score >= 40 ? "Warm" : "Cold"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${lead.score}%` }} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <button className="text-xs text-primary underline"
                      onMouseEnter={() => setTooltip(lead.id)} onMouseLeave={() => setTooltip(null)}>
                      View
                    </button>
                    {tooltip === lead.id && (
                      <div className="absolute z-10 bg-card border rounded p-2 text-xs shadow-lg w-48 mt-1">
                        {WEIGHTS.map(w => (
                          <div key={w.key} className="flex justify-between">
                            <span>{w.label}:</span>
                            <span>{Math.round(lead[w.key] * w.weight / 100)} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{assigned[lead.id] || lead.rep || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
