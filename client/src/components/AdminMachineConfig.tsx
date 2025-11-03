import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
}

export default function AdminMachineConfig() {
  const [machines] = useState<Machine[]>([
    { id: '1', name: 'RFC Machine 01', type: 'Rinse-Fill-Cap', location: 'Production Line A' },
    { id: '2', name: 'PET Blowing Machine', type: 'Bottle Manufacturing', location: 'Production Line B' },
    { id: '3', name: 'Batch Coding Machine', type: 'Labeling', location: 'Packaging Area' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-title">Machine Configuration</h2>
        <Button onClick={() => console.log('Add machine')} data-testid="button-add-machine">
          <Plus className="h-4 w-4 mr-1" />
          Add Machine
        </Button>
      </div>

      <div className="space-y-3">
        {machines.map((machine, index) => (
          <Card key={machine.id} className="p-4" data-testid={`card-machine-${index}`}>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-sm" data-testid={`text-machine-name-${index}`}>{machine.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Type: {machine.type}</p>
                <p className="text-xs text-muted-foreground">Location: {machine.location}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => console.log('Edit machine', machine.id)}
                  data-testid={`button-edit-${index}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Delete machine', machine.id)}
                  data-testid={`button-delete-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
