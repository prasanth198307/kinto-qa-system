import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Camera, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoCapture } from "@/components/PhotoCapture";

interface Task {
  id: string;
  name: string;
  verificationCriteria: string;
  result: 'pass' | 'fail' | null;
  remarks: string;
  photoUrl?: string;
}

interface SparePart {
  id: string;
  item: string;
  quantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface ChecklistFormProps {
  machineName: string;
  tasks: Task[];
  onSubmit?: () => void;
}

export default function ChecklistForm({ machineName, tasks: initialTasks, onSubmit }: ChecklistFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>('morning');
  const [supervisor, setSupervisor] = useState('');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [signature, setSignature] = useState('');
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const addSparePart = () => {
    setSpareParts([...spareParts, {
      id: Date.now().toString(),
      item: '',
      quantity: 1,
      urgency: 'medium'
    }]);
  };

  const removeSparePart = (id: string) => {
    setSpareParts(spareParts.filter(sp => sp.id !== id));
  };

  const updateTask = (id: string, field: keyof Task, value: any) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const updateSparePart = (id: string, field: keyof SparePart, value: any) => {
    setSpareParts(spareParts.map(sp =>
      sp.id === id ? { ...sp, [field]: value } : sp
    ));
  };

  const handlePhotoCapture = (taskId: string) => {
    setCurrentTaskId(taskId);
    setPhotoDialogOpen(true);
  };

  const handlePhotoSave = (taskId: string, photoUrl: string) => {
    updateTask(taskId, 'photoUrl', photoUrl);
    setPhotoDialogOpen(false);
    setCurrentTaskId(null);
  };

  const handlePhotoRemove = (taskId: string) => {
    updateTask(taskId, 'photoUrl', undefined);
  };

  const urgencyColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <div className="pb-24 space-y-4">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-machine-name">{machineName}</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
                data-testid="input-date"
              />
            </div>
            <div>
              <Label htmlFor="shift" className="text-sm font-medium">Shift</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger className="mt-1" data-testid="select-shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="supervisor" className="text-sm font-medium">Supervisor Name</Label>
            <Input
              id="supervisor"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="Enter supervisor name"
              className="mt-1"
              data-testid="input-supervisor"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Checklist</h3>
        
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={task.id} className="pb-4 border-b last:border-b-0">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm" data-testid={`text-task-name-${index}`}>{task.name}</p>
                  <p className="text-xs text-muted-foreground">{task.verificationCriteria}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={task.result === 'pass' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateTask(task.id, 'result', 'pass')}
                    data-testid={`button-pass-${index}`}
                  >
                    Pass
                  </Button>
                  <Button
                    variant={task.result === 'fail' ? 'destructive' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateTask(task.id, 'result', 'fail')}
                    data-testid={`button-fail-${index}`}
                  >
                    Fail
                  </Button>
                  <Button
                    variant={task.photoUrl ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => handlePhotoCapture(task.id)}
                    data-testid={`button-photo-${index}`}
                  >
                    {task.photoUrl ? <ImageIcon className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>

                {task.photoUrl && (
                  <div className="relative mt-2">
                    <img
                      src={task.photoUrl}
                      alt={`Photo for ${task.name}`}
                      className="w-full h-32 object-cover rounded-md border"
                      data-testid={`image-task-photo-${index}`}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => handlePhotoRemove(task.id)}
                      data-testid={`button-remove-photo-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Textarea
                  placeholder="Remarks (optional)"
                  value={task.remarks}
                  onChange={(e) => updateTask(task.id, 'remarks', e.target.value)}
                  className="min-h-[60px]"
                  data-testid={`textarea-remarks-${index}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Spares Required</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addSparePart}
            data-testid="button-add-spare"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Spare
          </Button>
        </div>

        {spareParts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No spare parts required</p>
        ) : (
          <div className="space-y-3">
            {spareParts.map((spare, index) => (
              <div key={spare.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Spare item name"
                    value={spare.item}
                    onChange={(e) => updateSparePart(spare.id, 'item', e.target.value)}
                    data-testid={`input-spare-item-${index}`}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={spare.quantity}
                      onChange={(e) => updateSparePart(spare.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-20"
                      min="1"
                      data-testid={`input-spare-quantity-${index}`}
                    />
                    <Select 
                      value={spare.urgency} 
                      onValueChange={(value) => updateSparePart(spare.id, 'urgency', value)}
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-spare-urgency-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <Badge className={urgencyColors.low}>Low</Badge>
                        </SelectItem>
                        <SelectItem value="medium">
                          <Badge className={urgencyColors.medium}>Medium</Badge>
                        </SelectItem>
                        <SelectItem value="high">
                          <Badge className={urgencyColors.high}>High</Badge>
                        </SelectItem>
                        <SelectItem value="critical">
                          <Badge className={urgencyColors.critical}>Critical</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSparePart(spare.id)}
                  data-testid={`button-remove-spare-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Remarks</h3>
        <Textarea
          placeholder="Additional notes or observations..."
          value={generalRemarks}
          onChange={(e) => setGeneralRemarks(e.target.value)}
          className="min-h-[100px]"
          data-testid="textarea-general-remarks"
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4">Signature</h3>
        <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center mb-4">
          {signature ? (
            <div className="text-center">
              <p className="font-serif text-2xl" data-testid="text-signature">{signature}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign Here</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Type your name to sign"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            data-testid="input-signature"
          />
          <Button
            variant="outline"
            onClick={() => setSignature('')}
            data-testid="button-clear-signature"
          >
            Clear
          </Button>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            console.log('Submit checklist', { date, shift, supervisor, tasks, spareParts, generalRemarks, signature });
            onSubmit?.();
          }}
          data-testid="button-submit"
        >
          Submit for Review
        </Button>
      </div>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Task Photo</DialogTitle>
          </DialogHeader>
          {currentTaskId && (
            <PhotoCapture
              taskId={currentTaskId}
              onPhotoCapture={handlePhotoSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
