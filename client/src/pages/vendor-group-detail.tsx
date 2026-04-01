import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  IndianRupee,
  TrendingUp,
  FileText,
  Users,
  Eye,
  Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubDealer {
  vendorId: string;
  vendorCode: string;
  subDealerName: string;
  gstNumber: string | null;
  mobileNumber: string;
  city: string | null;
  state: string | null;
  invoiceCount: number;
  totalInvoiced: number;
  totalReceived: number;
  totalCredits: number;
  totalDebits: number;
  totalAdvances: number;
  outstanding: number;
  lastTransactionDate: string | null;
}

interface GroupDetailResponse {
  group: {
    vendorName: string;
    subDealerCount: number;
    invoiceCount: number;
    totalInvoiced: number;
    totalReceived: number;
    totalCredits: number;
    totalDebits: number;
    totalAdvances: number;
    outstanding: number;
  };
  subDealers: SubDealer[];
}

export default function VendorGroupDetailPage() {
  const { vendorName } = useParams<{ vendorName: string }>();
  const [, setLocation] = useLocation();

  const decodedName = decodeURIComponent(vendorName || "");

  const { data, isLoading } = useQuery<GroupDetailResponse>({
    queryKey: ["/api/vendor-group", vendorName],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-group/${encodeURIComponent(decodedName)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch vendor group detail");
      return res.json();
    },
    enabled: !!vendorName,
  });

  const formatCurrency = (amount: number) =>
    (amount / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/vendor-history")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-group-name">
              {isLoading ? (
                <Skeleton className="h-7 w-80" />
              ) : (
                decodedName
              )}
            </h1>
            {!isLoading && data && (
              <Badge variant="outline" className="text-blue-600 border-blue-200 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {data.group.subDealerCount} sub-dealers
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Consolidated view — click a sub-dealer row to see its full invoice ledger
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-sub-dealer-count">
                {data?.group.subDealerCount || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-invoiced">
                {formatCurrency(data?.group.totalInvoiced || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{data?.group.invoiceCount || 0} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-received">
                {formatCurrency(data?.group.totalReceived || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div
                className={`text-2xl font-bold ${
                  (data?.group.outstanding || 0) > 0
                    ? "text-orange-600"
                    : (data?.group.outstanding || 0) < 0
                    ? "text-green-600"
                    : ""
                }`}
                data-testid="text-total-outstanding"
              >
                {formatCurrency(data?.group.outstanding || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-Dealers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sub-Dealer Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub-Dealer / Buyer Name</TableHead>
                  <TableHead>GST / Code</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead className="text-right">Total Invoiced</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Last Transaction</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.subDealers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No sub-dealers found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.subDealers.map((dealer) => (
                    <TableRow
                      key={dealer.vendorId}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/vendor-history/${dealer.vendorId}`)}
                      data-testid={`row-dealer-${dealer.vendorId}`}
                    >
                      <TableCell>
                        <div className="font-medium" data-testid={`text-dealer-name-${dealer.vendorId}`}>
                          {dealer.subDealerName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>{dealer.gstNumber || "-"}</div>
                        <div className="text-xs">{dealer.vendorCode}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" data-testid={`badge-invoices-${dealer.vendorId}`}>
                          {dealer.invoiceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(dealer.totalInvoiced)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(dealer.totalReceived)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            dealer.outstanding > 0
                              ? "text-orange-600"
                              : dealer.outstanding < 0
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {formatCurrency(dealer.outstanding)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {formatDate(dealer.lastTransactionDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/vendor-history/${dealer.vendorId}`);
                          }}
                          data-testid={`button-view-${dealer.vendorId}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Total Row */}
          {!isLoading && data && data.subDealers.length > 0 && (
            <div className="border-t px-4 py-3 flex flex-wrap justify-between gap-4 text-sm">
              <span className="font-medium text-muted-foreground">
                {data.group.subDealerCount} sub-dealers · {data.group.invoiceCount} invoices total
              </span>
              <div className="flex gap-6">
                <span>
                  Invoiced:{" "}
                  <span className="font-semibold">{formatCurrency(data.group.totalInvoiced)}</span>
                </span>
                <span>
                  Received:{" "}
                  <span className="font-semibold text-green-600">{formatCurrency(data.group.totalReceived)}</span>
                </span>
                <span>
                  Outstanding:{" "}
                  <span className={`font-semibold ${data.group.outstanding > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {formatCurrency(data.group.outstanding)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
