import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import type { Machine, User } from "@shared/schema";

interface BulkAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BulkMachineStartupAssignment({ open, onOpenChange }: BulkAssignmentProps) {
  const { toast } = useToast();
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [assignedUserId, setAssignedUserId] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [productionStartTime, setProductionStartTime] = useState("");
  const [shift, setShift] = useState("");

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const operators = users.filter(u => u.roleId);

  const bulkCreateMutation = useMutation({
    mutationFn: async (tasks: any[]) => {
      const promises = tasks.map(task =>
        apiRequest('POST', '/api/machine-startup-tasks', task)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machine-startup-tasks'] });
      toast({
        title: "Bulk assignment successful",
        description: `${selectedMachines.length} machine startup tasks created successfully.`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk assignment failed",
        description: error.message || "Failed to create machine startup tasks.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedMachines([]);
    setAssignedUserId("");
    setProductionDate("");
    setProductionStartTime("");
    setShift("");
  };

  const toggleMachine = (machineId: string) => {
    setSelectedMachines(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const toggleAllMachines = () => {
    if (selectedMachines.length === machines.length) {
      setSelectedMachines([]);
    } else {
      setSelectedMachines(machines.map(m => m.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMachines.length === 0) {
      toast({
        title: "No machines selected",
        description: "Please select at least one machine.",
        variant: "destructive",
      });
      return;
    }

    if (!assignedUserId) {
      toast({
        title: "No operator selected",
        description: "Please select an operator to assign.",
        variant: "destructive",
      });
      return;
    }

    if (!productionDate || !productionStartTime) {
      toast({
        title: "Missing information",
        description: "Please provide production date and start time.",
        variant: "destructive",
      });
      return;
    }

    const tasks = selectedMachines.map(machineId => {
      const machine = machines.find(m => m.id === machineId);
      const warmupMinutes = machine?.warmupTimeMinutes || 0;
      
      const scheduledDateTime = new Date(`${productionDate}T${productionStartTime}`);
      
      const reminderMinutes = warmupMinutes > 0 ? warmupMinutes + 15 : 30;

      return {
        machineId,
        assignedUserId,
        scheduledStartTime: scheduledDateTime.toISOString(),
        reminderBeforeMinutes: reminderMinutes,
        productionDate,
        shift: shift || null,
        notes: warmupMinutes > 0 
          ? `Machine requires ${warmupMinutes} minutes warmup before production`
          : "Machine can start directly",
        whatsappEnabled: true,
        emailEnabled: true,
      };
    });

    bulkCreateMutation.mutate(tasks);
  };

  const selectedMachineObjects = machines.filter(m => selectedMachines.includes(m.id));
  const totalWarmupNeeded = Math.max(...selectedMachineObjects.map(m => m.warmupTimeMinutes || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-assignment">
        <DialogHeader>
          <DialogTitle>Bulk Machine Assignment for Next Day</DialogTitle>
          <DialogDescription>
            Assign multiple machines to one operator for tomorrow's production
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Select Machines ({selectedMachines.length} selected)</Label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={selectedMachines.length === machines.length}
                  onCheckedChange={toggleAllMachines}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm font-medium">Select All Machines</span>
              </div>
              
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {machines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No machines available</p>
                ) : (
                  machines.map((machine, index) => (
                    <div key={machine.id} className="flex items-start gap-3 p-2 hover-elevate rounded" data-testid={`machine-item-${index}`}>
                      <Checkbox
                        checked={selectedMachines.includes(machine.id)}
                        onCheckedChange={() => toggleMachine(machine.id)}
                        data-testid={`checkbox-machine-${index}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{machine.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {machine.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {machine.warmupTimeMinutes || 0} min warmup
                          {(machine.warmupTimeMinutes || 0) === 0 && (
                            <span className="text-green-600 ml-1">(Ready instantly)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedMachines.length > 0 && totalWarmupNeeded > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Maximum warmup needed: {totalWarmupNeeded} minutes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Operator will be reminded {totalWarmupNeeded + 15} minutes before production starts
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="operator">Assign to Operator *</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId} required>
                <SelectTrigger data-testid="select-operator">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="production-date">Production Date *</Label>
                <Input
                  id="production-date"
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  required
                  data-testid="input-production-date"
                />
              </div>

              <div>
                <Label htmlFor="start-time">Production Start Time *</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={productionStartTime}
                  onChange={(e) => setProductionStartTime(e.target.value)}
                  required
                  data-testid="input-start-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="shift">Shift (Optional)</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger data-testid="select-shift">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Afternoon">Afternoon</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={bulkCreateMutation.isPending || selectedMachines.length === 0}
              data-testid="button-create-bulk-tasks"
            >
              {bulkCreateMutation.isPending ? (
                <>Creating {selectedMachines.length} Tasks...</>
              ) : (
                <>Create {selectedMachines.length} Startup Tasks</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
