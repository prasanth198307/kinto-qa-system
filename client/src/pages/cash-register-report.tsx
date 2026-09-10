import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, getDaysInMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRightLeft,
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  Eye,
  File,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from '@/hooks/use-toast';
import { useTenantConfig, formatCurrency as fmtCur } from '@/hooks/use-tenant-config';
import { getCashSourceLabel } from '@/lib/utils';
import { downloadXLSX } from '@/lib/download-utils';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

interface PeriodSummary {
  period: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  openDays: number;
  closedDays: number;
  openingBalance: number;
  closingBalance: number;
  totalCashReceived: number;
  totalExpenses: number;
  totalTransfers: number;
  netCashFlow: number;
  days: {
    id: string;
    date: string;
    status: string;
    openingBalance: number;
    cashReceived: number;
    expenses: number;
    transfers: number;
    closingBalance: number;
    salespersonName: string;
    importedFromFile: string | null;
  }[];
}

interface TransactionData {
  id: string;
  dayId: string;
  date: string;
  salespersonName: string;
  transactionType: string;
  sourceType?: string;
  amount: number;
  description?: string;
  reference?: string;
  partyName?: string;
  convertedToVoucherId?: string;
}

interface ReportData {
  periodType: string;
  startDate?: string;
  endDate?: string;
  overallSummary: {
    totalDays: number;
    totalCashReceived: number;
    totalExpenses: number;
    totalTransfers: number;
    netCashFlow: number;
    openingBalance: number;
    closingBalance: number;
    openDays: number;
    closedDays: number;
  };
  periods: PeriodSummary[];
  transactions?: TransactionData[];
}

interface DocumentData {
  id: string;
  date: string;
  transactionType: string;
  sourceType?: string;
  amount: number;
  description?: string;
  documentPath: string;
  documentName: string;
  reference?: string;
  dayId: string;
  voucherId?: string;
}

// formatCurrency is defined inside the component (see CashRegisterReport)

const formatCurrencyNumber = (rupees: number) => {
  return rupees.toFixed(2);
};

