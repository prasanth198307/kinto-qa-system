import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { exportToExcel } from "@/lib/excel-export";

interface GroupAccount {
  id: string;
  code: string;
  name: string;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
}

interface AccountGroup {
  accountType: string;
  subType: string;
  accounts: GroupAccount[];
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalClosing: number;
}

interface TypeTotal {
  accountType: string;
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalClosing: number;
  groupCount: number;
  accountCount: number;
}

interface GroupSummaryResponse {
  groups: AccountGroup[];
  typeTotals: TypeTotal[];
}

function getCurrentFY(): string {
  const now = new Date();
  return String(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
}

function getFYLabel(startYear: string): string {
  const y = parseInt(startYear);
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

function getAvailableFYs(): string[] {
  const current = parseInt(getCurrentFY());
  return Array.from({ length: 4 }, (_, i) => String(current - i));
}

function getFYDates(fy: string): { start: string; end: string } {
  const y = parseInt(fy);
  return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
}

function formatAmount(paise: number): string {
  if (paise === 0) return "-";
  const rupees = Math.abs(paise) / 100;
  return rupees.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"];
const TYPE_LABELS: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

const SUBTYPE_LABELS: Record<string, Record<string, string>> = {
  asset: {
    current_asset: "Current Assets",
    trade_receivable: "Sundry Debtors",
    inventory: "Stock-in-Hand",
    gst_input: "Duties & Taxes (Input Credit)",
    other: "Other Assets",
  },
  liability: {
    trade_payable: "Sundry Creditors",
    gst: "Duties & Taxes (GST)",
    loan: "Secured/Unsecured Loans",
    statutory: "Statutory Liabilities",
    advance_liability: "Advance from Customers",
    other: "Other Liabilities",
  },
  equity: {
    capital: "Capital Account",
    drawings: "Drawings Account",
    retained: "Profit & Loss A/c",
    other: "Other Equity",
  },
  revenue: {
    operating: "Sales & Operating Income",
    other_income: "Other Income",
    other: "Other Revenue",
  },
  expense: {
    direct: "Direct Expenses",
    operating: "Indirect Expenses",
    administrative: "Administrative Expenses",
    financial: "Financial Expenses",
    other: "Other Expenses",
  },
};

function getSubTypeLabel(accountType: string, subType: string): string {
  return SUBTYPE_LABELS[accountType]?.[subType] || subType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function GroupSummaryPage() {
  const [, setLocation] = useLocation();
  const [dateMode, setDateMode] = useState<"fy" | "custom">("fy");
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const isCustomValid = dateMode === "custom" && customFrom && customTo && customFrom <= customTo;

  const { fromDate, toDate } = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return { fromDate: customFrom, toDate: customTo };
    }
    const dates = getFYDates(selectedFY);
    return { fromDate: dates.start, toDate: dates.end };
  })();

  const { data, isLoading } = useQuery<GroupSummaryResponse>({
    queryKey: ['/api/group-summary', fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/group-summary?fromDate=${fromDate}&toDate=${toDate}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch group summary");
      return res.json();
    },
  });

  const currentPeriodLabel = (() => {
    if (dateMode === "custom" && isCustomValid) {
      return `${formatDateDisplay(customFrom)} to ${formatDateDisplay(customTo)}`;
    }
    const fyStart = parseInt(selectedFY);
    return `Apr ${fyStart} \u2013 Mar ${fyStart + 1}`;
  })();

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleAccountClick(account: GroupAccount) {
    const params = new URLSearchParams();
    params.set("accountId", account.id);
    params.set("fromDate", fromDate);
    params.set("toDate", toDate);
    setLocation(`/ledger-view?${params.toString()}`);
  }

  function handleExcelDownload() {
    if (!data) return;
    const fmtRupees = (paise: number) => paise === 0 ? 0 : Number((paise / 100).toFixed(2));
    const rows: (string | number | null)[][] = [
      ["KINTO Smart Ops - Group Summary"],
      [currentPeriodLabel],
      [],
      ["Group", "Opening Balance (Rs.)", "Period Debit (Rs.)", "Period Credit (Rs.)", "Closing Balance (Rs.)"],
    ];

    for (const typeName of TYPE_ORDER) {
      const typeGroups = data.groups.filter(g => g.accountType === typeName);
      if (typeGroups.length === 0) continue;
      rows.push([TYPE_LABELS[typeName], "", "", "", ""]);
      for (const group of typeGroups) {
        rows.push([
          `  ${getSubTypeLabel(group.accountType, group.subType)}`,
          fmtRupees(group.totalOpening),
          fmtRupees(group.totalDebit),
          fmtRupees(group.totalCredit),
          fmtRupees(group.totalClosing),
        ]);
        for (const account of group.accounts) {
          rows.push([
            `    ${account.code} - ${account.name}`,
            fmtRupees(account.openingBalance),
            fmtRupees(account.periodDebit),
            fmtRupees(account.periodCredit),
            fmtRupees(account.closingBalance),
          ]);
        }
      }
      const typeTotal = data.typeTotals.find(t => t.accountType === typeName);
      if (typeTotal) {
        rows.push([
          `Total ${TYPE_LABELS[typeName]}`,
          fmtRupees(typeTotal.totalOpening),
          fmtRupees(typeTotal.totalDebit),
          fmtRupees(typeTotal.totalCredit),
          fmtRupees(typeTotal.totalClosing),
        ]);
      }
      rows.push([]);
    }

    exportToExcel({
      filename: `Group_Summary_${currentPeriodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      sheets: [{ name: "Group Summary", data: rows }],
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-group-summary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const groups = data?.groups || [];
  const typeTotals = data?.typeTotals || [];

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto" data-testid="page-group-summary">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Group Summary</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-period-label">{currentPeriodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as "fy" | "custom")}>
            <SelectTrigger className="w-[120px]" data-testid="select-date-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">Financial Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === "fy" && (
            <Select value={selectedFY} onValueChange={setSelectedFY}>
              <SelectTrigger className="w-[140px]" data-testid="select-financial-year">
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

          <Button variant="outline" size="sm" onClick={handleExcelDownload} disabled={!data} data-testid="button-download-excel">
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-group-summary">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Group / Account</th>
                  <th className="text-right p-3 font-medium w-[130px]">Opening Bal.</th>
                  <th className="text-right p-3 font-medium w-[130px]">Debit</th>
                  <th className="text-right p-3 font-medium w-[130px]">Credit</th>
                  <th className="text-right p-3 font-medium w-[130px]">Closing Bal.</th>
                </tr>
              </thead>
              <tbody>
                {TYPE_ORDER.map(typeName => {
                  const typeGroups = groups.filter(g => g.accountType === typeName);
                  const typeTotal = typeTotals.find(t => t.accountType === typeName);
                  if (!typeTotal || (typeTotal.groupCount === 0 && typeTotal.accountCount === 0)) return null;

                  return (
                    <GroupTypeSection
                      key={typeName}
                      typeName={typeName}
                      typeLabel={TYPE_LABELS[typeName]}
                      typeGroups={typeGroups}
                      typeTotal={typeTotal}
                      expandedGroups={expandedGroups}
                      onToggleGroup={toggleGroup}
                      onAccountClick={handleAccountClick}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GroupTypeSection({
  typeName,
  typeLabel,
  typeGroups,
  typeTotal,
  expandedGroups,
  onToggleGroup,
  onAccountClick,
}: {
  typeName: string;
  typeLabel: string;
  typeGroups: AccountGroup[];
  typeTotal: TypeTotal;
  expandedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  onAccountClick: (account: GroupAccount) => void;
}) {
  return (
    <>
      <tr className="border-b bg-muted/30" data-testid={`row-type-header-${typeName}`}>
        <td colSpan={5} className="p-3 font-semibold text-base">
          {typeLabel}
        </td>
      </tr>

      {typeGroups.map(group => {
        const groupKey = `${group.accountType}::${group.subType}`;
        const isExpanded = expandedGroups.has(groupKey);
        const subLabel = getSubTypeLabel(group.accountType, group.subType);

        return (
          <GroupRow
            key={groupKey}
            group={group}
            groupKey={groupKey}
            subLabel={subLabel}
            isExpanded={isExpanded}
            onToggle={() => onToggleGroup(groupKey)}
            onAccountClick={onAccountClick}
          />
        );
      })}

      <tr className="border-b bg-muted/20 font-semibold" data-testid={`row-type-total-${typeName}`}>
        <td className="p-3 pl-6">Total {typeLabel}</td>
        <td className="text-right p-3">{formatAmount(typeTotal.totalOpening)}</td>
        <td className="text-right p-3">{formatAmount(typeTotal.totalDebit)}</td>
        <td className="text-right p-3">{formatAmount(typeTotal.totalCredit)}</td>
        <td className="text-right p-3">{formatAmount(typeTotal.totalClosing)}</td>
      </tr>

      <tr className="h-2" />
    </>
  );
}

function GroupRow({
  group,
  groupKey,
  subLabel,
  isExpanded,
  onToggle,
  onAccountClick,
}: {
  group: AccountGroup;
  groupKey: string;
  subLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAccountClick: (account: GroupAccount) => void;
}) {
  return (
    <>
      <tr
        className="border-b cursor-pointer hover-elevate"
        onClick={onToggle}
        data-testid={`row-group-${groupKey}`}
      >
        <td className="p-3 pl-6 flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-medium">{subLabel}</span>
          <span className="text-xs text-muted-foreground">({group.accounts.length})</span>
        </td>
        <td className="text-right p-3">{formatAmount(group.totalOpening)}</td>
        <td className="text-right p-3">{formatAmount(group.totalDebit)}</td>
        <td className="text-right p-3">{formatAmount(group.totalCredit)}</td>
        <td className="text-right p-3">{formatAmount(group.totalClosing)}</td>
      </tr>

      {isExpanded && group.accounts.map(account => (
        <tr
          key={account.id}
          className="border-b text-muted-foreground cursor-pointer hover-elevate"
          onClick={() => onAccountClick(account)}
          data-testid={`row-account-${account.id}`}
        >
          <td className="p-2 pl-14 flex items-center gap-1.5">
            <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{account.code}</code>
            <span>{account.name}</span>
            <ExternalLink className="w-3 h-3 invisible group-hover:visible" />
          </td>
          <td className="text-right p-2">{formatAmount(account.openingBalance)}</td>
          <td className="text-right p-2">{formatAmount(account.periodDebit)}</td>
          <td className="text-right p-2">{formatAmount(account.periodCredit)}</td>
          <td className="text-right p-2">{formatAmount(account.closingBalance)}</td>
        </tr>
      ))}
    </>
  );
}
