import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play } from "lucide-react";

export default function MrpRunPage() {
  const { toast } = useToast();
  const [plannedOrders, setPlannedOrders] = useState<Record<string, unknown>[]>([]);
  const [exceptions, setExceptions] = useState<Record<string, unknown>[]>([]);

  const mrpMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/mrp/mrp/run", { horizon_days: 30 }),
    onSuccess: (d: unknown) => {
      const res = d as Record<string, unknown>;
      setPlannedOrders(Array.isArray(res?.planned_orders) ? res.planned_orders as Record<string, unknown>[] : []);
      setExceptions(Array.isArray(res?.exceptions) ? res.exceptions as Record<string, unknown>[] : []);
      toast({ title: "MRP run complete" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MRP Run</h1>
        <Button onClick={() => mrpMutation.mutate()} disabled={mrpMutation.isPending}>
          <Play className="h-3 w-3 mr-1" />Run MRP (30-day horizon)
        </Button>
      </div>

      {mrpMutation.isSuccess && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3">Planned Orders</h2>
            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>{["Item","Qty","Due Date","Type"].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {plannedOrders.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No planned orders</td></tr>}
                {plannedOrders.map((o, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-medium">{o.item as string}</td>
                    <td className="p-3">{o.qty as number}</td>
                    <td className="p-3">{o.due_date as string}</td>
                    <td className="p-3"><Badge variant="outline">{o.order_type as string}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {exceptions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Exceptions</h2>
              <div className="space-y-2">
                {exceptions.map((ex, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Badge variant="destructive">Exception</Badge>
                      <span className="text-sm">{ex.message as string}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!mrpMutation.isSuccess && !mrpMutation.isPending && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Click "Run MRP" to generate planned orders for the next 30 days.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
