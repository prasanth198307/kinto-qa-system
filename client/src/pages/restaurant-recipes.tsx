import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const apiFetch = (u: string) => fetch(u, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const apiPost = (u: string, b: any) => fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const apiDelete = (u: string) => fetch(u, { method: "DELETE", credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });
const fmt = (n: any) => sym + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function costPctBadge(pct: number) {
  if (pct <= 0) return <Badge variant="outline" className="text-xs text-gray-400">No recipe</Badge>;
  if (pct < 30) return <Badge className="text-xs bg-green-100 text-green-800 border-green-300">{pct.toFixed(1)}%</Badge>;
  if (pct < 50) return <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">{pct.toFixed(1)}%</Badge>;
  return <Badge className="text-xs bg-red-100 text-red-800 border-red-300">{pct.toFixed(1)}%</Badge>;
}

// ── Food Cost Report Tab ────────────────────────────────────────────────────
function FoodCostReport() {
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/restaurant/recipes/food-cost-report?from=${from}&to=${to}`);
      setRows(Array.isArray(data) ? data : []);
    } catch { setRows([]); }
    setLoading(false);
  };

  const exportCSV = () => {
    const header = "Item,Qty Sold,Revenue,Food Cost,Gross Profit,Margin %";
    const body = rows.map(r => {
      const margin = Number(r.total_revenue) > 0 ? ((Number(r.total_revenue) - Number(r.total_food_cost)) / Number(r.total_revenue) * 100).toFixed(1) : "0";
      return `"${r.name}",${r.qty_sold},${r.total_revenue},${r.total_food_cost},${Number(r.total_revenue) - Number(r.total_food_cost)},${margin}`;
    }).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `food-cost-report-${from}-${to}.csv`; a.click();
  };

  const totRevenue = rows.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const totFoodCost = rows.reduce((s, r) => s + Number(r.total_food_cost || 0), 0);
  const totProfit = totRevenue - totFoodCost;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center bg-gray-50 p-3 rounded border">
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 h-8 text-xs" />
        <span className="text-gray-400 text-xs">to</span>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 h-8 text-xs" />
        <Button size="sm" className="h-8 text-xs" onClick={load} disabled={loading}>{loading ? "Loading..." : "Load Report"}</Button>
        {rows.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCSV}>⬇ Export CSV</Button>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", val: fmt(totRevenue), cls: "text-blue-700" },
              { label: "Total Food Cost", val: fmt(totFoodCost), cls: "text-red-600" },
              { label: "Gross Profit", val: fmt(totProfit), cls: totProfit >= 0 ? "text-green-700" : "text-red-700" },
              { label: "Avg Margin", val: totRevenue > 0 ? ((totProfit / totRevenue) * 100).toFixed(1) + "%" : "—", cls: "text-gray-700" },
            ].map(c => (
              <Card key={c.label}><CardContent className="pt-4">
                <div className="text-xs text-gray-500">{c.label}</div>
                <div className={`text-xl font-bold mt-1 ${c.cls}`}>{c.val}</div>
              </CardContent></Card>
            ))}
          </div>

          <div className="rounded border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Food Cost</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const profit = Number(r.total_revenue) - Number(r.total_food_cost);
                  const margin = Number(r.total_revenue) > 0 ? (profit / Number(r.total_revenue)) * 100 : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.qty_sold || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(r.total_revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{fmt(r.total_food_cost)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(profit)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${margin >= 60 ? "text-green-700" : margin >= 40 ? "text-amber-700" : "text-red-700"}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-bold bg-gray-50 border-t-2">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totRevenue)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{fmt(totFoodCost)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(totProfit)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {totRevenue > 0 ? ((totProfit / totRevenue) * 100).toFixed(1) + "%" : "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {rows.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-16">Select a date range and click Load Report</div>
      )}
    </div>
  );
}

// ── Recipe Editor ────────────────────────────────────────────────────────────
function RecipeEditor({ menuItem, recipe, onSaved }: { menuItem: any; recipe: any; onSaved: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [yieldQty, setYieldQty] = useState(String(recipe?.yield_qty || "1"));
  const [yieldUnit, setYieldUnit] = useState(recipe?.yield_unit || "portion");
  const [prepTime, setPrepTime] = useState(String(recipe?.prep_time_minutes || ""));
  const [notes, setNotes] = useState(recipe?.notes || "");
  const [ingName, setIngName] = useState("");
  const [ingQty, setIngQty] = useState("");
  const [ingUnit, setIngUnit] = useState("");
  const [ingCost, setIngCost] = useState("");
  const [ingRmId, setIngRmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingIng, setAddingIng] = useState(false);

  const recipeId = recipe?.id;

  const { data: ingredients = [] as any[] } = useQuery({
    queryKey: ["/api/restaurant/recipes", recipeId, "ingredients"],
    queryFn: () => recipeId ? apiFetch(`/api/restaurant/recipes/${recipeId}/ingredients`) : Promise.resolve([]),
    enabled: !!recipeId,
  });

  const { data: rawMaterials = [] as any[] } = useQuery({
    queryKey: ["/api/raw-materials"],
    queryFn: () => apiFetch("/api/raw-materials"),
  });

  const [rmSearch, setRmSearch] = useState("");
  const filteredRm = (rawMaterials as any[]).filter((rm: any) =>
    !rmSearch || String(rm.name || "").toLowerCase().includes(rmSearch.toLowerCase())
  ).slice(0, 8);

  const saveRecipe = async () => {
    setSaving(true);
    try {
      await apiPost("/api/restaurant/recipes", {
        menu_item_id: menuItem.id,
        yield_qty: Number(yieldQty) || 1,
        yield_unit: yieldUnit,
        prep_time_minutes: prepTime ? Number(prepTime) : null,
        notes,
      });
      qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] });
      toast({ title: "Recipe saved" });
      onSaved();
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    setSaving(false);
  };

  const addIngredient = async () => {
    if (!recipeId) { toast({ title: "Save recipe first", variant: "destructive" }); return; }
    if (!ingName || !ingQty) { toast({ title: "Name and quantity required", variant: "destructive" }); return; }
    setAddingIng(true);
    try {
      await apiPost(`/api/restaurant/recipes/${recipeId}/ingredients`, {
        raw_material_id: ingRmId || null,
        raw_material_name: ingName,
        quantity: Number(ingQty),
        unit: ingUnit,
        cost_per_unit: Number(ingCost) || 0,
      });
      qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes", recipeId, "ingredients"] });
      qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] });
      setIngName(""); setIngQty(""); setIngUnit(""); setIngCost(""); setRmSearch(""); setIngRmId(null);
      toast({ title: "Ingredient added" });
    } catch { toast({ title: "Failed to add ingredient", variant: "destructive" }); }
    setAddingIng(false);
  };

  const deleteIngredient = async (ingId: number) => {
    if (!recipeId) return;
    await apiDelete(`/api/restaurant/recipes/${recipeId}/ingredients/${ingId}`);
    qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes", recipeId, "ingredients"] });
    qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] });
  };

  const totalFoodCost = (ingredients as any[]).reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.cost_per_unit || 0), 0);
  const sellingPrice = Number(menuItem.selling_price || 0);
  const foodCostPct = sellingPrice > 0 ? (totalFoodCost / sellingPrice) * 100 : 0;
  const grossProfitPct = sellingPrice > 0 ? ((sellingPrice - totalFoodCost) / sellingPrice) * 100 : 0;
  const suggestedPrice = totalFoodCost > 0 ? (totalFoodCost / 0.3).toFixed(2) : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold">{menuItem.name}</h3>
          <p className="text-sm text-gray-500">Selling Price: {fmt(menuItem.selling_price)}</p>
        </div>
        <Button onClick={saveRecipe} disabled={saving} size="sm">{saving ? "Saving..." : "💾 Save Recipe"}</Button>
      </div>

      {/* Yield + prep */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">Yield Quantity</label>
          <Input value={yieldQty} onChange={e => setYieldQty(e.target.value)} className="h-8 text-sm mt-1" type="number" min="0.001" step="0.001" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Yield Unit</label>
          <Input value={yieldUnit} onChange={e => setYieldUnit(e.target.value)} className="h-8 text-sm mt-1" placeholder="portion / ml / g" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Prep Time (min)</label>
          <Input value={prepTime} onChange={e => setPrepTime(e.target.value)} className="h-8 text-sm mt-1" type="number" placeholder="15" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Notes / Method</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-8 text-sm mt-1" placeholder="Preparation notes..." />
      </div>

      {/* Ingredients */}
      <div>
        <div className="text-sm font-semibold mb-2">Ingredients</div>
        <div className="rounded border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raw Material</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">Line Cost</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ingredients as any[]).map((ing: any) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium text-sm">
                    <div>{ing.raw_material_name}</div>
                    {ing.raw_material_id && (
                      <button onClick={() => setLocation(`/restaurant-inventory?raw_material_id=${ing.raw_material_id}`)} className="text-blue-500 hover:underline text-xs">View in Inventory →</button>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{ing.quantity}</TableCell>
                  <TableCell className="text-sm text-gray-500">{ing.unit || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(ing.cost_per_unit)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{fmt(Number(ing.quantity) * Number(ing.cost_per_unit))}</TableCell>
                  <TableCell>
                    <button onClick={() => deleteIngredient(ing.id)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                  </TableCell>
                </TableRow>
              ))}
              {(ingredients as any[]).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-4 text-sm">No ingredients yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add ingredient */}
        <div className="mt-3 p-3 bg-gray-50 rounded border">
          <div className="text-xs font-medium text-gray-600 mb-2">Add Ingredient</div>
          <div className="relative mb-2">
            <Input placeholder="Search raw materials..." value={rmSearch} onChange={e => { setRmSearch(e.target.value); setIngName(e.target.value); }} className="h-8 text-xs" />
            {rmSearch && filteredRm.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded shadow-lg z-10 max-h-40 overflow-auto">
                {filteredRm.map((rm: any) => (
                  <button key={rm.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50"
                    onClick={() => { setIngName(rm.name); setIngUnit(rm.unit || ""); setIngRmId(rm.id); if (rm.cost_per_unit) setIngCost(String(rm.cost_per_unit)); setRmSearch(""); }}>
                    {rm.name} <span className="text-gray-400">({rm.unit}){rm.cost_per_unit ? ` — ${sym}${rm.cost_per_unit}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Name" value={ingName} onChange={e => setIngName(e.target.value)} className="h-7 text-xs" />
            <Input placeholder="Qty" value={ingQty} onChange={e => setIngQty(e.target.value)} className="h-7 text-xs" type="number" />
            <Input placeholder="Unit (g/ml/pcs)" value={ingUnit} onChange={e => setIngUnit(e.target.value)} className="h-7 text-xs" />
            <Input placeholder="Cost/Unit ${sym}" value={ingCost} onChange={e => setIngCost(e.target.value)} className="h-7 text-xs" type="number" />
          </div>
          <Button size="sm" className="mt-2 h-7 text-xs" onClick={addIngredient} disabled={addingIng}>{addingIng ? "Adding..." : "+ Add"}</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Food Cost", val: fmt(totalFoodCost), cls: "text-red-700" },
          { label: "Selling Price", val: fmt(sellingPrice), cls: "text-blue-700" },
          { label: "Food Cost %", val: foodCostPct > 0 ? foodCostPct.toFixed(1) + "%" : "—", cls: foodCostPct < 30 ? "text-green-700" : foodCostPct < 50 ? "text-amber-700" : "text-red-700" },
          { label: "Gross Profit %", val: grossProfitPct > 0 ? grossProfitPct.toFixed(1) + "%" : "—", cls: "text-green-700" },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-3 pb-3">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className={`text-xl font-bold mt-0.5 ${c.cls}`}>{c.val}</div>
          </CardContent></Card>
        ))}
      </div>
      {totalFoodCost > 0 && (
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
          💡 Suggested selling price at 30% food cost ratio: <strong>{fmt(suggestedPrice)}</strong>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RestaurantRecipesPage() {
  const [activeTab, setActiveTab] = useState<"recipes" | "food-cost">("recipes");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { data: menuItems = [] as any[] } = useQuery({
    queryKey: ["/api/restaurant/menu-items"],
    queryFn: () => apiFetch("/api/restaurant/menu-items"),
  });

  const { data: recipes = [] as any[] } = useQuery({
    queryKey: ["/api/restaurant/recipes"],
    queryFn: () => apiFetch("/api/restaurant/recipes"),
  });

  const recipeMap: Record<number, any> = {};
  (recipes as any[]).forEach((r: any) => { recipeMap[r.menu_item_id] = r; });

  const filteredItems = (menuItems as any[]).filter((mi: any) =>
    !search || String(mi.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedRecipe = selectedItem ? recipeMap[selectedItem.id] : null;

  // Stats
  const totalRecipes = (recipes as any[]).length;
  const withCost = (recipes as any[]).filter((r: any) => Number(r.food_cost) > 0);
  const avgFoodCostPct = withCost.length > 0
    ? withCost.reduce((s: number, r: any) => {
        const pct = Number(r.selling_price) > 0 ? (Number(r.food_cost) / Number(r.selling_price)) * 100 : 0;
        return s + pct;
      }, 0) / withCost.length
    : 0;
  const highestCost = (recipes as any[]).reduce((best: any, r: any) =>
    Number(r.food_cost) > Number(best?.food_cost || 0) ? r : best, null);
  const lowestMargin = withCost.reduce((worst: any, r: any) => {
    const pct = Number(r.selling_price) > 0 ? (Number(r.food_cost) / Number(r.selling_price)) * 100 : 0;
    const worstPct = Number(worst?.selling_price) > 0 ? (Number(worst?.food_cost) / Number(worst?.selling_price)) * 100 : 0;
    return pct > worstPct ? r : worst;
  }, null);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Recipe & Food Costing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage recipes and track food cost ratios</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={activeTab === "recipes" ? "default" : "outline"} onClick={() => setActiveTab("recipes")}>📋 Recipes</Button>
          <Button size="sm" variant={activeTab === "food-cost" ? "default" : "outline"} onClick={() => setActiveTab("food-cost")}>📊 Food Cost Report</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Recipes", val: totalRecipes },
          { label: "Avg Food Cost %", val: avgFoodCostPct > 0 ? avgFoodCostPct.toFixed(1) + "%" : "—" },
          { label: "Highest Cost Item", val: highestCost?.menu_item_name || "—" },
          { label: "Lowest Margin Item", val: lowestMargin?.menu_item_name || "—" },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-4">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="text-xl font-bold mt-1 truncate" title={String(c.val)}>{c.val}</div>
          </CardContent></Card>
        ))}
      </div>

      {activeTab === "food-cost" && <FoodCostReport />}

      {activeTab === "recipes" && (
        <div className="grid grid-cols-3 gap-5">
          {/* Left: item list */}
          <div className="col-span-1 space-y-3">
            <Input placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {filteredItems.map((mi: any) => {
                const recipe = recipeMap[mi.id];
                const foodCost = Number(recipe?.food_cost || 0);
                const sellingPrice = Number(mi.selling_price || 0);
                const pct = sellingPrice > 0 && foodCost > 0 ? (foodCost / sellingPrice) * 100 : 0;
                const isSelected = selectedItem?.id === mi.id;
                return (
                  <button key={mi.id} onClick={() => setSelectedItem(mi)}
                    className={`w-full text-left p-3 rounded border transition-colors ${isSelected ? "bg-blue-50 border-blue-400" : "bg-white hover:bg-gray-50 border-gray-200"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{mi.name}</div>
                        <div className="text-xs text-gray-500">{fmt(mi.selling_price)}</div>
                      </div>
                      {costPctBadge(pct)}
                    </div>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center text-gray-400 py-8 text-sm">No items found</div>
              )}
            </div>
          </div>

          {/* Right: recipe editor */}
          <div className="col-span-2">
            {selectedItem ? (
              <Card>
                <CardContent className="pt-5">
                  <RecipeEditor
                    menuItem={selectedItem}
                    recipe={selectedRecipe}
                    onSaved={() => {}}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded border border-dashed text-gray-400">
                Select a menu item from the left to edit its recipe
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
