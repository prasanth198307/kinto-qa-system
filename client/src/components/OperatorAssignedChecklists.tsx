import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardCheck, Wrench, AlertTriangle } from "lucide-react";
import { type ChecklistAssignment, type User } from "@shared/schema";
import { format, isPast, parseISO, startOfDay } from "date-fns";

export function OperatorAssignedChecklists() {
  const { data: currentUser } = useQuery<User>({ queryKey: ['/api/auth/user'] });
  
  const { data: assignments = [], isLoading } = useQuery<ChecklistAssignment[]>({
    queryKey: ['/api/checklist-assignments', 'operator', currentUser?.id],
    enabled: !!currentUser?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/checklist-templates'],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['/api/machines'],
  });

  // Utility function to check if a checklist is overdue
  const isOverdue = (assignedDate: string, status: string): boolean => {
    if (status !== 'pending') return false;
    const assignedDay = startOfDay(parseISO(assignedDate));
    const today = startOfDay(new Date());
    return isPast(assignedDay) && assignedDay.getTime() < today.getTime();
  };

  // Filter for today's assignments and overdue assignments
  const today = format(new Date(), "yyyy-MM-dd");
  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const todayAssignments = pendingAssignments.filter(a => a.assignedDate === today);
  const overdueAssignments = pendingAssignments.filter(a => isOverdue(a.assignedDate, a.status));

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t: any) => t.id === templateId);
    return template?.name || "Unknown Template";
  };

  const getMachineName = (machineId: string) => {
    const machine = machines.find((m: any) => m.id === machineId);
    return machine?.name || "Unknown Machine";
  };

  if (isLoading) {
    return <div className="p-4">Loading assignments...</div>;
  }

  const renderAssignmentCard = (assignment: ChecklistAssignment, isOverdueCard: boolean) => (
    <Card 
      key={assignment.id} 
      className={`hover-elevate ${isOverdueCard ? 'border-red-500 bg-red-50' : ''}`}
      data-testid={`card-operator-assignment-${assignment.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className={`text-base ${isOverdueCard ? 'text-red-900' : ''}`} data-testid={`text-template-${assignment.id}`}>
                {getTemplateName(assignment.templateId)}
              </CardTitle>
              {isOverdueCard && (
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" data-testid={`icon-overdue-${assignment.id}`} />
              )}
            </div>
            <div className={`flex items-center gap-2 text-sm ${isOverdueCard ? 'text-red-700' : 'text-muted-foreground'}`}>
              <Wrench className="w-3 h-3" />
              <span data-testid={`text-machine-${assignment.id}`}>{getMachineName(assignment.machineId)}</span>
            </div>
          </div>
          <Badge variant="secondary" data-testid={`badge-shift-${assignment.id}`}>
            {assignment.shift || 'Morning'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className={`flex items-center gap-1 ${isOverdueCard ? 'text-red-700' : 'text-muted-foreground'}`}>
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(assignment.assignedDate), 'MMM dd, yyyy')}</span>
          </div>
          {isOverdueCard ? (
            <Badge className="bg-red-100 text-red-800 border-red-300" data-testid={`badge-overdue-${assignment.id}`}>
              OVERDUE
            </Badge>
          ) : (
            <Badge 
              variant="outline"
              data-testid={`badge-status-${assignment.id}`}
            >
              {assignment.status}
            </Badge>
          )}
        </div>
        {assignment.notes && (
          <div className={`text-sm border-t pt-2 mt-2 ${isOverdueCard ? 'text-red-700 border-red-500' : 'text-muted-foreground'}`}>
            <p className="font-medium">Notes:</p>
            <p className="text-xs">{assignment.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">My Assigned Checklists</h3>
      </div>

      {overdueAssignments.length === 0 && todayAssignments.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pending checklists</p>
            <p className="text-sm mt-1">Check back later or contact your manager</p>
          </CardContent>
        </Card>
      )}

      {overdueAssignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-red-50 text-red-900 px-4 py-3 rounded-lg border border-red-500">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                Overdue Assignments ({overdueAssignments.length})
              </p>
              <p className="text-xs mt-0.5 text-red-700">
                Please complete these as soon as possible
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {overdueAssignments.map((assignment) => renderAssignmentCard(assignment, true))}
          </div>
        </div>
      )}

      {todayAssignments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today's Assignments ({todayAssignments.length})
          </h4>
          <div className="grid gap-3">
            {todayAssignments.map((assignment) => renderAssignmentCard(assignment, false))}
          </div>
        </div>
      )}
    </div>
  );
}
