import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, GripVertical } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChecklistTask {
  id: string;
  name: string;
  verificationCriteria: string;
}

export default function AdminChecklistBuilder() {
  const [checklistName, setChecklistName] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [tasks, setTasks] = useState<ChecklistTask[]>([
    { id: '1', name: '', verificationCriteria: '' }
  ]);

  const addTask = () => {
    setTasks([...tasks, { id: Date.now().toString(), name: '', verificationCriteria: '' }]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof ChecklistTask, value: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
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
            <Label htmlFor="machine">Assign to Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="mt-1" data-testid="select-machine">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rfc">RFC Machine</SelectItem>
                <SelectItem value="pet">PET Blowing Machine</SelectItem>
                <SelectItem value="batch">Batch Coding Machine</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                        value={task.name}
                        onChange={(e) => updateTask(task.id, 'name', e.target.value)}
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
          onClick={() => console.log('Save checklist', { checklistName, selectedMachine, tasks })}
          data-testid="button-save"
        >
          Save Checklist
        </Button>
        <Button
          variant="outline"
          onClick={() => console.log('Preview checklist')}
          data-testid="button-preview"
        >
          Preview
        </Button>
      </div>
    </div>
  );
}
