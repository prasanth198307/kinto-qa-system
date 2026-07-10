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
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const today = new Date().toISOString().split("T")[0];
const UNITS = ["kg", "g", "L", "ml", "pcs", "nos"];
const WASTE_REASONS = ["overcooked", "expired", "dropped", "spoiled", "other"];
const REASON_COLORS: Record<string, string> = {
  overcooked: "bg-orange-100 text-orange-800",
  expired: "bg-red-100 text-red-800",
  dropped: "bg-yellow-100 text-yellow-800",
  spoiled: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-600",
};

export default function RestaurantInventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"recipes" | "wastage" | "stock">("recipes");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  // Recipe form
  const [recipeForm, setRecipeForm] = useState({ menu_item_id: "", ingredient_name: "", raw_material_id: "", quantity: "", unit: "kg", cost: "" });
  const [editRecipeId, setEditRecipeId] = useState<number | null>(null);
  const [rmSearch, setRmSearch] = useState("");

  // Wastage form
  const [wastageForm, setWastageForm] = useState({ item_name: "", quantity: "", unit: "kg", cost_per_unit: "", reason: "other", waste_date: today, recorded_by: "" });

  // Stock deduct form
  const [stockForm, setStockForm] = useState({ outlet_id: "", ingredient_name: "", quantity: "", unit: "kg", reason: "manual" });

  const { data: recipes = [] } = useQuery({
    queryKey: ["/api/restaurant/recipes"],
    queryFn: () => api("GET", "/api/restaurant/recipes"),
    enabled: tab === "recipes",
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/restaurant/menu-items"],
    queryFn: () => api("GET", "/api/restaurant/menu-items"),
    enabled: tab === "recipes",
  });

  const { data: wastage = [] } = useQuery({
    queryKey: ["/api/restaurant/wastage"],
    queryFn: () => api("GET", "/api/restaurant/wastage"),
    enabled: tab === "wastage",
  });

  const { data: wastageSummary } = useQuery({
    queryKey: ["/api/restaurant/wastage/summary"],
    queryFn: () => api("GET", "/api/restaurant/wastage/summary"),
    enabled: tab === "wastage" || tab === "stock",
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
    enabled: tab === "stock",
  });

  // Low stock query — component level so it's always available in stock tab
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['/api/restaurant/stock/low-stock'],
    queryFn: () => api("GET", "/api/restaurant/stock/low-stock"),
    enabled: tab === "stock",
    refetchInterval: tab === "stock" ? 60000 : false,
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["/api/raw-materials"],
    queryFn: () => api("GET", "/api/raw-materials"),
  });
  const filteredRm = (rawMaterials as any[]).filter((rm: any) =>
    !rmSearch || (rm.name || rm.materialName || "").toLowerCase().includes(rmSearch.toLowerCase())
  );

  const selectRawMaterial = (rm: any) => {
    setRecipeForm(f => ({
      ...f,
      raw_material_id: String(rm.id),
      ingredient_name: rm.name || rm.materialName || "",
      unit: rm.unit || rm.baseUnit || "kg",
      cost: rm.cost_per_unit || rm.unitCost ? String(rm.cost_per_unit || rm.unitCost) : f.cost,
    }));
    setRmSearch("");
  };

  const invalidateRecipes = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] });
  const invalidateWastage = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/wastage"] });

  const recipeMut = useMutation({
    mutationFn: (data: any) => editRecipeId
      ? api("PUT", `/api/restaurant/recipes/${editRecipeId}`, data)
      : api("POST", "/api/restaurant/recipes", data),
    onSuccess: () => { toast({ title: editRecipeId ? "Recipe updated" : "Ingredient added" }); invalidateRecipes(); resetRecipeForm(); },
    onError: () => toast({ title: "Error saving recipe", variant: "destructive" }),
  });

  const deleteRecipeMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/recipes/${id}`),
    onSuccess: () => { toast({ title: "Ingredient removed" }); invalidateRecipes(); },
  });

  const wastageMut = useMutation({
    mutationFn: (data: any) => api("POST", "/api/restaurant/wastage", data),
    onSuccess: () => { toast({ title: "Wastage recorded" }); invalidateWastage(); resetWastageForm(); },
    onError: () => toast({ title: "Error recording wastage", variant: "destructive" }),
  });

  const stockMut = useMutation({
    mutationFn: (data: any) => api("POST", "/api/restaurant/stock/deduct", data),
    onSuccess: () => { toast({ title: "Stock deducted" }); },
    onError: () => toast({ title: "Error deducting stock", variant: "destructive" }),
  });

  const resetRecipeForm = () => { setRecipeForm({ menu_item_id: "", ingredient_name: "", raw_material_id: "", quantity: "", unit: "kg", cost: "" }); setEditRecipeId(null); setRmSearch(""); };
  const resetWastageForm = () => { setWastageForm({ item_name: "", quantity: "", unit: "kg", cost_per_unit: "", reason: "other", waste_date: today, recorded_by: "" }); };

  // Group recipes by menu_item_id
  const recipesByItem: Record<string, any[]> = {};
  (recipes as any[]).forEach((r: any) => {
    const key = r.menu_item_id || "unassigned";
    if (!recipesByItem[key]) recipesByItem[key] = [];
    recipesByItem[key].push(r);
  });

  const getItemCost = (ingredients: any[]) => ingredients.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.cost) || 0), 0);
  const getMenuItemPrice = (id: string) => menuItems.find((m: any) => String(m.id) === String(id))?.price || 0;
  const getFoodCostPct = (cost: number, price: number) => price > 0 ? (cost / price) * 100 : 0;
  const foodCostBadge = (pct: number) => pct < 30 ? "bg-green-100 text-green-800" : pct < 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  const wastageToday = (wastage as any[]).filter(w => w.waste_date?.split("T")[0] === today).reduce((s, w) => s + (w.total_cost || 0), 0);
  const wastageWeek = (wastage as any[]).filter(w => {
    const d = new Date(w.waste_date || w.created_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  }).reduce((s, w) => s + (w.total_cost || 0), 0);
  const wastageMonth = (wastage as any[]).reduce((s, w) => s + (w.total_cost || 0), 0);
  const topWasted = (wastageSummary as any[])?.sort((a, b) => b.total_cost - a.total_cost)?.[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          {(["recipes", "wastage", "stock"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {t === "recipes" ? "Recipes" : t === "wastage" ? "Food Wastage" : "Stock Log"}
            </Button>
          ))}
        </div>
      </div>

      {tab === "recipes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Recipe Ingredient</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3 items-end">
                <div><label className="text-sm font-medium">Menu Item</label>
                  <Select value={recipeForm.menu_item_id} onValueChange={v => setRecipeForm(f => ({ ...f, menu_item_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>{menuItems.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.item_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="relative"><label className="text-sm font-medium">Ingredient (Raw Material)</label>
                  <Input
                    value={recipeForm.raw_material_id ? recipeForm.ingredient_name : rmSearch}
                    onChange={e => { setRmSearch(e.target.value); setRecipeForm(f => ({ ...f, raw_material_id: "", ingredient_name: e.target.value })); }}
                    placeholder="Search raw materials..."
                  />
                  {rmSearch && filteredRm.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded shadow max-h-44 overflow-y-auto">
                      {filteredRm.slice(0, 15).map((rm: any) => (
                        <div key={rm.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between" onClick={() => selectRawMaterial(rm)}>
                          <span className="font-medium">{rm.name || rm.materialName}</span>
                          <span className="text-gray-400">{rm.unit || rm.baseUnit}{rm.cost_per_unit ? ` · ₹${rm.cost_per_unit}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {recipeForm.raw_material_id && (
                    <div className="text-xs text-green-600 mt-1">✓ Linked to raw material ID: {recipeForm.raw_material_id} <button className="text-red-400 ml-1" onClick={() => setRecipeForm(f => ({ ...f, raw_material_id: "", ingredient_name: "" }))}>×</button></div>
                  )}
                </div>
                <div><label className="text-sm font-medium">Qty</label>
                  <Input type="number" value={recipeForm.quantity} onChange={e => setRecipeForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="text-sm font-medium">Unit</label>
                  <Select value={recipeForm.unit} onValueChange={v => setRecipeForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><label className="text-sm font-medium">Cost/unit (₹)</label>
                  <Input type="number" value={recipeForm.cost} onChange={e => setRecipeForm(f => ({ ...f, cost: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={() => recipeMut.mutate({ ...recipeForm, quantity: parseFloat(recipeForm.quantity), cost: parseFloat(recipeForm.cost), raw_material_id: recipeForm.raw_material_id || null })} disabled={!recipeForm.menu_item_id || !recipeForm.ingredient_name || recipeMut.isPending}>
                  {recipeMut.isPending ? "Saving..." : editRecipeId ? "Update" : "Add Ingredient"}
                </Button>
                {editRecipeId && <Button variant="outline" onClick={resetRecipeForm}>Cancel</Button>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {Object.entries(recipesByItem).map(([itemId, ingredients]) => {
              const item = menuItems.find((m: any) => String(m.id) === itemId);
              const cost = getItemCost(ingredients);
              const price = getMenuItemPrice(itemId);
              const pct = getFoodCostPct(cost, price);
              return (
                <Card key={itemId}>
                  <CardHeader className="cursor-pointer py-3" onClick={() => setExpandedItem(expandedItem === parseInt(itemId) ? null : parseInt(itemId))}>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">{item?.item_name || `Item #${itemId}`}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Cost: {fmt(cost)}</span>
                        {price > 0 && <span className={`px-2 py-0.5 rounded text-xs ${foodCostBadge(pct)}`}>Food Cost {pct.toFixed(1)}%</span>}
                        <span className="text-gray-400">{expandedItem === parseInt(itemId) ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedItem === parseInt(itemId) && (
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Cost/Unit</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {ingredients.map((ing: any) => (
                            <TableRow key={ing.id}>
                              <TableCell>{ing.ingredient_name}</TableCell>
                              <TableCell>{ing.quantity}</TableCell>
                              <TableCell>{ing.unit}</TableCell>
                              <TableCell>{fmt(ing.cost)}</TableCell>
                              <TableCell>{fmt((parseFloat(ing.quantity) || 0) * (parseFloat(ing.cost) || 0))}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => { setRecipeForm({ menu_item_id: String(ing.menu_item_id), ingredient_name: ing.ingredient_name, raw_material_id: String(ing.raw_material_id || ""), quantity: String(ing.quantity), unit: ing.unit, cost: String(ing.cost) }); setEditRecipeId(ing.id); setRmSearch(""); }}>Edit</Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Remove this ingredient?")) deleteRecipeMut.mutate(ing.id); }}>Del</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {Object.keys(recipesByItem).length === 0 && <p className="text-center text-gray-400 py-8">No recipes defined yet. Add ingredients above.</p>}
          </div>
        </div>
      )}

      {tab === "wastage" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Today's Waste", value: fmt(wastageToday) },
              { label: "This Week", value: fmt(wastageWeek) },
              { label: "This Month", value: fmt(wastageMonth) },
              { label: "Top Wasted", value: topWasted?.reason || "—" },
            ].map(c => <Card key={c.label}><CardContent className="pt-4"><p className="text-sm text-gray-500">{c.label}</p><p className="text-xl font-bold">{c.value}</p></CardContent></Card>)}
          </div>

          <Card>
            <CardHeader><CardTitle>Record Wastage</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">Item Name</label>
                  <Input value={wastageForm.item_name} onChange={e => setWastageForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Item wasted" /></div>
                <div><label className="text-sm font-medium">Quantity</label>
                  <Input type="number" value={wastageForm.quantity} onChange={e => setWastageForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="text-sm font-medium">Unit</label>
                  <Select value={wastageForm.unit} onValueChange={v => setWastageForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><label className="text-sm font-medium">Cost/Unit (₹)</label>
                  <Input type="number" value={wastageForm.cost_per_unit} onChange={e => setWastageForm(f => ({ ...f, cost_per_unit: e.target.value }))} /></div>
                <div><label className="text-sm font-medium">Reason</label>
                  <Select value={wastageForm.reason} onValueChange={v => setWastageForm(f => ({ ...f, reason: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WASTE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><label className="text-sm font-medium">Date</label>
                  <Input type="date" value={wastageForm.waste_date} onChange={e => setWastageForm(f => ({ ...f, waste_date: e.target.value }))} /></div>
                <div><label className="text-sm font-medium">Recorded By</label>
                  <Input value={wastageForm.recorded_by} onChange={e => setWastageForm(f => ({ ...f, recorded_by: e.target.value }))} /></div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {wastageForm.quantity && wastageForm.cost_per_unit && (
                  <span className="text-sm text-gray-600">Total: {fmt(parseFloat(wastageForm.quantity) * parseFloat(wastageForm.cost_per_unit))}</span>
                )}
                <Button onClick={() => wastageMut.mutate({ ...wastageForm, quantity: parseFloat(wastageForm.quantity), cost_per_unit: parseFloat(wastageForm.cost_per_unit) })}
                  disabled={!wastageForm.item_name || !wastageForm.quantity || wastageMut.isPending}>
                  {wastageMut.isPending ? "Recording..." : "Record Wastage"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Wastage Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Cost/Unit</TableHead><TableHead>Total Cost</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(wastage as any[]).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-gray-400">No wastage records</TableCell></TableRow>
                  ) : (wastage as any[]).map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>{w.waste_date?.split("T")[0]}</TableCell>
                      <TableCell>{w.item_name}</TableCell>
                      <TableCell>{w.quantity}</TableCell>
                      <TableCell>{w.unit}</TableCell>
                      <TableCell>{fmt(w.cost_per_unit)}</TableCell>
                      <TableCell>{fmt(w.total_cost || (w.quantity * w.cost_per_unit))}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded text-xs ${REASON_COLORS[w.reason] || "bg-gray-100"}`}>{w.reason}</span></TableCell>
                      <TableCell>{w.recorded_by || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {wastageSummary && (
            <Card>
              <CardHeader><CardTitle>Wastage by Reason</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Reason</TableHead><TableHead>Count</TableHead><TableHead>Total Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(wastageSummary as any[]).map((s: any) => (
                      <TableRow key={s.reason}>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs ${REASON_COLORS[s.reason] || "bg-gray-100"}`}>{s.reason}</span></TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell>{fmt(s.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "stock" && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm text-blue-800">
              Stock is automatically deducted when payments are recorded. Use the form below for manual corrections only.
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          {(lowStockItems as any[]).filter((i: any) => i.is_low).length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 font-semibold">⚠️ Low Stock Alerts ({(lowStockItems as any[]).filter((i: any) => i.is_low).length} items)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(lowStockItems as any[]).filter((i: any) => i.is_low).map((item: any, idx: number) => (
                  <div key={idx} className="bg-white border border-red-100 rounded p-2 text-sm">
                    <div className="font-medium text-red-700">{item.ingredient_name}</div>
                    <div className="text-xs text-gray-500">Used: {item.total_deducted} {item.unit}</div>
                    <div className="text-xs text-orange-500">Alert: {item.alert}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full stock usage table */}
          {(lowStockItems as any[]).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Stock Usage</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Total Used</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(lowStockItems as any[]).map((item: any, idx: number) => (
                      <TableRow key={idx} className={item.is_low ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{item.ingredient_name}</TableCell>
                        <TableCell>{item.total_deducted}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.last_used ? new Date(item.last_used).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge className={item.is_low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                            {item.alert}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {wastageSummary && (
            <Card>
              <CardHeader><CardTitle>Stock Deduction Summary by Reason</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Reason</TableHead><TableHead>Occurrences</TableHead><TableHead>Total Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(wastageSummary as any[]).map((s: any) => (
                      <TableRow key={s.reason}>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs ${REASON_COLORS[s.reason] || "bg-gray-100"}`}>{s.reason}</span></TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell>{fmt(s.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Manual Stock Deduction</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Outlet</label>
                  <Select value={stockForm.outlet_id} onValueChange={v => setStockForm(f => ({ ...f, outlet_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                    <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><label className="text-sm font-medium">Ingredient Name</label>
                  <Input value={stockForm.ingredient_name} onChange={e => setStockForm(f => ({ ...f, ingredient_name: e.target.value }))} placeholder="Ingredient to deduct" /></div>
                <div><label className="text-sm font-medium">Quantity</label>
                  <Input type="number" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="text-sm font-medium">Unit</label>
                  <Select value={stockForm.unit} onValueChange={v => setStockForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="col-span-2"><label className="text-sm font-medium">Reason</label>
                  <Input value={stockForm.reason} onChange={e => setStockForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for manual deduction" /></div>
              </div>
              <Button className="mt-3" onClick={() => stockMut.mutate({ outlet_id: stockForm.outlet_id, items: [{ ingredient_name: stockForm.ingredient_name, quantity: parseFloat(stockForm.quantity), unit: stockForm.unit }], kot_id: null })}
                disabled={!stockForm.ingredient_name || !stockForm.quantity || stockMut.isPending}>
                {stockMut.isPending ? "Deducting..." : "Deduct Stock"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
