import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Download, Search, Check, ChevronsUpDown, BookOpen } from "lucide-react";
import { groupAccountsByParent } from "@/lib/account-hierarchy";

interface AccountListItem {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType?: string;
  parentId?: string | null;
  level?: number;
}

interface LedgerTransaction {
  lineId: string;
  journalId: string;
  journalNumber: string;
  journalDate: string;
  description: string;
  sourceType: string;
  sourceId: string;
  debit: number;
  credit: number;
  balance: number;
  memo: string;
  partyName: string;
}

interface LedgerResponse {
  account: { id: string; code: string; name: string; accountType: string };
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerTransaction[];
  periodDebit: number;
  periodCredit: number;
}

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return String(year);
}

function getAvailableFYs(): string[] {
  const currentFYStart = parseInt(getCurrentFY());
  return Array.from({ length: 4 }, (_, i) => String(currentFYStart - i));
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function formatAmount(paise: number | null | undefined): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const abs = Math.abs(val);
  const formatted = (abs / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  return val < 0 ? `(${formatted})` : formatted;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function LedgerViewPage() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const urlAccountId = urlParams.get("accountId") || "";
  const urlFromDate = urlParams.get("fromDate") || "";
  const urlToDate = urlParams.get("toDate") || "";

  const hasCustomUrlDates = !!urlFromDate && !!urlToDate;

  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [selectedAccountId, setSelectedAccountId] = useState<string>(urlAccountId);
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [dateMode, setDateMode] = useState<"fy" | "custom">(hasCustomUrlDates ? "custom" : "fy");
  const [customFrom, setCustomFrom] = useState(urlFromDate);
  const [customTo, setCustomTo] = useState(urlToDate);

  const prevSearchRef = useRef(searchString);
  useEffect(() => {
    if (prevSearchRef.current === searchString) return;
    prevSearchRef.current = searchString;
    const params = new URLSearchParams(searchString);
    const accId = params.get("accountId") || "";
    const from = params.get("fromDate") || "";
    const to = params.get("toDate") || "";
    if (accId) setSelectedAccountId(accId);
    if (from && to) {
      setDateMode("custom");
      setCustomFrom(from);
      setCustomTo(to);
    }
  }, [searchString]);

  const { data: accountsList = [], isLoading: accountsLoading } = useQuery<AccountListItem[]>({
    queryKey: ["/api/chart-of-accounts-list"],
  });

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const queryParams = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `fromDate=${customFrom}&toDate=${customTo}`;
    }
    return `fy=${selectedFY}`;
  })();

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery<LedgerResponse>({
    queryKey: ["/api/ledger", selectedAccountId, dateMode, selectedFY, customFrom, customTo],
    queryFn: async () => {
      const res = await fetch(`/api/ledger/${selectedAccountId}?${queryParams}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch ledger data");
      return res.json();
    },
    enabled: !!selectedAccountId,
  });

  const selectedAccount = accountsList.find(a => a.id === selectedAccountId);

  const fyStartYear = parseInt(selectedFY);
  const periodLabel = dateMode === "custom" && isCustomValid
    ? `${formatDate(customFrom)} to ${formatDate(customTo)}`
    : `Apr ${fyStartYear} \u2013 Mar ${fyStartYear + 1}`;

  async function downloadExcel() {
    if (!ledgerData) return;
    const XLSX = await import("xlsx");

    const rows: Record<string, string | number>[] = [];

    rows.push({
      Date: "",
      "Journal #": "",
      Description: "Opening Balance",
      Debit: "",
      Credit: "",
      Balance: (Number(ledgerData.openingBalance) || 0) / 100,
    });

    for (const txn of ledgerData.transactions) {
      rows.push({
        Date: txn.journalDate,
        "Journal #": txn.journalNumber,
        Description: txn.description + (txn.partyName ? ` | ${txn.partyName}` : "") + (txn.memo ? ` | ${txn.memo}` : ""),
        Debit: (Number(txn.debit) || 0) / 100,
        Credit: (Number(txn.credit) || 0) / 100,
        Balance: (Number(txn.balance) || 0) / 100,
      });
    }

    rows.push({
      Date: "",
      "Journal #": "",
      Description: "Closing Balance",
      Debit: (Number(ledgerData.periodDebit) || 0) / 100,
      Credit: (Number(ledgerData.periodCredit) || 0) / 100,
      Balance: (Number(ledgerData.closingBalance) || 0) / 100,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 45 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    const accountName = ledgerData.account.name.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `Ledger_${accountName}_${selectedFY}.xlsx`);
    toast({ title: "Downloaded", description: "Ledger exported as Excel (.xlsx)" });
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-ledger-view">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Ledger View</h1>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as "fy" | "custom")}>
            <SelectTrigger className="w-[130px]" data-testid="select-date-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">Financial Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === "fy" && (
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[150px]" data-testid="select-financial-year">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableFYs().map(fy => (
                  <SelectItem key={fy} value={fy}>{getFYLabel(fy)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {dateMode === "custom" && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-[140px]"
                data-testid="input-date-to"
              />
            </div>
          )}

          {ledgerData && (
            <Button variant="outline" onClick={downloadExcel} data-testid="button-download-excel">
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
          )}
        </div>
      </div>

      <div>
        <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={accountPopoverOpen}
              className="w-full max-w-lg justify-between font-normal"
              data-testid="button-select-account"
            >
              {selectedAccount ? (
                <span className="truncate">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono mr-2">{selectedAccount.code}</code>
                  {selectedAccount.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Select an account...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by code or name..." data-testid="input-search-account" />
              <CommandList>
                <CommandEmpty>No account found.</CommandEmpty>
                {groupAccountsByParent(accountsList).map(group => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.accounts.map(account => (
                      <CommandItem
                        key={account.id}
                        value={`${account.code} ${account.name}`}
                        onSelect={() => {
                          setSelectedAccountId(account.id);
                          setAccountPopoverOpen(false);
                        }}
                        data-testid={`option-account-${account.code}`}
                      >
                        <Check className={`mr-2 h-4 w-4 ${selectedAccountId === account.id ? "opacity-100" : "opacity-0"}`} />
                        <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono mr-2 shrink-0">{account.code}</code>
                        <span className="truncate">{account.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!selectedAccountId && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-select-prompt">
              Select an account above to view its ledger
            </p>
          </CardContent>
        </Card>
      )}

      {selectedAccountId && ledgerLoading && (
        <div className="flex items-center justify-center h-48" data-testid="loading-ledger">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {ledgerData && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Opening Balance</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-opening-balance">
                  {formatAmount(ledgerData.openingBalance)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Period Debit</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-period-debit">
                  {formatAmount(ledgerData.periodDebit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Period Credit</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-period-credit">
                  {formatAmount(ledgerData.periodCredit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Closing Balance</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-closing-balance">
                  {formatAmount(ledgerData.closingBalance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-ledger">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap w-[110px]">Date</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap w-[100px]">Journal #</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Description / Narration</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Debit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap w-[130px]">Credit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap w-[140px]">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="bg-muted/20" data-testid="row-opening-balance">
                    <td className="px-4 py-2" colSpan={3}>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Opening Balance</span>
                    </td>
                    <td className="text-right px-4 py-2" colSpan={2}></td>
                    <td className="text-right px-4 py-2 font-mono tabular-nums font-medium whitespace-nowrap" data-testid="value-opening-balance">
                      {formatAmount(ledgerData.openingBalance)}
                    </td>
                  </tr>
                  {ledgerData.transactions.map((txn, idx) => (
                    <tr key={txn.lineId || idx} className="hover-elevate" data-testid={`row-txn-${txn.lineId || idx}`}>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground" data-testid={`date-${txn.lineId || idx}`}>
                        {formatDate(txn.journalDate)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" data-testid={`journal-${txn.lineId || idx}`}>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{txn.journalNumber}</code>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate max-w-[400px]" data-testid={`desc-${txn.lineId || idx}`}>
                          {txn.description}
                          {txn.partyName && (
                            <span className="text-muted-foreground"> | {txn.partyName}</span>
                          )}
                        </div>
                        {txn.memo && (
                          <div className="text-xs text-muted-foreground truncate max-w-[400px]">{txn.memo}</div>
                        )}
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap" data-testid={`debit-${txn.lineId || idx}`}>
                        {formatAmount(txn.debit)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap" data-testid={`credit-${txn.lineId || idx}`}>
                        {formatAmount(txn.credit)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums font-medium whitespace-nowrap" data-testid={`balance-${txn.lineId || idx}`}>
                        {formatAmount(txn.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold" data-testid="row-closing-balance">
                    <td className="px-4 py-3" colSpan={3}>
                      <span className="text-xs font-semibold uppercase tracking-wide">Closing Balance</span>
                    </td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-debit">
                      {formatAmount(ledgerData.periodDebit)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="total-credit">
                      {formatAmount(ledgerData.periodCredit)}
                    </td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap" data-testid="value-closing-balance">
                      {formatAmount(ledgerData.closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {ledgerData.transactions.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground" data-testid="text-no-transactions">
                  No transactions found for this period
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
