import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Plus, Pencil, Search, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ── Static country list with tax regime defaults ──────────────────────────────
const COUNTRIES = [
  { code: "IND", name: "India",          currency: "INR", symbol: "₹",  taxName: "GST",  taxRate: 18, dateFormat: "DD/MM/YYYY" },
  { code: "ARE", name: "UAE",            currency: "AED", symbol: "د.إ", taxName: "VAT",  taxRate: 5,  dateFormat: "DD/MM/YYYY" },
  { code: "SAU", name: "Saudi Arabia",   currency: "SAR", symbol: "﷼",  taxName: "VAT",  taxRate: 15, dateFormat: "DD/MM/YYYY" },
  { code: "USA", name: "United States",  currency: "USD", symbol: "$",  taxName: "Sales Tax", taxRate: 0, dateFormat: "MM/DD/YYYY" },
  { code: "GBR", name: "United Kingdom", currency: "GBP", symbol: "£",  taxName: "VAT",  taxRate: 20, dateFormat: "DD/MM/YYYY" },
  { code: "DEU", name: "Germany",        currency: "EUR", symbol: "€",  taxName: "MwSt", taxRate: 19, dateFormat: "DD.MM.YYYY" },
  { code: "AUS", name: "Australia",      currency: "AUD", symbol: "A$", taxName: "GST",  taxRate: 10, dateFormat: "DD/MM/YYYY" },
  { code: "SGP", name: "Singapore",      currency: "SGD", symbol: "S$", taxName: "GST",  taxRate: 9,  dateFormat: "DD/MM/YYYY" },
  { code: "MYS", name: "Malaysia",       currency: "MYR", symbol: "RM", taxName: "SST",  taxRate: 6,  dateFormat: "DD/MM/YYYY" },
  { code: "BGD", name: "Bangladesh",     currency: "BDT", symbol: "৳",  taxName: "VAT",  taxRate: 15, dateFormat: "DD/MM/YYYY" },
  { code: "NPL", name: "Nepal",          currency: "NPR", symbol: "रू", taxName: "VAT",  taxRate: 13, dateFormat: "DD/MM/YYYY" },
  { code: "LKA", name: "Sri Lanka",      currency: "LKR", symbol: "Rs", taxName: "VAT",  taxRate: 15, dateFormat: "DD/MM/YYYY" },
  { code: "PAK", name: "Pakistan",       currency: "PKR", symbol: "₨",  taxName: "GST",  taxRate: 17, dateFormat: "DD/MM/YYYY" },
  { code: "CAN", name: "Canada",         currency: "CAD", symbol: "C$", taxName: "GST",  taxRate: 5,  dateFormat: "DD/MM/YYYY" },
  { code: "NZL", name: "New Zealand",    currency: "NZD", symbol: "NZ$",taxName: "GST",  taxRate: 15, dateFormat: "DD/MM/YYYY" },
];

const INDIAN_STATES = [
  { code: "AP", name: "Andhra Pradesh",       gst: "37" },
  { code: "AR", name: "Arunachal Pradesh",    gst: "12" },
  { code: "AS", name: "Assam",                gst: "18" },
  { code: "BR", name: "Bihar",                gst: "10" },
  { code: "CT", name: "Chhattisgarh",         gst: "22" },
  { code: "GA", name: "Goa",                  gst: "30" },
  { code: "GJ", name: "Gujarat",              gst: "24" },
  { code: "HR", name: "Haryana",              gst: "06" },
  { code: "HP", name: "Himachal Pradesh",     gst: "02" },
  { code: "JH", name: "Jharkhand",            gst: "20" },
  { code: "KA", name: "Karnataka",            gst: "29" },
  { code: "KL", name: "Kerala",               gst: "32" },
  { code: "MP", name: "Madhya Pradesh",       gst: "23" },
  { code: "MH", name: "Maharashtra",          gst: "27" },
  { code: "MN", name: "Manipur",              gst: "14" },
  { code: "ML", name: "Meghalaya",            gst: "17" },
  { code: "MZ", name: "Mizoram",              gst: "15" },
  { code: "NL", name: "Nagaland",             gst: "13" },
  { code: "OD", name: "Odisha",               gst: "21" },
  { code: "PB", name: "Punjab",               gst: "03" },
  { code: "RJ", name: "Rajasthan",            gst: "08" },
  { code: "SK", name: "Sikkim",               gst: "11" },
  { code: "TN", name: "Tamil Nadu",           gst: "33" },
  { code: "TG", name: "Telangana",            gst: "36" },
  { code: "TR", name: "Tripura",              gst: "16" },
  { code: "UP", name: "Uttar Pradesh",        gst: "09" },
  { code: "UT", name: "Uttarakhand",          gst: "05" },
  { code: "WB", name: "West Bengal",          gst: "19" },
  { code: "AN", name: "Andaman & Nicobar",    gst: "35" },
  { code: "CH", name: "Chandigarh",           gst: "04" },
  { code: "DN", name: "Dadra & Nagar Haveli", gst: "26" },
  { code: "DD", name: "Daman & Diu",          gst: "25" },
  { code: "DL", name: "Delhi",                gst: "07" },
  { code: "JK", name: "Jammu & Kashmir",      gst: "01" },
  { code: "LA", name: "Ladakh",               gst: "38" },
  { code: "LD", name: "Lakshadweep",          gst: "31" },
  { code: "PY", name: "Puducherry",           gst: "34" },
];

