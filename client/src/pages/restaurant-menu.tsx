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
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const FOOD_ICONS: Record<string, string> = { veg: "🟢", "non-veg": "🔴", egg: "🟡" };
const GST_LABELS: Record<string, string> = { food: "Food (5%)", restaurant: "Restaurant (12%)", bar: "Bar (18%)" };
const GST_PCT: Record<string, number> = { food: 5, restaurant: 12, bar: 18 };

type Category = { id: number; name: string; description?: string; sort_order: number; is_active: boolean };
type MenuItem = { id: number; name: string; description?: string; category_id: number; price: number; cost_price?: number; food_type: string; gst_type: string; kitchen_station?: string; preparation_mins?: number; calories?: number; is_available: boolean; is_featured?: boolean; allergens?: string; valid_from?: string; valid_to?: string };
type Modifier = { id: number; name: string; modifier_type: string; is_required: boolean; max_selection: number; options?: ModifierOption[] };
type ModifierOption = { id: number; option_name: string; price_adjustment: number };
type Combo = { id: number; combo_name: string; description?: string; combo_price: number; gst_pct: number; is_available: boolean; valid_from?: string; valid_to?: string };

const emptyCategory = (): Partial<Category> => ({ name: "", description: "", sort_order: 0, is_active: true });
const emptyItem = (): Partial<MenuItem> => ({ name: "", description: "", category_id: undefined, price: 0, cost_price: 0, food_type: "veg", gst_type: "food", kitchen_station: "main", preparation_mins: 15, calories: undefined, is_available: true, is_featured: false, allergens: "", valid_from: "", valid_to: "" });
const emptyModifier = (): Partial<Modifier> => ({ name: "", modifier_type: "addon", is_required: false, max_selection: 1 });
const emptyCombo = (): Partial<Combo> => ({ combo_name: "", description: "", combo_price: 0, gst_pct: 5, is_available: true, valid_from: "", valid_to: "" });