const exportToExcel = async (reportData: ReportData, periodType: string) => {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cash Register');
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 8 }];

  // Column widths
  ws.columns = [
    { key: 'date',    width: 14 },
    { key: 'partic',  width: 30 },
    { key: 'from',    width: 24 },
    { key: 'to',      width: 24 },
    { key: 'in',      width: 16 },
    { key: 'out',     width: 16 },
    { key: 'bal',     width: 18 },
  ];

  // Palette
  const NAVY   = '1A2B45'; const NAVY2  = '253858';
  const IN_BG  = 'EAF6EE'; const OUT_BG = 'FDECEA';
  const IN_FG  = '1E7E4A'; const OUT_FG = 'C0392B';
  const GOLD   = 'B8891A'; const GOLD_BG= 'FDF3DC';
  const WHITE  = 'FFFFFF'; const MUTED  = '5C6B7A';
  const KPI_BG = 'F6F8FA';
  const OP_BG  = 'D6EAF8'; const OP_FG  = '154360';
  const CL_BG  = 'D5F5E3'; const CL_FG  = '1E7E4A';
  const COMMA  = '#,##0';

  const s = (fgColor: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + fgColor } });
  const f = (color: string, bold = false, size = 9, italic = false) =>
    ({ name: 'Arial', color: { argb: 'FF' + color }, bold, size, italic });
  const al = (h: 'left'|'right'|'center', indent = 0) => ({ horizontal: h, vertical: 'middle' as const, indent });

  const mergeRow = (row: ExcelJS.Row, fromCol: number, toCol: number, bg: string) => {
    ws.mergeCells(row.number, fromCol, row.number, toCol);
    for (let c = fromCol; c <= toCol; c++) row.getCell(c).fill = s(bg);
  };

  // ── Row 1: Title ───────────────────────────────────────────────────────────
  const r1 = ws.addRow(['KINTO WATER — CASH REGISTER']);
  r1.height = 28; mergeRow(r1, 1, 7, NAVY);
  const c1 = r1.getCell(1);
  c1.font = f(WHITE, true, 14); c1.alignment = al('left', 1);

  // ── Row 2: Subtitle ────────────────────────────────────────────────────────
  const today = format(new Date(), 'd MMM yyyy');
  const startDate = reportData.periods.length ? reportData.periods[0].startDate : '';
  const endDate   = reportData.periods.length ? reportData.periods[reportData.periods.length - 1].endDate : '';
  const periodLabel = startDate && endDate
    ? `${format(new Date(startDate), 'd MMM')} – ${format(new Date(endDate), 'd MMM yyyy')}`
    : periodType;
  const r2 = ws.addRow([`Period: ${periodLabel}   ·   ${reportData.overallSummary.totalDays} Days   ·   Generated ${today}`]);
  r2.height = 16; mergeRow(r2, 1, 7, NAVY2);
  const c2 = r2.getCell(1);
  c2.font = f('AACCEE', false, 9, true); c2.alignment = al('left', 1);

  // ── Row 3: Spacer ──────────────────────────────────────────────────────────
  const r3 = ws.addRow([]); r3.height = 6;

  // ── Rows 4-5: KPI tiles ────────────────────────────────────────────────────
  const kpis = [
    { label: 'Opening Balance', value: reportData.overallSummary.openingBalance, fg: NAVY,   bg: KPI_BG, cols: [1,2] },
    { label: 'Total Received',  value: reportData.overallSummary.totalCashReceived, fg: IN_FG,  bg: IN_BG,  cols: [3,4] },
    { label: 'Total Expenses',  value: reportData.overallSummary.totalExpenses,     fg: OUT_FG, bg: OUT_BG, cols: [5,6] },
    { label: 'Net Cash Flow',   value: reportData.overallSummary.netCashFlow,       fg: GOLD,   bg: GOLD_BG,cols: [7,7] },
  ];
  const r4 = ws.addRow([]); r4.height = 15;
  const r5 = ws.addRow([]); r5.height = 15;
  kpis.forEach(({ label, value, fg, bg, cols }) => {
    const [c1, c2] = cols;
    if (c1 !== c2) {
      ws.mergeCells(r4.number, c1, r4.number, c2);
      ws.mergeCells(r5.number, c1, r5.number, c2);
    }
    const lc = r4.getCell(c1);
    lc.value = label; lc.font = f(MUTED, true, 8); lc.fill = s(bg); lc.alignment = al('left', 1);
    const vc = r5.getCell(c1);
    vc.value = value; vc.numFmt = COMMA;
    vc.font = f(fg, true, 13); vc.fill = s(bg); vc.alignment = al('left', 1);
  });

  // ── Row 6: Closing balance banner ─────────────────────────────────────────
  const r6 = ws.addRow([]); r6.height = 15;
  mergeRow(r6, 1, 7, NAVY);
  const cb = r6.getCell(1);
  cb.value = `Closing Balance:   ₹${reportData.overallSummary.closingBalance.toLocaleString('en-IN')}   ·   As of ${today}`;
  cb.font = f(WHITE, true, 10); cb.alignment = al('right', 1);

  // ── Row 7: Spacer ──────────────────────────────────────────────────────────
  const r7 = ws.addRow([]); r7.height = 6;

  // ── Row 8: Column headers ─────────────────────────────────────────────────
  const r8 = ws.addRow(['Date','Particulars','Received From','Paid To','Cash In (₹)','Cash Out (₹)','Balance (₹)']);
  r8.height = 22;
  r8.eachCell(cell => {
    cell.font = f(WHITE, true, 9); cell.fill = s(NAVY);
  });
  ['left','left','left','left','right','right','right'].forEach((ha, i) => {
    r8.getCell(i + 1).alignment = al(ha as 'left'|'right', 1);
  });

  // ── Transactions ──────────────────────────────────────────────────────────
  const allTxns = [...(reportData.transactions || [])].sort((a, b) =>
    a.date.localeCompare(b.date) || a.transactionType.localeCompare(b.transactionType)
  );

  // Group by date
  const byDate = new Map<string, typeof allTxns>();
  allTxns.forEach(t => {
    const d = t.date.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(t);
  });

  let runningBal = reportData.overallSummary.openingBalance;

  byDate.forEach((txns, dateStr) => {
    const dayOpen = runningBal;
    const dayDate = new Date(dateStr);
    const dayLabel = format(dayDate, 'd MMMM yyyy  (EEEE)');

    // Day header row — blue, bold, opening balance inline
    const rh = ws.addRow([]); rh.height = 16;
    mergeRow(rh, 1, 7, OP_BG);
    const hc = rh.getCell(1);
    hc.value = `  ${dayLabel}   ·   Opening: ₹${dayOpen.toLocaleString('en-IN')}`;
    hc.font = f(OP_FG, true, 10); hc.alignment = al('left');

    let dayIn = 0; let dayOut = 0;

    txns.forEach(t => {
      const isIn  = t.transactionType === 'cash_received';
      const amt   = Number(t.amount);
      const bg    = isIn ? IN_BG : OUT_BG;
      const ref   = t.reference || '';
      const desc  = t.description || '';
      const src   = (t.sourceType || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const particulars = isIn ? (ref || src) : (desc || ref);
      const receivedFrom = isIn ? (t.partyName || '') : '';
      const paidTo       = isIn ? '' : (t.partyName || ref);
      const cashIn       = isIn ? amt : null;
      const cashOut      = isIn ? null : amt;
      runningBal += isIn ? amt : -amt;
      if (isIn) dayIn += amt; else dayOut += amt;

      const rt = ws.addRow([
        format(dayDate, 'd MMM'),
        particulars,
        receivedFrom,
        paidTo,
        cashIn,
        cashOut,
        runningBal,
      ]);
      rt.height = 14;
      rt.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = s(bg);
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE8EEF4' } } };
        if (colNum >= 5) {
          cell.numFmt = COMMA;
          cell.alignment = al('right', 1);
          const fg = colNum === 5 ? IN_FG : colNum === 6 ? OUT_FG : NAVY;
          cell.font = f(fg, colNum === 7, 9.5);
        } else {
          cell.alignment = al('left', 1);
          cell.font = f(NAVY, false, 9.5);
        }
      });
    });

    // Day total row — closing balance green
    const rt2 = ws.addRow([]); rt2.height = 16;
    ws.mergeCells(rt2.number, 1, rt2.number, 4);
    const dtc = rt2.getCell(1);
    dtc.value = `  ${format(dayDate, 'd MMM')} — Day Total`;
    dtc.font = f(MUTED, true, 8.5); dtc.fill = s(WHITE); dtc.alignment = al('left');
    dtc.border = { top: { style: 'thin', color: { argb: 'FF' + NAVY } }, bottom: { style: 'thin', color: { argb: 'FF' + NAVY } } };

    const inCell = rt2.getCell(5);
    inCell.value = dayIn; inCell.numFmt = COMMA;
    inCell.font = f(IN_FG, true, 10); inCell.fill = s(WHITE); inCell.alignment = al('right', 1);
    inCell.border = { top: { style: 'thin', color: { argb: 'FF' + NAVY } }, bottom: { style: 'thin', color: { argb: 'FF' + NAVY } } };

    const outCell = rt2.getCell(6);
    outCell.value = dayOut; outCell.numFmt = COMMA;
    outCell.font = f(OUT_FG, true, 10); outCell.fill = s(WHITE); outCell.alignment = al('right', 1);
    outCell.border = { top: { style: 'thin', color: { argb: 'FF' + NAVY } }, bottom: { style: 'thin', color: { argb: 'FF' + NAVY } } };

    const clCell = rt2.getCell(7);
    clCell.value = runningBal; clCell.numFmt = COMMA;
    clCell.font = f(CL_FG, true, 11); clCell.fill = s(CL_BG); clCell.alignment = al('right', 1);
    clCell.border = { top: { style: 'thin', color: { argb: 'FF' + NAVY } }, bottom: { style: 'thin', color: { argb: 'FF' + NAVY } } };
  });

  // ── Grand total ────────────────────────────────────────────────────────────
  const rgt = ws.addRow([]); rgt.height = 20;
  ws.mergeCells(rgt.number, 1, rgt.number, 4);
  const gtc = rgt.getCell(1);
  gtc.value = `  GRAND TOTAL  ·  As of ${today}`;
  gtc.font = f(WHITE, true, 10); gtc.fill = s(NAVY); gtc.alignment = al('left');

  const gtIn = rgt.getCell(5);
  gtIn.value = reportData.overallSummary.totalCashReceived; gtIn.numFmt = COMMA;
  gtIn.font = f('7ADDA4', true, 11); gtIn.fill = s(NAVY); gtIn.alignment = al('right', 1);

  const gtOut = rgt.getCell(6);
  gtOut.value = reportData.overallSummary.totalExpenses; gtOut.numFmt = COMMA;
  gtOut.font = f('F5A09A', true, 11); gtOut.fill = s(NAVY); gtOut.alignment = al('right', 1);

  const gtBal = rgt.getCell(7);
  gtBal.value = reportData.overallSummary.closingBalance; gtBal.numFmt = COMMA;
  gtBal.font = f(WHITE, true, 11); gtBal.fill = s(NAVY); gtBal.alignment = al('right', 1);

  // ── Footer note ────────────────────────────────────────────────────────────
  const rf = ws.addRow([]); rf.height = 13;
  ws.mergeCells(rf.number, 1, rf.number, 7);
  const fc = rf.getCell(1);
  fc.value = '  Note: Blue row = Opening balance per day   ·   Green cell = Closing balance per day';
  fc.font = f(MUTED, false, 8, true); fc.alignment = al('left');

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cash-register-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  a.click(); URL.revokeObjectURL(url);
};

