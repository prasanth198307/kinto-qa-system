import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Plus, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, Users } from "lucide-react";
import BulkMachineStartupAssignment from "@/components/BulkMachineStartupAssignment";

const startupTaskSchema = z.object({
  machineId: z.string().min(1, "Machine is required"),
  assignedUserId: z.string().min(1, "User is required"),
  scheduledStartTime: z.string().min(1, "Start time is required"),
  reminderBeforeMinutes: z.coerce.number().min(5).max(480),
  productionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  shift: z.string().optional(),
  notes: z.string().optional(),
  whatsappEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
});

type StartupTaskForm = z.infer<typeof startupTaskSchema>;

interface MachineStartupTask {
  id: string;
  machineId: string;
  assignedUserId: string;
  scheduledStartTime: string;
  reminderBeforeMinutes: number;
  status: string;
  notificationSentAt: string | null;
  machineStartedAt: string | null;
  whatsappEnabled: number;
  emailEnabled: number;
  whatsappSent: number;
  emailSent: number;
  productionDate: string;
  shift: string | null;
  notes: string | null;
  createdBy: string | null;
  recordStatus: number;
  createdAt: string;
  updatedAt: string;
}

export default function MachineStartupReminders() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [editingTask, setEditingTask] = useState<MachineStartupTask | null>(null);

  // Fetch startup tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<MachineStartupTask[]>({
    queryKey: ['/api/machine-startup-tasks'],
  });

  // Fetch machines
  const { data: machines = [] } = useQuery<any[]>({
    queryKey: ['/api/machines'],
  });

  // Fetch users (operators)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<StartupTaskForm>({
    resolver: zodResolver(startupTaskSchema),
    defaultValues: {
      machineId: "",
      assignedUserId: "",
      scheduledStartTime: "",
      reminderBeforeMinutes: 30,
      productionDate: "",
      shift: "",
      notes: "",
      whatsappEnabled: true,
      emailEnabled: true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: StartupTaskForm) => {
      return await apiRequest('POST', '/api/machine-startup-tasks', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-startup-tasks'] });
      toast({ title: "Success", description: "Startup reminder created successfully" });
      setShowForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create startup reminder",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/machine-startup-tasks/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-startup-tasks'] });
      toast({ title: "Success", description: "Startup reminder deleted" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete startup reminder",
      });
    },
  });

  const handleSubmit = (data: StartupTaskForm) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this startup reminder?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" data-testid={`status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'notified':
        return <Badge variant="default" data-testid={`status-${status}`}><Bell className="w-3 h-3 mr-1" />Notified</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600" data-testid={`status-${status}`}><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" data-testid={`status-${status}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  const getMachineName = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    return machine?.name || machineId;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Machine Startup Reminders
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Schedule reminders for operators to start machines before production
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkAssignment(true)}
                variant="default"
                data-testid="button-bulk-assignment"
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Assignment
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                data-testid="button-create-reminder"
              >
                <Plus className="w-4 h-4 mr-2" />
                Single Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reminders scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Create your first machine startup reminder to notify operators
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Reminder
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notifications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                    <TableCell className="font-medium" data-testid={`text-machine-${task.id}`}>
                      {getMachineName(task.machineId)}
                    </TableCell>
                    <TableCell data-testid={`text-user-${task.id}`}>
                      {getUserName(task.assignedUserId)}
                    </TableCell>
                    <TableCell data-testid={`text-time-${task.id}`}>
                      {format(new Date(task.scheduledStartTime), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell data-testid={`text-date-${task.id}`}>
                      {format(new Date(task.productionDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell data-testid={`text-shift-${task.id}`}>
                      {task.shift || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(task.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {task.whatsappEnabled === 1 && (
                          <Badge
                            variant={task.whatsappSent === 1 ? "default" : "outline"}
                            className="text-xs"
                            data-testid={`badge-whatsapp-${task.id}`}
                          >
                            WhatsApp {task.whatsappSent === 1 && '✓'}
                          </Badge>
                        )}
                        {task.emailEnabled === 1 && (
                          <Badge
                            variant={task.emailSent === 1 ? "default" : "outline"}
                            className="text-xs"
                            data-testid={`badge-email-${task.id}`}
                          >
                            Email {task.emailSent === 1 && '✓'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                        data-testid={`button-delete-${task.id}`}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Machine Startup Reminder</DialogTitle>
            <DialogDescription>
              Schedule a reminder to notify an operator to start a machine before production
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="machineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-machine">
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {machines.map((machine) => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.name}
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
                name="assignedUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To (Operator)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.filter(u => u.role === 'operator').map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="productionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-production-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-start-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reminderBeforeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Before (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="5"
                          max="480"
                          {...field}
                          data-testid="input-reminder-minutes"
                        />
                      </FormControl>
                      <FormDescription>
                        Send reminder 5-480 minutes before start time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-shift">
                            <SelectValue placeholder="Select shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                          <SelectItem value="Night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional instructions..."
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Notification Channels</h4>
                
                <FormField
                  control={form.control}
                  name="whatsappEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>WhatsApp Notification</FormLabel>
                        <FormDescription>
                          Send reminder via WhatsApp (logged to console)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-whatsapp"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Email Notification</FormLabel>
                        <FormDescription>
                          Send reminder via Email (logged to console)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-email"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Reminder
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BulkMachineStartupAssignment 
        open={showBulkAssignment} 
        onOpenChange={setShowBulkAssignment} 
      />
    </div>
  );
}
