import { Card } from "@/components/ui/card";

const formatCurrency = (amountInPaise: number) =>
  `₹${(amountInPaise / 100).toFixed(2)}`;

interface TaxBreakdown {
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  transportCharges: number;
  totalAmount: number;
}

interface InvoiceTaxSummaryProps {
  taxes: TaxBreakdown;
  isIntrastateSupply: boolean;
}

export default function InvoiceTaxSummary({ taxes, isIntrastateSupply }: InvoiceTaxSummaryProps) {
  return (
    <Card className="p-3 bg-muted">
      <h3 className="font-semibold text-sm mb-2">
        Tax Summary ({isIntrastateSupply ? "Intrastate" : "Interstate"} Supply)
      </h3>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-semibold">{formatCurrency(taxes.subtotal)}</span>
        </div>

        {isIntrastateSupply ? (
          <>
            <div className="flex justify-between">
              <span>CGST:</span>
              <span>{formatCurrency(taxes.cgstAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST:</span>
              <span>{formatCurrency(taxes.sgstAmount)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>IGST:</span>
            <span>{formatCurrency(taxes.igstAmount)}</span>
          </div>
        )}

        {taxes.transportCharges > 0 && (
          <div className="flex justify-between">
            <span>Transport Charges:</span>
            <span>{formatCurrency(taxes.transportCharges)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-bold border-t pt-1.5">
          <span>Total Amount:</span>
          <span>{formatCurrency(taxes.totalAmount)}</span>
        </div>
      </div>
    </Card>
  );
}
