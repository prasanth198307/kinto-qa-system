import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CustomFieldsSectionProps {
  entityType: string;
  // Controlled mode: parent passes values & onChange
  values?: Record<string, any>;
  onChange?: (key: string, value: any) => void;
  // Self-contained mode: auto-load/save when entityId is provided
  entityId?: number | string | null;
  readOnly?: boolean;
}

function FieldInput({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  if (field.field_type === "text") return (
    <Input id={`cf-${field.field_name}`} data-testid={`input-cf-${field.field_name}`}
      value={value || ""} onChange={e => onChange(e.target.value)} required={field.is_required} />
  );
  if (field.field_type === "number") return (
    <Input id={`cf-${field.field_name}`} type="number" data-testid={`input-cf-${field.field_name}`}
      value={value || ""} onChange={e => onChange(e.target.value)} required={field.is_required} />
  );
  if (field.field_type === "date") return (
    <Input id={`cf-${field.field_name}`} type="date" data-testid={`input-cf-${field.field_name}`}
      value={value || ""} onChange={e => onChange(e.target.value)} required={field.is_required} />
  );
  if (field.field_type === "textarea") return (
    <Textarea id={`cf-${field.field_name}`} data-testid={`input-cf-${field.field_name}`}
      value={value || ""} onChange={e => onChange(e.target.value)} required={field.is_required} />
  );
  if (field.field_type === "select") return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger id={`cf-${field.field_name}`} data-testid={`select-cf-${field.field_name}`}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {(field.options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  if (field.field_type === "boolean") return (
    <Select value={value?.toString() || ""} onValueChange={v => onChange(v === "true")}>
      <SelectTrigger id={`cf-${field.field_name}`} data-testid={`select-cf-${field.field_name}`}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">Yes</SelectItem>
        <SelectItem value="false">No</SelectItem>
      </SelectContent>
    </Select>
  );
  return null;
}

export function CustomFieldsSection({ entityType, values: controlledValues, onChange: controlledOnChange, entityId, readOnly }: CustomFieldsSectionProps) {
  const { toast } = useToast();
  const fields = useCustomFields(entityType);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  const isSelfContained = !!entityId && !controlledOnChange;

  // Fetch saved values if entityId provided
  const { data: savedValues } = useQuery<any[]>({
    queryKey: ["/api/generic/custom-field-values", entityType, entityId],
    queryFn: () => fetch(`/api/generic/custom-field-values/${entityType}/${entityId}`, { credentials: "include" }).then(r => r.json()),
    enabled: isSelfContained,
  });

  useEffect(() => {
    if (savedValues && isSelfContained) {
      const map: Record<string, any> = {};
      for (const row of savedValues) {
        map[row.field_name] = row.field_value;
      }
      setLocalValues(map);
    }
  }, [savedValues, isSelfContained]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const byDefId: Record<string, any> = {};
      for (const field of fields) {
        if (localValues[field.field_name] !== undefined) {
          byDefId[field.id] = localValues[field.field_name];
        }
      }
      return fetch(`/api/generic/custom-field-values/${entityType}/${entityId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: byDefId }),
      }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generic/custom-field-values", entityType, entityId] });
      toast({ title: "Custom fields saved" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (fields.length === 0) return null;

  const values = isSelfContained ? localValues : (controlledValues || {});
  const handleChange = isSelfContained
    ? (key: string, value: any) => setLocalValues(prev => ({ ...prev, [key]: value }))
    : (key: string, value: any) => controlledOnChange?.(key, value);

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Custom Fields</p>
        {isSelfContained && !readOnly && (
          <Button type="button" size="sm" variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-custom-fields">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      {fields.map(field => (
        <div key={field.id} className="space-y-1.5">
          <Label htmlFor={`cf-${field.field_name}`}>
            {field.field_label}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <FieldInput field={field} value={values[field.field_name]} onChange={v => handleChange(field.field_name, v)} />
        </div>
      ))}
    </div>
  );
}
