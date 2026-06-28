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

function elapsed(ts: string) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function RestaurantKitchenPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: kots = [] } = useQuery({
    queryKey: ["restaurant-kots"],
    queryFn: () => api("GET", "/api/restaurant/shifts"),
    refetchInterval: 15000
  });

  const markReady = useMutation({
    mutationFn: ({ kotId, itemId }: { kotId: number; itemId: number }) =>
      api("PUT", `/api/restaurant/kot/${kotId}/items/${itemId}/status`, { status: "ready" }),
    onSuccess: () => { toast({ title: "Item marked ready" }); qc.invalidateQueries({ queryKey: ["restaurant-kots"] }); }
  });

  const kotList: any[] = Array.isArray(kots) ? kots : (kots as any)?.kots || [];

  const timeColor = (mins: number) => mins < 5 ? "border-green-400 bg-green-50" : mins < 10 ? "border-yellow-400 bg-yellow-50" : "border-red-400 bg-red-50";
  const timeBadge = (mins: number): "default" | "secondary" | "destructive" => mins < 5 ? "default" : mins < 10 ? "secondary" : "destructive";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Kitchen Display System</h1>
      {kotList.length === 0 ? (
        <div className="text-center text-gray-500 py-20 text-lg">No active KOTs</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {kotList.map((kot: any) => {
            const mins = elapsed(kot.created_at || kot.time || new Date().toISOString());
            return (
              <Card key={kot.id} className={`border-2 ${timeColor(mins)}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle>Table {kot.table_number || kot.table}</CardTitle>
                    <Badge variant={timeBadge(mins)}>{mins}m ago</Badge>
                  </div>
                  <div className="text-xs text-gray-500">KOT #{kot.kot_number || kot.id}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(kot.items || []).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center border rounded p-2">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">Qty: {item.quantity || item.qty}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.status === "ready" ? "default" : "secondary"}>{item.status || "pending"}</Badge>
                          {item.status !== "ready" && (
                            <Button size="sm" onClick={() => markReady.mutate({ kotId: kot.id, itemId: item.id })}>Ready</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
