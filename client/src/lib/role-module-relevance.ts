// Roles that are only relevant when the tenant has specific modules.
// Roles not listed here are always shown regardless of plan.
export const ROLE_MODULE_RELEVANCE: Record<string, string[]> = {
  operator:        ['whatsapp', 'maintenance', 'production'],
  reviewer:        ['whatsapp', 'maintenance', 'production'],
  accountsmanager: ['accounting', 'invoicing', 'expenses'],
};
