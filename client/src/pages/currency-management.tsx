import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Globe, TrendingUp, Pencil } from "lucide-react";

const COMMON_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
];

function CurrenciesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", isBase: false });
  const { data: currencies = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/assets/currencies"] });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/assets/currencies/${editing.id}`, d)
      : apiRequest("POST", "/api/assets/currencies", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets/currencies"] }); toast({ title: editing ? "Currency updated" : "Currency added" }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/assets/currencies/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/assets/currencies"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setEditing(null); setForm({ code: "", name: "", symbol: "", isBase: false }); setDialogOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ code: c.code, name: c.name, symbol: c.symbol || "", isBase: c.is_base }); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} data-testid="button-new-currency"><Plus className="w-4 h-4 mr-1" />Add Currency</Button>
      </div>
      {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : currencies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><Globe className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No currencies configured. Add INR as base currency first.</p></div>
      ) : (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3">Code</th><th className="text-left p-3">Name</th><th className="text-left p-3">Symbol</th><th className="p-3">Base</th><th className="p-3"></th></tr></thead>
            <tbody>
              {(currencies as any[]).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 font-mono">{c.symbol || "—"}</td>
                  <td className="p-3 text-center">{c.is_base ? <Badge variant="default" className="text-xs">Base</Badge> : "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Currency" : "Add Currency"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quick Select</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {COMMON_CURRENCIES.map(c => (
                  <Button key={c.code} size="sm" variant="outline" className="text-xs" onClick={() => setForm(p => ({ ...p, code: c.code, name: c.name, symbol: c.symbol }))}>
                    {c.code}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code <span className="text-destructive">*</span></Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="USD" maxLength={3} /></div>
              <div><Label>Symbol</Label><Input value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="$" /></div>
            </div>
            <div><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="US Dollar" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isBase" checked={form.isBase} onChange={e => setForm(p => ({ ...p, isBase: e.target.checked }))} />
              <label htmlFor="isBase" className="text-sm">Set as base currency</label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.code || !form.name} data-testid="button-save-currency">
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExchangeRatesTab() {
  const { toast } = useToast();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>("");
  const [rate, setRate] = useState("");
  const [rateValue, setRateValue] = useState("");

  const { data: currencies = [] } = useQuery<any[]>({ queryKey: ["/api/assets/currencies"] });
  const { data: rates = [] } = useQuery<any[]>({
    queryKey: ["/api/assets/currencies", selectedCurrencyId, "rates"],
    enabled: !!selectedCurrencyId,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/assets/currencies/${selectedCurrencyId}/rates`, { rate, rateValue: parseFloat(rateValue) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets/currencies", selectedCurrencyId, "rates"] });
      toast({ title: "Exchange rate saved" });
      setRate(""); setRateValue("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const nonBase = (currencies as any[]).filter((c: any) => !c.is_base);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <Label>Currency</Label>
          <select className="w-full border rounded-md h-9 px-3 text-sm bg-background" value={selectedCurrencyId} onChange={e => setSelectedCurrencyId(e.target.value)}>
            <option value="">Select currency</option>
            {nonBase.map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </div>
        <div><Label>Date</Label><Input type="date" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div><Label>Rate (per base currency)</Label><Input type="number" step="0.0001" value={rateValue} onChange={e => setRateValue(e.target.value)} placeholder="e.g. 83.5" /></div>
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !selectedCurrencyId || !rate || !rateValue} data-testid="button-save-rate">
        <Plus className="w-4 h-4 mr-1" />{saveMutation.isPending ? "Saving..." : "Add Rate"}
      </Button>

      {selectedCurrencyId && (rates as any[]).length > 0 && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3">Date</th><th className="text-right p-3">Rate</th></tr></thead>
            <tbody>
              {(rates as any[]).map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{new Date(r.rate).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right font-mono">{r.rate_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}
      {!selectedCurrencyId && (
        <div className="text-center py-12 text-muted-foreground"><TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>Select a currency to view its exchange rates</p></div>
      )}
    </div>
  );
}

export default function CurrencyManagementPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Currency Management</h1>
        <p className="text-sm text-muted-foreground">Configure currencies and exchange rates for multi-currency transactions</p>
      </div>
      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies" data-testid="tab-currencies">Currencies</TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">Exchange Rates</TabsTrigger>
        </TabsList>
        <TabsContent value="currencies" className="mt-4"><CurrenciesTab /></TabsContent>
        <TabsContent value="rates" className="mt-4"><ExchangeRatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
