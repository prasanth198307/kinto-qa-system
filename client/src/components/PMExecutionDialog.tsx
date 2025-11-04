import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, Camera, AlertCircle } from "lucide-react";
import type { MaintenancePlan, PMTemplateTask } from "@shared/schema";

interface PMExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MaintenancePlan | null;
}

interface TaskExecution {
  taskId: string;
  status: 'pass' | 'fail' | null;
  notes: string;
  photoData: string | null;
}

export function PMExecutionDialog({ open, onOpenChange, plan }: PMExecutionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executionNotes, setExecutionNotes] = useState("");
  const [taskExecutions, setTaskExecutions] = useState<Map<string, TaskExecution>>(new Map());

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<PMTemplateTask[]>({
    queryKey: plan?.taskListTemplateId ? ['/api/pm-task-list-templates', plan.taskListTemplateId, 'tasks'] : ['no-template'],
    enabled: open && !!plan?.taskListTemplateId,
  });

  const createExecutionMutation = useMutation({
    mutationFn: async (data: { execution: any; tasks: any[] }) => {
      return apiRequest('POST', '/api/pm-executions', data);
    },
    onSuccess: () => {
      toast({
        title: "PM Completed",
        description: "Preventive maintenance has been completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pm-executions'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete PM execution",
      });
    },
  });

  const handleClose = () => {
    setExecutionNotes("");
    setTaskExecutions(new Map());
    onOpenChange(false);
  };

  const updateTaskExecution = (taskId: string, field: keyof TaskExecution, value: any) => {
    setTaskExecutions(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(taskId) || { taskId, status: null, notes: '', photoData: null };
      newMap.set(taskId, { ...existing, [field]: value });
      return newMap;
    });
  };

  const handlePhotoUpload = (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Photo must be less than 5MB",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateTaskExecution(taskId, 'photoData', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!plan) return;

    const incompleteTasks = tasks.filter(task => {
      const execution = taskExecutions.get(task.id);
      if (!execution || execution.status === null) return true;
      if (task.requiresPhoto === 'true' && !execution.photoData) return true;
      return false;
    });

    if (incompleteTasks.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete Tasks",
        description: `Please complete all ${incompleteTasks.length} task(s) before submitting.`,
      });
      return;
    }

    const executionData = {
      maintenancePlanId: plan.id,
      machineId: plan.machineId,
      taskListTemplateId: plan.taskListTemplateId || undefined,
      remarks: executionNotes.trim() || undefined,
    };

    const taskData = tasks.map((task, index) => {
      const exec = taskExecutions.get(task.id);
      return {
        taskName: task.taskName,
        description: task.description || undefined,
        result: exec?.status || 'fail',
        remarks: exec?.notes?.trim() || undefined,
        photoUrl: exec?.photoData || undefined,
        orderIndex: index + 1,
      };
    });

    createExecutionMutation.mutate({
      execution: executionData,
      tasks: taskData,
    });
  };

  if (!plan) return null;

  const allTasksComplete = tasks.length > 0 && tasks.every(task => {
    const execution = taskExecutions.get(task.id);
    if (!execution || execution.status === null) return false;
    if (task.requiresPhoto === 'true' && !execution.photoData) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-pm-execution">
        <DialogHeader>
          <DialogTitle>Complete Preventive Maintenance</DialogTitle>
          <DialogDescription>
            Complete all tasks for this scheduled maintenance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Plan Details</Label>
            <div className="text-sm text-muted-foreground">
              <p>Plan: {plan.planName}</p>
              <p>Frequency: {plan.frequency}</p>
            </div>
          </div>

          {!plan.taskListTemplateId ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This maintenance plan has no task list template associated. Only general notes can be recorded.
                </p>
              </CardContent>
            </Card>
          ) : isLoadingTasks ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No tasks found for this template.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Task Checklist</Label>
              {tasks.map((task, index) => {
                const execution = taskExecutions.get(task.id);
                return (
                  <Card key={task.id} data-testid={`card-task-${task.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-muted-foreground">#{index + 1}</span>
                            {task.taskName}
                            {task.requiresPhoto === 'true' && (
                              <Badge variant="outline" className="gap-1">
                                <Camera className="h-3 w-3" />
                                Photo Required
                              </Badge>
                            )}
                          </CardTitle>
                          {task.description && (
                            <CardDescription className="mt-1">{task.description}</CardDescription>
                          )}
                          {task.verificationCriteria && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span className="font-medium">Verification: </span>
                              {task.verificationCriteria}
                            </div>
                          )}
                        </div>
                        {execution?.status && (
                          <div className="flex-shrink-0">
                            {execution.status === 'pass' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Status</Label>
                        <RadioGroup
                          value={execution?.status || ''}
                          onValueChange={(value) => updateTaskExecution(task.id, 'status', value)}
                          data-testid={`radio-status-${task.id}`}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="pass" id={`pass-${task.id}`} data-testid={`radio-pass-${task.id}`} />
                              <Label htmlFor={`pass-${task.id}`} className="font-normal cursor-pointer">
                                Pass
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fail" id={`fail-${task.id}`} data-testid={`radio-fail-${task.id}`} />
                              <Label htmlFor={`fail-${task.id}`} className="font-normal cursor-pointer">
                                Fail
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {task.requiresPhoto === 'true' && (
                        <div className="space-y-2">
                          <Label className="text-sm">Photo</Label>
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handlePhotoUpload(task.id, e)}
                              className="text-sm"
                              data-testid={`input-photo-${task.id}`}
                            />
                            {execution?.photoData && (
                              <img
                                src={execution.photoData}
                                alt="Task photo"
                                className="max-w-xs rounded border"
                                data-testid={`img-photo-preview-${task.id}`}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`notes-${task.id}`} className="text-sm">Notes (optional)</Label>
                        <Textarea
                          id={`notes-${task.id}`}
                          value={execution?.notes || ''}
                          onChange={(e) => updateTaskExecution(task.id, 'notes', e.target.value)}
                          placeholder="Additional notes about this task..."
                          rows={2}
                          data-testid={`textarea-notes-${task.id}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="execution-notes" className="text-sm font-medium">General Notes (optional)</Label>
            <Textarea
              id="execution-notes"
              value={executionNotes}
              onChange={(e) => setExecutionNotes(e.target.value)}
              placeholder="Overall notes about this maintenance execution..."
              rows={3}
              data-testid="textarea-execution-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createExecutionMutation.isPending}
            data-testid="button-cancel-execution"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createExecutionMutation.isPending || (tasks.length > 0 && !allTasksComplete)}
            data-testid="button-submit-execution"
          >
            {createExecutionMutation.isPending ? "Completing..." : "Complete PM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
