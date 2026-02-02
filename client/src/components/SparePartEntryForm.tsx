import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { SparePartEntry, SparePartCatalog } from "@shared/schema";

interface SparePartEntryFormProps {
  part: SparePartCatalog;
  onClose: () => void;
}

export default function SparePartEntryForm({ part, onClose }: SparePartEntryFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: '',
    unitPrice: '',
    remarks: ''
  });

  const { data: entries = [], isLoading } = useQuery<SparePartEntry[]>({
    queryKey: [`/api/spare-parts/${part.id}/entries`],
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/spare-parts/${part.id}/entries`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/spare-parts/${part.id}/entries`] });
      queryClient.invalidateQueries({ queryKey: ['/api/spare-parts'] });
      setIsOpen(false);
      setFormData({
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: '',
        unitPrice: '',
        remarks: ''
      });
      toast({ title: "Success", description: "Stock entry recorded successfully" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity),
      unitPrice: parseInt(formData.unitPrice),
      purchaseDate: new Date(formData.purchaseDate).toISOString()
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Stock History: {part.partName}</h3>
        <Button onClick={() => setIsOpen(true)}>Add Stock Entry</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price (₹)</TableHead>
                <TableHead>Total (₹)</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.purchaseDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{entry.quantity}</TableCell>
                  <TableCell>{entry.unitPrice}</TableCell>
                  <TableCell>{entry.quantity * entry.unitPrice}</TableCell>
                  <TableCell>{entry.remarks || '-'}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No stock entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Stock Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input 
                type="date" 
                value={formData.purchaseDate} 
                onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input 
                  type="number" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input 
                  type="number" 
                  value={formData.unitPrice} 
                  onChange={e => setFormData({...formData, unitPrice: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input 
                value={formData.remarks} 
                onChange={e => setFormData({...formData, remarks: e.target.value})}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>Record Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
