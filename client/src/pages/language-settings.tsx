import { useState, useEffect } from "react";
import { useI18n, LOCALES, type Locale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Globe, Save, RotateCcw, Languages } from "lucide-react";

// All translatable keys grouped by category
const KEY_GROUPS: { group: string; keys: string[] }[] = [
  {
    group: "Common Actions",
    keys: ["save", "cancel", "edit", "delete", "add", "create", "update", "search", "export", "print",
      "download", "upload", "submit", "confirm", "close", "back", "next", "view", "refresh", "filter",
      "actions", "loading", "no_data", "select", "all", "yes", "no"],
  },
  {
    group: "Table Headers",
    keys: ["date", "amount", "status", "name", "phone", "email", "address", "total", "quantity",
      "price", "customer", "invoice", "balance", "description", "type", "notes", "code"],
  },
  {
    group: "Status Labels",
    keys: ["active", "inactive", "pending", "approved", "rejected", "completed", "cancelled",
      "draft", "paid", "unpaid", "overdue"],
  },
  {
    group: "Navigation / Modules",
    keys: ["dashboard", "reports", "settings", "inventory", "sales", "purchases", "customers",
      "vendors", "products", "invoices", "payments", "accounting", "hr_payroll", "manufacturing",
      "logistics", "restaurant", "hotel", "healthcare", "pharmacy", "education", "agriculture",
      "real_estate", "gold", "nidhi", "ngo", "crm", "ecommerce", "retail_pos", "finance",
      "users", "logout", "login", "notifications", "profile", "language"],
  },
  {
    group: "Finance",
    keys: ["tax", "discount", "subtotal", "grand_total", "journal_entries", "ledger",
      "trial_balance", "profit_loss", "balance_sheet"],
  },
];

const ALL_KEYS = KEY_GROUPS.flatMap((g) => g.keys);

// English default labels (mirrors i18n.tsx `en` dictionary)
const EN_LABELS: Record<string, string> = {
  save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", add: "Add",
  create: "Create", update: "Update", search: "Search", export: "Export",
  print: "Print", download: "Download", upload: "Upload", submit: "Submit",
  confirm: "Confirm", close: "Close", back: "Back", next: "Next", view: "View",
  refresh: "Refresh", filter: "Filter", actions: "Actions", loading: "Loading...",
  no_data: "No data found", select: "Select", all: "All", yes: "Yes", no: "No",
  date: "Date", amount: "Amount", status: "Status", name: "Name", phone: "Phone",
  email: "Email", address: "Address", total: "Total", quantity: "Quantity",
  price: "Price", customer: "Customer", invoice: "Invoice", balance: "Balance",
  description: "Description", type: "Type", notes: "Notes", code: "Code",
  active: "Active", inactive: "Inactive", pending: "Pending", approved: "Approved",
  rejected: "Rejected", completed: "Completed", cancelled: "Cancelled",
  draft: "Draft", paid: "Paid", unpaid: "Unpaid", overdue: "Overdue",
  dashboard: "Dashboard", reports: "Reports", settings: "Settings",
  inventory: "Inventory", sales: "Sales", purchases: "Purchases",
  customers: "Customers", vendors: "Vendors", products: "Products",
  invoices: "Invoices", payments: "Payments", accounting: "Accounting",
  hr_payroll: "HR & Payroll", manufacturing: "Manufacturing", logistics: "Logistics",
  restaurant: "Restaurant", hotel: "Hotel", healthcare: "Healthcare",
  pharmacy: "Pharmacy", education: "Education", agriculture: "Agriculture",
  real_estate: "Real Estate", gold: "Gold", nidhi: "Nidhi Company", ngo: "NGO",
  crm: "CRM", ecommerce: "E-Commerce", retail_pos: "Retail / POS",
  finance: "Finance", users: "Users", logout: "Logout", login: "Login",
  notifications: "Notifications", profile: "Profile", language: "Language",
  tax: "Tax", discount: "Discount", subtotal: "Subtotal", grand_total: "Grand Total",
  journal_entries: "Journal Entries", ledger: "Ledger", trial_balance: "Trial Balance",
  profit_loss: "Profit & Loss", balance_sheet: "Balance Sheet",
};

