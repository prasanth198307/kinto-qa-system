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
import { insertRawMaterialIssuanceSchema, type RawMaterialIssuance, type RawMaterial, type Product, type Uom } from "@shared/schema";
import { format } from "date-fns";

interface RawMaterialIssuanceFormProps {
  issuance: RawMaterialIssuance | null;
  onClose: () => void;
}

export default function RawMaterialIssuanceForm({ issuance, onClose }: RawMaterialIssuanceFormProps) {
  const { toast } = useToast();

  const { data: materials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const form = useForm({
    resolver: zodResolver(insertRawMaterialIssuanceSchema.extend({
      issuanceDate: insertRawMaterialIssuanceSchema.shape.issuanceDate.optional(),
      materialId: insertRawMaterialIssuanceSchema.shape.materialId,
      quantityIssued: insertRawMaterialIssuanceSchema.shape.quantityIssued,
    })),
    defaultValues: {
      issuanceDate: format(new Date(), 'yyyy-MM-dd'),
      materialId: '',
      quantityIssued: 0,
      uomId: '',
      productId: '',
      batchNumber: '',
      issuedTo: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (issuance) {
      form.reset({
        issuanceDate: issuance.issuanceDate ? format(new Date(issuance.issuanceDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        materialId: issuance.materialId || '',
        quantityIssued: issuance.quantityIssued || 0,
        uomId: issuance.uomId || '',
        productId: issuance.productId || '',
        batchNumber: issuance.batchNumber || '',
        issuedTo: issuance.issuedTo || '',
        remarks: issuance.remarks || '',
      });
    } else {
      form.reset({
        issuanceDate: format(new Date(), 'yyyy-MM-dd'),
        materialId: '',
        quantityIssued: 0,
        uomId: '',
        productId: '',
        batchNumber: '',
        issuedTo: '',
        remarks: '',
      });
    }
  }, [issuance, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (issuance) {
        return apiRequest('PATCH', `/api/raw-material-issuances/${issuance.id}`, data);
      } else {
        return apiRequest('POST', '/api/raw-material-issuances', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-transactions'] });
      toast({
        title: "Success",
        description: issuance ? "Issuance updated successfully" : "Material issued successfully and inventory deducted",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save issuance",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">
        {issuance ? 'Edit Raw Material Issuance' : 'Issue Raw Material for Production'}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="issuanceDate">Issuance Date *</Label>
          <Input
            id="issuanceDate"
            type="date"
            {...form.register('issuanceDate')}
            data-testid="input-issuance-date"
          />
          {form.formState.errors.issuanceDate && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.issuanceDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="materialId">Raw Material *</Label>
          <Select
            value={form.watch('materialId')}
            onValueChange={(value) => form.setValue('materialId', value)}
          >
            <SelectTrigger data-testid="select-material">
              <SelectValue placeholder="Select raw material" />
            </SelectTrigger>
            <SelectContent>
              {materials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.materialName} (Stock: {material.currentStock || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.materialId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.materialId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="quantityIssued">Quantity Issued *</Label>
          <Input
            id="quantityIssued"
            type="number"
            {...form.register('quantityIssued', { valueAsNumber: true })}
            data-testid="input-quantity-issued"
          />
          {form.formState.errors.quantityIssued && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.quantityIssued.message}</p>
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

        <div>
          <Label htmlFor="productId">Product (To Produce)</Label>
          <Select
            value={form.watch('productId') ?? ''}
            onValueChange={(value) => form.setValue('productId', value ? value : undefined)}
          >
            <SelectTrigger data-testid="select-product">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.productName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="batchNumber">Batch Number</Label>
          <Input
            id="batchNumber"
            {...form.register('batchNumber')}
            data-testid="input-batch-number"
          />
        </div>

        <div>
          <Label htmlFor="issuedTo">Issued To (Person/Department)</Label>
          <Input
            id="issuedTo"
            {...form.register('issuedTo')}
            placeholder="e.g., Production Line 1, John Doe"
            data-testid="input-issued-to"
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
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-issuance">
            {mutation.isPending ? 'Saving...' : issuance ? 'Update' : 'Issue Material'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
