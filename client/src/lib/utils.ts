import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCashSourceLabel(key: string): string {
  switch (key) {
    case 'sale_cash': return 'Sale Cash';
    case 'secondary_sale': return 'Secondary Sale';
    case 'upi': return 'UPI';
    case 'bank_transfer': return 'Bank Transfer';
    case 'from_microgrid': return 'From MicroGrid';
    case 'from_scrap': return 'From Scrap';
    case 'other': return 'Other';
    default: return key;
  }
}
