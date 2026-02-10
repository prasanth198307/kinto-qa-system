interface HierarchyAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  nodeType?: string;
  parentId?: string | null;
  level?: number;
}

interface GroupedResult<T extends HierarchyAccount> {
  label: string;
  parentCode: string;
  accounts: T[];
}

export function groupAccountsByParent<T extends HierarchyAccount>(accounts: T[]): GroupedResult<T>[] {
  const groupMap = new Map(accounts.filter(a => a.nodeType === 'group').map(g => [g.id, g]));
  const ledgers = accounts.filter(a => a.nodeType !== 'group');
  const grouped: Record<string, { parentCode: string; accounts: T[] }> = {};

  for (const acc of ledgers) {
    const parent = acc.parentId ? groupMap.get(acc.parentId) : null;
    const label = parent ? `${parent.code} - ${parent.name}` : acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1);
    const parentCode = parent ? parent.code : '9999';
    if (!grouped[label]) grouped[label] = { parentCode, accounts: [] };
    grouped[label].accounts.push(acc);
  }

  return Object.entries(grouped)
    .sort(([, a], [, b]) => a.parentCode.localeCompare(b.parentCode, undefined, { numeric: true }))
    .map(([label, { parentCode, accounts }]) => ({
      label,
      parentCode,
      accounts: accounts.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    }));
}
