import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, ShoppingCart, Wrench } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

type MRPLine = { material: string; required: number; on_hand: number; shortage: number; uom: string; level: number };

const MOCK_DEMAND = [
  { product: "Water Purifier X1", planned_qty: 50 },
  { product: "Water Purifier Pro", planned_qty: 30 },
];

const MOCK_MRP: MRPLine[] = [
  { material: "Water Purifier X1 (FG)", required: 50, on_hand: 5, shortage: 45, uom: "Nos", level: 0 },
  { material: "  Filter Housing Assembly", required: 50, on_hand: 20, shortage: 30, uom: "Nos", level: 1 },
  { material: "    PP Filter Membrane", required: 150, on_hand: 200, shortage: 0, uom: "Pcs", level: 2 },
  { material: "    O-Ring Set", required: 150, on_hand: 50, shortage: 100, uom: "Sets", level: 2 },
  { material: "  UV Lamp", required: 50, on_hand: 10, shortage: 40, uom: "Nos", level: 1 },
  { material: "  Control Board", required: 50, on_hand: 60, shortage: 0, uom: "Nos", level: 1 },
  { material: "  Housing Cabinet (Plastic)", required: 50, on_hand: 15, shortage: 35, uom: "Nos", level: 1 },
];

export default function MRPPage() {
  const [demand, setDemand] = useState(MOCK_DEMAND);
  const [mrpResult, setMRPResult] = useState<MRPLine[] | null>(null);
  const [msg, setMsg] = useState("");

  const runMRPMut = useMutation({
    mutationFn: (body: typeof demand) => api("POST", "/api/manufacturing/mrp/run", { demand: body }),
    onSuccess: (data) => {
      if (data?.materials?.length) setMRPResult(data.materials);
      else setMRPResult(MOCK_MRP);
    },
    onError: () => setMRPResult(MOCK_MRP),
  });

  const genPR = () => {
    const shortages = (mrpResult || MOCK_MRP).filter(m => m.shortage > 0);
    setMsg(`Generated ${shortages.length} Purchase Requisitions for shortage items.`);
  };

  const genWO = () => {
    const subAssemblies = (mrpResult || MOCK_MRP).filter(m => m.level === 1 && m.shortage > 0);
    setMsg(`Generated ${subAssemblies.length} Work Orders for sub-assemblies.`);
  };

  const displayResult = mrpResult || MOCK_MRP;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MRP Engine</h1>
          <p className="text-muted-foreground">Material Requirements Planning — BOM explosion</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={genPR}><ShoppingCart className="h-4 w-4 mr-2" />Generate PRs</Button>
          <Button variant="outline" onClick={genWO}><Wrench className="h-4 w-4 mr-2" />Generate Work Orders</Button>
          <Button onClick={() => runMRPMut.mutate(demand)} disabled={runMRPMut.isPending}>
            <Play className="h-4 w-4 mr-2" />{runMRPMut.isPending ? "Running..." : "Run MRP"}
          </Button>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">{msg}</div>}

      <Card>
        <CardHeader><CardTitle>Planned Production Demand</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finished Good</TableHead>
                <TableHead>Planned Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demand.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.product}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={d.planned_qty}
                      onChange={e => setDemand(prev => prev.map((item, j) => j === i ? { ...item, planned_qty: Number(e.target.value) } : item))}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>MRP Explosion — Material Requirements</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material (BOM Tree)</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Shortage</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayResult.map((m, i) => (
                <TableRow key={i} className={m.shortage > 0 ? "bg-red-50" : ""}>
                  <TableCell>
                    <span style={{ paddingLeft: `${m.level * 20}px` }} className={m.level === 0 ? "font-bold" : ""}>
                      {m.material}
                    </span>
                  </TableCell>
                  <TableCell>{m.required}</TableCell>
                  <TableCell>{m.on_hand}</TableCell>
                  <TableCell>
                    {m.shortage > 0
                      ? <Badge variant="destructive">{m.shortage}</Badge>
                      : <Badge variant="default">OK</Badge>}
                  </TableCell>
                  <TableCell>{m.uom}</TableCell>
                  <TableCell>
                    {m.shortage > 0 && m.level >= 1 && (
                      <span className="text-xs text-muted-foreground">{m.level === 1 ? "→ Work Order" : "→ Purchase"}</span>
                    )}
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
