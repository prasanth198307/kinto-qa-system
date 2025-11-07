import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Calendar, User, FileText, Image as ImageIcon, ChevronRight } from "lucide-react";
import type { PMExecution, PMExecutionTask, PMTemplateTask, PMTaskListTemplate, MaintenancePlan, User as UserType, Machine } from "@shared/schema";
import PrintablePMExecution from "@/components/PrintablePMExecution";

interface PMExecutionWithDetails extends PMExecution {
  tasks?: PMExecutionTask[];
  template?: PMTaskListTemplate;
  plan?: MaintenancePlan;
  executor?: UserType;
  machine?: Machine;
}

export function PMHistoryView() {
  const [selectedExecution, setSelectedExecution] = useState<PMExecutionWithDetails | null>(null);

  const { data: executions = [], isLoading } = useQuery<PMExecutionWithDetails[]>({
    queryKey: ['/api/pm-executions'],
  });

  const { data: templateTasks = [] } = useQuery<PMTemplateTask[]>({
    queryKey: selectedExecution?.taskListTemplateId ? ['/api/pm-task-list-templates', selectedExecution.taskListTemplateId, 'tasks'] : ['no-template'],
    enabled: !!selectedExecution?.taskListTemplateId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">PM Execution History</h2>
            <p className="text-muted-foreground">View completed preventive maintenance records</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getTaskStats = (execution: PMExecutionWithDetails) => {
    if (!execution.tasks || execution.tasks.length === 0) {
      return { total: 0, passed: 0, failed: 0 };
    }
    const passed = execution.tasks.filter(t => t.result === 'pass').length;
    const failed = execution.tasks.filter(t => t.result === 'fail').length;
    return { total: execution.tasks.length, passed, failed };
  };
  
  const getUserDisplay = (user?: UserType) => {
    if (!user) return 'N/A';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email || 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PM Execution History</h2>
          <p className="text-muted-foreground">View completed preventive maintenance records</p>
        </div>
      </div>

      {executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No PM Execution History</p>
            <p className="text-sm text-muted-foreground mt-1">Completed maintenance tasks will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {executions.map(execution => {
            const stats = getTaskStats(execution);
            return (
              <Card
                key={execution.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedExecution(execution)}
                data-testid={`card-execution-${execution.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {execution.plan?.planName || 'Maintenance Plan'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {execution.completedAt ? format(new Date(execution.completedAt), 'MMM dd, yyyy') : 'Unknown date'}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {execution.executor && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{getUserDisplay(execution.executor)}</span>
                    </div>
                  )}
                  {execution.machine && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Machine:</span>
                      <span className="font-medium truncate">{execution.machine.name}</span>
                    </div>
                  )}
                  {stats.total > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {stats.passed} Passed
                      </Badge>
                      {stats.failed > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3 text-red-600" />
                          {stats.failed} Failed
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-execution-details">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle>PM Execution Details</DialogTitle>
                <DialogDescription>
                  Completed on {selectedExecution?.completedAt ? format(new Date(selectedExecution.completedAt), 'MMMM dd, yyyy') : 'Unknown date'}
                </DialogDescription>
              </div>
              {selectedExecution && <PrintablePMExecution execution={selectedExecution} />}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plan Name</p>
                  <p className="font-medium">{selectedExecution?.plan?.planName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Frequency</p>
                  <p className="font-medium">{selectedExecution?.plan?.frequency || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Machine</p>
                  <p className="font-medium">{selectedExecution?.machine?.name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completed By</p>
                  <p className="font-medium">{getUserDisplay(selectedExecution?.executor)}</p>
                </div>
              </div>

              {selectedExecution?.remarks && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">General Notes</p>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedExecution.remarks}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedExecution?.tasks && selectedExecution.tasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Task Results</p>
                    <Badge variant="outline">
                      {selectedExecution.tasks.length} {selectedExecution.tasks.length === 1 ? 'Task' : 'Tasks'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {selectedExecution.tasks.map((taskExecution, index) => {
                      return (
                        <Card key={taskExecution.id} data-testid={`card-task-result-${taskExecution.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <span className="text-muted-foreground">#{index + 1}</span>
                                  {taskExecution.taskName}
                                  <Badge variant={taskExecution.result === 'pass' ? 'default' : 'destructive'}>
                                    {taskExecution.result === 'pass' ? 'Pass' : 'Fail'}
                                  </Badge>
                                </CardTitle>
                                {taskExecution.description && (
                                  <CardDescription className="mt-1">{taskExecution.description}</CardDescription>
                                )}
                              </div>
                              {taskExecution.result === 'pass' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {taskExecution.remarks && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm whitespace-pre-wrap">{taskExecution.remarks}</p>
                              </div>
                            )}

                            {taskExecution.photoUrl && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  Photo Evidence
                                </p>
                                <img
                                  src={taskExecution.photoUrl}
                                  alt="Task verification photo"
                                  className="max-w-md rounded border"
                                  data-testid={`img-task-photo-${taskExecution.id}`}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setSelectedExecution(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PMHistoryView;
