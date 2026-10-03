import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { Calendar, Download, ChevronsUpDown, BookOpen, X } from "lucide-react";
import { downloadXLSX } from "@/lib/download-utils";
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

function formatAmount(paise: number | null | undefined, config: ReturnType<typeof useTenantConfig>): string {
  const val = Number(paise) || 0;
  if (val === 0) return "-";
  const formatted = fmtCur(Math.abs(val) / 100, config);
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
  const tenantConfig = useTenantConfig();
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const urlAccountId = urlParams.get("accountId") || "";
  const urlFromDate = urlParams.get("fromDate") || "";
  const urlToDate = urlParams.get("toDate") || "";

  const hasCustomUrlDates = !!urlFromDate && !!urlToDate;

  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  // Multi-select: array of account IDs
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(urlAccountId ? [urlAccountId] : []);
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
    if (accId) setSelectedAccountIds([accId]);
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

  // Fetch ledger for each selected account
  const ledgerQueries = useQueries({
    queries: selectedAccountIds.map(accountId => ({
      queryKey: ["/api/ledger", accountId, dateMode, selectedFY, customFrom, customTo],
      queryFn: async (): Promise<LedgerResponse> => {
        const res = await fetch(`/api/ledger/${accountId}?${queryParams}`, { credentials: 'include' });
        if (!res.ok) throw new Error("Failed to fetch ledger data");
        return res.json();
      },
      enabled: !!accountId,
    })),
  });

  const allLoading = ledgerQueries.some(q => q.isLoading);
  const ledgerResults = ledgerQueries.map(q => q.data).filter(Boolean) as LedgerResponse[];

  const fyStartYear = parseInt(selectedFY);
  const periodLabel = dateMode === "custom" && isCustomValid
    ? `${formatDate(customFrom)} to ${formatDate(customTo)}`
    : `Apr ${fyStartYear} – Mar ${fyStartYear + 1}`;

  // Toggle account selection
  function toggleAccount(id: string) {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function removeAccount(id: string) {
    setSelectedAccountIds(prev => prev.filter(x => x !== id));
  }

  function selectAllInGroup(groupAccounts: typeof accountsList) {
    const ids = groupAccounts.map(a => a.id);
    setSelectedAccountIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  }

  // Combined totals across all accounts
  const combinedDebit  = ledgerResults.reduce((s, d) => s + (Number(d.periodDebit)  || 0), 0);
  const combinedCredit = ledgerResults.reduce((s, d) => s + (Number(d.periodCredit) || 0), 0);
  const combinedClose  = ledgerResults.reduce((s, d) => s + (Number(d.closingBalance) || 0), 0);
  const combinedOpen   = ledgerResults.reduce((s, d) => s + (Number(d.openingBalance) || 0), 0);

  async function downloadExcel() {
    if (!ledgerResults.length) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    for (const ledgerData of ledgerResults) {
      const rows: Record<string, string | number>[] = [];
      rows.push({ Date: "", "Journal #": "", Description: "Opening Balance", Debit: "", Credit: "", Balance: (Number(ledgerData.openingBalance) || 0) / 100 });
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
      rows.push({ Date: "", "Journal #": "", Description: "Closing Balance", Debit: (Number(ledgerData.periodDebit) || 0) / 100, Credit: (Number(ledgerData.periodCredit) || 0) / 100, Balance: (Number(ledgerData.closingBalance) || 0) / 100 });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 45 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      const sheetName = ledgerData.account.name.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    const suffix = ledgerResults.length === 1 ? ledgerResults[0].account.name.replace(/[^a-zA-Z0-9]/g, "_") : `${ledgerResults.length}_accounts`;
    await downloadXLSX(wb, `Ledger_${suffix}_${selectedFY}.xlsx`);
    toast({ title: "Downloaded", description: `Ledger exported — ${ledgerResults.length} sheet(s)` });
  }

  const selectedAccounts = accountsList.filter(a => selectedAccountIds.includes(a.id));
  const [accountSearch, setAccountSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountPopoverOpen(false);
      }
    }
    if (accountPopoverOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountPopoverOpen]);

  const filteredGroups = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return groupAccountsByParent(accountsList)
      .map(group => ({
        ...group,
        accounts: group.accounts.filter(a =>
          !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.accounts.length > 0);
  }, [accountsList, accountSearch]);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-ledger-view">
      {/* Header */}
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
              <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-[140px]" data-testid="input-date-from" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-[140px]" data-testid="input-date-to" />
            </div>
          )}

          {ledgerResults.length > 0 && (
            <Button variant="outline" onClick={downloadExcel} data-testid="button-download-excel">
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
          )}
        </div>
      </div>

      {/* Multi-select account picker — plain HTML, no cmdk */}
      <div className="space-y-2">
        <div className="relative max-w-lg" ref={dropdownRef}>
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setAccountPopoverOpen(o => !o)}
            className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent focus:outline-none"
            data-testid="button-select-account"
          >
            <span className="truncate text-left">
              {selectedAccountIds.length === 0
                ? <span className="text-muted-foreground">Select accounts... (multi-select)</span>
                : selectedAccountIds.length === 1 && selectedAccounts[0]
                  ? <span><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono mr-2">{selectedAccounts[0].code}</code>{selectedAccounts[0].name}</span>
                  : <span>{selectedAccountIds.length} accounts selected</span>
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>

          {/* Dropdown panel */}
          {accountPopoverOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg" style={{maxHeight: '360px', display: 'flex', flexDirection: 'column'}}>
              {/* Search */}
              <div className="p-2 border-b">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search by code or name..."
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="input-search-account"
                />
              </div>
              {/* Count + clear */}
              <div className="px-3 py-1.5 border-b flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedAccountIds.length} selected</span>
                {selectedAccountIds.length > 0 && (
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); setSelectedAccountIds([]); }}
                    className="text-destructive hover:underline"
                  >Clear all</button>
                )}
              </div>
              {/* List */}
              <div style={{overflowY: 'auto', flex: 1}}>
                {filteredGroups.length === 0 && (
                  <div className="px-3 py-4 text-sm text-center text-muted-foreground">No accounts found</div>
                )}
                {filteredGroups.map(group => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 sticky top-0 flex items-center justify-between">
                      <span>{group.label}</span>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); selectAllInGroup(group.accounts); }}
                        className="text-primary hover:underline font-normal ml-2 shrink-0"
                      >
                        {group.accounts.every(a => selectedAccountIds.includes(a.id)) ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {group.accounts.map(account => {
                      const isSelected = selectedAccountIds.includes(account.id);
                      return (
                        <label
                          key={account.id}
                          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm ${isSelected ? 'bg-primary/5' : ''}`}
                          data-testid={`option-account-${account.code}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAccount(account.id)}
                            className="h-4 w-4 rounded border-input accent-primary"
                          />
                          <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono shrink-0">{account.code}</code>
                          <span className="truncate">{account.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected chips */}
        {selectedAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedAccounts.map(acc => (
              <span key={acc.id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                <code className="font-mono">{acc.code}</code>
                <span>{acc.name}</span>
                <button type="button" onClick={() => removeAccount(acc.id)} className="ml-0.5 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {selectedAccountIds.length === 0 && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-select-prompt">
              Select one or more accounts above to view their ledger
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {selectedAccountIds.length > 0 && allLoading && (
        <div className="flex items-center justify-center h-48" data-testid="loading-ledger">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Combined summary when multiple accounts */}
      {ledgerResults.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Combined Opening", value: combinedOpen },
            { label: "Combined Debit",   value: combinedDebit },
            { label: "Combined Credit",  value: combinedCredit },
            { label: "Combined Closing", value: combinedClose },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{formatAmount(value, tenantConfig)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Per-account ledger sections */}
      {ledgerResults.map((ledgerData) => (
        <div key={ledgerData.account.id} className="space-y-3">
          {/* Account header with summary */}
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{ledgerData.account.code}</code>
            <span className="font-semibold text-sm">{ledgerData.account.name}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Opening Balance</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-opening-balance">
                  {formatAmount(ledgerData.openingBalance, tenantConfig)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Period Debit</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-period-debit">
                  {formatAmount(ledgerData.periodDebit, tenantConfig)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Period Credit</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-period-credit">
                  {formatAmount(ledgerData.periodCredit, tenantConfig)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Closing Balance</div>
                <div className="text-sm font-semibold font-mono tabular-nums mt-0.5" data-testid="text-closing-balance">
                  {formatAmount(ledgerData.closingBalance, tenantConfig)}
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
                      {formatAmount(ledgerData.openingBalance, tenantConfig)}
                    </td>
                  </tr>
                  {ledgerData.transactions.map((txn, idx) => (
                    <tr key={txn.lineId || idx} className="hover-elevate" data-testid={`row-txn-${txn.lineId || idx}`}>
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{formatDate(txn.journalDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{txn.journalNumber}</code>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate max-w-[400px]">
                          {txn.description}
                          {txn.partyName && <span className="text-muted-foreground"> | {txn.partyName}</span>}
                        </div>
                        {txn.memo && <div className="text-xs text-muted-foreground truncate max-w-[400px]">{txn.memo}</div>}
                      </td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">{formatAmount(txn.debit, tenantConfig)}</td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums whitespace-nowrap">{formatAmount(txn.credit, tenantConfig)}</td>
                      <td className="text-right px-4 py-2 font-mono tabular-nums font-medium whitespace-nowrap">{formatAmount(txn.balance, tenantConfig)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="px-4 py-3" colSpan={3}>
                      <span className="text-xs font-semibold uppercase tracking-wide">Closing Balance</span>
                    </td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap">{formatAmount(ledgerData.periodDebit, tenantConfig)}</td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap">{formatAmount(ledgerData.periodCredit, tenantConfig)}</td>
                    <td className="text-right px-4 py-3 font-mono tabular-nums whitespace-nowrap">{formatAmount(ledgerData.closingBalance, tenantConfig)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {ledgerData.transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions found for this period</p>
          )}
        </div>
      ))}
    </div>
  );
}