interface TaxConfig {
  id?: number;
  country: string;
  tax_name: string;
  tax_rate: number;
  tax_number?: string;
  invoice_prefix?: string;
  currency: string;
  currency_symbol: string;
  date_format: string;
}

export default function StatesCountriesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("countries");
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<TaxConfig | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: taxConfigs = [] } = useQuery<TaxConfig[]>({
    queryKey: ["/api/masters/country-tax-config"],
    queryFn: () => fetch("/api/masters/country-tax-config").then(r => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: (data: TaxConfig) =>
      apiRequest(data.id ? "PUT" : "POST", `/api/masters/country-tax-config${data.id ? `/${data.id}` : ""}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/masters/country-tax-config"] });
      setEditOpen(false);
      toast({ title: "Tax config saved" });
    },
  });

  const openEdit = (country: typeof COUNTRIES[0]) => {
    const existing = taxConfigs.find((t: TaxConfig) => t.country === country.name);
    setEditItem(existing ?? {
      country: country.name,
      tax_name: country.taxName,
      tax_rate: country.taxRate,
      currency: country.currency,
      currency_symbol: country.symbol,
      date_format: country.dateFormat,
    });
    setEditOpen(true);
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.currency.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStates = INDIAN_STATES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Countries, States & Tax Regimes</h1>
          <p className="text-gray-500 text-sm mt-1">Configure per-country tax rules, currency & date formats</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="countries"><Globe className="h-4 w-4 mr-1" />Countries & Tax</TabsTrigger>
          <TabsTrigger value="states"><MapPin className="h-4 w-4 mr-1" />Indian States (GST)</TabsTrigger>
        </TabsList>

        <div className="relative mt-4 mb-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Countries Tab */}
        <TabsContent value="countries">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCountries.map(c => {
              const config = taxConfigs.find((t: TaxConfig) => t.country === c.name);
              return (
                <Card key={c.code} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-gray-700">{c.symbol}</span>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.currency} · {c.code}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            <IndianRupee className="h-3 w-3 mr-0.5" />{config?.tax_name ?? c.taxName} {config?.tax_rate ?? c.taxRate}%
                          </Badge>
                          {config?.tax_number && (
                            <Badge variant="secondary" className="text-xs">{config.tax_number}</Badge>
                          )}
                          {config && <Badge className="text-xs bg-green-100 text-green-700">Configured</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Indian States Tab */}
        <TabsContent value="states">
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm">All 36 States & UTs — GST State Codes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredStates.map((s, i) => (
                  <div key={s.code} className={`flex items-center justify-between px-4 py-2.5 text-sm border-b border-r ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <div>
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.code}</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">{s.gst}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Tax Config Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tax Configuration — {editItem?.country}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tax Name</Label>
                  <Input value={editItem.tax_name} onChange={e => setEditItem({ ...editItem, tax_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Tax Rate (%)</Label>
                  <Input type="number" value={editItem.tax_rate} onChange={e => setEditItem({ ...editItem, tax_rate: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Tax Number (GSTIN / VAT Reg. No.)</Label>
                  <Input value={editItem.tax_number ?? ""} onChange={e => setEditItem({ ...editItem, tax_number: e.target.value })} placeholder="e.g. 29AAAAA0000A1Z5" />
                </div>
                <div>
                  <Label className="text-xs">Invoice Prefix</Label>
                  <Input value={editItem.invoice_prefix ?? ""} onChange={e => setEditItem({ ...editItem, invoice_prefix: e.target.value })} placeholder="e.g. INV-" />
                </div>
                <div>
                  <Label className="text-xs">Currency Code</Label>
                  <Input value={editItem.currency} onChange={e => setEditItem({ ...editItem, currency: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Currency Symbol</Label>
                  <Input value={editItem.currency_symbol} onChange={e => setEditItem({ ...editItem, currency_symbol: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Date Format</Label>
                  <Select value={editItem.date_format} onValueChange={v => setEditItem({ ...editItem, date_format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (India, UK)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (USA)</SelectItem>
                      <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (Europe)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate(editItem)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
