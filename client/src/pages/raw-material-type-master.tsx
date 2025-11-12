import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RawMaterialType = {
  id: string;
  typeCode: string;
  typeName: string;
  conversionMethod: string;
  baseUnit: string;
  baseUnitWeight?: number;
  derivedUnit?: string;
  weightPerDerivedUnit?: number;
  derivedValuePerBase?: number;
  outputType?: string;
  outputUnitsCovered?: number;
  conversionValue?: number;
  lossPercent?: number;
  usableUnits?: number;
  description?: string;
  isActive: number;
};

// Form schema matching backend discriminated union exactly
const formSchema = z.discriminatedUnion("conversionMethod", [
  z.object({
    conversionMethod: z.literal("formula-based"),
    typeName: z.string().min(1, "Type name is required"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0"),
    derivedUnit: z.string().min(1, "Derived unit is required"),
    weightPerDerivedUnit: z.number().positive("Weight per derived unit must be greater than 0"),
    derivedValuePerBase: z.number().optional(),
    outputType: z.string().optional(),
    outputUnitsCovered: z.number().optional(),
    lossPercent: z.number().min(0).max(100).default(0),
    description: z.string().optional(),
  }),
  z.object({
    conversionMethod: z.literal("direct-value"),
    typeName: z.string().min(1, "Type name is required"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0").optional(),
    derivedUnit: z.string().min(1, "Derived unit is required"),
    derivedValuePerBase: z.number().positive("Derived value per base must be greater than 0"),
    weightPerDerivedUnit: z.number().optional(),
    outputType: z.string().optional(),
    outputUnitsCovered: z.number().optional(),
    lossPercent: z.number().min(0).max(100).default(0),
    description: z.string().optional(),
  }),
  z.object({
    conversionMethod: z.literal("output-coverage"),
    typeName: z.string().min(1, "Type name is required"),
    baseUnit: z.string().min(1, "Base unit is required"),
    baseUnitWeight: z.number().positive("Base unit weight must be greater than 0").optional(),
    outputType: z.string().min(1, "Output type is required"),
    outputUnitsCovered: z.number().positive("Output units covered must be greater than 0"),
    derivedUnit: z.string().optional(),
    weightPerDerivedUnit: z.number().optional(),
    derivedValuePerBase: z.number().optional(),
    lossPercent: z.number().min(0).max(100).default(0),
    description: z.string().optional(),
  }),
]);

type FormValues = z.infer<typeof formSchema>;

export default function RawMaterialTypeMaster() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RawMaterialType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<RawMaterialType | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      conversionMethod: "formula-based",
      typeName: "",
      baseUnit: "",
      derivedUnit: "",
      lossPercent: 0,
      description: "",
    },
  });

  const conversionMethod = form.watch("conversionMethod");
  const baseUnitWeight = form.watch("baseUnitWeight");
  const weightPerDerivedUnit = form.watch("weightPerDerivedUnit");
  const derivedValuePerBase = form.watch("derivedValuePerBase");
  const outputUnitsCovered = form.watch("outputUnitsCovered");
  const lossPercent = form.watch("lossPercent") || 0;

  // Calculate conversion value based on method
  const calculateConversionValue = () => {
    if (conversionMethod === "formula-based" && baseUnitWeight && weightPerDerivedUnit) {
      return Math.round((baseUnitWeight * 1000) / weightPerDerivedUnit);
    } else if (conversionMethod === "direct-value" && derivedValuePerBase) {
      return derivedValuePerBase;
    } else if (conversionMethod === "output-coverage" && outputUnitsCovered) {
      return outputUnitsCovered;
    }
    return 0;
  };

  const conversionValue = calculateConversionValue();
  const usableUnits = Math.round(conversionValue * (1 - (lossPercent / 100)));

  const { data: types = [], isLoading } = useQuery<RawMaterialType[]>({
    queryKey: ["/api/raw-material-types"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest("POST", "/api/raw-material-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-material-types"] });
      toast({ title: "Success", description: "Raw material type created successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create raw material type",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: FormValues }) => {
      return await apiRequest("PATCH", `/api/raw-material-types/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-material-types"] });
      toast({ title: "Success", description: "Raw material type updated successfully" });
      setDialogOpen(false);
      setEditingType(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update raw material type",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/raw-material-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-material-types"] });
      toast({ title: "Success", description: "Raw material type deleted successfully" });
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete raw material type",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, updates: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (type: RawMaterialType) => {
    setEditingType(type);
    // Preserve ALL fields from backend, including optional ones, to prevent data loss
    form.reset({
      conversionMethod: type.conversionMethod as any,
      typeName: type.typeName,
      baseUnit: type.baseUnit,
      baseUnitWeight: type.baseUnitWeight || undefined,
      derivedUnit: type.derivedUnit || undefined,
      weightPerDerivedUnit: type.weightPerDerivedUnit || undefined,
      derivedValuePerBase: type.derivedValuePerBase || undefined,
      outputType: type.outputType || undefined,
      outputUnitsCovered: type.outputUnitsCovered || undefined,
      lossPercent: type.lossPercent || 0,
      description: type.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (type: RawMaterialType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingType(null);
    form.reset({
      conversionMethod: "formula-based",
      typeName: "",
      baseUnit: "",
      derivedUnit: "",
      lossPercent: 0,
      description: "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Raw Material Type Master
          </h1>
          <p className="text-muted-foreground mt-1">
            Define raw material types with conversion methods for inventory management
          </p>
        </div>
        <Button onClick={handleAddNew} data-testid="button-add-type">
          <Plus className="h-4 w-4 mr-2" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading types...</div>
          ) : types.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No raw material types found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type Code</TableHead>
                  <TableHead>Type Name</TableHead>
                  <TableHead>Conversion Method</TableHead>
                  <TableHead>Base Unit</TableHead>
                  <TableHead>Conversion Details</TableHead>
                  <TableHead>Usable Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id} data-testid={`row-type-${type.id}`}>
                    <TableCell className="font-medium">{type.typeCode}</TableCell>
                    <TableCell>{type.typeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {type.conversionMethod === "formula-based" && "Formula-Based"}
                        {type.conversionMethod === "direct-value" && "Direct-Value"}
                        {type.conversionMethod === "output-coverage" && "Output-Coverage"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {type.baseUnit}
                      {type.baseUnitWeight && ` (${type.baseUnitWeight})`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {type.conversionMethod === "formula-based" && (
                        <div>
                          <div>{type.derivedUnit}: {type.conversionValue} pcs</div>
                          <div className="text-muted-foreground text-xs">
                            {type.baseUnitWeight}kg × 1000 ÷ {type.weightPerDerivedUnit}g
                          </div>
                        </div>
                      )}
                      {type.conversionMethod === "direct-value" && (
                        <div>
                          {type.derivedUnit}: {type.conversionValue} pcs
                        </div>
                      )}
                      {type.conversionMethod === "output-coverage" && (
                        <div>
                          {type.outputType}: {type.conversionValue} units
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.usableUnits} ({100 - (type.lossPercent || 0)}%)
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.isActive === 1 ? "default" : "secondary"}>
                        {type.isActive === 1 ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(type)}
                          data-testid={`button-edit-${type.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(type)}
                          data-testid={`button-delete-${type.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Raw Material Type" : "Add Raw Material Type"}
            </DialogTitle>
            <DialogDescription>
              Define a raw material type with its conversion method and parameters.
              The system will auto-calculate conversion values.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="typeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Preform, Cap, Label" data-testid="input-type-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conversionMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversion Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-conversion-method">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select conversion method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="formula-based">Formula-Based (Weight Calculation)</SelectItem>
                        <SelectItem value="direct-value">Direct-Value (Manual Entry)</SelectItem>
                        <SelectItem value="output-coverage">Output-Coverage (Coverage Ratio)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="baseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-base-unit">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select base unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bag">Bag</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="Box">Box</SelectItem>
                          <SelectItem value="Roll">Roll</SelectItem>
                          <SelectItem value="Litre">Litre</SelectItem>
                          <SelectItem value="Piece">Piece</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {conversionMethod !== "output-coverage" && (
                  <FormField
                    control={form.control}
                    name="baseUnitWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Unit Weight (kg){conversionMethod === "direct-value" ? " (Optional)" : ""}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 25"
                            data-testid="input-base-weight"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Formula-Based Method Fields */}
              {conversionMethod === "formula-based" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground">
                    Formula: (Base Unit Weight × 1000) ÷ Weight Per Derived Unit
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="derivedUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Derived Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-derived-unit">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select derived unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Piece">Piece</SelectItem>
                              <SelectItem value="Bottle">Bottle</SelectItem>
                              <SelectItem value="Case">Case</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weightPerDerivedUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight Per Derived Unit (grams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 21"
                              data-testid="input-weight-per-derived"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Direct-Value Method Fields */}
              {conversionMethod === "direct-value" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground">
                    Enter the number of derived units per base unit directly
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="derivedUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Derived Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-derived-unit">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select derived unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Piece">Piece</SelectItem>
                              <SelectItem value="Bottle">Bottle</SelectItem>
                              <SelectItem value="Case">Case</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="derivedValuePerBase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Derived Units Per Base</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 7000"
                              data-testid="input-derived-value"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Output-Coverage Method Fields */}
              {conversionMethod === "output-coverage" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground">
                    Define how many output units one base unit can cover
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="outputType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Output Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-output-type">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select output type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Bottle">Bottle</SelectItem>
                              <SelectItem value="Case">Case</SelectItem>
                              <SelectItem value="Unit">Unit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="outputUnitsCovered"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Output Units Covered</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 1000"
                              data-testid="input-output-units"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="lossPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loss Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        data-testid="input-loss-percent"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Auto-Calculation Display */}
              <div className="p-4 border rounded-md bg-primary/5">
                <div className="text-sm font-medium mb-2">Auto-Calculated Values:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Conversion Value:</div>
                    <div className="font-medium" data-testid="display-conversion-value">{conversionValue}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Usable Units ({100 - lossPercent}%):</div>
                    <div className="font-medium" data-testid="display-usable-units">{usableUnits}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingType ? "Update Type" : "Create Type"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Raw Material Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.typeName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => typeToDelete && deleteMutation.mutate(typeToDelete.id)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
