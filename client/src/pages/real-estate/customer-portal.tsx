import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, Printer, Home, IndianRupee, FileText, Building2 } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function CustomerPortalPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["re-customer-search", query],
    queryFn: () => api("GET", `/api/real-estate/customers/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
  const results = Array.isArray(searchResults) ? searchResults : [];

  const { data: account, isLoading: loadingAccount } = useQuery({
    queryKey: ["re-customer-account", selectedCustomer?.id],
    queryFn: () => api("GET", `/api/real-estate/customers/${selectedCustomer.id}/account`),
    enabled: !!selectedCustomer?.id,
  });

  const units = Array.isArray(account?.units) ? account.units : [];
  const payments = Array.isArray(account?.payments) ? account.payments : [];
  const dues = Array.isArray(account?.dues) ? account.dues : [];
  const documents = Array.isArray(account?.documents) ? account.documents : [];
  const milestones = Array.isArray(account?.milestones) ? account.milestones : [];

  function handlePrint() { window.print(); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Portal</h1>
        {selectedCustomer && (
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print Statement</Button>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search customer by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setQuery(search)} disabled={search.length < 2}>
          <Search className="w-4 h-4 mr-2" />Search
        </Button>
      </div>

      {query.length >= 2 && !selectedCustomer && (
        <Card>
          <CardContent className="p-0">
            {searching && <div className="p-6 text-center text-muted-foreground">Searching...</div>}
            {!searching && results.length === 0 && <div className="p-6 text-center text-muted-foreground">No customers found.</div>}
            {!searching && results.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
                <div>
                  <p className="font-medium">{c.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{c.phone} · {c.email}</p>
                </div>
                <Button size="sm" onClick={() => setSelectedCustomer(c)}>View Account</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedCustomer && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold">{selectedCustomer.customer_name}</h2>
              <p className="text-sm text-muted-foreground">{selectedCustomer.phone} · {selectedCustomer.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setQuery(""); setSearch(""); }}>Change Customer</Button>
          </div>

          {loadingAccount && <div className="p-8 text-center text-muted-foreground">Loading account...</div>}

          {!loadingAccount && account && (
            <Tabs defaultValue="units">
              <TabsList>
                <TabsTrigger value="units"><Home className="w-4 h-4 mr-1" />Units ({units.length})</TabsTrigger>
                <TabsTrigger value="payments"><IndianRupee className="w-4 h-4 mr-1" />Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="dues">Dues ({dues.length})</TabsTrigger>
                <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" />Documents ({documents.length})</TabsTrigger>
                <TabsTrigger value="progress"><Building2 className="w-4 h-4 mr-1" />Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="units">
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Unit</TableHead><TableHead>Project</TableHead><TableHead>Tower</TableHead><TableHead>Floor</TableHead><TableHead className="text-right">Area (sqft)</TableHead><TableHead className="text-right">Total Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {units.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No units.</TableCell></TableRow>}
                      {units.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.unit_number}</TableCell>
                          <TableCell>{u.project_name}</TableCell>
                          <TableCell>{u.tower}</TableCell>
                          <TableCell>{u.floor}</TableCell>
                          <TableCell className="text-right">{u.area_sqft?.toLocaleString()}</TableCell>
                          <TableCell className="text-right">₹{Number(u.total_value || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge>{u.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Mode</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No payments.</TableCell></TableRow>}
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell>{p.reference}</TableCell>
                          <TableCell>{p.unit_number}</TableCell>
                          <TableCell className="text-right font-medium">₹{Number(p.amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{p.mode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="dues">
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Demand #</TableHead><TableHead>Unit</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Due Amt</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {dues.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No pending dues.</TableCell></TableRow>}
                      {dues.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.demand_number}</TableCell>
                          <TableCell>{d.unit_number}</TableCell>
                          <TableCell className={d.status === "overdue" ? "text-red-600 font-medium" : ""}>{d.due_date}</TableCell>
                          <TableCell className="text-right">₹{Number(d.due_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">₹{Number(d.balance || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant={d.status === "overdue" ? "destructive" : "secondary"}>{d.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="documents">
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Unit</TableHead><TableHead>Document</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {documents.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No documents.</TableCell></TableRow>}
                      {documents.map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.unit_number}</TableCell>
                          <TableCell className="capitalize">{d.doc_type}</TableCell>
                          <TableCell><Badge variant={d.status === "submitted" ? "outline" : d.status === "received" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{d.remarks || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="progress">
                <div className="grid gap-4">
                  {milestones.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No milestones available.</CardContent></Card>}
                  {milestones.map((m: any) => (
                    <Card key={m.id}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">{m.milestone_name}</CardTitle>
                        <Badge variant={m.status === "completed" ? "outline" : m.status === "delayed" ? "destructive" : "default"}>{m.status}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <Progress value={Number(m.completion_percent || 0)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{m.completion_percent}% complete</span>
                          <span>Planned: {m.planned_date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}
