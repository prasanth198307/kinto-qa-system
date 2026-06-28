import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STAGES = ["sowing","germination","vegetative","flowering","maturity","harvest"];

export default function AgricultureCropsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ farmer_id: "", crop_name: "", variety: "", area_acres: "", sowing_date: "", expected_harvest_date: "" });

  const { data: crops = [] } = useQuery({ queryKey: ["/api/agriculture/crops"], queryFn: () => api("GET", "/api/agriculture/crops") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/agriculture/crops", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/crops"] }); setShowForm(false); toast({ title: "Crop added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: any) => api("POST", `/api/agriculture/crops/${id}/stage`, { growth_stage: stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/agriculture/crops"] }); toast({ title: "Stage updated" }); },
  });

  const stageColor: Record<string,string> = { sowing: "secondary", germination: "outline", vegetative: "default", flowering: "default", maturity: "default", harvest: "default" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Crop Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Crop</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Crop</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {["farmer_id","crop_name","variety","area_acres","sowing_date","expected_harvest_date"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input type={k.includes("date") ? "date" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Crops</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead><TableHead>Variety</TableHead><TableHead>Farmer</TableHead>
                <TableHead>Area (Acres)</TableHead><TableHead>Sowing</TableHead><TableHead>Harvest</TableHead>
                <TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crops.map((c: any) => {
                const nextStage = STAGES[STAGES.indexOf(c.growth_stage) + 1];
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.crop_name}</TableCell>
                    <TableCell>{c.variety}</TableCell>
                    <TableCell>{c.farmer_name || c.member_name}</TableCell>
                    <TableCell>{fmt(c.area_acres)}</TableCell>
                    <TableCell>{c.sowing_date}</TableCell>
                    <TableCell>{c.expected_harvest || c.expected_harvest_date}</TableCell>
                    <TableCell><Badge variant={(stageColor[c.growth_stage] as any) || "secondary"}>{c.growth_stage}</Badge></TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell>
                      {nextStage && <Button size="sm" variant="outline" onClick={() => stageMutation.mutate({ id: c.id, stage: nextStage })}>→ {nextStage}</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {crops.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No crops found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
