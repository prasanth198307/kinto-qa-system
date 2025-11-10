import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertChecklistAssignmentSchema, type ChecklistAssignment, type User, type ChecklistTemplate, type Machine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { format, isPast, parseISO, startOfDay } from "date-fns";

const formSchema = insertChecklistAssignmentSchema.omit({ assignedBy: true }).extend({
  templateId: z.string().min(1, "Checklist template is required"),
  machineId: z.string().min(1, "Machine is required"),
  operatorId: z.string().min(1, "Operator is required"),
  assignedDate: z.string().min(1, "Date is required"),
  whatsappEnabled: z.number().optional(),
}).refine((data) => {
  // If WhatsApp is enabled, operator must have a mobile number
  return true; // Validation will be done during form submission
}, {
  message: "Operator must have a mobile number when WhatsApp is enabled",
  path: ["whatsappEnabled"]
});

type FormData = z.infer<typeof formSchema>;

export function ManagerChecklistAssignment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: currentUser } = useQuery<User>({ queryKey: ['/api/auth/user'] });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ChecklistAssignment[]>({
    queryKey: ['/api/checklist-assignments'],
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates'],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const operators = usersData.filter((u: any) => u.role?.name === 'operator');
  const reviewers = usersData.filter((u: any) => u.role?.name === 'reviewer');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: "",
      machineId: "",
      operatorId: "",
      reviewerId: "",
      assignedDate: format(new Date(), "yyyy-MM-dd"),
      shift: "Morning",
      status: "pending",
      whatsappEnabled: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      console.log("Submitting checklist assignment:", data);
      // Server will set assignedBy from authenticated session for security
      return apiRequest('/api/checklist-assignments', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-assignments'] });
      toast({ title: "Success", description: "Checklist assigned successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Failed to assign checklist:", error);
      const errorMessage = error.message || "Failed to assign checklist";
      const errorDetails = error.errors 
        ? error.errors.map((e: any) => e.message).join(", ")
        : "";
      
      toast({ 
        title: "Error", 
        description: errorDetails || errorMessage, 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/checklist-assignments/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-assignments'] });
      toast({ title: "Success", description: "Assignment deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete assignment", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    // Validate WhatsApp requirement
    if (data.whatsappEnabled === 1) {
      const selectedOperator = operators.find((u: any) => u.id === data.operatorId);
      if (!selectedOperator?.mobileNumber) {
        toast({
          title: "Validation Error",
          description: "Cannot enable WhatsApp: Selected operator has no mobile number",
          variant: "destructive"
        });
        return;
      }
    }
    createMutation.mutate(data);
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "N/A";
    const user = usersData.find((u: any) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown";
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    return template?.name || "Unknown";
  };

  const getMachineName = (machineId: string) => {
    const machine = machines.find((m) => m.id === machineId);
    return machine?.name || "Unknown";
  };

  // Utility function to check if a checklist is overdue
  const isOverdue = (assignedDate: string, status: string): boolean => {
    if (status !== 'pending') return false;
    const assignedDay = startOfDay(parseISO(assignedDate));
    const today = startOfDay(new Date());
    return isPast(assignedDay) && assignedDay.getTime() < today.getTime();
  };

  // Calculate overdue assignments count
  const overdueCount = assignments.filter(a => a.assignedDate && isOverdue(a.assignedDate, a.status)).length;

  if (assignmentsLoading) {
    return <div className="p-4">Loading assignments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Checklist Assignments</h2>
          {overdueCount > 0 && (
            <p className="text-sm text-red-600 mt-1">
              {overdueCount} overdue assignment{overdueCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-assignment">
              <Plus className="w-4 h-4 mr-2" />
              Assign Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Checklist to Operator</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checklist Template</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-populate machine when template is selected
                          const selectedTemplate = templates.find(t => t.id === value);
                          if (selectedTemplate?.machineId) {
                            form.setValue('machineId', selectedTemplate.machineId);
                          }
                        }} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-machine">
                            <SelectValue placeholder="Select machine" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {machines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="operatorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operator</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-operator">
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {operators.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reviewerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reviewer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reviewer">
                            <SelectValue placeholder="Select reviewer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reviewers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName} {u.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-shift">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                          <SelectItem value="Night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Send via WhatsApp</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Operator will receive checklist tasks via WhatsApp
                          {form.watch('operatorId') && (() => {
                            const selectedOperator = operators.find((u: any) => u.id === form.watch('operatorId'));
                            return selectedOperator?.mobileNumber ? (
                              <div className="mt-1 text-xs">
                                Operator phone: {selectedOperator.mobileNumber}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-amber-600">
                                Warning: Operator has no mobile number
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 1}
                          onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                          data-testid="switch-whatsapp"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-assignment">
                    {createMutation.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No assignments yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          assignments.map((assignment) => {
            const assignmentIsOverdue = assignment.assignedDate ? isOverdue(assignment.assignedDate, assignment.status) : false;
            return (
              <Card 
                key={assignment.id} 
                className={`${assignmentIsOverdue ? 'border-red-500 bg-red-50' : ''}`}
                data-testid={`card-assignment-${assignment.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className={`text-base ${assignmentIsOverdue ? 'text-red-900' : ''}`}>
                          {getTemplateName(assignment.templateId)}
                        </CardTitle>
                        {assignmentIsOverdue && (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" data-testid={`icon-overdue-${assignment.id}`} />
                        )}
                      </div>
                      <div className={`text-sm ${assignmentIsOverdue ? 'text-red-700' : 'text-muted-foreground'}`}>
                        Machine: {getMachineName(assignment.machineId)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(assignment.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${assignment.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={assignmentIsOverdue ? 'text-red-600' : 'text-muted-foreground'}>Operator:</span>
                      <div className={`font-medium ${assignmentIsOverdue ? 'text-red-900' : ''}`} data-testid={`text-operator-${assignment.id}`}>
                        {getUserName(assignment.operatorId)}
                      </div>
                    </div>
                    <div>
                      <span className={assignmentIsOverdue ? 'text-red-600' : 'text-muted-foreground'}>Reviewer:</span>
                      <div className={`font-medium ${assignmentIsOverdue ? 'text-red-900' : ''}`} data-testid={`text-reviewer-${assignment.id}`}>
                        {getUserName(assignment.reviewerId)}
                      </div>
                    </div>
                    <div>
                      <span className={assignmentIsOverdue ? 'text-red-600' : 'text-muted-foreground'}>Date:</span>
                      <div className={`font-medium flex items-center gap-1 ${assignmentIsOverdue ? 'text-red-900' : ''}`}>
                        <Calendar className="w-3 h-3" />
                        {assignment.assignedDate}
                      </div>
                    </div>
                    <div>
                      <span className={assignmentIsOverdue ? 'text-red-600' : 'text-muted-foreground'}>Shift:</span>
                      <div className={`font-medium ${assignmentIsOverdue ? 'text-red-900' : ''}`}>{assignment.shift}</div>
                    </div>
                    <div className="col-span-2">
                      <span className={assignmentIsOverdue ? 'text-red-600' : 'text-muted-foreground'}>Status:</span>
                      <div className="flex items-center gap-2 mt-1">
                        {assignmentIsOverdue ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300" data-testid={`badge-overdue-${assignment.id}`}>
                            OVERDUE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {assignment.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
