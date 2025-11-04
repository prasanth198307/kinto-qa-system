import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Machine, SparePartCatalog } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface ChecklistTask {
  id: string;
  taskName: string;
  verificationCriteria: string;
  orderIndex: number;
}

export default function AdminChecklistBuilder() {
  const [checklistName, setChecklistName] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('none');
  const [tasks, setTasks] = useState<ChecklistTask[]>([
    { id: '1', taskName: '', verificationCriteria: '', orderIndex: 0 }
  ]);
  const { toast } = useToast();

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: machineSpareParts = [], isLoading: isLoadingSpareParts } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/machines', selectedMachine, 'spare-parts'],
    queryFn: async () => {
      const response = await fetch(`/api/machines/${selectedMachine}/spare-parts`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch machine spare parts');
      return response.json();
    },
    enabled: selectedMachine !== 'none' && !!selectedMachine,
  });

  const saveChecklistMutation = useMutation({
    mutationFn: async (data: { name: string; machineId?: string; tasks: { taskName: string; verificationCriteria?: string; orderIndex: number }[] }) => {
      return await apiRequest('POST', '/api/checklist-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-templates'] });
      toast({
        title: "Checklist saved",
        description: "Checklist template has been saved successfully.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save checklist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setChecklistName('');
    setSelectedMachine('none');
    setTasks([{ id: '1', taskName: '', verificationCriteria: '', orderIndex: 0 }]);
  };

  const addTask = () => {
    const newId = Date.now().toString();
    setTasks([...tasks, { id: newId, taskName: '', verificationCriteria: '', orderIndex: tasks.length }]);
  };

  const removeTask = (id: string) => {
    if (tasks.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one task is required.",
        variant: "destructive",
      });
      return;
    }
    setTasks(tasks.filter(t => t.id !== id).map((t, idx) => ({ ...t, orderIndex: idx })));
  };

  const updateTask = (id: string, field: keyof ChecklistTask, value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    if (!checklistName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a checklist name.",
        variant: "destructive",
      });
      return;
    }

    const hasEmptyTaskNames = tasks.some(t => !t.taskName.trim());
    if (hasEmptyTaskNames) {
      toast({
        title: "Validation Error",
        description: "All tasks must have a name.",
        variant: "destructive",
      });
      return;
    }

    const validTasks = tasks.map(({ taskName, verificationCriteria, orderIndex }) => ({
      taskName: taskName.trim(),
      verificationCriteria: verificationCriteria?.trim() || '',
      orderIndex
    }));

    const machineIdToSave = selectedMachine === 'none' || !selectedMachine ? undefined : selectedMachine;
    
    saveChecklistMutation.mutate({
      name: checklistName.trim(),
      machineId: machineIdToSave,
      tasks: validTasks
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="text-title">Checklist Builder</h2>
        
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="checklist-name">Checklist Name</Label>
            <Input
              id="checklist-name"
              placeholder="e.g., RFC Machine Daily Checklist"
              value={checklistName}
              onChange={(e) => setChecklistName(e.target.value)}
              className="mt-1"
              data-testid="input-checklist-name"
            />
          </div>

          <div>
            <Label htmlFor="machine">Assign to Machine (Optional)</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="mt-1" data-testid="select-machine">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (General Checklist)</SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>{machine.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMachine && selectedMachine !== 'none' && (
            <div className="mt-4">
              <Label className="text-sm font-medium mb-2">Relevant Spare Parts</Label>
              {isLoadingSpareParts ? (
                <p className="text-sm text-muted-foreground">Loading spare parts...</p>
              ) : machineSpareParts.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {machineSpareParts.map((part) => (
                    <Badge key={part.id} variant="secondary" className="text-xs" data-testid={`badge-spare-part-${part.id}`}>
                      {part.partName}
                      {part.partNumber && ` (${part.partNumber})`}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">No spare parts assigned to this machine yet.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addTask}
            data-testid="button-add-task"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>

        <div className="space-y-3">
          {tasks.map((task, index) => (
            <Card key={task.id} className="p-4" data-testid={`card-task-${index}`}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`task-name-${task.id}`} className="text-xs">Task Name</Label>
                      <Input
                        id={`task-name-${task.id}`}
                        placeholder="e.g., Clean the Machine"
                        value={task.taskName}
                        onChange={(e) => updateTask(task.id, 'taskName', e.target.value)}
                        className="mt-1"
                        data-testid={`input-task-name-${index}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`task-criteria-${task.id}`} className="text-xs">Verification Criteria</Label>
                      <Textarea
                        id={`task-criteria-${task.id}`}
                        placeholder="e.g., Wipe down surfaces and remove any spills"
                        value={task.verificationCriteria}
                        onChange={(e) => updateTask(task.id, 'verificationCriteria', e.target.value)}
                        className="mt-1 min-h-[60px]"
                        data-testid={`textarea-task-criteria-${index}`}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTask(task.id)}
                    disabled={tasks.length === 1}
                    data-testid={`button-remove-task-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={saveChecklistMutation.isPending}
          data-testid="button-save"
        >
          {saveChecklistMutation.isPending ? 'Saving...' : 'Save Checklist'}
        </Button>
        <Button
          variant="outline"
          onClick={resetForm}
          data-testid="button-reset"
        >
          Clear Form
        </Button>
      </div>
    </div>
  );
}
