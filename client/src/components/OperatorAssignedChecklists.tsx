import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ClipboardCheck, Wrench } from "lucide-react";
import { type ChecklistAssignment, type User } from "@shared/schema";
import { format } from "date-fns";

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

  // Filter for today's assignments
  const today = format(new Date(), "yyyy-MM-dd");
  const todayAssignments = assignments.filter(a => a.assignedDate === today && a.status === 'pending');

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Today's Assigned Checklists</h3>
      </div>

      {todayAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No checklists assigned for today</p>
            <p className="text-sm mt-1">Check back later or contact your manager</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {todayAssignments.map((assignment) => (
            <Card key={assignment.id} className="hover-elevate" data-testid={`card-operator-assignment-${assignment.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base" data-testid={`text-template-${assignment.id}`}>
                      {getTemplateName(assignment.templateId)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(assignment.assignedDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <Badge 
                    variant={assignment.status === 'completed' ? 'default' : 'outline'}
                    data-testid={`badge-status-${assignment.id}`}
                  >
                    {assignment.status}
                  </Badge>
                </div>
                {assignment.notes && (
                  <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                    <p className="font-medium">Notes:</p>
                    <p className="text-xs">{assignment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
