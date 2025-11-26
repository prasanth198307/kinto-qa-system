import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Download
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
}

const formatCurrency = (paise: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
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
  const [periodType, setPeriodType] = useState('daily');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ['/api/cash-register/report', periodType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        periodType,
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
      case 'this_month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'last_month':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'this_year':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'last_year':
        start = startOfYear(subYears(today, 1));
        end = endOfYear(subYears(today, 1));
        break;
      case 'all':
        start = new Date('2020-01-01');
        end = today;
        break;
      default:
        start = subMonths(today, 1);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-report-title">Cash Register Report</h1>
          <p className="text-muted-foreground">View daily, weekly, monthly, and yearly cash flow summaries</p>
        </div>
        <Button variant="outline" onClick={handlePrint} data-testid="button-print-report">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="w-[140px]" data-testid="select-period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
                data-testid="input-end-date"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickRange('today')} data-testid="button-today">Today</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('this_week')} data-testid="button-this-week">This Week</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('this_month')} data-testid="button-this-month">This Month</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('last_month')} data-testid="button-last-month">Last Month</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('this_year')} data-testid="button-this-year">This Year</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('last_year')} data-testid="button-last-year">Last Year</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('all')} data-testid="button-all-time">All Time</Button>
          </div>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Breakdown
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
    </div>
  );
}
