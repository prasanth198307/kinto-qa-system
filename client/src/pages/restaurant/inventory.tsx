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

const UNITS = ["kg", "g", "L", "ml", "pcs"];
const REASONS = ["overcooked", "expired", "dropped", "spoiled", "other"];

export default function RestaurantInventoryPage() {
  const [tab, setTab] = useState<"recipes" | "wastage" | "deductions">("recipes");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: recipes = [] } = useQuery({ queryKey: ["/api/restaurant/recipes"], queryFn: () => api("GET", "/api/restaurant/recipes") });
  const { data: menuItems = [] } = useQuery({ queryKey: ["/api/restaurant/menu-items"], queryFn: () => api("GET", "/api/restaurant/menu-items") });
  const { data: wastage = [] } = useQuery({ queryKey: ["/api/restaurant/wastage"], queryFn: () => api("GET", "/api/restaurant/wastage") });

  const [recipeForm, setRecipeForm] = useState({ menu_item_id: "", ingredient_name: "", quantity: "", unit: "kg", cost: "" });
  const [wastageForm, setWastageForm] = useState({ item_name: "", quantity: "", unit: "kg", cost_per_unit: "", reason: "expired", recorded_by: "", waste_date: new Date().toISOString().slice(0, 10) });

  const addRecipe = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/recipes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] }); toast({ title: "Ingredient added" }); setRecipeForm({ menu_item_id: "", ingredient_name: "", quantity: "", unit: "kg", cost: "" }); },
  });
  const delRecipe = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/recipes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/recipes"] }),
  });
  const addWastage = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/wastage", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/wastage"] }); toast({ title: "Wastage recorded" }); setWastageForm({ item_name: "", quantity: "", unit: "kg", cost_per_unit: "", reason: "expired", recorded_by: "", waste_date: new Date().toISOString().slice(0, 10) }); },
  });

  // Group recipes by menu item
  const grouped = (recipes as any[]).reduce((acc: any, r: any) => { const k = r.menu_item_name || r.menu_item_id; acc[k] = [...(acc[k] || []), r]; return acc; }, {});

  const today = new Date().toISOString().slice(0, 10);
  const todayCost = (wastage as any[]).filter((w: any) => w.waste_date?.slice(0, 10) === today).reduce((s: number, w: any) => s + Number(w.total_cost || 0), 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekCost = (wastage as any[]).filter((w: any) => w.waste_date?.slice(0, 10) >= weekAgo).reduce((s: number, w: any) => s + Number(w.total_cost || 0), 0);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Inventory Management</h1>
      <div className="flex gap-2">
        {(["recipes", "wastage", "deductions"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="capitalize">{t === "deductions" ? "Stock Deductions" : t === "wastage" ? "Food Wastage" : "Recipes"}</Button>
        ))}
      </div>

      {tab === "recipes" && (
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Add Ingredient to Recipe</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Select value={recipeForm.menu_item_id} onValueChange={v => setRecipeForm(p => ({ ...p, menu_item_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Menu Item" /></SelectTrigger>
                <SelectContent>{(menuItems as any[]).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.item_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Ingredient Name" value={recipeForm.ingredient_name} onChange={e => setRecipeForm(p => ({ ...p, ingredient_name: e.target.value }))} />
              <Input placeholder="Quantity" type="number" value={recipeForm.quantity} onChange={e => setRecipeForm(p => ({ ...p, quantity: e.target.value }))} />
              <Select value={recipeForm.unit} onValueChange={v => setRecipeForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Cost (₹)" type="number" value={recipeForm.cost} onChange={e => setRecipeForm(p => ({ ...p, cost: e.target.value }))} />
              <Button onClick={() => addRecipe.mutate(recipeForm)}>Add Ingredient</Button>
            </CardContent>
          </Card>
          {Object.entries(grouped).map(([item, rows]: [string, any]) => (
            <Card key={item}><CardHeader><CardTitle>{item}</CardTitle></CardHeader>
              <CardContent><Table><TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Cost</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((r: any) => (<TableRow key={r.id}><TableCell>{r.ingredient_name}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.unit}</TableCell><TableCell>₹{fmt(r.cost)}</TableCell><TableCell><Button size="sm" variant="destructive" onClick={() => delRecipe.mutate(r.id)}>Del</Button></TableCell></TableRow>))}</TableBody>
              </Table></CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "wastage" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Today's Wastage</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">₹{fmt(todayCost)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle>This Week</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-600">₹{fmt(weekCost)}</p></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle>Record Wastage</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Item Name" value={wastageForm.item_name} onChange={e => setWastageForm(p => ({ ...p, item_name: e.target.value }))} />
              <Input placeholder="Quantity" type="number" value={wastageForm.quantity} onChange={e => setWastageForm(p => ({ ...p, quantity: e.target.value }))} />
              <Select value={wastageForm.unit} onValueChange={v => setWastageForm(p => ({ ...p, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Cost/Unit (₹)" type="number" value={wastageForm.cost_per_unit} onChange={e => setWastageForm(p => ({ ...p, cost_per_unit: e.target.value }))} />
              <Select value={wastageForm.reason} onValueChange={v => setWastageForm(p => ({ ...p, reason: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Recorded By" value={wastageForm.recorded_by} onChange={e => setWastageForm(p => ({ ...p, recorded_by: e.target.value }))} />
              <Input type="date" value={wastageForm.waste_date} onChange={e => setWastageForm(p => ({ ...p, waste_date: e.target.value }))} />
              <Button onClick={() => addWastage.mutate(wastageForm)}>Record</Button>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Wastage Log</CardTitle></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit</TableHead><TableHead>Cost/Unit</TableHead><TableHead>Total</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
              <TableBody>{(wastage as any[]).map((w: any) => (<TableRow key={w.id}><TableCell>{w.waste_date?.slice(0, 10)}</TableCell><TableCell>{w.item_name}</TableCell><TableCell>{w.quantity}</TableCell><TableCell>{w.unit}</TableCell><TableCell>₹{fmt(w.cost_per_unit)}</TableCell><TableCell>₹{fmt(w.total_cost)}</TableCell><TableCell><Badge variant="outline">{w.reason}</Badge></TableCell><TableCell>{w.recorded_by}</TableCell></TableRow>))}</TableBody>
            </Table></CardContent>
          </Card>
        </div>
      )}

      {tab === "deductions" && (
        <Card><CardHeader><CardTitle>Stock Deductions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Stock is automatically deducted when orders are paid. Deductions are based on recipe ingredients linked to each menu item.</p>
            <Table><TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Item</TableHead><TableHead>Ingredient</TableHead><TableHead>Deducted Qty</TableHead><TableHead>Unit</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
              <TableBody><TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Deductions are logged automatically on order payment.</TableCell></TableRow></TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
