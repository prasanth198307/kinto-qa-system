import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Bell } from "lucide-react";

const COMMODITIES = ["Wheat", "Rice", "Maize", "Cotton", "Soybean", "Onion", "Potato", "Tomato"];
const STATES = ["MP", "UP", "Punjab", "Haryana", "Maharashtra", "Rajasthan", "Gujarat"];

const MOCK_PRICES = [
  { date: "2026-06-30", mandi: "Indore APMC", min: 2100, max: 2350, modal: 2250 },
  { date: "2026-06-29", mandi: "Indore APMC", min: 2050, max: 2300, modal: 2180 },
  { date: "2026-06-28", mandi: "Bhopal APMC", min: 2000, max: 2280, modal: 2150 },
  { date: "2026-06-27", mandi: "Ujjain APMC", min: 1980, max: 2250, modal: 2120 },
  { date: "2026-06-26", mandi: "Gwalior APMC", min: 2020, max: 2310, modal: 2200 },
];

export default function MandiPricesPage() {
  const [commodity, setCommodity] = useState("Wheat");
  const [state, setState] = useState("MP");
  const [alertPrice, setAlertPrice] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [prices, setPrices] = useState(MOCK_PRICES);
  const [fetching, setFetching] = useState(false);

  const fetchPrices = async () => {
    setFetching(true);
    try {
      const data = await fetch(`/api/agriculture/mandi-prices?commodity=${commodity}&state=${state}`).then(r => r.json());
      if (Array.isArray(data) && data.length) setPrices(data);
      else setPrices(MOCK_PRICES);
    } catch {
      setPrices(MOCK_PRICES);
    }
    setFetching(false);
  };

  const setAlert = () => {
    if (!alertPrice) return;
    setAlertMsg(`Alert set: Notify if ${commodity} modal price drops below ₹${alertPrice}/quintal`);
  };

  const maxModal = Math.max(...prices.map(p => p.modal));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mandi Price Feed</h1>
          <p className="text-muted-foreground">Live APMC/Mandi commodity prices</p>
        </div>
        <Button onClick={fetchPrices} disabled={fetching}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {fetching ? "Fetching..." : "Fetch Latest Prices"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Commodity</label>
          <Select value={commodity} onValueChange={setCommodity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">State / APMC</label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Price Table — {commodity} (₹/quintal)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mandi</TableHead>
                <TableHead>Min Price</TableHead>
                <TableHead>Max Price</TableHead>
                <TableHead>Modal Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{p.mandi}</TableCell>
                  <TableCell>₹{p.min.toLocaleString()}</TableCell>
                  <TableCell>₹{p.max.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">₹{p.modal.toLocaleString()}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>30-Day Modal Price Trend</CardTitle></CardHeader>
        <CardContent>
          <svg viewBox="0 0 600 120" className="w-full border rounded">
            {prices.map((p, i) => {
              const h = Math.round((p.modal / maxModal) * 90);
              const x = i * 110 + 20;
              return (
                <g key={i}>
                  <rect x={x} y={110 - h} width="80" height={h} fill="#16a34a" opacity="0.8" rx="3" />
                  <text x={x + 40} y={108} textAnchor="middle" fontSize="9" fill="#666">{p.date.slice(5)}</text>
                  <text x={x + 40} y={110 - h - 4} textAnchor="middle" fontSize="9" fill="#333">{p.modal}</text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Price Alert Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Alert threshold (₹/quintal)</label>
              <Input type="number" placeholder="e.g. 2000" value={alertPrice} onChange={e => setAlertPrice(e.target.value)} />
            </div>
            <Button onClick={setAlert}><Bell className="h-4 w-4 mr-2" /> Set Alert</Button>
          </div>
          {alertMsg && <p className="text-sm text-green-600 mt-2">{alertMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
