import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, u: string, b?: any) =>
  fetch(u, {
    method: m,
    headers: { "Content-Type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
    credentials: "include",
  }).then((r) => r.json());

interface FranchiseConfig {
  royalty_pct: number;
  marketing_fee_pct: number;
  min_royalty_amount: number;
  payment_cycle: string;
  effective_date: string;
}

interface Outlet {
  id: number;
  name: string;
  city: string;
  monthly_revenue: number;
  royalty_due: number;
  marketing_fee: number;
  status: string;
  last_payment_date: string;
  royalty_paid: boolean;
}

interface FranchiseInvoice {
  id: number;
  outlet_name: string;
  period: string;
  royalty_amount: number;
  marketing_fee: number;
  total: number;
  generated_at: string;
  status: string;
}

interface FranchiseApplication {
  id: number;
  applicant_name: string;
  city: string;
  phone: string;
  applied_date: string;
  status: string;
}

export default function RestaurantFranchisePage() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const formatCurrency = (amount: number) => fmtCur(amount, tenantConfig);
  const qc = useQueryClient();

  const [config, setConfig] = useState<FranchiseConfig>({
    royalty_pct: 5,
    marketing_fee_pct: 2,
    min_royalty_amount: 5000,
    payment_cycle: "monthly",
    effective_date: new Date().toISOString().split("T")[0],
  });

  const { data: configData } = useQuery({
    queryKey: ["franchise-config"],
    queryFn: () => api("GET", "/api/restaurant/franchise/config"),
    onSuccess: (d: FranchiseConfig) => { if (d && !d.error) setConfig(d); },
  } as any);

  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["franchise-outlets"],
    queryFn: () => api("GET", "/api/restaurant/franchise/outlets"),
  });

  const { data: invoices = [] } = useQuery<FranchiseInvoice[]>({
    queryKey: ["franchise-invoices"],
    queryFn: () => api("GET", "/api/restaurant/franchise/invoices"),
  });

  const { data: applications = [] } = useQuery<FranchiseApplication[]>({
    queryKey: ["franchise-applications"],
    queryFn: () => api("GET", "/api/restaurant/franchise/applications"),
  });

  const saveConfig = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/franchise/config", config),
    onSuccess: () => {
      toast({ title: "Franchise config saved" });
      qc.invalidateQueries({ queryKey: ["franchise-config"] });
    },
    onError: () => toast({ title: "Failed to save config", variant: "destructive" }),
  });

  const generateInvoices = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/franchise/invoices/generate", {}),
    onSuccess: () => {
      toast({ title: "Royalty invoices generated" });
      qc.invalidateQueries({ queryKey: ["franchise-invoices"] });
    },
    onError: () => toast({ title: "Failed to generate invoices", variant: "destructive" }),
  });

  const updateApplication = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/restaurant/franchise/applications/${id}`, { status }),
    onSuccess: () => {
      toast({ title: "Application updated" });
      qc.invalidateQueries({ queryKey: ["franchise-applications"] });
    },
    onError: () => toast({ title: "Failed to update application", variant: "destructive" }),
  });

  const outletList = Array.isArray(outlets) ? outlets : [];
  const invoiceList = Array.isArray(invoices) ? invoices : [];
  const applicationList = Array.isArray(applications) ? applications : [];

  const totalRevenue = outletList.reduce((s: number, o: Outlet) => s + (o.monthly_revenue || 0), 0);
  const activeOutlets = outletList.filter((o: Outlet) => o.status === "active").length;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Franchise Management</h1>
          <p className="text-muted-foreground">Manage outlets, royalties, and franchise applications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outlets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outletList.length}</div>
              <p className="text-xs text-muted-foreground">{activeOutlets} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Network Revenue (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {applicationList.filter((a: FranchiseApplication) => a.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Franchise Config</TabsTrigger>
            <TabsTrigger value="outlets">Outlet Performance</TabsTrigger>
            <TabsTrigger value="invoices">Royalty Invoices</TabsTrigger>
            <TabsTrigger value="applications">Franchise Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Royalty & Fee Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Royalty % (of outlet revenue)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={config.royalty_pct}
                      onChange={(e) => setConfig({ ...config, royalty_pct: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marketing Fee %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={config.marketing_fee_pct}
                      onChange={(e) => setConfig({ ...config, marketing_fee_pct: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Royalty Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      value={config.min_royalty_amount}
                      onChange={(e) => setConfig({ ...config, min_royalty_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Cycle</Label>
                    <Select value={config.payment_cycle} onValueChange={(v) => setConfig({ ...config, payment_cycle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Effective Date</Label>
                    <Input
                      type="date"
                      value={config.effective_date}
                      onChange={(e) => setConfig({ ...config, effective_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                  {saveConfig.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outlets">
            <Card>
              <CardHeader>
                <CardTitle>Outlet Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Monthly Revenue</TableHead>
                      <TableHead className="text-right">Royalty Due</TableHead>
                      <TableHead className="text-right">Marketing Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Compliance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outletList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No outlets configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      outletList.map((outlet: Outlet) => (
                        <TableRow key={outlet.id}>
                          <TableCell className="font-medium">{outlet.name}</TableCell>
                          <TableCell>{outlet.city}</TableCell>
                          <TableCell className="text-right">{formatCurrency(outlet.monthly_revenue || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(outlet.royalty_due || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(outlet.marketing_fee || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={outlet.status === "active" ? "default" : "secondary"}>
                              {outlet.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{outlet.last_payment_date || "—"}</TableCell>
                          <TableCell>
                            <Badge className={outlet.royalty_paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {outlet.royalty_paid ? "Paid" : "Overdue"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Royalty Invoices</CardTitle>
                <Button onClick={() => generateInvoices.mutate()} disabled={generateInvoices.isPending}>
                  {generateInvoices.isPending ? "Generating..." : "Generate Monthly Invoices"}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Royalty</TableHead>
                      <TableHead className="text-right">Marketing Fee</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No royalty invoices generated yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoiceList.map((inv: FranchiseInvoice) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.outlet_name}</TableCell>
                          <TableCell>{inv.period}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.royalty_amount || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.marketing_fee || 0)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(inv.total || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => window.open(`/api/restaurant/franchise/invoices/${inv.id}/pdf`, "_blank")}>
                              Download PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Franchise Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No applications received
                        </TableCell>
                      </TableRow>
                    ) : (
                      applicationList.map((app: FranchiseApplication) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.applicant_name}</TableCell>
                          <TableCell>{app.city}</TableCell>
                          <TableCell>{app.phone}</TableCell>
                          <TableCell>{app.applied_date}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                app.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : app.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-2">
                            {app.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => updateApplication.mutate({ id: app.id, status: "approved" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateApplication.mutate({ id: app.id, status: "rejected" })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
