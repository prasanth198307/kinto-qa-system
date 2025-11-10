import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Machine, User, PMTaskListTemplate } from "@shared/schema";

interface SchedulePMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SchedulePMDialog({ open, onOpenChange }: SchedulePMDialogProps) {
  const [formData, setFormData] = useState({
    machineId: '',
    planName: '',
    planType: '',
    frequency: 'monthly',
    nextDueDate: '',
    assignedTo: '',
    taskListTemplateId: ''
  });
  const { toast } = useToast();

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: pmTemplates = [] } = useQuery<PMTaskListTemplate[]>({
    queryKey: ['/api/pm-task-list-templates'],
  });

  const createPMMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating PM plan with data:", data);
      return await apiRequest('POST', '/api/maintenance-plans', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-plans'] });
      resetForm();
      onOpenChange(false);
      toast({
        title: "PM Scheduled",
        description: "Preventive maintenance task has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to create PM plan:", error);
      const errorMessage = error.message || "Failed to schedule PM task";
      const errorDetails = error.errors 
        ? error.errors.map((e: any) => e.message).join(", ")
        : "";
      
      toast({
        title: "Error",
        description: errorDetails || errorMessage,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      machineId: '',
      planName: '',
      planType: '',
      frequency: 'monthly',
      nextDueDate: '',
      assignedTo: '',
      taskListTemplateId: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.machineId || !formData.planName || !formData.planType || !formData.nextDueDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      machineId: formData.machineId || undefined,
      planName: formData.planName.trim(),
      planType: formData.planType.trim(),
      frequency: formData.frequency,
      nextDueDate: new Date(formData.nextDueDate),
      taskListTemplateId: formData.taskListTemplateId || undefined,
      assignedTo: formData.assignedTo || undefined,
      isActive: 'true'
    };

    createPMMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-schedule-pm">
        <DialogHeader>
          <DialogTitle>Schedule Preventive Maintenance</DialogTitle>
          <DialogDescription>
            Create a new preventive maintenance schedule for a machine.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="machine">Machine *</Label>
              <Select value={formData.machineId} onValueChange={(value) => setFormData({ ...formData, machineId: value })}>
                <SelectTrigger data-testid="select-machine">
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} - {machine.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="taskListTemplate">PM Task List Template (Optional)</Label>
              <Select value={formData.taskListTemplateId} onValueChange={(value) => setFormData({ ...formData, taskListTemplateId: value })}>
                <SelectTrigger data-testid="select-task-list-template">
                  <SelectValue placeholder="Select a task list template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {pmTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.category && ` - ${template.category}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pmTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No PM task list templates available. Create one in the PM Templates tab.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                placeholder="e.g., Monthly Lubrication"
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                required
                data-testid="input-plan-name"
              />
            </div>

            <div>
              <Label htmlFor="planType">Task Type *</Label>
              <Input
                id="planType"
                placeholder="e.g., Lubrication, Deep Clean, Oil Change"
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                required
                data-testid="input-plan-type"
              />
            </div>

            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nextDueDate">Next Due Date *</Label>
              <Input
                id="nextDueDate"
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                required
                data-testid="input-next-due-date"
              />
            </div>

            <div>
              <Label htmlFor="assignedTo">Assign To (Optional)</Label>
              <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select a user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPMMutation.isPending} data-testid="button-submit-pm">
              {createPMMutation.isPending ? 'Scheduling...' : 'Schedule PM'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
