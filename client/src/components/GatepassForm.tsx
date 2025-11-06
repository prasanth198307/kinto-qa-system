import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertGatepassSchema, type Gatepass, type FinishedGood, type Product, type Uom } from "@shared/schema";
import { format } from "date-fns";

interface GatepassFormProps {
  gatepass: Gatepass | null;
  onClose: () => void;
}

export default function GatepassForm({ gatepass, onClose }: GatepassFormProps) {
  const { toast } = useToast();

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const form = useForm({
    resolver: zodResolver(insertGatepassSchema),
    defaultValues: {
      gatepassNumber: '',
      gatepassDate: format(new Date(), 'yyyy-MM-dd'),
      finishedGoodId: '',
      productId: '',
      quantityDispatched: 0,
      uomId: '',
      vehicleNumber: '',
      driverName: '',
      driverContact: '',
      transporterName: '',
      destination: '',
      customerName: '',
      invoiceNumber: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (gatepass) {
      form.reset({
        gatepassNumber: gatepass.gatepassNumber || '',
        gatepassDate: gatepass.gatepassDate ? format(new Date(gatepass.gatepassDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        finishedGoodId: gatepass.finishedGoodId || '',
        productId: gatepass.productId || '',
        quantityDispatched: gatepass.quantityDispatched || 0,
        uomId: gatepass.uomId || '',
        vehicleNumber: gatepass.vehicleNumber || '',
        driverName: gatepass.driverName || '',
        driverContact: gatepass.driverContact || '',
        transporterName: gatepass.transporterName || '',
        destination: gatepass.destination || '',
        customerName: gatepass.customerName || '',
        invoiceNumber: gatepass.invoiceNumber || '',
        remarks: gatepass.remarks || '',
      });
    } else {
      form.reset({
        gatepassNumber: '',
        gatepassDate: format(new Date(), 'yyyy-MM-dd'),
        finishedGoodId: '',
        productId: '',
        quantityDispatched: 0,
        uomId: '',
        vehicleNumber: '',
        driverName: '',
        driverContact: '',
        transporterName: '',
        destination: '',
        customerName: '',
        invoiceNumber: '',
        remarks: '',
      });
    }
  }, [gatepass, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (gatepass) {
        return apiRequest('PATCH', `/api/gatepasses/${gatepass.id}`, data);
      } else {
        return apiRequest('POST', '/api/gatepasses', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({
        title: "Success",
        description: gatepass ? "Gatepass updated successfully" : "Gatepass issued successfully and inventory deducted",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save gatepass",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  const selectedFinishedGood = finishedGoods.find(fg => fg.id === form.watch('finishedGoodId'));

  useEffect(() => {
    if (selectedFinishedGood) {
      form.setValue('productId', selectedFinishedGood.productId);
      if (selectedFinishedGood.uomId) {
        form.setValue('uomId', selectedFinishedGood.uomId);
      }
    }
  }, [selectedFinishedGood, form]);

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">
        {gatepass ? 'Edit Gatepass' : 'Issue Gatepass for Finished Goods Dispatch'}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gatepassNumber">Gatepass Number *</Label>
            <Input
              id="gatepassNumber"
              {...form.register('gatepassNumber')}
              placeholder="e.g., GP-2024-001"
              data-testid="input-gatepass-number"
            />
            {form.formState.errors.gatepassNumber && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.gatepassNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="gatepassDate">Gatepass Date *</Label>
            <Input
              id="gatepassDate"
              type="date"
              {...form.register('gatepassDate')}
              data-testid="input-gatepass-date"
            />
            {form.formState.errors.gatepassDate && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.gatepassDate.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="finishedGoodId">Finished Good *</Label>
          <Select
            value={form.watch('finishedGoodId')}
            onValueChange={(value) => form.setValue('finishedGoodId', value)}
          >
            <SelectTrigger data-testid="select-finished-good">
              <SelectValue placeholder="Select finished good" />
            </SelectTrigger>
            <SelectContent>
              {finishedGoods.map((fg) => {
                const product = products.find(p => p.id === fg.productId);
                return (
                  <SelectItem key={fg.id} value={fg.id}>
                    {product?.productName || 'Unknown'} - Batch: {fg.batchNumber} (Qty: {fg.quantity})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {form.formState.errors.finishedGoodId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.finishedGoodId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantityDispatched">Quantity Dispatched *</Label>
            <Input
              id="quantityDispatched"
              type="number"
              {...form.register('quantityDispatched', { valueAsNumber: true })}
              data-testid="input-quantity-dispatched"
            />
            {selectedFinishedGood && (
              <p className="text-xs text-muted-foreground mt-1">
                Available: {selectedFinishedGood.quantity}
              </p>
            )}
            {form.formState.errors.quantityDispatched && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.quantityDispatched.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="uomId">Unit of Measure</Label>
            <Select
              value={form.watch('uomId') ?? ''}
              onValueChange={(value) => form.setValue('uomId', value ? value : undefined)}
            >
              <SelectTrigger data-testid="select-uom">
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
            <Input
              id="vehicleNumber"
              {...form.register('vehicleNumber')}
              placeholder="e.g., MH-12-AB-1234"
              data-testid="input-vehicle-number"
            />
            {form.formState.errors.vehicleNumber && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.vehicleNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="driverName">Driver Name *</Label>
            <Input
              id="driverName"
              {...form.register('driverName')}
              data-testid="input-driver-name"
            />
            {form.formState.errors.driverName && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.driverName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="driverContact">Driver Contact</Label>
            <Input
              id="driverContact"
              {...form.register('driverContact')}
              placeholder="Phone number"
              data-testid="input-driver-contact"
            />
          </div>

          <div>
            <Label htmlFor="transporterName">Transporter Name</Label>
            <Input
              id="transporterName"
              {...form.register('transporterName')}
              data-testid="input-transporter-name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              {...form.register('destination')}
              data-testid="input-destination"
            />
          </div>

          <div>
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              {...form.register('customerName')}
              data-testid="input-customer-name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input
            id="invoiceNumber"
            {...form.register('invoiceNumber')}
            data-testid="input-invoice-number"
          />
        </div>

        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea
            id="remarks"
            {...form.register('remarks')}
            placeholder="Additional notes"
            data-testid="input-remarks"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-gatepass">
            {mutation.isPending ? 'Saving...' : gatepass ? 'Update' : 'Issue Gatepass'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
