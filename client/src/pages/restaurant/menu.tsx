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

const BLANK_ITEM = { name: "", category_id: "", price: "", cost_price: "", food_type: "veg", description: "", gst_type: "food", preparation_mins: "", kitchen_station: "main", is_available: true };
const BLANK_CAT = { name: "", description: "" };

export default function RestaurantMenuPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"items" | "categories">("items");
  const [catFilter, setCatFilter] = useState("all");
  const [itemForm, setItemForm] = useState<any>(null);
  const [catForm, setCatForm] = useState<any>(null);
  const [editCatId, setEditCatId] = useState<number | null>(null);

  const { data: categories = [] } = useQuery({ queryKey: ["/api/restaurant/menu-categories"], queryFn: () => api("GET", "/api/restaurant/menu-categories") });
  const { data: items = [] } = useQuery({ queryKey: ["/api/restaurant/menu-items"], queryFn: () => api("GET", "/api/restaurant/menu-items") });

  const inv = (keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const saveCat = useMutation({
    mutationFn: (d: any) => editCatId ? api("PUT", `/api/restaurant/menu-categories/${editCatId}`, d) : api("POST", "/api/restaurant/menu-categories", d),
    onSuccess: () => { inv(["/api/restaurant/menu-categories"]); setCatForm(null); setEditCatId(null); toast({ title: "Category saved" }); }
  });
  const delCat = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/menu-categories/${id}`),
    onSuccess: () => { inv(["/api/restaurant/menu-categories"]); toast({ title: "Category deleted" }); }
  });
  const saveItem = useMutation({
    mutationFn: (d: any) => d.id ? api("PUT", `/api/restaurant/menu-items/${d.id}`, d) : api("POST", "/api/restaurant/menu-items", d),
    onSuccess: () => { inv(["/api/restaurant/menu-items"]); setItemForm(null); toast({ title: "Item saved" }); }
  });
  const delItem = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/menu-items/${id}`),
    onSuccess: () => { inv(["/api/restaurant/menu-items"]); toast({ title: "Item deleted" }); }
  });
  const toggleItem = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/restaurant/menu-items/${id}/toggle`),
    onSuccess: () => inv(["/api/restaurant/menu-items"])
  });

  const filteredItems = catFilter === "all" ? items : items.filter((i: any) => String(i.category_id) === catFilter);

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2 border-b pb-2">
        {(["items", "categories"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="capitalize">{t === "items" ? "Menu Items" : "Categories"}</Button>
        ))}
      </div>

      {tab === "categories" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Menu Categories</CardTitle>
            <Button size="sm" onClick={() => { setCatForm(BLANK_CAT); setEditCatId(null); }}>+ Add Category</Button>
          </CardHeader>
          <CardContent>
            {catForm && (
              <div className="flex gap-2 mb-4">
                <Input placeholder="Name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
                <Input placeholder="Description" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} />
                <Button onClick={() => saveCat.mutate(catForm)}>Save</Button>
                <Button variant="outline" onClick={() => { setCatForm(null); setEditCatId(null); }}>Cancel</Button>
              </div>
            )}
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{categories.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setCatForm({ name: c.name, description: c.description }); setEditCatId(c.id); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => delCat.mutate(c.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "items" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Menu Items</CardTitle>
            <div className="flex gap-2">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setItemForm({ ...BLANK_ITEM })}>+ Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            {itemForm && (
              <div className="grid grid-cols-3 gap-2 mb-4 p-3 border rounded">
                <Input placeholder="Name *" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
                <Select value={String(itemForm.category_id)} onValueChange={v => setItemForm({ ...itemForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Price" type="number" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} />
                <Input placeholder="Cost Price" type="number" value={itemForm.cost_price} onChange={e => setItemForm({ ...itemForm, cost_price: e.target.value })} />
                <Select value={itemForm.food_type} onValueChange={v => setItemForm({ ...itemForm, food_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="veg">Veg</SelectItem><SelectItem value="non-veg">Non-Veg</SelectItem><SelectItem value="egg">Egg</SelectItem></SelectContent>
                </Select>
                <Select value={itemForm.gst_type} onValueChange={v => setItemForm({ ...itemForm, gst_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="food">Food (5%)</SelectItem><SelectItem value="restaurant">Restaurant (12%)</SelectItem><SelectItem value="bar">Bar (18%)</SelectItem></SelectContent>
                </Select>
                <Input placeholder="Prep Mins" type="number" value={itemForm.preparation_mins} onChange={e => setItemForm({ ...itemForm, preparation_mins: e.target.value })} />
                <Select value={itemForm.kitchen_station} onValueChange={v => setItemForm({ ...itemForm, kitchen_station: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="main">Main</SelectItem><SelectItem value="hot">Hot</SelectItem><SelectItem value="cold">Cold</SelectItem><SelectItem value="bar">Bar</SelectItem></SelectContent>
                </Select>
                <Input placeholder="Description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
                <div className="flex gap-2 col-span-3">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} /> Available</label>
                  <Button onClick={() => saveItem.mutate(itemForm)}>Save</Button>
                  <Button variant="outline" onClick={() => setItemForm(null)}>Cancel</Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Type</TableHead><TableHead>GST</TableHead><TableHead>Available</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredItems.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{categories.find((c: any) => c.id === i.category_id)?.name || "-"}</TableCell>
                  <TableCell>₹{fmt(i.price)}</TableCell>
                  <TableCell><Badge className={i.food_type === "veg" ? "bg-green-600" : i.food_type === "non-veg" ? "bg-red-600" : "bg-yellow-600"}>{i.food_type}</Badge></TableCell>
                  <TableCell>{i.gst_type}</TableCell>
                  <TableCell><Button size="sm" variant={i.is_available ? "default" : "outline"} onClick={() => toggleItem.mutate(i.id)}>{i.is_available ? "Yes" : "No"}</Button></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setItemForm({ ...i })}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => delItem.mutate(i.id)}>Del</Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
