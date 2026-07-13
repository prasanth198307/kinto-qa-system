import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  Search,
  IndianRupee,
  Users,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface Invoice {
  invoiceNumber: string;
  invoiceDate: string;
  sourceAccount: string;
  outstandingRupees: number;
  daysOld: number;
}

interface Customer {
  vendorId: string;
  customerName: string;
  outletName?: string;
  mobileNumber: string;
  paymentMode: string;
  isHpRetail: boolean;
  hasChildren: boolean;
  childAccountNames?: string[];
  invoiceCount: number;
  totalOutstandingInvoices: number;
  pendingAmountRupees: number;
  advancesAppliedRupees: number;
  latestInvoiceExcluded: boolean;
  allIncludedDueToOverdue: boolean;
  invoices: Invoice[];
  shippingAddress?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface ApiResponse {
  timestamp: string;
  tenantId: number;
  totalCustomers: number;
  totalPendingRupees: number;
  customers: Customer[];
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function DaysOldBadge({ days }: { days: number }) {
  if (days > 60)
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 no-default-active-elevate">{days}d</Badge>;
  if (days > 30)
    return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 no-default-active-elevate">{days}d</Badge>;
  return <Badge className="bg-muted text-muted-foreground no-default-active-elevate">{days}d</Badge>;
}

function InvoiceRows({ invoices }: { invoices: Invoice[] }) {
  const tenantConfig = useTenantConfig();
  return (
    <TableRow>
      <TableCell colSpan={7} className="p-0 bg-muted/30">
        <div className="px-6 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Invoice Breakdown</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left pb-1 text-xs text-muted-foreground font-medium">Invoice #</th>
                <th className="text-left pb-1 text-xs text-muted-foreground font-medium">Date</th>
                <th className="text-left pb-1 text-xs text-muted-foreground font-medium">Account</th>
                <th className="text-right pb-1 text-xs text-muted-foreground font-medium">Outstanding</th>
                <th className="text-right pb-1 text-xs text-muted-foreground font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoiceNumber} className="border-b border-border/30 last:border-0">
                  <td className="py-1 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="py-1 text-xs text-muted-foreground">
                    {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                  </td>
                  <td className="py-1 text-xs text-muted-foreground max-w-[180px] truncate">{inv.sourceAccount}</td>
                  <td className="py-1 text-right font-medium text-xs">{fmtCur(inv.outstandingRupees, tenantConfig)}</td>
                  <td className="py-1 text-right">
                    <DaysOldBadge days={inv.daysOld} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CustomerOutstandingReport() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<ApiResponse>({
    queryKey: ["/api/external/customer-outstanding"],
    staleTime: 2 * 60 * 1000,
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = (data?.customers ?? []).filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.customerName.toLowerCase().includes(q) ||
      (c.outletName || "").toLowerCase().includes(q) ||
      c.mobileNumber.includes(q)
    );
  });

  const overdueCount = filtered.filter((c) => c.allIncludedDueToOverdue).length;
  const totalFiltered = filtered.reduce((s, c) => s + c.pendingAmountRupees, 0);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customer Outstanding Report</h1>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              As of {format(new Date(dataUpdatedAt), "dd MMM yyyy, h:mm a")}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-outstanding"
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-blue-100 dark:bg-blue-900/30 p-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-xl font-semibold" data-testid="text-total-customers">
                {isLoading ? "—" : data?.totalCustomers ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-green-100 dark:bg-green-900/30 p-2">
              <IndianRupee className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pending</p>
              <p className="text-xl font-semibold" data-testid="text-total-pending">
                {isLoading ? "—" : fmtCur(data?.totalPendingRupees ?? 0, tenantConfig)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-red-100 dark:bg-red-900/30 p-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue Accounts</p>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400" data-testid="text-overdue-count">
                {isLoading ? "—" : overdueCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Outstanding by Customer</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customer or mobile…"
              className="pl-8 h-8 w-56 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-outstanding"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {search && (
            <div className="px-4 pb-2 text-xs text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} — Pending: {fmtCur(totalFiltered, tenantConfig)}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Pending Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search ? "No customers match your search." : "No outstanding balances found."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((customer) => {
                  const rowId = customer.vendorId;
                  const isOpen = expanded.has(rowId);
                  const hasInvoices = customer.invoices.length > 0;
                  return (
                    <>
                      <TableRow
                        key={rowId}
                        className={`${hasInvoices ? "cursor-pointer hover-elevate" : ""} ${customer.allIncludedDueToOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                        onClick={() => hasInvoices && toggle(rowId)}
                        data-testid={`row-customer-${customer.vendorId}`}
                      >
                        <TableCell className="w-8">
                          {hasInvoices ? (
                            isOpen ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-sm leading-tight">{customer.customerName}</p>
                            {customer.outletName && (
                              <p className="text-xs text-muted-foreground mt-0.5">{customer.outletName}</p>
                            )}
                            {customer.hasChildren && customer.childAccountNames && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                + {customer.childAccountNames.join(", ")}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {customer.mobileNumber || "—"}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize no-default-active-elevate">
                            {customer.paymentMode === "bill_to_bill" ? "Bill-to-Bill" : "COD"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{customer.invoiceCount}</span>
                          {customer.totalOutstandingInvoices > customer.invoiceCount && (
                            <span className="text-xs text-muted-foreground ml-1">
                              /{customer.totalOutstandingInvoices}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {customer.allIncludedDueToOverdue && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs no-default-active-elevate">
                                Overdue
                              </Badge>
                            )}
                            {customer.latestInvoiceExcluded && (
                              <Badge variant="outline" className="text-xs no-default-active-elevate">
                                1 held
                              </Badge>
                            )}
                            {customer.advancesAppliedRupees > 0 && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs no-default-active-elevate">
                                Adv {fmtCur(customer.advancesAppliedRupees, tenantConfig)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <span className="font-semibold text-sm">
                            {fmtCur(customer.pendingAmountRupees, tenantConfig)}
                          </span>
                        </TableCell>
                      </TableRow>

                      {isOpen && <InvoiceRows invoices={customer.invoices} />}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
