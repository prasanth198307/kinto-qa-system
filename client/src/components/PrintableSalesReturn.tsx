import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import type { SalesReturn, SalesReturnItem, Product, Invoice } from "@shared/schema";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface PrintableSalesReturnProps {
  salesReturn: SalesReturn & {
    invoiceNumber?: string;
    buyerName?: string;
  };
}

export default function PrintableSalesReturn({ salesReturn }: PrintableSalesReturnProps) {
  const tenantConfig = useTenantConfig();
  const [enabled, setEnabled] = useState(false);

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery<SalesReturnItem[]>({
    queryKey: ['/api/sales-return-items', salesReturn.id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-return-items?returnId=${salesReturn.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch sales return items');
      return res.json();
    },
    enabled,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled,
  });

  const { data: invoice, isLoading: invoiceLoading } = useQuery<Invoice>({
    queryKey: ['/api/invoices', salesReturn.invoiceId],
    enabled: enabled && !!salesReturn.invoiceId,
  });

  const isLoading = enabled && (itemsLoading || productsLoading || (!!salesReturn.invoiceId && invoiceLoading));

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.productName || 'Unknown Product';
  };

  const getBuyerName = (): string => {
    if (salesReturn.buyerName) return salesReturn.buyerName;
    if (invoice?.buyerName) return invoice.buyerName;
    return 'Unknown';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return fmtCur(amountInPaise / 100, tenantConfig);
  };

  const getReasonLabel = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      damaged: 'Damaged Goods',
      quality_issue: 'Quality Issue',
      wrong_item: 'Wrong Item Delivered',
      customer_rejection: 'Customer Rejection',
      excess: 'Excess Quantity',
      expired: 'Expired/Near Expiry',
    };
    return reasonMap[reason] || reason;
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending_receipt: 'Pending Receipt',
      received: 'Received',
      inspected: 'Inspected',
      completed: 'Completed',
    };
    return statusMap[status] || status;
  };

  const getDispositionLabel = (disposition: string | null): string => {
    if (!disposition) return '-';
    const dispMap: Record<string, string> = {
      scrap: 'Scrap',
      restock: 'Restock',
      repair: 'Repair',
      quarantine: 'Quarantine',
    };
    return dispMap[disposition] || disposition;
  };

  const generatePrintHTML = (
    items: SalesReturnItem[],
    products: Product[],
    invoice: Invoice | undefined,
  ): string => {
    const getProductName = (productId: string) =>
      products.find(p => p.id === productId)?.productName || 'Unknown Product';
    const getBuyer = () =>
      salesReturn.buyerName || invoice?.buyerName || 'Unknown';

    const totalQuantity = items.reduce((sum, item) => sum + (item.verifiedQuantity ?? item.quantityReturned ?? 0), 0);
    const totalCredit = items.reduce((sum, item) => sum + (item.creditAmount || 0), 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Return ${salesReturn.returnNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5in; size: A4; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; background: #fff; padding: 20px; }
          .print-btn { margin-bottom: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; font-size: 14px; border-radius: 4px; }
          .document { max-width: 800px; margin: 0 auto; background: white; }
          .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .header h2 { font-size: 16px; color: #333; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-box { border: 1px solid #ddd; padding: 12px; }
          .info-box h3 { font-size: 12px; color: #666; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
          .info-row .label { color: #666; }
          .info-row .value { font-weight: 500; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10pt; }
          .items-table th { background: #f5f5f5; font-weight: bold; }
          .items-table .number { text-align: right; }
          .items-table tfoot td { font-weight: bold; background: #f9f9f9; }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-received { background: #cce5ff; color: #004085; }
          .status-inspected { background: #d4edda; color: #155724; }
          .status-completed { background: #28a745; color: white; }
          .remarks-section { border: 1px solid #ddd; padding: 12px; margin-bottom: 20px; }
          .remarks-section h3 { font-size: 12px; margin-bottom: 8px; }
          .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; }
          .signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #000; }
          .signature-box span { font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">Print Document</button>
        <div class="document">
          <div class="header">
            <h1>INMOISTURE PRIVATE LIMITED</h1>
            <h2>SALES RETURN NOTE</h2>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <h3>Return Details</h3>
              <div class="info-row"><span class="label">Return No:</span><span class="value">${salesReturn.returnNumber}</span></div>
              <div class="info-row"><span class="label">Return Date:</span><span class="value">${format(new Date(salesReturn.returnDate), 'dd/MM/yyyy')}</span></div>
              <div class="info-row"><span class="label">Invoice No:</span><span class="value">${salesReturn.invoiceNumber || invoice?.invoiceNumber || '-'}</span></div>
              <div class="info-row"><span class="label">Return Type:</span><span class="value">${salesReturn.returnType === 'full' ? 'Full Return' : 'Partial Return'}</span></div>
              <div class="info-row"><span class="label">Status:</span><span class="value status-badge status-${salesReturn.status.replace('_', '-')}">${getStatusLabel(salesReturn.status)}</span></div>
            </div>
            <div class="info-box">
              <h3>Customer Details</h3>
              <div class="info-row"><span class="label">Customer:</span><span class="value">${getBuyer()}</span></div>
              <div class="info-row"><span class="label">Return Reason:</span><span class="value">${getReasonLabel(salesReturn.returnReason)}</span></div>
              ${salesReturn.receivedDate ? `<div class="info-row"><span class="label">Received Date:</span><span class="value">${format(new Date(salesReturn.receivedDate), 'dd/MM/yyyy')}</span></div>` : ''}
              ${salesReturn.inspectedDate ? `<div class="info-row"><span class="label">Inspected Date:</span><span class="value">${format(new Date(salesReturn.inspectedDate), 'dd/MM/yyyy')}</span></div>` : ''}
              ${salesReturn.transporterName ? `<div class="info-row"><span class="label">Transporter:</span><span class="value">${salesReturn.transporterName}</span></div>` : ''}
            </div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:5%;">#</th>
                <th style="width:30%;">Product</th>
                <th style="width:12%;">Batch No.</th>
                <th style="width:10%;" class="number">Qty</th>
                <th style="width:13%;">Condition</th>
                <th style="width:12%;">Disposition</th>
                <th style="width:18%;" class="number">Credit Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${getProductName(item.productId)}</td>
                  <td>${item.batchNumber || '-'}</td>
                  <td class="number">${(() => {
                    const cases = item.casesReturned || 0;
                    const loose = item.looseBottlesReturned || 0;
                    const qtyDisplay = cases > 0 && loose > 0
                      ? `${cases} cases + ${loose} bottles (${item.quantityReturned})`
                      : cases > 0 ? `${cases} cases (${item.quantityReturned})`
                      : `${item.quantityReturned} bottles`;
                    if (item.verifiedQuantity != null && item.verifiedQuantity !== item.quantityReturned) {
                      return `<span style="text-decoration:line-through;color:#999;">${qtyDisplay}</span> ${item.verifiedQuantity}`;
                    }
                    return qtyDisplay;
                  })()}</td>
                  <td>${item.conditionOnReceipt || '-'}</td>
                  <td>${getDispositionLabel(item.disposition)}</td>
                  <td class="number">${formatCurrency(item.creditAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Total</td>
                <td class="number">${totalQuantity}</td>
                <td colspan="2"></td>
                <td class="number">${formatCurrency(totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
          ${salesReturn.totalReturnTransportCost && salesReturn.totalReturnTransportCost > 0 ? `
          <div class="info-box" style="margin-bottom:20px;">
            <div class="info-row"><span class="label">Return Transport Cost:</span><span class="value">${formatCurrency(salesReturn.totalReturnTransportCost)}</span></div>
          </div>` : ''}
          ${salesReturn.creditNoteNumber ? `
          <div class="info-box" style="margin-bottom:20px;">
            <h3>Credit Note Details</h3>
            <div class="info-row"><span class="label">Credit Note No:</span><span class="value">${salesReturn.creditNoteNumber}</span></div>
            ${salesReturn.creditNoteDate ? `<div class="info-row"><span class="label">Credit Note Date:</span><span class="value">${format(new Date(salesReturn.creditNoteDate), 'dd/MM/yyyy')}</span></div>` : ''}
            <div class="info-row"><span class="label">Total Credit Amount:</span><span class="value">${formatCurrency(salesReturn.totalCreditAmount)}</span></div>
          </div>` : ''}
          ${salesReturn.remarks ? `
          <div class="remarks-section">
            <h3>Remarks</h3>
            <p>${salesReturn.remarks}</p>
          </div>` : ''}
          <div class="signature-section">
            <div class="signature-box"><span>Received By</span></div>
            <div class="signature-box"><span>Inspected By</span></div>
            <div class="signature-box"><span>Authorized Signatory</span></div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    // Enable queries on first click and wait for data
    setEnabled(true);

    // If data already loaded (enabled was already true), print immediately
    if (enabled && !isLoading && items.length >= 0) {
      doPrint(items, products, invoice);
      return;
    }

    // Otherwise fetch then print
    try {
      const [itemsResult, productsResult] = await Promise.all([
        fetch(`/api/sales-return-items?returnId=${salesReturn.id}`, { credentials: 'include' }).then(r => r.json()),
        fetch('/api/products', { credentials: 'include' }).then(r => r.json()),
      ]);
      let inv: Invoice | undefined;
      if (salesReturn.invoiceId) {
        const invRes = await fetch(`/api/invoices/${salesReturn.invoiceId}`, { credentials: 'include' });
        if (invRes.ok) inv = await invRes.json();
      }
      doPrint(itemsResult, productsResult, inv);
    } catch (e) {
      console.error('Failed to load print data', e);
    }
  };

  const doPrint = (items: SalesReturnItem[], products: Product[], invoice: Invoice | undefined) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(generatePrintHTML(items, products, invoice));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      title="Print Sales Return"
      data-testid={`button-print-sales-return-${salesReturn.id}`}
    >
      <Printer className="w-4 h-4 mr-2" />
      Print
    </Button>
  );
}
