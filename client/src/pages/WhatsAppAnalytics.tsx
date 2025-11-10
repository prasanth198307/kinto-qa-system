import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface MachineStartupTask {
  id: string;
  machineName?: string;
  assignedUserName?: string;
  scheduledStartTime: string;
  taskReferenceId: string | null;
  operatorResponse: string | null;
  operatorResponseTime: string | null;
  responseStatus: 'on_time' | 'late' | 'early' | 'no_response';
  status: string;
}

export default function WhatsAppAnalytics() {
  const { data: tasks, isLoading } = useQuery<MachineStartupTask[]>({
    queryKey: ['/api/machine-startup-tasks'],
  });

  const tasksWithWhatsApp = tasks?.filter(t => t.taskReferenceId) || [];
  const onTime = tasksWithWhatsApp.filter(t => t.responseStatus === 'on_time').length;
  const late = tasksWithWhatsApp.filter(t => t.responseStatus === 'late').length;
  const early = tasksWithWhatsApp.filter(t => t.responseStatus === 'early').length;
  const noResponse = tasksWithWhatsApp.filter(t => t.responseStatus === 'no_response').length;
  const responseRate = tasksWithWhatsApp.length > 0 
    ? ((tasksWithWhatsApp.length - noResponse) / tasksWithWhatsApp.length * 100).toFixed(1)
    : '0';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_time':
        return <Badge className="bg-green-600" data-testid={`badge-status-on_time`}><CheckCircle2 className="w-3 h-3 mr-1" />On Time</Badge>;
      case 'late':
        return <Badge variant="destructive" data-testid={`badge-status-late`}><AlertCircle className="w-3 h-3 mr-1" />Late</Badge>;
      case 'early':
        return <Badge className="bg-blue-600" data-testid={`badge-status-early`}><Clock className="w-3 h-3 mr-1" />Early</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-no_response`}>No Response</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading WhatsApp analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-whatsapp-analytics">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">WhatsApp Response Analytics</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Track two-way WhatsApp communication for machine startup reminders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-sent">{tasksWithWhatsApp.length}</div>
            <p className="text-xs text-muted-foreground">WhatsApp reminders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-response-rate">{responseRate}%</div>
            <p className="text-xs text-muted-foreground">{tasksWithWhatsApp.length - noResponse} of {tasksWithWhatsApp.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">On Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-on-time">{onTime}</div>
            <p className="text-xs text-muted-foreground">±15 min window</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Early</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-early">{early}</div>
            <p className="text-xs text-muted-foreground">&gt;15 min before</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Late</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-late">{late}</div>
            <p className="text-xs text-muted-foreground">&gt;15 min after</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Response History
          </CardTitle>
          <CardDescription>
            All machine startup reminders sent via WhatsApp with operator responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasksWithWhatsApp.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-data">
              No WhatsApp reminders sent yet. Create a machine startup task to begin.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksWithWhatsApp.map((task) => (
                  <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                    <TableCell className="font-mono text-xs" data-testid={`cell-task-id-${task.id}`}>
                      {task.taskReferenceId}
                    </TableCell>
                    <TableCell data-testid={`cell-machine-${task.id}`}>{task.machineName || 'N/A'}</TableCell>
                    <TableCell data-testid={`cell-operator-${task.id}`}>{task.assignedUserName || 'N/A'}</TableCell>
                    <TableCell data-testid={`cell-scheduled-${task.id}`}>
                      {format(new Date(task.scheduledStartTime), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell data-testid={`cell-response-time-${task.id}`}>
                      {task.operatorResponseTime 
                        ? format(new Date(task.operatorResponseTime), 'MMM d, h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell data-testid={`cell-status-${task.id}`}>{getStatusBadge(task.responseStatus)}</TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`cell-message-${task.id}`}>
                      {task.operatorResponse || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
