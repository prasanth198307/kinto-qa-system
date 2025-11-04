import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Edit, Trash2, CheckSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { PMTaskListTemplate, PMTemplateTask, MachineType } from "@shared/schema";

interface TaskFormData {
  id: string;
  taskName: string;
  description: string;
  verificationCriteria: string;
  orderIndex: number;
  requiresPhoto: boolean;
}

export default function AdminPMTaskListTemplates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PMTaskListTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [category, setCategory] = useState('');
  const [tasks, setTasks] = useState<TaskFormData[]>([
    { id: '1', taskName: '', description: '', verificationCriteria: '', orderIndex: 0, requiresPhoto: false }
  ]);
  const { toast } = useToast();

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<PMTaskListTemplate[]>({
    queryKey: ['/api/pm-task-list-templates'],
  });

  const { data: machineTypes = [], isLoading: isLoadingMachineTypes } = useQuery<MachineType[]>({
    queryKey: ['/api/machine-types'],
  });

  const { data: templateTasks = [] } = useQuery<PMTemplateTask[]>({
    queryKey: ['/api/pm-task-list-templates', selectedTemplate?.id, 'tasks'],
    enabled: !!selectedTemplate?.id,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { template: any; tasks: any[] }) => {
      return await apiRequest('POST', '/api/pm-task-list-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-task-list-templates'] });
      toast({
        title: "Template Created",
        description: "PM task list template has been created successfully.",
      });
      resetForm();
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/pm-task-list-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pm-task-list-templates'] });
      toast({
        title: "Template Deleted",
        description: "PM task list template has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setSelectedMachineType('');
    setCategory('');
    setTasks([{ id: '1', taskName: '', description: '', verificationCriteria: '', orderIndex: 0, requiresPhoto: false }]);
  };

  const addTask = () => {
    const newId = Date.now().toString();
    setTasks([...tasks, { id: newId, taskName: '', description: '', verificationCriteria: '', orderIndex: tasks.length, requiresPhoto: false }]);
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

  const updateTask = (id: string, field: keyof TaskFormData, value: string | boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleCreate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a template name.",
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

    const validTasks = tasks.map(({ taskName, description, verificationCriteria, orderIndex, requiresPhoto }) => ({
      taskName: taskName.trim(),
      description: description?.trim() || undefined,
      verificationCriteria: verificationCriteria?.trim() || undefined,
      orderIndex,
      requiresPhoto: requiresPhoto ? 'true' : 'false',
    }));

    createTemplateMutation.mutate({
      template: {
        name: templateName.trim(),
        description: templateDescription?.trim() || undefined,
        machineTypeId: selectedMachineType || undefined,
        category: category?.trim() || undefined,
      },
      tasks: validTasks
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleViewTemplate = (template: PMTaskListTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">PM Task List Templates</h2>
          <p className="text-sm text-muted-foreground">Create and manage reusable task lists for preventive maintenance</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-pm-template">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {isLoadingTemplates ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const machineType = machineTypes.find(mt => mt.id === template.machineTypeId);
            return (
              <Card key={template.id} data-testid={`card-pm-template-${template.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{template.description || "No description"}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleViewTemplate(template)}
                        data-testid={`button-view-template-${template.id}`}
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(template.id)}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {machineType && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Machine Type:</span>
                        <Badge variant="outline">{machineType.name}</Badge>
                      </div>
                    )}
                    {template.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <Badge>{template.category}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No PM Task List Templates</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first template to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-pm-template">
          <DialogHeader>
            <DialogTitle>Create PM Task List Template</DialogTitle>
            <DialogDescription>
              Create a reusable task list template for preventive maintenance activities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  placeholder="e.g., Monthly Lubrication Checklist"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Lubrication, Cleaning"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  data-testid="input-category"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="templateDescription">Description</Label>
              <Textarea
                id="templateDescription"
                placeholder="Describe what this template is for..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={2}
                data-testid="textarea-template-description"
              />
            </div>

            <div>
              <Label htmlFor="machineType">Machine Type (Optional)</Label>
              <Select value={selectedMachineType} onValueChange={setSelectedMachineType}>
                <SelectTrigger data-testid="select-machine-type">
                  <SelectValue placeholder="Select a machine type" />
                </SelectTrigger>
                <SelectContent>
                  {machineTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tasks *</Label>
                <Button type="button" size="sm" onClick={addTask} data-testid="button-add-task">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Task
                </Button>
              </div>
              
              {tasks.map((task, index) => (
                <Card key={task.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground mt-2">{index + 1}.</span>
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Task name *"
                          value={task.taskName}
                          onChange={(e) => updateTask(task.id, 'taskName', e.target.value)}
                          data-testid={`input-task-name-${index}`}
                        />
                        <Textarea
                          placeholder="Task description (optional)"
                          value={task.description}
                          onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                          rows={2}
                          data-testid={`textarea-task-description-${index}`}
                        />
                        <Textarea
                          placeholder="Verification criteria (optional)"
                          value={task.verificationCriteria}
                          onChange={(e) => updateTask(task.id, 'verificationCriteria', e.target.value)}
                          rows={2}
                          data-testid={`textarea-verification-criteria-${index}`}
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={task.requiresPhoto}
                            onCheckedChange={(checked) => updateTask(task.id, 'requiresPhoto', checked)}
                            data-testid={`switch-requires-photo-${index}`}
                          />
                          <Label className="text-sm">Requires photo upload</Label>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTask(task.id)}
                        data-testid={`button-remove-task-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreate} 
              disabled={createTemplateMutation.isPending}
              data-testid="button-submit-template"
            >
              {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-pm-template">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTemplate && (
              <>
                {selectedTemplate.category && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Category:</span>
                    <Badge>{selectedTemplate.category}</Badge>
                  </div>
                )}
                {selectedTemplate.machineTypeId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Machine Type:</span>
                    <Badge variant="outline">
                      {machineTypes.find(mt => mt.id === selectedTemplate.machineTypeId)?.name || "Unknown"}
                    </Badge>
                  </div>
                )}
              </>
            )}

            <div>
              <h4 className="text-sm font-medium mb-3">Tasks</h4>
              <div className="space-y-2">
                {templateTasks.map((task, index) => (
                  <Card key={task.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-muted-foreground">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-medium">{task.taskName}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            )}
                            {task.verificationCriteria && (
                              <div className="mt-2">
                                <span className="text-sm font-medium">Verification: </span>
                                <span className="text-sm text-muted-foreground">{task.verificationCriteria}</span>
                              </div>
                            )}
                            {task.requiresPhoto === 'true' && (
                              <Badge variant="secondary" className="mt-2">
                                Photo Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