export default function LanguageSettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { toast } = useToast();

  const [editLocale, setEditLocale] = useState<Locale>(locale);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Load existing overrides when locale changes
  useEffect(() => {
    fetch(`/api/i18n/overrides?locale=${editLocale}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: any) => {
        const existing = d?.overrides || {};
        setOverrides(existing);
        setEdited(existing);
      })
      .catch(() => {
        setOverrides({});
        setEdited({});
      });
  }, [editLocale]);

  const handleChange = (key: string, value: string) => {
    setEdited((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: string) => {
    setEdited((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send only changed keys (empty string = delete)
      const payload: Record<string, string> = {};
      for (const key of ALL_KEYS) {
        const editedVal = edited[key];
        const originalVal = overrides[key];
        if (editedVal !== originalVal) {
          payload[key] = editedVal ?? "";
        }
      }
      const res = await fetch("/api/i18n/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: editLocale, overrides: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOverrides(edited);
      toast({ title: "Saved", description: `${Object.keys(payload).length} translation(s) updated for ${editLocale.toUpperCase()}.` });
    } catch {
      toast({ title: "Error", description: "Failed to save translations.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setDefaultLocale = async () => {
    setLocale(editLocale);
    await fetch("/api/i18n/locale", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: editLocale }),
    });
    toast({ title: "Language updated", description: `Default language set to ${LOCALES.find((l) => l.code === editLocale)?.nativeLabel}` });
  };

  const filteredGroups = KEY_GROUPS.map((g) => ({
    ...g,
    keys: g.keys.filter(
      (k) =>
        !search ||
        k.includes(search.toLowerCase()) ||
        EN_LABELS[k]?.toLowerCase().includes(search.toLowerCase()) ||
        (edited[k] ?? "").toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((g) => g.keys.length > 0);

  const hasChanges = ALL_KEYS.some((k) => edited[k] !== overrides[k]);
  const currentLang = LOCALES.find((l) => l.code === editLocale);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Languages className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Language Settings</h1>
          <p className="text-sm text-muted-foreground">Configure translations and set the default language for your organization</p>
        </div>
      </div>

      {/* Default language selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Default Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select value={locale} onValueChange={(v) => { setLocale(v as Locale); setEditLocale(v as Locale); }}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.nativeLabel} <span className="text-muted-foreground text-xs ml-1">({l.label})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{locale.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">Currently active — changes apply immediately</span>
          </div>
        </CardContent>
      </Card>

      {/* Translation overrides */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              Custom Translations
              {editLocale !== "en" && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  for {currentLang?.nativeLabel} ({editLocale.toUpperCase()})
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={editLocale} onValueChange={(v) => setEditLocale(v as Locale)}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.filter((l) => l.code !== "en").map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.nativeLabel} ({l.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Override default translations for your business terminology. Leave blank to use system defaults.
          </p>
          <Input
            placeholder="Search keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 h-8 text-sm"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.group}</h3>
              <div className="space-y-1.5">
                {group.keys.map((key) => {
                  const defaultEn = EN_LABELS[key] ?? key;
                  const currentVal = edited[key] ?? "";
                  const isModified = currentVal !== (overrides[key] ?? "");
                  return (
                    <div key={key} className="grid grid-cols-[140px_1fr_1fr_36px] items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground truncate" title={key}>{key}</span>
                      <span className="text-sm text-foreground/70 truncate">{defaultEn}</span>
                      <Input
                        value={currentVal}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={`Enter ${editLocale} translation...`}
                        className={`h-7 text-sm ${isModified ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-50 hover:opacity-100"
                        onClick={() => handleReset(key)}
                        title="Reset to default"
                        disabled={!currentVal}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
