import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { NavSection } from "@/components/VerticalNavSidebar";

interface ModuleLabel { module_key: string; custom_label: string; }

const DEFAULT_LABELS: Record<string, string> = {
  invoices: "Invoices", purchase_orders: "Purchase Orders", customers: "Customers",
  vendors: "Vendors", products: "Products / Items", raw_materials: "Raw Materials",
  gatepasses: "Gate Passes", production: "Production Orders", quality: "Quality Checks",
  maintenance: "Preventive Maintenance", hr: "HR & Payroll", projects: "Projects",
  assets: "Fixed Assets", expenses: "Expense Claims", timesheets: "Timesheets",
};

// Maps nav item IDs to module_keys so labels can be overridden
const NAV_ID_TO_MODULE_KEY: Record<string, string> = {
  invoices: "invoices",
  "purchase-orders": "purchase_orders",
  customers: "customers",
  vendors: "vendors",
  products: "products",
  "raw-materials": "raw_materials",
  gatepasses: "gatepasses",
  "production-entries": "production",
  "quality-checks": "quality",
  maintenance: "maintenance",
  "hr-employees": "hr",
  projects: "projects",
  "fixed-assets": "assets",
  "expense-claims": "expenses",
  timesheets: "timesheets",
};

// Section ID to module key mapping
const SECTION_ID_TO_MODULE_KEY: Record<string, string> = {
  "finance-section": "invoices",
  "purchases-section": "purchase_orders",
  "production-section": "products",
  "hr-section": "hr",
};

export function useModuleLabels() {
  const { user } = useAuth();
  const { data } = useQuery<ModuleLabel[]>({
    queryKey: ["/api/hr/module-labels"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const labelMap: Record<string, string> = { ...DEFAULT_LABELS };
  if (data) {
    for (const row of data) {
      if (row.custom_label) labelMap[row.module_key] = row.custom_label;
    }
  }

  function getLabel(key: string): string {
    return labelMap[key] || DEFAULT_LABELS[key] || key;
  }

  // Apply custom labels to nav sections, replacing labels where module keys are known
  function applyModuleLabelsToNav(sections: NavSection[]): NavSection[] {
    if (!data || data.length === 0) return sections;
    return sections.map(section => {
      const sectionKey = section.id ? SECTION_ID_TO_MODULE_KEY[section.id] : undefined;
      const newSection = { ...section };
      if (sectionKey && labelMap[sectionKey] && labelMap[sectionKey] !== DEFAULT_LABELS[sectionKey]) {
        // Optionally rename section label if the section maps to a module
      }
      newSection.items = section.items.map(item => {
        const moduleKey = NAV_ID_TO_MODULE_KEY[item.id];
        if (moduleKey && labelMap[moduleKey] && labelMap[moduleKey] !== DEFAULT_LABELS[moduleKey]) {
          return { ...item, label: labelMap[moduleKey] };
        }
        return item;
      });
      return newSection;
    });
  }

  return { labelMap, getLabel, applyModuleLabelsToNav };
}
