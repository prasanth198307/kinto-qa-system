import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Minus, RotateCcw } from "lucide-react";
import type { SparePartEntry, SparePartCatalog, SparePartIssuance, Machine, User } from "@shared/schema";

interface SparePartEntryFormProps {
  part: SparePartCatalog;
  onClose: () => void;
}

export default function SparePartEntryForm({ part, onClose }: SparePartEntryFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("entries");
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedIssuance, setSelectedIssuance] = useState<SparePartIssuance | null>(null);
  
  const [entryFormData, setEntryFormData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: '',
    unitPrice: '',
    gstPercent: '18',
    remarks: ''
  });

  const [issueFormData, setIssueFormData] = useState({
    machineId: '', // Start empty
    issuedTo: '',
    issueDate: new Date().toISOString().split('T')[0],
    quantity: '',
    purpose: '',
    workOrderNumber: '',
    remarks: ''
  });

  // Effect to sync machineId if part changes or when dialog opens
  useEffect(() => {
    if (isIssueDialogOpen) {
      console.log('DIALOG OPENED - Syncing machineId. Part has:', part.machineId);
      setIssueFormData(prev => ({
        ...prev,
        machineId: part.machineId || ''
      }));
    } else {
      // Clear when closing
      setIssueFormData(prev => ({
        ...prev,
        machineId: ''
      }));
    }
  }, [isIssueDialogOpen, part.id, part.machineId]);

  const [returnQuantity, setReturnQuantity] = useState('');

  const { data: entries = [], isLoading: entriesLoading } = useQuery<SparePartEntry[]>({
    queryKey: [`/api/spare-parts/${part.id}/entries`],
  });

  const { data: issuances = [], isLoading: issuancesLoading } = useQuery<SparePartIssuance[]>({
    queryKey: [`/api/spare-parts/${part.id}/issuances`],
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const entryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/spare-parts/${part.id}/entries`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/spare-parts/${part.id}/entries`] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsEntryDialogOpen(false);
      setEntryFormData({
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: '',
        unitPrice: '',
        gstPercent: '18',
        remarks: ''
      });
      toast({ title: "Success", description: "Stock entry recorded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record entry", variant: "destructive" });
    }
  });

  const issueMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/spare-part-issuances`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/spare-parts/${part.id}/issuances`] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsIssueDialogOpen(false);
      setIssueFormData({
        machineId: part.machineId || '',
        issuedTo: '',
        issueDate: new Date().toISOString().split('T')[0],
        quantity: '',
        purpose: '',
        workOrderNumber: '',
        remarks: ''
      });
      toast({ title: "Success", description: "Spare part issued successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to issue spare part", variant: "destructive" });
    }
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return await apiRequest('POST', `/api/spare-part-issuances/${id}/return`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/spare-parts/${part.id}/issuances`] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsReturnDialogOpen(false);
      setSelectedIssuance(null);
      setReturnQuantity('');
      toast({ title: "Success", description: "Spare part returned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to return spare part", variant: "destructive" });
    }
  });

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(entryFormData.quantity);
    const unitPrice = parseInt(entryFormData.unitPrice);
    const gstPercent = parseInt(entryFormData.gstPercent) || 0;
    const baseAmount = qty * unitPrice;
    const gstAmount = Math.round(baseAmount * gstPercent / 100);
    const totalAmount = baseAmount + gstAmount;
    
    entryMutation.mutate({
      quantity: qty,
      unitPrice: unitPrice,
      gstPercent: gstPercent,
      gstAmount: gstAmount,
      totalAmount: totalAmount,
      remarks: entryFormData.remarks,
      purchaseDate: new Date(entryFormData.purchaseDate).toISOString()
    });
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    issueMutation.mutate({
      sparePartId: part.id,
      machineId: issueFormData.machineId || null,
      issuedTo: issueFormData.issuedTo || null,
      issueDate: new Date(issueFormData.issueDate).toISOString(),
      quantity: parseInt(issueFormData.quantity),
      purpose: issueFormData.purpose || null,
      workOrderNumber: issueFormData.workOrderNumber || null,
      remarks: issueFormData.remarks || null
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIssuance) {
      returnMutation.mutate({
        id: selectedIssuance.id,
        quantity: parseInt(returnQuantity)
      });
    }
  };

  const openReturnDialog = (issuance: SparePartIssuance) => {
    setSelectedIssuance(issuance);
    setReturnQuantity('');
    setIsReturnDialogOpen(true);
  };

  const getMachineName = (machineId: string | null) => {
    if (!machineId) return '-';
    const machine = machines.find(m => m.id === machineId);
    return machine?.name || machineId;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return '-';
    const user = users.find(u => u.id === userId);
    return user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || userId;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">{part.partName}</h3>
          <p className="text-sm text-muted-foreground">
            Part #: {part.partNumber || 'N/A'} | Current Stock: <strong>{part.currentStock || 0}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEntryDialogOpen(true)} data-testid="button-add-stock">
            <Plus className="w-4 h-4 mr-1" /> Add Spare Part Entry
          </Button>
          <Button size="sm" onClick={() => setIsIssueDialogOpen(true)} data-testid="button-issue-stock">
            <Minus className="w-4 h-4 mr-1" /> Issue Part
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries" data-testid="tab-stock-in">Stock In ({entries.length})</TabsTrigger>
          <TabsTrigger value="issuances" data-testid="tab-stock-out">Stock Out ({issuances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price (₹)</TableHead>
                    <TableHead>GST</TableHead>
                    <TableHead>Total (₹)</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No stock entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => {
                      const baseAmount = entry.quantity * entry.unitPrice;
                      const gstAmt = (entry as any).gstAmount || 0;
                      const total = (entry as any).totalAmount || baseAmount + gstAmt;
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.purchaseDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-green-600 font-medium">+{entry.quantity}</TableCell>
                          <TableCell>₹{entry.unitPrice}</TableCell>
                          <TableCell>{(entry as any).gstPercent || 0}% (₹{gstAmt})</TableCell>
                          <TableCell className="font-medium">₹{total}</TableCell>
                          <TableCell>{entry.remarks || '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issuances">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issuancesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : issuances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        No issuances found
                      </TableCell>
                    </TableRow>
                  ) : (
                    issuances.map((issuance) => {
                      const netIssued = Number(issuance.quantity) - (Number(issuance.returnedQuantity) || 0);
                      return (
                        <TableRow key={issuance.id}>
                          <TableCell>{format(new Date(issuance.issueDate), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-red-600 font-medium">
                            -{issuance.quantity}
                            {Number(issuance.returnedQuantity) > 0 && (
                              <span className="text-green-600 text-xs ml-1">(+{issuance.returnedQuantity} returned)</span>
                            )}
                          </TableCell>
                          <TableCell>{getMachineName(issuance.machineId)}</TableCell>
                          <TableCell>{getUserName(issuance.issuedTo)}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{issuance.purpose || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={issuance.status === 'returned' ? 'secondary' : 'default'}>
                              {issuance.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {netIssued > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReturnDialog(issuance)}
                                data-testid={`button-return-${issuance.id}`}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" /> Return
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Stock Entry Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock Entry</DialogTitle>
            <DialogDescription>Record a new stock purchase for {part.partName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEntrySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input 
                type="date" 
                value={entryFormData.purchaseDate} 
                onChange={e => setEntryFormData({...entryFormData, purchaseDate: e.target.value})}
                required
                data-testid="input-entry-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={entryFormData.quantity} 
                  onChange={e => setEntryFormData({...entryFormData, quantity: e.target.value})}
                  required
                  data-testid="input-entry-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={entryFormData.unitPrice} 
                  onChange={e => setEntryFormData({...entryFormData, unitPrice: e.target.value})}
                  required
                  data-testid="input-entry-price"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST %</Label>
                <Select value={entryFormData.gstPercent} onValueChange={v => setEntryFormData({...entryFormData, gstPercent: v})}>
                  <SelectTrigger data-testid="select-entry-gst">
                    <SelectValue placeholder="GST %" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={(parseInt(entryFormData.quantity) || 0) * (parseInt(entryFormData.unitPrice) || 0) + Math.round((parseInt(entryFormData.quantity) || 0) * (parseInt(entryFormData.unitPrice) || 0) * (parseInt(entryFormData.gstPercent) || 0) / 100)}
                  readOnly
                  className="bg-muted"
                  data-testid="input-entry-total-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input 
                value={entryFormData.remarks} 
                onChange={e => setEntryFormData({...entryFormData, remarks: e.target.value})}
                data-testid="input-entry-remarks"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEntryDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={entryMutation.isPending} data-testid="button-submit-entry">
                {entryMutation.isPending ? 'Recording...' : 'Record Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Issue Spare Part Dialog */}
      <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue Spare Part</DialogTitle>
            <DialogDescription>
              Issue {part.partName} from stock. Current available: <strong>{issueMutation.isPending ? '...' : (part.currentStock || 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input 
                  type="date" 
                  value={issueFormData.issueDate} 
                  onChange={e => setIssueFormData({...issueFormData, issueDate: e.target.value})}
                  required
                  data-testid="input-issue-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input 
                  type="number" 
                  min="1"
                  max={part.currentStock || 0}
                  value={issueFormData.quantity} 
                  onChange={e => setIssueFormData({...issueFormData, quantity: e.target.value})}
                  required
                  data-testid="input-issue-quantity"
                />
              </div>
            </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Machine</Label>
                    <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted flex items-center">
                      <span className="text-sm font-medium">
                        {part.machineId ? getMachineName(part.machineId) : "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Issued To *</Label>
                    <Input 
                      value={issueFormData.issuedTo} 
                      onChange={e => setIssueFormData({...issueFormData, issuedTo: e.target.value})}
                      placeholder="Enter person name"
                      required
                      data-testid="input-issue-user"
                    />
                  </div>
                </div>
            <div className="space-y-2">
              <Label>Work Order #</Label>
              <Input 
                value={issueFormData.workOrderNumber} 
                onChange={e => setIssueFormData({...issueFormData, workOrderNumber: e.target.value})}
                placeholder="Optional work order reference"
                data-testid="input-issue-workorder"
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea 
                value={issueFormData.purpose} 
                onChange={e => setIssueFormData({...issueFormData, purpose: e.target.value})}
                placeholder="Reason for issuance"
                rows={2}
                data-testid="input-issue-purpose"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsIssueDialogOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={issueMutation.isPending || !issueFormData.quantity || parseInt(issueFormData.quantity) > (part.currentStock || 0)} 
                data-testid="button-submit-issue"
              >
                {issueMutation.isPending ? 'Issuing...' : 'Issue Part'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Spare Part Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Spare Part</DialogTitle>
            <DialogDescription>
              {selectedIssuance && (
                <>
                  Returning from issuance dated {format(new Date(selectedIssuance.issueDate), 'dd MMM yyyy')}.
                  Max returnable: <strong>{Number(selectedIssuance.quantity) - (Number(selectedIssuance.returnedQuantity) || 0)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Return Quantity</Label>
              <Input 
                type="number" 
                min="1"
                max={selectedIssuance ? Number(selectedIssuance.quantity) - (Number(selectedIssuance.returnedQuantity) || 0) : 0}
                value={returnQuantity} 
                onChange={e => setReturnQuantity(e.target.value)}
                required
                data-testid="input-return-quantity"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={returnMutation.isPending} data-testid="button-submit-return">
                {returnMutation.isPending ? 'Returning...' : 'Return'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
