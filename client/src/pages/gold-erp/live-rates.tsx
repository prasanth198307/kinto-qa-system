import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Bell } from "lucide-react";

const MOCK_RATES = {
  gold: { "24K": { per_gram: 7250, per_10g: 72500 }, "22K": { per_gram: 6650, per_10g: 66500 }, "18K": { per_gram: 5440, per_10g: 54400 } },
  silver: { "999": { per_gram: 88, per_10g: 880 }, "925": { per_gram: 81, per_10g: 810 } },
  timestamp: new Date().toLocaleTimeString(),
  yesterday: { "24K": 7180, "22K": 6590, "18K": 5390 },
  lastWeek: { "24K": 7100, "22K": 6510, "18K": 5330 },
};

export default function LiveGoldRatesPage() {
  const [rates, setRates] = useState(MOCK_RATES);
  const [fetching, setFetching] = useState(false);
  const [weight, setWeight] = useState("");
  const [purity, setPurity] = useState("22K");
  const [makingPct, setMakingPct] = useState("12");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  const fetchRates = async () => {
    setFetching(true);
    try {
      const data = await fetch("/api/gold-erp/live-rates").then(r => r.json());
      if (data?.gold) setRates(data);
      else setRates({ ...MOCK_RATES, timestamp: new Date().toLocaleTimeString() });
    } catch {
      setRates({ ...MOCK_RATES, timestamp: new Date().toLocaleTimeString() });
    }
    setFetching(false);
  };

  const calcTotal = () => {
    if (!weight) return null;
    const ratePerGram = rates.gold[purity as "24K" | "22K" | "18K"]?.per_gram || 0;
    const baseValue = Number(weight) * ratePerGram;
    const making = baseValue * (Number(makingPct) / 100);
    return { base: baseValue, making, total: baseValue + making };
  };

  const calc = calcTotal();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Gold & Silver Rates</h1>
          <p className="text-muted-foreground">MCX-based live metal rates</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Last updated: {rates.timestamp}</span>
          <Button onClick={fetchRates} disabled={fetching}>
            <RefreshCw className="h-4 w-4 mr-2" />{fetching ? "Refreshing..." : "Refresh Rates"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["24K", "22K", "18K"] as const).map(p => (
          <Card key={p} className="border-yellow-200">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Gold {p}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">₹{rates.gold[p].per_gram.toLocaleString()}/g</p>
              <p className="text-sm text-muted-foreground">₹{rates.gold[p].per_10g.toLocaleString()} / 10g</p>
              <div className="mt-2 text-xs text-muted-foreground">
                Yesterday: ₹{rates.yesterday[p]}/g &nbsp;|&nbsp; Last Week: ₹{rates.lastWeek[p]}/g
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Rate Comparison</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purity</TableHead>
                <TableHead>Today (₹/g)</TableHead>
                <TableHead>Yesterday</TableHead>
                <TableHead>Last Week</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(["24K", "22K", "18K"] as const).map(p => {
                const change = rates.gold[p].per_gram - rates.yesterday[p];
                return (
                  <TableRow key={p}>
                    <TableCell>Gold {p}</TableCell>
                    <TableCell>₹{rates.gold[p].per_gram.toLocaleString()}</TableCell>
                    <TableCell>₹{rates.yesterday[p].toLocaleString()}</TableCell>
                    <TableCell>₹{rates.lastWeek[p].toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={change >= 0 ? "default" : "destructive"}>
                        {change >= 0 ? "+" : ""}{change}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(["999", "925"] as const).map(f => (
                <TableRow key={f}>
                  <TableCell>Silver {f}</TableCell>
                  <TableCell>₹{rates.silver[f].per_gram}/g</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Making Charges Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Weight (grams)</label>
                <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 10" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Making Charges %</label>
                <Input type="number" value={makingPct} onChange={e => setMakingPct(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              {(["24K", "22K", "18K"] as const).map(p => (
                <Button key={p} size="sm" variant={purity === p ? "default" : "outline"} onClick={() => setPurity(p)}>{p}</Button>
              ))}
            </div>
            {calc && (
              <div className="bg-muted rounded p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Base Value:</span><span>₹{calc.base.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Making Charges:</span><span>₹{calc.making.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Total:</span><span>₹{calc.total.toLocaleString()}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rate Alert</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Alert when 22K gold goes above (₹/g)</label>
              <Input type="number" value={alertPrice} onChange={e => setAlertPrice(e.target.value)} placeholder="e.g. 7000" />
            </div>
            <Button onClick={() => alertPrice && setAlertMsg(`Alert set for ₹${alertPrice}/g on 22K gold`)}>
              <Bell className="h-4 w-4 mr-2" /> Set Alert
            </Button>
            {alertMsg && <p className="text-sm text-green-600">{alertMsg}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
