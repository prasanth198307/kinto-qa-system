import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pencil, IndianRupee, Star, Gift, Loader2, Package2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SuperAdminLayout from "./super-admin-layout";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface CatalogModule {
  slug: string;
  name: string;
  description: string;
  category: string;
  price_monthly: number;
  is_free: boolean;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  dependencies: string[];
  updated_at: string;
}

const CATEGORIES = ["Core", "Finance", "Inventory", "Production", "HR", "Sales", "Industry"];

const CATEGORY_COLORS: Record<string, string> = {
  Core:       "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Finance:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Inventory:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Production: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  HR:         "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Sales:      "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Industry:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

export default function SuperAdminModuleCatalog() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [filterCat, setFilterCat] = useState("All");
  const [editing, setEditing] = useState<CatalogModule | null>(null);
  const [form, setForm] = useState<Partial<CatalogModule>>({});

  const { data: modules = [], isLoading } = useQuery<CatalogModule[]>({
    queryKey: ["/api/admin/module-catalog"],
  });

  const saveMutation = useMutation({
    mutationFn: (mod: Partial<CatalogModule> & { slug: string }) =>
      apiRequest("PUT", `/api/admin/module-catalog/${mod.slug}`, mod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/module-catalog"] });
      toast({ title: "Module updated", description: `${form.name} saved successfully.` });
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const openEdit = (mod: CatalogModule) => {
    setEditing(mod);
    setForm({ ...mod });
  };

  const filtered = modules.filter(m => {
    const matchSearch = search === "" ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.slug.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || m.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<string, CatalogModule[]>>((acc, cat) => {
    const items = filtered.filter(m => m.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const totalRevenue = modules.filter(m => !m.is_free && m.is_active).reduce((s, m) => s + m.price_monthly, 0);

  return (
    <SuperAdminLayout
      title="Module Catalog"
      subtitle="Manage module names, descriptions, and prices shown in the marketplace"
      actions={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search modules…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-52"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Modules</p>
            <p className="text-2xl font-bold" data-testid="stat-total-modules">{modules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Paid Modules</p>
            <p className="text-2xl font-bold" data-testid="stat-paid-modules">{modules.filter(m => !m.is_free && m.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Free / Always-on</p>
            <p className="text-2xl font-bold" data-testid="stat-free-modules">{modules.filter(m => m.is_free).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Max Possible/Tenant</p>
            <p className="text-2xl font-bold" data-testid="stat-max-revenue">{sym}{totalRevenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading catalog…</span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Package2 className="h-10 w-10 opacity-30" />
          <p>No modules match your search.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${CATEGORY_COLORS[cat] ?? ""}`}>{cat}</span>
                <span className="text-xs text-muted-foreground">{items.length} module{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(mod => (
                  <Card key={mod.slug} className={`relative ${!mod.is_active ? "opacity-50" : ""}`} data-testid={`card-module-${mod.slug}`}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight truncate">{mod.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{mod.slug}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(mod)}
                          data-testid={`button-edit-${mod.slug}`}
                          className="shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 mb-3">{mod.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {mod.is_free ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Gift className="h-3 w-3" /> Free
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs font-semibold" data-testid={`price-${mod.slug}`}>
                            <IndianRupee className="h-3 w-3" />{mod.price_monthly.toLocaleString("en-IN")}/mo
                          </Badge>
                        )}
                        {mod.is_popular && (
                          <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-500 text-white">
                            <Star className="h-3 w-3 fill-white" /> Popular
                          </Badge>
                        )}
                        {!mod.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto" data-testid="dialog-edit-module">
          <DialogHeader>
            <DialogTitle>Edit Module — <span className="font-mono text-sm">{editing?.slug}</span></DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Module Name</Label>
              <Input
                data-testid="input-module-name"
                value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                data-testid="input-module-description"
                value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category ?? "Core"}
                  onValueChange={v => setForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger data-testid="select-module-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  data-testid="input-sort-order"
                  type="number"
                  value={form.sort_order ?? 99}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                Price per Month (₹)
              </Label>
              <Input
                data-testid="input-price-monthly"
                type="number"
                min={0}
                value={form.price_monthly ?? 0}
                onChange={e => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))}
                disabled={form.is_free}
                className={form.is_free ? "opacity-40" : ""}
              />
              {form.is_free && (
                <p className="text-xs text-muted-foreground">Price is ignored for free modules</p>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Always Free</Label>
                  <p className="text-xs text-muted-foreground">Module is free for all tenants</p>
                </div>
                <Switch
                  data-testid="switch-is-free"
                  checked={form.is_free ?? false}
                  onCheckedChange={v => setForm(f => ({ ...f, is_free: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Mark as Popular</Label>
                  <p className="text-xs text-muted-foreground">Shows a "Popular" badge in marketplace</p>
                </div>
                <Switch
                  data-testid="switch-is-popular"
                  checked={form.is_popular ?? false}
                  onCheckedChange={v => setForm(f => ({ ...f, is_popular: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive modules are hidden from tenants</p>
                </div>
                <Switch
                  data-testid="switch-is-active"
                  checked={form.is_active ?? true}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              data-testid="button-save-module"
              disabled={saveMutation.isPending}
              onClick={() => editing && saveMutation.mutate({ ...form, slug: editing.slug } as any)}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
