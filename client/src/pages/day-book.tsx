import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Calendar, Download, Search, FileStack } from "lucide-react";
import { downloadXLSX } from "@/lib/download-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface JournalLine {
  lineId: string;
  journalId: string;
  accountId: string;
  debit: number;
  credit: number;
  memo: string | null;
  partyName: string | null;
  accountCode: string;
  accountName: string;
}

interface DayBookEntry {
  id: string;
  journalNumber: string;
  journalDate: string;
  sourceType: string | null;
  sourceId: string | null;
  description: string | null;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}

interface DayBookResponse {
  entries: DayBookEntry[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  sourceTypes: string[];
}

function formatAmount(paise: number | null | undefined): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const abs = Math.abs(val);
  const formatted = (abs / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return val < 0 ? `(${formatted})` : formatted;
}

function formatSourceType(type: string | null): string {
  if (!type) return "Other";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function DayBookPage() {
  const { toast } = useToast();
  const today = getTodayStr();

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [sourceType, setSourceType] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const limit = 50;

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("fromDate", fromDate);
    params.set("toDate", toDate);
    if (sourceType !== "all") params.set("sourceType", sourceType);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return params.toString();
  }, [fromDate, toDate, sourceType, page]);

  const { data, isLoading } = useQuery<DayBookResponse>({
    queryKey: ["/api/day-book", fromDate, toDate, sourceType, page],
    queryFn: async () => {
      const res = await fetch(`/api/day-book?${queryParams}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch day book");
      return res.json();
    },
  });

  const entries = data?.entries || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;
  const sourceTypes = data?.sourceTypes || [];

  const summaryDebit = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.totalDebit) || 0), 0),
    [entries]
  );
  const summaryCredit = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.totalCredit) || 0), 0),
    [entries]
  );

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDownloadExcel() {
    try {
      const XLSX = await import("xlsx");

      const rows: Record<string, string | number>[] = [];
      entries.forEach((entry) => {
        entry.lines.forEach((line) => {
          rows.push({
            "Journal #": entry.journalNumber,
            Date: formatDate(entry.journalDate),
            "Source Type": formatSourceType(entry.sourceType),
            Description: entry.description || "",
            Status: entry.status,
            "Account Code": line.accountCode,
            "Account Name": line.accountName,
            "Party Name": line.partyName || "",
            Debit: (Number(line.debit) || 0) / 100,
            Credit: (Number(line.credit) || 0) / 100,
            Memo: line.memo || "",
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 30 },
        { wch: 10 },
        { wch: 12 },
        { wch: 30 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Day Book");
      await downloadXLSX(wb, `Day_Book_${fromDate}_to_${toDate}.xlsx`);
      toast({ title: "Downloaded", description: "Day Book exported as Excel (.xlsx)" });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Could not export Day Book",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-day-book">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" data-testid="page-day-book">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <FileStack className="w-5 h-5" />
            Day Book
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-subtitle">
            Chronological view of all journal entries
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadExcel} data-testid="button-download-excel">
          <Download className="w-4 h-4 mr-1" /> Download Excel
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            data-testid="input-from-date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            data-testid="input-to-date"
          />
        </div>
        <Select
          value={sourceType}
          onValueChange={(v) => {
            setSourceType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]" data-testid="select-source-type">
            <SelectValue placeholder="All Voucher Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Voucher Types</SelectItem>
            {sourceTypes.map((st) => (
              <SelectItem key={st} value={st}>
                {formatSourceType(st)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Entries</div>
            <div className="text-lg font-semibold mt-0.5" data-testid="text-total-entries">
              {totalCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Debit</div>
            <div className="text-lg font-semibold mt-0.5 font-mono tabular-nums" data-testid="text-total-debit">
              {formatAmount(summaryDebit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Credit</div>
            <div className="text-lg font-semibold mt-0.5 font-mono tabular-nums" data-testid="text-total-credit">
              {formatAmount(summaryCredit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileStack className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground" data-testid="text-no-entries">
              No journal entries found for the selected period.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isExpanded = expandedIds.has(entry.id);
            return (
              <Card key={entry.id} data-testid={`card-entry-${entry.id}`}>
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover-elevate"
                  onClick={() => toggleExpanded(entry.id)}
                  data-testid={`button-toggle-entry-${entry.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-medium text-sm"
                        data-testid={`text-journal-number-${entry.id}`}
                      >
                        {entry.journalNumber}
                      </span>
                      <Badge variant="secondary" data-testid={`badge-source-${entry.id}`}>
                        {formatSourceType(entry.sourceType)}
                      </Badge>
                      {entry.status && entry.status !== "posted" && (
                        <Badge variant="outline" data-testid={`badge-status-${entry.id}`}>
                          {entry.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5" data-testid={`text-description-${entry.id}`}>
                      {formatDate(entry.journalDate)}
                      {entry.description && ` — ${entry.description}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono tabular-nums" data-testid={`text-debit-${entry.id}`}>
                      {formatAmount(entry.totalDebit)}
                    </div>
                    <div className="text-sm font-mono tabular-nums text-muted-foreground" data-testid={`text-credit-${entry.id}`}>
                      {formatAmount(entry.totalCredit)}
                    </div>
                  </div>
                </div>
                {isExpanded && entry.lines && entry.lines.length > 0 && (
                  <CardContent className="p-0 border-t" data-testid={`lines-${entry.id}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Account</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Party</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[120px]">Debit</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-[120px]">Credit</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Memo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr
                              key={line.lineId}
                              className="border-b last:border-b-0"
                              data-testid={`row-line-${line.lineId}`}
                            >
                              <td className="px-4 py-2">
                                <span className="text-xs text-muted-foreground mr-1.5">{line.accountCode}</span>
                                <span>{line.accountName}</span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{line.partyName || "-"}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {formatAmount(line.debit)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">
                                {formatAmount(line.credit)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{line.memo || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap" data-testid="pagination-controls">
          <p className="text-sm text-muted-foreground" data-testid="text-page-info">
            Page {page} of {totalPages} ({totalCount} entries)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
