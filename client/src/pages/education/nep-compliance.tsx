import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const NEP_INITIATIVES = [
  { id: "foundational_literacy", label: "Foundational Literacy & Numeracy", target: "Grades 1-3 100% reading ability" },
  { id: "multidisciplinary", label: "Multidisciplinary Education", target: "STEM + Arts + Humanities integration" },
  { id: "vocational", label: "Vocational Education", target: "Grade 6+ vocational modules" },
  { id: "mother_tongue", label: "Mother Tongue Medium", target: "Grade 1-5 instruction in mother tongue" },
  { id: "digital_infra", label: "Digital Infrastructure", target: "1 device per 2 students" },
  { id: "teacher_training", label: "Teacher Professional Development", target: "20 hrs/year per teacher" },
  { id: "holistic_assessment", label: "Holistic Assessment (360°)", target: "Portfolio-based student evaluation" },
  { id: "school_bags", label: "Reduced Curriculum Load", target: "No homework till Grade 2" },
];

const MOCK_ACTIVITY_LOG = [
  { date: "2026-06-15", initiative: "Foundational Literacy", action: "Launched reading corner in all classrooms", by: "Principal" },
  { date: "2026-06-10", initiative: "Vocational Education", action: "Enrolled 45 students in carpentry module", by: "VP Academics" },
  { date: "2026-05-28", initiative: "Teacher Training", action: "Completed 8hr digital literacy workshop", by: "IT Coordinator" },
];

export default function NEPCompliancePage() {
  const qc = useQueryClient();
  const { data: progress = {} } = useQuery({ queryKey: ["nep-compliance"], queryFn: () => api("GET", "/api/education/nep-compliance") });
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});

  const updateMut = useMutation({
    mutationFn: (body: Record<string, number>) => api("PUT", "/api/education/nep-compliance", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nep-compliance"] }),
  });

  const getProgress = (id: string) => localProgress[id] ?? (progress as Record<string, number>)[id] ?? 0;

  const overallScore = Math.round(NEP_INITIATIVES.reduce((s, n) => s + getProgress(n.id), 0) / NEP_INITIATIVES.length);

  const scoreColor = overallScore >= 75 ? "text-green-600" : overallScore >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NEP 2020 Compliance</h1>
          <p className="text-muted-foreground">National Education Policy implementation tracker</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">NEP Readiness Score</p>
          <p className={`text-4xl font-bold ${scoreColor}`}>{overallScore}%</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Implementation Progress by Initiative</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {NEP_INITIATIVES.map(n => {
              const val = getProgress(n.id);
              return (
                <div key={n.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.target}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={val}
                        onChange={e => setLocalProgress(p => ({ ...p, [n.id]: Number(e.target.value) }))}
                        className="w-20 h-8 text-sm"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${val >= 75 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="mt-4" onClick={() => updateMut.mutate(localProgress)}>Save Progress</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Initiative</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ACTIVITY_LOG.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.date}</TableCell>
                  <TableCell><Badge variant="outline">{l.initiative}</Badge></TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
