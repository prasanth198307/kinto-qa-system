import { useQuery } from "@tanstack/react-query";

interface CustomFieldDef {
  id: number;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
  options: string[];
}

export function useCustomFields(entityType: string) {
  const { data = [] } = useQuery<CustomFieldDef[]>({
    queryKey: ["/api/hr/custom-fields"],
    staleTime: 5 * 60 * 1000,
  });
  return (data as CustomFieldDef[]).filter(f => f.entity_type === entityType).sort((a, b) => a.sort_order - b.sort_order);
}
