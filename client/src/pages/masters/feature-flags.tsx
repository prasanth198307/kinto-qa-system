import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function MastersFeatureFlagsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: flags = [] } = useQuery({ queryKey: ["/api/masters/feature-flags"], queryFn: () => api("GET", "/api/masters/feature-flags") });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => api("PUT", `/api/masters/feature-flags/${key}`, { enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/masters/feature-flags"] }); toast({ title: "Flag updated" }); },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Feature Flags</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Flag Key</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead>
              <TableHead>Updated At</TableHead><TableHead>Updated By</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(flags) && flags.map((f: any) => (
                <TableRow key={f.flag_key || f.id}>
                  <TableCell className="font-mono text-sm">{f.flag_key}</TableCell>
                  <TableCell>{f.description}</TableCell>
                  <TableCell><Badge variant={f.enabled ? "default" : "secondary"}>{f.enabled ? "Enabled" : "Disabled"}</Badge></TableCell>
                  <TableCell>{f.updated_at?.slice(0,16)}</TableCell>
                  <TableCell>{f.updated_by}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={f.enabled ? "destructive" : "default"}
                      onClick={() => toggleMutation.mutate({ key: f.flag_key, enabled: !f.enabled })}
                    >
                      {f.enabled ? "Disable" : "Enable"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
