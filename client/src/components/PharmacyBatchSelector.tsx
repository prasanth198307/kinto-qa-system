// PharmacyBatchSelector — FEFO (First Expiry First Out) batch selection component
// Used in pharmacy billing to sort and display drug batches by expiry date ASC

import { useTenantConfig } from "@/hooks/use-tenant-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Batch {
  batch_number: string;
  expiry_date: string;
  quantity: number;
  mrp: number;
}

interface Props {
  batches: Batch[];
  selectedBatch: string | null;
  onSelect: (batch: Batch) => void;
}

function isExpiringWithin3Months(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  return expiry <= threeMonthsLater;
}

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

// FEFO sort: earliest expiry first
function sortFefo(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
}

export default function PharmacyBatchSelector({ batches, selectedBatch, onSelect }: Props) {
  const tenantConfig = useTenantConfig();
  const sorted = sortFefo(batches);

  if (!sorted.length) {
    return <p className="text-sm text-gray-500 py-2">No batches available</p>;
  }

  return (
    <div className="space-y-1 mt-1">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs text-blue-600 font-medium">FEFO</span>
        <span className="text-xs text-gray-500">— Batches sorted by earliest expiry first</span>
      </div>
      {sorted.map((b, i) => {
        const expiring = isExpiringWithin3Months(b.expiry_date);
        const expired = isExpired(b.expiry_date);
        const isFirst = i === 0;
        const isSelected = selectedBatch === b.batch_number;

        return (
          <Button
            key={b.batch_number}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={expired || b.quantity === 0}
            onClick={() => onSelect(b)}
            className={`w-full justify-start text-left h-auto py-2 ${expired ? "opacity-50" : ""} ${isFirst && !expired ? "border-blue-400" : ""}`}
          >
            <div className="flex flex-col w-full gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{b.batch_number}</span>
                {isFirst && !expired && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs px-1">FEFO</Badge>
                )}
                {expiring && !expired && (
                  <Badge className="bg-orange-100 text-orange-800 text-xs px-1">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5 inline" />Expiring Soon
                  </Badge>
                )}
                {expired && (
                  <Badge className="bg-red-100 text-red-800 text-xs px-1">Expired</Badge>
                )}
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>Exp: {b.expiry_date}</span>
                <span>Qty: {b.quantity}</span>
                <span>MRP: {tenantConfig.currency_symbol}{b.mrp}</span>
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
