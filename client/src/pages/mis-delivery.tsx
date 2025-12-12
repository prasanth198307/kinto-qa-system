import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Truck, CheckCircle2, Clock, TrendingUp, Timer } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

interface DeliveryData {
  period: number;
  summary: {
    totalDispatches: number;
    completed: number;
    inTransit: number;
    pending: number;
    otifRate: string;
    avgDeliveryHours: string;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    totalDispatched: number;
    completed: number;
    completionRate: string;
  }>;
  transporterPerformance: Array<{
    transporter: string;
    totalDispatches: number;
    completed: number;
    pending: number;
    completionRate: string;
  }>;
}

export default function MISDelivery() {
  const [period, setPeriod] = useState('30');

  const { data, isLoading } = useQuery<DeliveryData>({
    queryKey: ['/api/mis/delivery-performance', { period }],
  });

  const statusLabels: Record<string, string> = {
    generated: 'Pending',
    vehicle_out: 'In Transit',
    delivered: 'Delivered',
    completed: 'Completed'
  };

  const statusColors: Record<string, string> = {
    generated: 'bg-amber-500',
    vehicle_out: 'bg-blue-500',
    delivered: 'bg-green-400',
    completed: 'bg-green-600'
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-delivery-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Delivery Performance</h1>
            <p className="text-muted-foreground">OTIF tracking and dispatch analytics</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Dispatches</p>
                    <p className="text-2xl font-bold">{data.summary.totalDispatches}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{data.summary.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">OTIF Rate</p>
                    <p className={`text-2xl font-bold ${parseFloat(data.summary.otifRate) >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                      {data.summary.otifRate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Timer className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
                    <p className="text-2xl font-bold">{data.summary.avgDeliveryHours}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dispatch Status</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.statusBreakdown.map((status, idx) => {
                    const total = data.summary.totalDispatches;
                    const percentage = total > 0 ? (status.count / total * 100) : 0;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm capitalize">{statusLabels[status.status] || status.status}</span>
                          <span className="font-medium">{status.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${statusColors[status.status] || 'bg-primary'} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.statusBreakdown.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No dispatch data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending & In Transit</CardTitle>
                <CardDescription>Dispatches requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-500/10 rounded-lg text-center">
                    <Clock className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                    <p className="text-3xl font-bold text-amber-600">{data.summary.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending Dispatch</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                    <Truck className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-3xl font-bold text-blue-600">{data.summary.inTransit}</p>
                    <p className="text-sm text-muted-foreground">In Transit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transporter Performance</CardTitle>
              <CardDescription>Delivery completion by transporter</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transporter</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transporterPerformance.map((t, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{t.transporter}</TableCell>
                      <TableCell className="text-right">{t.totalDispatches}</TableCell>
                      <TableCell className="text-right text-green-600">{t.completed}</TableCell>
                      <TableCell className="text-right text-amber-600">{t.pending}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={parseFloat(t.completionRate) >= 80 ? 'default' : 'secondary'}>
                          {t.completionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.transporterPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No transporter data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Dispatch Trend</CardTitle>
              <CardDescription>Day-by-day dispatch activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailyTrend.slice(0, 14).map((day, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </TableCell>
                      <TableCell className="text-right">{day.totalDispatched}</TableCell>
                      <TableCell className="text-right text-green-600">{day.completed}</TableCell>
                      <TableCell className="text-right">
                        <span className={parseFloat(day.completionRate) >= 80 ? 'text-green-600' : 'text-amber-600'}>
                          {day.completionRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.dailyTrend.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        No daily data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load delivery performance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
