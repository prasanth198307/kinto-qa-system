import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Lock } from "lucide-react";

const fmt = (v: any) => {
  const n = Number(v);
  return isNaN(n) || v === null || v === "" ? String(v ?? "—") : n.toLocaleString("en-IN");
};

export default function PublicDashboardPage() {
  const [, params] = useRoute("/analytics/public/:token");
  const token = params?.token || "";

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["public-dashboard", token],
    queryFn: async () => {
      const r = await fetch(`/api/analytics-public/dashboard/${token}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Failed to load");
      return d;
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading dashboard...</div>;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="font-semibold">{(error as Error).message}</div>
          <div className="text-sm text-muted-foreground">Ask the dashboard owner for a new share link.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">{data.name}</h1>
              {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Shared view · read-only{data.expires_at ? ` · expires ${String(data.expires_at).slice(0, 10)}` : ""}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {(data.reports || []).map((r: any) => (
            <Card key={r.id}>
              <CardHeader><CardTitle className="text-base">{r.data?.name || `Report #${r.id}`}</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-96 overflow-auto">
                {r.data?.error ? (
                  <div className="p-4 text-sm text-red-600">{r.data.error}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>{(r.data?.columns || []).map((c: string) => <TableHead key={c} className="text-xs uppercase">{c.replace(/_/g, " ")}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {(r.data?.rows || []).slice(0, 50).map((row: any, i: number) => (
                        <TableRow key={i}>
                          {(r.data?.columns || []).map((c: string) => <TableCell key={c} className="text-sm">{fmt(row[c])}</TableCell>)}
                        </TableRow>
                      ))}
                      {!(r.data?.rows?.length) && <TableRow><TableCell className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
          {!(data.reports?.length) && <div className="col-span-2 text-center text-muted-foreground py-12">This dashboard has no widgets yet.</div>}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">Powered by SwachERP Analytics Studio</div>
      </div>
    </div>
  );
}
