import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PriceList {
  id: number;
  name: string;
  currency_code: string;
  description: string;
  is_active: boolean;
  item_count: number;
}

interface PriceListItem {
  id: number;
  product_id: string;
  product_name: string;
  min_qty: number;
  price: number;
  valid_from: string;
  valid_to: string;
}

export default function PriceListsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [form, setForm] = useState({ name: "", currency_code: "INR", description: "" });
  const [itemForm, setItemForm] = useState({ product_id: "", product_name: "", min_qty: 1, price: 0, valid_from: "", valid_to: "" });

  const { data: priceLists = [], isLoading } = useQuery<PriceList[]>({
    queryKey: ["/api/generic/price-lists"],
  });

  const { data: listItems = [] } = useQuery<PriceListItem[]>({
    queryKey: ["/api/generic/price-lists", selectedList?.id, "items"],
    enabled: !!selectedList,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/generic/price-lists", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/price-lists"] });
      toast({ title: "Price list created" });
      setOpen(false);
      setForm({ name: "", currency_code: "INR", description: "" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const saveItemMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/generic/price-lists/${selectedList?.id}/items`, itemForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/price-lists", selectedList?.id, "items"] });
      toast({ title: "Price list item added" });
      setItemOpen(false);
      setItemForm({ product_id: "", product_name: "", min_qty: 1, price: 0, valid_from: "", valid_to: "" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/generic/price-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/price-lists"] });
      toast({ title: "Price list deleted" });
      if (selectedList?.id === undefined) setSelectedList(null);
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Price Lists</h1>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-new-price-list">
          <Plus className="h-4 w-4 mr-1" /> New Price List
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* List sidebar */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">All Price Lists</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
            ) : priceLists.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">No price lists yet.</div>
            ) : (
              <div className="divide-y">
                {priceLists.map(pl => (
                  <div
                    key={pl.id}
                    className={`flex items-center justify-between p-3 cursor-pointer hover-elevate ${selectedList?.id === pl.id ? "bg-accent" : ""}`}
                    onClick={() => setSelectedList(pl)}
                    data-testid={`item-price-list-${pl.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{pl.name}</div>
                      <div className="text-xs text-muted-foreground">{pl.currency_code}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card className="md:col-span-2">
          {!selectedList ? (
            <CardContent className="p-8 text-center text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2" />
              <p>Select a price list to view items</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{selectedList.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedList.currency_code} {selectedList.description ? `· ${selectedList.description}` : ""}</p>
                  </div>
                  <Button size="sm" onClick={() => setItemOpen(true)} data-testid="button-add-price-item">
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {listItems.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No items in this price list yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Min Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Valid From</TableHead>
                        <TableHead>Valid To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listItems.map((item) => (
                        <TableRow key={item.id} data-testid={`row-price-item-${item.id}`}>
                          <TableCell className="font-medium">{item.product_name || item.product_id}</TableCell>
                          <TableCell>{item.min_qty}</TableCell>
                          <TableCell>₹{Number(item.price).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-sm">{item.valid_from ? new Date(item.valid_from).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-sm">{item.valid_to ? new Date(item.valid_to).toLocaleDateString() : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create price list dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Price List</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input data-testid="input-price-list-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Retail Pricing" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency_code} onValueChange={v => setForm(f => ({ ...f, currency_code: v }))}>
                <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input data-testid="input-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name} data-testid="button-save-price-list">
                {saveMutation.isPending ? "Saving..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Price List Item</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={itemForm.product_id} onValueChange={v => {
                const prod = products.find((p: any) => p.id === v);
                setItemForm(f => ({ ...f, product_id: v, product_name: prod?.name || "" }));
              }}>
                <SelectTrigger data-testid="select-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Min Qty</Label>
                <Input type="number" min={1} data-testid="input-min-qty" value={itemForm.min_qty} onChange={e => setItemForm(f => ({ ...f, min_qty: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input type="number" min={0} data-testid="input-price" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valid From</Label>
                <Input type="date" data-testid="input-valid-from" value={itemForm.valid_from} onChange={e => setItemForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valid To</Label>
                <Input type="date" data-testid="input-valid-to" value={itemForm.valid_to} onChange={e => setItemForm(f => ({ ...f, valid_to: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setItemOpen(false)}>Cancel</Button>
              <Button onClick={() => saveItemMutation.mutate()} disabled={saveItemMutation.isPending || !itemForm.product_id} data-testid="button-save-price-item">
                {saveItemMutation.isPending ? "Saving..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