const formatPeriodLabel = (period: string, periodType: string) => {
  if (periodType === 'daily') {
    return format(new Date(period), 'EEE, MMM d, yyyy');
  } else if (periodType === 'weekly') {
    const weekStart = new Date(period);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  } else if (periodType === 'monthly') {
    const [year, month] = period.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
  } else if (periodType === 'yearly') {
    return period;
  }
  return period;
};

export default function CashRegisterReport() {
  const tenantConfig = useTenantConfig();
  // Cash register amounts are stored in RUPEES (not paise)
  const formatCurrency = (rupees: number) => fmtCur(rupees, tenantConfig);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('report');
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState(() => format(new Date(), 'yyyy'));
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return format(date, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [docTransactionType, setDocTransactionType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingDocs, setIsDownloadingDocs] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2020; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  const { startDate, endDate } = useMemo(() => {
    if (periodType === 'monthly') {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1;
      const start = startOfMonth(new Date(year, month, 1));
      const end = endOfMonth(new Date(year, month, 1));
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    } else if (periodType === 'yearly') {
      const year = parseInt(selectedYear);
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 11, 31));
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    } else if (periodType === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    } else {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      };
    }
  }, [periodType, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const actualPeriodType = periodType === 'custom' ? 'daily' : periodType;

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/cash-register/report', actualPeriodType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodType: actualPeriodType,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/cash-register/report?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    },
  });

  const { data: documentsData, isLoading: isLoadingDocs } = useQuery<{ documents: DocumentData[] }>({
    queryKey: ['/api/cash-register/documents', startDate, endDate, docTransactionType],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        transactionType: docTransactionType,
      });
      const response = await fetch(`/api/cash-register/documents?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: activeTab === 'documents',
  });

  const handleExcelExport = async () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      await exportToExcel(reportData, periodType);
      toast({ title: 'Excel downloaded successfully' });
    } catch (error) {
      toast({ title: 'Failed to export Excel', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintVoucher = (voucherId: string) => {
    window.open(`/api/expense-vouchers/${voucherId}/print`, '_blank');
  };

  const handleDownloadDocument = (documentPath: string, documentName: string) => {
    const link = document.createElement('a');
    link.href = documentPath;
    link.download = documentName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllDocuments = async () => {
    if (!documentsData?.documents || documentsData.documents.length === 0) {
      toast({ title: 'No documents to download', variant: 'destructive' });
      return;
    }
    
    setIsDownloadingDocs(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        transactionType: docTransactionType,
      });
      
      const response = await fetch(`/api/cash-register/documents/download?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download documents');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cash_register_docs_${startDate}_to_${endDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({ title: `Downloaded ${documentsData.documents.length} documents as ZIP` });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to download documents', variant: 'destructive' });
    } finally {
      setIsDownloadingDocs(false);
    }
  };

  const togglePeriod = (period: string) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedPeriods(newExpanded);
  };

  const setQuickRange = (range: string) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (range) {
      case 'today':
        start = today;
        break;
      case 'this_week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'last_30':
        start = new Date();
        start.setDate(start.getDate() - 30);
        break;
      case 'all':
        start = new Date('2020-01-01');
        end = today;
        break;
      default:
        start = subMonths(today, 1);
    }

    setCustomStartDate(format(start, 'yyyy-MM-dd'));
    setCustomEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/?tab=overview')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-report-title">Cash Register Report</h1>
            <p className="text-muted-foreground">View cash flow summaries and documents</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handleExcelExport} 
            disabled={isExporting || !reportData}
            data-testid="button-download-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Download Excel'}
          </Button>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print-report">
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="report" data-testid="tab-report">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Report
          </TabsTrigger>
          <TabsTrigger value="vouchers" data-testid="tab-vouchers">
            <Receipt className="w-4 h-4 mr-2" />
            Print Vouchers
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-6 mt-4">

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>View</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-[140px]" data-testid="select-period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodType === 'monthly' && (
              <>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px]" data-testid="select-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px]" data-testid="select-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {periodType === 'yearly' && (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {periodType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}
          </div>

          {periodType === 'monthly' && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const today = new Date();
                  setSelectedMonth(format(today, 'MM'));
                  setSelectedYear(format(today, 'yyyy'));
                }} 
                data-testid="button-this-month"
              >
                This Month
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const lastMonth = subMonths(new Date(), 1);
                  setSelectedMonth(format(lastMonth, 'MM'));
                  setSelectedYear(format(lastMonth, 'yyyy'));
                }} 
                data-testid="button-last-month"
              >
                Last Month
              </Button>
            </div>
          )}

          {periodType === 'yearly' && (
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedYear(format(new Date(), 'yyyy'))} 
                data-testid="button-this-year"
              >
                This Year
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedYear(format(subYears(new Date(), 1), 'yyyy'))} 
                data-testid="button-last-year"
              >
                Last Year
              </Button>
            </div>
          )}

          {periodType === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickRange('today')} data-testid="button-today">Today</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange('this_week')} data-testid="button-this-week">This Week</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange('last_30')} data-testid="button-last-30">Last 30 Days</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange('all')} data-testid="button-all-time">All Time</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm">Opening Balance</span>
                </div>
                <div className="text-xl font-bold" data-testid="text-opening-balance">
                  {formatCurrency(reportData.overallSummary.openingBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Cash Received</span>
                </div>
                <div className="text-xl font-bold text-green-600" data-testid="text-total-received">
                  +{formatCurrency(reportData.overallSummary.totalCashReceived)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">Expenses</span>
                </div>
                <div className="text-xl font-bold text-red-600" data-testid="text-total-expenses">
                  -{formatCurrency(reportData.overallSummary.totalExpenses)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="text-sm">Transfers</span>
                </div>
                <div className="text-xl font-bold text-blue-600" data-testid="text-total-transfers">
                  -{formatCurrency(reportData.overallSummary.totalTransfers)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-muted-foreground text-sm mb-1">Net Cash Flow</div>
                <div className={`text-2xl font-bold ${reportData.overallSummary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-cash-flow">
                  {reportData.overallSummary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.overallSummary.netCashFlow)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-muted-foreground text-sm mb-1">Closing Balance</div>
                <div className="text-2xl font-bold" data-testid="text-closing-balance">
                  {formatCurrency(reportData.overallSummary.closingBalance)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-muted-foreground text-sm mb-1">Days Summary</div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {reportData.overallSummary.closedDays} Closed
                  </Badge>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    {reportData.overallSummary.openDays} Open
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    ({reportData.overallSummary.totalDays} total)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {reportData.transactions && reportData.transactions.length > 0 && (() => {
            const cashTxns = reportData.transactions!.filter(t => t.transactionType === 'cash_received');
            if (cashTxns.length === 0) return null;
            const bySource: Record<string, { amount: number; count: number; descriptions: string[] }> = {};
            cashTxns.forEach(t => {
              const key = t.sourceType || 'other';
              if (!bySource[key]) bySource[key] = { amount: 0, count: 0, descriptions: [] };
              bySource[key].amount += t.amount;
              bySource[key].count += 1;
              if (key === 'other' && t.description) bySource[key].descriptions.push(t.description);
            });
            const sourceEntries = Object.entries(bySource).sort((a, b) => b[1].amount - a[1].amount);
            const totalReceived = sourceEntries.reduce((s, [, v]) => s + v.amount, 0);
            const getLabel = getCashSourceLabel;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Cash Received — By Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sourceEntries.map(([key, val]) => {
                      const pct = totalReceived > 0 ? Math.round((val.amount / totalReceived) * 100) : 0;
                      const label = key === 'other' && val.descriptions.length > 0
                        ? `Other (${val.descriptions.slice(0, 2).join(', ')}${val.descriptions.length > 2 ? '…' : ''})`
                        : getLabel(key);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs">{val.count} txn{val.count !== 1 ? 's' : ''}</span>
                              <span className="text-muted-foreground text-xs">{pct}%</span>
                              <span className="font-semibold text-green-600">{formatCurrency(val.amount)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(totalReceived)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {periodType === 'custom' ? 'Daily' : periodType.charAt(0).toUpperCase() + periodType.slice(1)} Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.periods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No data found for the selected period
                </div>
              ) : (
                <div className="space-y-2">
                  {reportData.periods.map((period) => (
                    <Collapsible 
                      key={period.period}
                      open={expandedPeriods.has(period.period)}
                      onOpenChange={() => togglePeriod(period.period)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover-elevate" data-testid={`row-period-${period.period}`}>
                          <div className="flex items-center gap-3">
                            {expandedPeriods.has(period.period) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <div>
                              <div className="font-medium">{formatPeriodLabel(period.period, periodType)}</div>
                              <div className="text-sm text-muted-foreground">
                                {period.daysCount} day{period.daysCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <div className="text-muted-foreground">Opening</div>
                              <div className="font-medium">{formatCurrency(period.openingBalance)}</div>
                            </div>
                            <div className="text-right text-green-600">
                              <div>+Received</div>
                              <div className="font-medium">{formatCurrency(period.totalCashReceived)}</div>
                            </div>
                            <div className="text-right text-red-600">
                              <div>-Expenses</div>
                              <div className="font-medium">{formatCurrency(period.totalExpenses)}</div>
                            </div>
                            <div className="text-right text-blue-600">
                              <div>-Transfers</div>
                              <div className="font-medium">{formatCurrency(period.totalTransfers)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-muted-foreground">Closing</div>
                              <div className="font-bold">{formatCurrency(period.closingBalance)}</div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 ml-7 border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right">Received</TableHead>
                                <TableHead className="text-right">Expenses</TableHead>
                                <TableHead className="text-right">Transfers</TableHead>
                                <TableHead className="text-right">Closing</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {period.days.map((day) => (
                                <TableRow key={day.id} data-testid={`row-day-${day.id}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {format(new Date(day.date), 'EEE, MMM d')}
                                      {day.importedFromFile && (
                                        <Badge variant="outline" className="text-xs">Imported</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={day.status === 'closed' ? 'default' : 'secondary'}
                                      className={day.status === 'closed' ? 'bg-green-600' : 'bg-yellow-500'}
                                    >
                                      {day.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(day.openingBalance)}</TableCell>
                                  <TableCell className="text-right text-green-600">+{formatCurrency(day.cashReceived)}</TableCell>
                                  <TableCell className="text-right text-red-600">-{formatCurrency(day.expenses)}</TableCell>
                                  <TableCell className="text-right text-blue-600">-{formatCurrency(day.transfers)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(day.closingBalance)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
      </TabsContent>

      <TabsContent value="vouchers" className="space-y-6 mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Print Expense Vouchers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Print expense vouchers for a specific date or date range. Vouchers are printed in A5 format (2 per A4 page).
            </p>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  const today = format(new Date(), 'yyyy-MM-dd');
                  const params = new URLSearchParams({
                    startDate: today,
                    endDate: today,
                    mode: 'day',
                  });
                  window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                }}
                data-testid="button-print-today-vouchers"
              >
                <Calendar className="w-6 h-6" />
                <span className="font-medium">Today's Vouchers</span>
                <span className="text-xs text-muted-foreground">{format(new Date(), 'MMM d, yyyy')}</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  const params = new URLSearchParams({
                    startDate,
                    endDate,
                    mode: 'range',
                  });
                  window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                }}
                data-testid="button-print-period-vouchers"
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span className="font-medium">Current Period</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d')}
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  const monthStart = startOfMonth(new Date());
                  const monthEnd = endOfMonth(new Date());
                  const params = new URLSearchParams({
                    startDate: format(monthStart, 'yyyy-MM-dd'),
                    endDate: format(monthEnd, 'yyyy-MM-dd'),
                    mode: 'range',
                  });
                  window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                }}
                data-testid="button-print-month-vouchers"
              >
                <Receipt className="w-6 h-6" />
                <span className="font-medium">This Month</span>
                <span className="text-xs text-muted-foreground">{format(new Date(), 'MMMM yyyy')}</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  const lastMonth = subMonths(new Date(), 1);
                  const monthStart = startOfMonth(lastMonth);
                  const monthEnd = endOfMonth(lastMonth);
                  const params = new URLSearchParams({
                    startDate: format(monthStart, 'yyyy-MM-dd'),
                    endDate: format(monthEnd, 'yyyy-MM-dd'),
                    mode: 'range',
                  });
                  window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                }}
                data-testid="button-print-last-month-vouchers"
              >
                <Printer className="w-6 h-6" />
                <span className="font-medium">Last Month</span>
                <span className="text-xs text-muted-foreground">{format(subMonths(new Date(), 1), 'MMMM yyyy')}</span>
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Custom Date Range</Label>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[160px]"
                    data-testid="input-voucher-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[160px]"
                    data-testid="input-voucher-end-date"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!customStartDate || !customEndDate) {
                      toast({
                        title: 'Date range required',
                        description: 'Please select both start and end dates.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    if (new Date(customStartDate) > new Date(customEndDate)) {
                      toast({
                        title: 'Invalid date range',
                        description: 'Start date cannot be after end date.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const params = new URLSearchParams({
                      startDate: customStartDate,
                      endDate: customEndDate,
                      mode: 'range',
                    });
                    window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                  }}
                  disabled={!customStartDate || !customEndDate}
                  data-testid="button-print-custom-vouchers"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Vouchers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Print Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Vouchers are formatted for A5 size (half of A4 page)</li>
              <li>• Two vouchers print per A4 page for easy cutting</li>
              <li>• Each voucher includes: Voucher number, date, payee, items, amounts, and signature boxes</li>
              <li>• Signature boxes: Receiver's Signature, Cashier's Signature, Approved By</li>
              <li>• Company name "MicroGrid" appears on each voucher</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filter Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={docTransactionType} onValueChange={setDocTransactionType}>
                    <SelectTrigger className="w-[160px]" data-testid="select-doc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="cash_received">Cash Received</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                      <SelectItem value="transfer">Transfers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing documents from {format(new Date(startDate), 'MMM d, yyyy')} to {format(new Date(endDate), 'MMM d, yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingDocs ? (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : documentsData?.documents && documentsData.documents.length > 0 ? (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({documentsData.documents.length})
                </CardTitle>
                <div className="flex gap-2">
                  {documentsData.documents.some(d => d.transactionType === 'expense' && d.voucherId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const params = new URLSearchParams({
                          startDate,
                          endDate,
                          mode: 'range',
                        });
                        window.open(`/cash-register/vouchers/print?${params}`, '_blank');
                      }}
                      data-testid="button-print-all-vouchers"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print All Vouchers
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAllDocuments}
                    disabled={isDownloadingDocs}
                    data-testid="button-download-all-docs"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isDownloadingDocs ? 'Downloading...' : 'Download All (ZIP)'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentsData.documents.map((doc) => (
                      <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                        <TableCell>{format(new Date(doc.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              doc.transactionType === 'cash_received' ? 'border-green-500 text-green-700' :
                              doc.transactionType === 'expense' ? 'border-red-500 text-red-700' :
                              'border-blue-500 text-blue-700'
                            }
                          >
                            {doc.transactionType === 'cash_received' ? 'Cash Received' :
                             doc.transactionType === 'expense' ? 'Expense' : 'Transfer'}
                            {doc.transactionType === 'cash_received' && doc.sourceType && ` (${doc.sourceType.replace('_', ' ')})`}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {doc.description || doc.reference || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(doc.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">{doc.documentName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(doc.documentPath, '_blank')}
                              title="View Document"
                              data-testid={`button-view-doc-${doc.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadDocument(doc.documentPath, doc.documentName)}
                              title="Download Document"
                              data-testid={`button-download-doc-${doc.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {doc.transactionType === 'expense' && doc.voucherId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePrintVoucher(doc.voucherId!)}
                                title="Print Voucher"
                                data-testid={`button-print-voucher-${doc.id}`}
                              >
                                <Receipt className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents found for the selected period and type</p>
                <p className="text-sm mt-2">Upload documents to cash register transactions to see them here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
