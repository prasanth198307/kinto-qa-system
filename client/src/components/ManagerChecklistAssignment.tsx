import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertChecklistAssignmentSchema, type ChecklistAssignment, type User, type ChecklistTemplate, type Machine } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

const formSchema = insertChecklistAssignmentSchema.omit({ assignedBy: true }).extend({
  assignedDate: z.string().min(1, "Date is required"),
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
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      // Server will set assignedBy from authenticated session for security
      return apiRequest('/api/checklist-assignments', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-assignments'] });
      toast({ title: "Success", description: "Checklist assigned successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign checklist", variant: "destructive" });
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

  if (assignmentsLoading) {
    return <div className="p-4">Loading assignments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Checklist Assignments</h2>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
          assignments.map((assignment) => (
            <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{getTemplateName(assignment.templateId)}</CardTitle>
                    <div className="text-sm text-muted-foreground">
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
                    <span className="text-muted-foreground">Operator:</span>
                    <div className="font-medium" data-testid={`text-operator-${assignment.id}`}>
                      {getUserName(assignment.operatorId)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reviewer:</span>
                    <div className="font-medium" data-testid={`text-reviewer-${assignment.id}`}>
                      {getUserName(assignment.reviewerId)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <div className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {assignment.assignedDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shift:</span>
                    <div className="font-medium">{assignment.shift}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium capitalize">{assignment.status}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
