import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Wrench, CheckCircle } from "lucide-react";

interface MaintenanceTask {
  id: string;
  machine: string;
  taskType: string;
  scheduledDate: string;
  status: 'upcoming' | 'overdue' | 'completed';
  assignedTo?: string;
}

interface MaintenanceScheduleProps {
  tasks: MaintenanceTask[];
  onComplete?: (task: MaintenanceTask) => void;
}

export default function MaintenanceSchedule({ tasks, onComplete }: MaintenanceScheduleProps) {
  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <Card key={task.id} className="p-4" data-testid={`card-maintenance-${index}`}>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm" data-testid={`text-machine-${index}`}>{task.machine}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{task.taskType}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {task.scheduledDate}
                  </div>
                  {task.assignedTo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned to: {task.assignedTo}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={statusColors[task.status]} data-testid={`badge-status-${index}`}>
                {task.status}
              </Badge>
            </div>

            {task.status !== 'completed' && onComplete && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onComplete(task)}
                data-testid={`button-complete-${index}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete PM
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