export default function RestaurantMenuPage() {
  const [tab, setTab] = useState<"items" | "categories" | "modifiers">("items");
  const { toast } = useToast();
  const qc = useQueryClient();

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/restaurant/menu-categories"], queryFn: () => api("GET", "/api/restaurant/menu-categories") });
  const [catForm, setCatForm] = useState<Partial<Category>>(emptyCategory());
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);

  const saveCat = useMutation({
    mutationFn: (d: Partial<Category>) => editCatId ? api("PUT", `/api/restaurant/menu-categories/${editCatId}`, d) : api("POST", "/api/restaurant/menu-categories", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-categories"] }); setShowCatForm(false); setCatForm(emptyCategory()); setEditCatId(null); toast({ title: "Category saved" }); },
    onError: () => toast({ title: "Error saving category", variant: "destructive" }),
  });
  const deleteCat = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/menu-categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-categories"] }); toast({ title: "Category deleted" }); },
  });
  const toggleCat = useMutation({
    mutationFn: (cat: Category) => api("PUT", `/api/restaurant/menu-categories/${cat.id}`, { ...cat, is_active: !cat.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-categories"] }),
  });

  // ─── MENU ITEMS ───────────────────────────────────────────────────────────
  const { data: menuItems = [] } = useQuery<MenuItem[]>({ queryKey: ["/api/restaurant/menu-items"], queryFn: () => api("GET", "/api/restaurant/menu-items") });
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>(emptyItem());
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [foodFilter, setFoodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ─── VARIATIONS STATE ─────────────────────────────────────────────────────
  const [showAddVariation, setShowAddVariation] = useState(false);
  const [variationForm, setVariationForm] = useState({ variation_name: '', price_modifier: 0, sku: '' });

  const saveItem = useMutation({
    mutationFn: (d: Partial<MenuItem>) => editItemId ? api("PUT", `/api/restaurant/menu-items/${editItemId}`, d) : api("POST", "/api/restaurant/menu-items", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] }); setShowItemPanel(false); setItemForm(emptyItem()); setEditItemId(null); toast({ title: "Item saved" }); },
    onError: () => toast({ title: "Error saving item", variant: "destructive" }),
  });
  const deleteItem = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/menu-items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] }),
  });
  const toggleItem = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/menu-items/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] }),
  });
  const bulkToggle = async (enable: boolean) => {
    for (const id of selectedIds) await api("PUT", `/api/restaurant/menu-items/${id}/toggle`, {});
    qc.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] });
    setSelectedIds([]);
    toast({ title: `${selectedIds.length} items ${enable ? "enabled" : "disabled"}` });
  };

  // ─── VARIATIONS QUERY & MUTATIONS ─────────────────────────────────────────
  const { data: variations = [], refetch: refetchVariations } = useQuery({
    queryKey: ['/api/restaurant/menu-items', editItemId, 'variations'],
    queryFn: () => editItemId ? api("GET", `/api/restaurant/menu-items/${editItemId}/variations`) : Promise.resolve([]),
    enabled: !!editItemId,
  });

  const addVariationMutation = useMutation({
    mutationFn: (data: any) => api("POST", `/api/restaurant/menu-items/${editItemId}/variations`, data),
    onSuccess: () => {
      refetchVariations();
      setShowAddVariation(false);
      setVariationForm({ variation_name: '', price_modifier: 0, sku: '' });
      toast({ title: "Variation added" });
    },
  });
  const deleteVariationMutation = useMutation({
    mutationFn: (vid: any) => api("DELETE", `/api/restaurant/menu-item-variations/${vid}`, {}),
    onSuccess: () => refetchVariations(),
  });

  const filteredItems = menuItems.filter(i => {
    if (catFilter !== "all" && String(i.category_id) !== catFilter) return false;
    if (foodFilter !== "all" && i.food_type !== foodFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── MODIFIERS ────────────────────────────────────────────────────────────
  const { data: modifiers = [] } = useQuery<Modifier[]>({ queryKey: ["/api/restaurant/modifiers"], queryFn: () => api("GET", "/api/restaurant/modifiers") });
  const [modForm, setModForm] = useState<Partial<Modifier>>(emptyModifier());
  const [expandedMod, setExpandedMod] = useState<number | null>(null);
  const [optionForms, setOptionForms] = useState<Record<number, { option_name: string; price_adjustment: number }>>({});

  const saveMod = useMutation({
    mutationFn: (d: Partial<Modifier>) => api("POST", "/api/restaurant/modifiers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/modifiers"] }); setModForm(emptyModifier()); toast({ title: "Modifier added" }); },
  });
  const deleteMod = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/modifiers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/modifiers"] }),
  });
  const saveOption = useMutation({
    mutationFn: ({ modId, data }: { modId: number; data: any }) => api("POST", `/api/restaurant/modifiers/${modId}/options`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/modifiers"] }); toast({ title: "Option added" }); },
  });
  const deleteOption = useMutation({
    mutationFn: ({ modId, optId }: { modId: number; optId: number }) => api("DELETE", `/api/restaurant/modifiers/${modId}/options/${optId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/modifiers"] }),
  });

  // ─── COMBOS ───────────────────────────────────────────────────────────────
  const { data: combos = [] } = useQuery<Combo[]>({ queryKey: ["/api/restaurant/combos"], queryFn: () => api("GET", "/api/restaurant/combos") });
  const [comboForm, setComboForm] = useState<Partial<Combo>>(emptyCombo());
  const [editComboId, setEditComboId] = useState<number | null>(null);

  const saveCombo = useMutation({
    mutationFn: (d: Partial<Combo>) => editComboId ? api("PUT", `/api/restaurant/combos/${editComboId}`, d) : api("POST", "/api/restaurant/combos", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/combos"] }); setComboForm(emptyCombo()); setEditComboId(null); toast({ title: "Combo saved" }); },
  });
  const deleteCombo = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/combos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/combos"] }),
  });

  const getCatName = (id: number) => categories.find(c => c.id === id)?.name || "—";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex gap-2">
          {(["items", "categories", "modifiers"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "items" ? "Menu Items" : t === "categories" ? "Categories" : "Modifiers & Combos"}
            </Button>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {tab === "categories" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Categories <span className="text-sm font-normal text-muted-foreground">({categories.length} total, {categories.filter(c => c.is_active).length} active)</span></CardTitle>
            <Button size="sm" onClick={() => { setCatForm(emptyCategory()); setEditCatId(null); setShowCatForm(true); }}>+ Add Category</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCatForm && (
              <div className="border rounded p-4 bg-muted/30 grid grid-cols-2 gap-3">
                <div className="col-span-2 text-sm font-semibold">{editCatId ? "Edit" : "New"} Category</div>
                <div>
                  <label className="text-xs font-medium">Name *</label>
                  <Input value={catForm.name || ""} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" />
                </div>
                <div>
                  <label className="text-xs font-medium">Sort Order</label>
                  <Input type="number" value={catForm.sort_order ?? 0} onChange={e => setCatForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium">Description</label>
                  <Input value={catForm.description || ""} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cat-active" checked={catForm.is_active ?? true} onChange={e => setCatForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <label htmlFor="cat-active" className="text-sm">Active</label>
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowCatForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveCat.mutate(catForm)} disabled={!catForm.name}>Save</Button>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">💡 Use sort_order to reorder categories in the menu.</p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Sort</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {categories.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cat.description || "—"}</TableCell>
                    <TableCell>{cat.sort_order}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleCat.mutate(cat)}>
                        <Badge variant={cat.is_active ? "default" : "secondary"}>{cat.is_active ? "Active" : "Inactive"}</Badge>
                      </button>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setCatForm(cat); setEditCatId(cat.id); setShowCatForm(true); }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteCat.mutate(cat.id); }}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── MENU ITEMS TAB ── */}
      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {["all", "veg", "non-veg", "egg"].map(ft => (
                <Button key={ft} size="sm" variant={foodFilter === ft ? "default" : "outline"} onClick={() => setFoodFilter(ft)}>
                  {ft === "all" ? "All" : `${FOOD_ICONS[ft]} ${ft}`}
                </Button>
              ))}
            </div>
            <Input className="w-52" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="ml-auto flex gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => bulkToggle(true)}>Enable Selected ({selectedIds.length})</Button>
                  <Button size="sm" variant="outline" onClick={() => bulkToggle(false)}>Disable Selected ({selectedIds.length})</Button>
                </>
              )}
              <Button size="sm" onClick={() => { setItemForm(emptyItem()); setEditItemId(null); setShowItemPanel(true); setShowAddVariation(false); }}>+ Add Item</Button>
            </div>
          </div>

          {showItemPanel && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{editItemId ? "Edit" : "New"} Menu Item</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium">Name *</label>
                  <Input value={itemForm.name || ""} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Category</label>
                  <Select value={String(itemForm.category_id || "")} onValueChange={v => setItemForm(f => ({ ...f, category_id: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <label className="text-xs font-medium">Description</label>
                  <textarea className="w-full border rounded px-3 py-2 text-sm min-h-16 bg-background" value={itemForm.description || ""} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Price (₹) *</label>
                  <Input type="number" value={itemForm.price || ""} onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Cost Price (₹)</label>
                  <Input type="number" value={itemForm.cost_price || ""} onChange={e => setItemForm(f => ({ ...f, cost_price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Food Type</label>
                  <Select value={itemForm.food_type || "veg"} onValueChange={v => setItemForm(f => ({ ...f, food_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">🟢 Veg</SelectItem>
                      <SelectItem value="non-veg">🔴 Non-Veg</SelectItem>
                      <SelectItem value="egg">🟡 Egg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">GST Type</label>
                  <Select value={itemForm.gst_type || "food"} onValueChange={v => setItemForm(f => ({ ...f, gst_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(GST_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Kitchen Station</label>
                  <Select value={itemForm.kitchen_station || "main"} onValueChange={v => setItemForm(f => ({ ...f, kitchen_station: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["main", "hot", "cold", "bar", "bakery"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Prep Time (mins)</label>
                  <Input type="number" value={itemForm.preparation_mins || 15} onChange={e => setItemForm(f => ({ ...f, preparation_mins: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Calories (kcal)</label>
                  <Input type="number" value={itemForm.calories || ""} onChange={e => setItemForm(f => ({ ...f, calories: Number(e.target.value) || undefined }))} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs font-medium">Allergens (comma-separated)</label>
                  <Input value={itemForm.allergens || ""} onChange={e => setItemForm(f => ({ ...f, allergens: e.target.value }))} placeholder="nuts, dairy, gluten" />
                </div>
                <div>
                  <label className="text-xs font-medium">Available From (time)</label>
                  <Input type="time" value={itemForm.valid_from || ""} onChange={e => setItemForm(f => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">Available To (time)</label>
                  <Input type="time" value={itemForm.valid_to || ""} onChange={e => setItemForm(f => ({ ...f, valid_to: e.target.value }))} />
                </div>
                <div className="flex items-center gap-4 col-span-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.is_available ?? true} onChange={e => setItemForm(f => ({ ...f, is_available: e.target.checked }))} /> Available</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.is_featured ?? false} onChange={e => setItemForm(f => ({ ...f, is_featured: e.target.checked }))} /> Featured</label>
                </div>

                {/* ── VARIATIONS SECTION ── */}
                {editItemId && (
                  <div className="col-span-3 border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm">Item Variations (sizes, types)</h4>
                      <Button size="sm" onClick={() => setShowAddVariation(true)} variant="outline">+ Add Variation</Button>
                    </div>
                    {variations.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Price Adj (±₹)</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(variations as any[]).map((v: any) => (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">{v.variation_name}</TableCell>
                              <TableCell className={v.price_modifier >= 0 ? "text-green-600" : "text-red-600"}>
                                {v.price_modifier >= 0 ? "+" : ""}{fmt(v.price_modifier)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">{v.sku || "—"}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="text-destructive h-6 px-2"
                                  onClick={() => { if (confirm(`Delete variation "${v.variation_name}"?`)) deleteVariationMutation.mutate(v.id); }}>
                                  Del
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {variations.length === 0 && !showAddVariation && (
                      <p className="text-xs text-muted-foreground">No variations yet. Add sizes or types above.</p>
                    )}
                    {showAddVariation && (
                      <div className="border rounded p-3 bg-muted/30 space-y-2 mt-2">
                        <div className="text-sm font-medium">New Variation</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs font-medium">Variation Name *</label>
                            <Input placeholder="e.g. Small, Large, Spicy" value={variationForm.variation_name}
                              onChange={e => setVariationForm(f => ({ ...f, variation_name: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Price Adjustment (±₹)</label>
                            <Input type="number" placeholder="0" value={variationForm.price_modifier}
                              onChange={e => setVariationForm(f => ({ ...f, price_modifier: Number(e.target.value) }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium">SKU (optional)</label>
                            <Input placeholder="SKU code" value={variationForm.sku}
                              onChange={e => setVariationForm(f => ({ ...f, sku: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addVariationMutation.mutate(variationForm)}
                            disabled={!variationForm.variation_name || addVariationMutation.isPending}>
                            {addVariationMutation.isPending ? "Adding..." : "Add"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setShowAddVariation(false); setVariationForm({ variation_name: '', price_modifier: 0, sku: '' }); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowItemPanel(false); setShowAddVariation(false); }}>Cancel</Button>
                  <Button onClick={() => saveItem.mutate(itemForm)} disabled={!itemForm.name || !itemForm.price}>Save Item</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-8"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? filteredItems.map(i => i.id) : [])} /></TableHead>
                  <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Cost</TableHead>
                  <TableHead>Type</TableHead><TableHead>GST</TableHead><TableHead>Station</TableHead><TableHead>Prep</TableHead>
                  <TableHead>Available</TableHead><TableHead>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} /></TableCell>
                      <TableCell className="font-medium">{item.is_featured && <span className="text-yellow-500 mr-1">★</span>}{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{getCatName(item.category_id)}</Badge></TableCell>
                      <TableCell>{fmt(item.price)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.cost_price ? fmt(item.cost_price) : "—"}</TableCell>
                      <TableCell>{FOOD_ICONS[item.food_type]} {item.food_type}</TableCell>
                      <TableCell><Badge variant="secondary">{GST_PCT[item.gst_type]}%</Badge></TableCell>
                      <TableCell className="capitalize">{item.kitchen_station || "—"}</TableCell>
                      <TableCell>{item.preparation_mins || 15}m</TableCell>
                      <TableCell>
                        <button onClick={() => toggleItem.mutate(item.id)}>
                          <Badge variant={item.is_available ? "default" : "secondary"}>{item.is_available ? "Yes" : "No"}</Badge>
                        </button>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setItemForm(item); setEditItemId(item.id); setShowItemPanel(true); setShowAddVariation(false); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id); }}>Del</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredItems.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No items found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MODIFIERS & COMBOS TAB ── */}
      {tab === "modifiers" && (
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT: Modifiers */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Modifiers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="border rounded p-3 bg-muted/30 space-y-2">
                <div className="text-sm font-medium">Add Modifier</div>
                <Input placeholder="Modifier name" value={modForm.name || ""} onChange={e => setModForm(f => ({ ...f, name: e.target.value }))} />
                <Select value={modForm.modifier_type || "addon"} onValueChange={v => setModForm(f => ({ ...f, modifier_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addon">Addon</SelectItem>
                    <SelectItem value="variant">Variant</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-3 items-center">
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={modForm.is_required ?? false} onChange={e => setModForm(f => ({ ...f, is_required: e.target.checked }))} /> Required</label>
                  <div className="flex items-center gap-1">
                    <label className="text-sm">Max:</label>
                    <Input type="number" className="w-16" value={modForm.max_selection || 1} onChange={e => setModForm(f => ({ ...f, max_selection: Number(e.target.value) }))} />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => saveMod.mutate(modForm)} disabled={!modForm.name}>Add Modifier</Button>
              </div>
              <div className="space-y-2">
                {modifiers.map(mod => (
                  <div key={mod.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{mod.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground capitalize">{mod.modifier_type}</span>
                        {mod.is_required && <Badge className="ml-2" variant="destructive" style={{ fontSize: "10px" }}>Required</Badge>}
                        <span className="ml-2 text-xs">max: {mod.max_selection}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}>Options</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete modifier "${mod.name}"?`)) deleteMod.mutate(mod.id); }}>Del</Button>
                      </div>
                    </div>
                    {expandedMod === mod.id && (
                      <div className="pl-3 border-l space-y-2">
                        {(mod.options || []).map(opt => (
                          <div key={opt.id} className="flex items-center justify-between text-sm">
                            <span>{opt.option_name}</span>
                            <div className="flex items-center gap-2">
                              <span className={opt.price_adjustment >= 0 ? "text-green-600" : "text-red-600"}>
                                {opt.price_adjustment >= 0 ? "+" : ""}{fmt(opt.price_adjustment)}
                              </span>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive" onClick={() => deleteOption.mutate({ modId: mod.id, optId: opt.id })}>×</Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input placeholder="Option name" className="flex-1" value={optionForms[mod.id]?.option_name || ""} onChange={e => setOptionForms(f => ({ ...f, [mod.id]: { ...f[mod.id], option_name: e.target.value } }))} />
                          <Input type="number" placeholder="±₹" className="w-20" value={optionForms[mod.id]?.price_adjustment ?? ""} onChange={e => setOptionForms(f => ({ ...f, [mod.id]: { ...f[mod.id], price_adjustment: Number(e.target.value) } }))} />
                          <Button size="sm" onClick={() => { saveOption.mutate({ modId: mod.id, data: optionForms[mod.id] }); setOptionForms(f => ({ ...f, [mod.id]: { option_name: "", price_adjustment: 0 } })); }} disabled={!optionForms[mod.id]?.option_name}>Add</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Combos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Combos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="border rounded p-3 bg-muted/30 space-y-2">
                <div className="text-sm font-medium">{editComboId ? "Edit" : "Add"} Combo</div>
                <Input placeholder="Combo name" value={comboForm.combo_name || ""} onChange={e => setComboForm(f => ({ ...f, combo_name: e.target.value }))} />
                <Input placeholder="Description" value={comboForm.description || ""} onChange={e => setComboForm(f => ({ ...f, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Price (₹)</label>
                    <Input type="number" value={comboForm.combo_price || ""} onChange={e => setComboForm(f => ({ ...f, combo_price: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-xs">GST %</label>
                    <Select value={String(comboForm.gst_pct || 5)} onValueChange={v => setComboForm(f => ({ ...f, gst_pct: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs">Valid From</label>
                    <Input type="time" value={comboForm.valid_from || ""} onChange={e => setComboForm(f => ({ ...f, valid_from: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs">Valid To</label>
                    <Input type="time" value={comboForm.valid_to || ""} onChange={e => setComboForm(f => ({ ...f, valid_to: e.target.value }))} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={comboForm.is_available ?? true} onChange={e => setComboForm(f => ({ ...f, is_available: e.target.checked }))} /> Available</label>
                <div className="flex gap-2">
                  {editComboId && <Button variant="outline" size="sm" onClick={() => { setComboForm(emptyCombo()); setEditComboId(null); }}>Cancel</Button>}
                  <Button size="sm" className="flex-1" onClick={() => saveCombo.mutate(comboForm)} disabled={!comboForm.combo_name}>Save Combo</Button>
                </div>
              </div>
              <div className="space-y-2">
                {combos.map(combo => (
                  <div key={combo.id} className="border rounded p-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium">{combo.combo_name}</div>
                      {combo.description && <div className="text-xs text-muted-foreground">{combo.description}</div>}
                      <div className="flex gap-2 mt-1">
                        <span className="text-sm font-semibold">{fmt(combo.combo_price)}</span>
                        <Badge variant="secondary">{combo.gst_pct}% GST</Badge>
                        <Badge variant={combo.is_available ? "default" : "secondary"}>{combo.is_available ? "Available" : "Unavailable"}</Badge>
                      </div>
                      {(combo.valid_from || combo.valid_to) && <div className="text-xs text-muted-foreground mt-1">{combo.valid_from} – {combo.valid_to}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setComboForm(combo); setEditComboId(combo.id); }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete combo "${combo.combo_name}"?`)) deleteCombo.mutate(combo.id); }}>Del</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
