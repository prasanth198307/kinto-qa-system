import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
    credentials: "include",
  }).then((r) => r.json());

const COUNTRIES = [
  { code: "IN", name: "India", taxLabel: "GST Number", taxName: "GST", currency: "INR", prefix: "INV" },
  { code: "AE", name: "UAE", taxLabel: "TRN (Tax Registration Number)", taxName: "VAT", currency: "AED", prefix: "UAE-INV" },
  { code: "SA", name: "Saudi Arabia", taxLabel: "VAT Number", taxName: "VAT", currency: "SAR", prefix: "SA-INV" },
  { code: "GB", name: "UK", taxLabel: "VAT Number", taxName: "VAT", currency: "GBP", prefix: "UK-INV" },
  { code: "US", name: "USA", taxLabel: "EIN / State Tax ID", taxName: "Sales Tax", currency: "USD", prefix: "US-INV" },
  { code: "SG", name: "Singapore", taxLabel: "GST Registration No.", taxName: "GST", currency: "SGD", prefix: "SG-INV" },
  { code: "BH", name: "Bahrain", taxLabel: "VAT Number", taxName: "VAT", currency: "BHD", prefix: "BH-INV" },
  { code: "QA", name: "Qatar", taxLabel: "Tax Registration No.", taxName: "VAT", currency: "QAR", prefix: "QA-INV" },
];

interface CountryConfig {
  tax_number: string;
  tax_rate: number;
  currency: string;
  invoice_prefix: string;
  tax_name: string;
}

interface Currency {
  code: string;
  name: string;
  exchange_rate: number;
}

export default function RestaurantTaxSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState<string>("IN");
  const [testAmount, setTestAmount] = useState<string>("");
  const [configs, setConfigs] = useState<Record<string, CountryConfig>>({});

  const { data: savedConfigs = {} } = useQuery({
    queryKey: ["restaurant-tax-settings"],
    queryFn: () => api("GET", "/api/restaurant/tax-settings"),
    onSuccess: (d: Record<string, CountryConfig>) => { if (d && !d.error) setConfigs(d); },
  } as any);

  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ["restaurant-currencies"],
    queryFn: () => api("GET", "/api/restaurant/currencies"),
  });

  const saveCountryConfig = useMutation({
    mutationFn: ({ country, cfg }: { country: string; cfg: CountryConfig }) =>
      api("POST", `/api/restaurant/tax-settings/${country}`, cfg),
    onSuccess: () => {
      toast({ title: "Tax settings saved" });
      qc.invalidateQueries({ queryKey: ["restaurant-tax-settings"] });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const countryMeta = COUNTRIES.find((c) => c.code === selectedCountry)!;
  const currentConfig: CountryConfig = configs[selectedCountry] ?? {
    tax_number: "",
    tax_rate: countryMeta.code === "IN" ? 18 : countryMeta.code === "US" ? 8.5 : 5,
    currency: countryMeta.currency,
    invoice_prefix: countryMeta.prefix,
    tax_name: countryMeta.taxName,
  };

  const setField = (field: keyof CountryConfig, value: string | number) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedCountry]: { ...currentConfig, [field]: value },
    }));
  };

  const taxAmount = testAmount ? (parseFloat(testAmount) * currentConfig.tax_rate) / 100 : 0;
  const totalAmount = testAmount ? parseFloat(testAmount) + taxAmount : 0;

  const currencyList = Array.isArray(currencies) ? currencies : [];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax & Currency Settings</h1>
          <p className="text-muted-foreground">Configure tax numbers, rates, and invoice settings per country</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Country list */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Countries</p>
            {COUNTRIES.map((country) => {
              const isConfigured = !!(configs[country.code]?.tax_number);
              return (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-colors ${
                    selectedCountry === country.code
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>{country.name}</span>
                  {isConfigured && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Config panel */}
          <div className="md:col-span-3 space-y-4">
            {selectedCountry === "SA" && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                <strong>ZATCA Phase 2 Compliance Required:</strong> Saudi Arabia requires e-invoicing (ZATCA Phase 2) for all VAT-registered businesses. Ensure your invoice XML complies with ZATCA standards.
              </div>
            )}
            {selectedCountry === "AE" && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                <strong>UAE FTA Notice:</strong> UAE VAT at 5% is standard. Ensure TRN is displayed on all tax invoices as per Federal Tax Authority requirements.
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{countryMeta.name} — Tax Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{countryMeta.taxLabel}</Label>
                    <Input
                      value={currentConfig.tax_number}
                      onChange={(e) => setField("tax_number", e.target.value)}
                      placeholder={`Enter ${countryMeta.taxLabel}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Name</Label>
                    <Input
                      value={currentConfig.tax_name}
                      onChange={(e) => setField("tax_name", e.target.value)}
                      placeholder="e.g. GST, VAT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={currentConfig.tax_rate}
                      onChange={(e) => setField("tax_rate", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={currentConfig.currency}
                      onChange={(e) => setField("currency", e.target.value)}
                      placeholder="e.g. INR, USD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice Prefix</Label>
                    <Input
                      value={currentConfig.invoice_prefix}
                      onChange={(e) => setField("invoice_prefix", e.target.value)}
                      placeholder="e.g. INV, UAE-INV"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => saveCountryConfig.mutate({ country: selectedCountry, cfg: currentConfig })}
                  disabled={saveCountryConfig.isPending}
                >
                  {saveCountryConfig.isPending ? "Saving..." : `Save ${countryMeta.name} Settings`}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Tax Calculation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>Amount ({currentConfig.currency})</Label>
                    <Input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
                {testAmount && (
                  <div className="bg-muted rounded-md p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Base Amount</span>
                      <span>{currentConfig.currency} {parseFloat(testAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{currentConfig.tax_name} ({currentConfig.tax_rate}%)</span>
                      <span>{currentConfig.currency} {taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total</span>
                      <span>{currentConfig.currency} {totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Currency table */}
        <Card>
          <CardHeader>
            <CardTitle>Currencies & Exchange Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency Code</TableHead>
                  <TableHead>Currency Name</TableHead>
                  <TableHead className="text-right">Exchange Rate (vs INR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencyList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No currency data available
                    </TableCell>
                  </TableRow>
                ) : (
                  currencyList.map((c: Currency) => (
                    <TableRow key={c.code}>
                      <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-right">{c.exchange_rate}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
