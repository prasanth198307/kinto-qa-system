import { Button } from "@/components/ui/button";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import type { ScrapInventory } from "@shared/schema";

interface PrintableScrapInventoryProps {
  scrap: ScrapInventory;
}

export default function PrintableScrapInventory({ scrap }: PrintableScrapInventoryProps) {
  const tenantConfig = useTenantConfig();
  const formatCurrency = (amountInPaise: number): string => fmtCur(amountInPaise / 100, tenantConfig);

  const getDamageReasonLabel = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      transport: 'Transport Damage',
      handling: 'Handling Damage',
      manufacturing_defect: 'Manufacturing Defect',
      customer_misuse: 'Customer Misuse',
      expired: 'Expired',
      other: 'Other',
    };
    return reasonMap[reason] || reason;
  };

  const getApprovalStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return statusMap[status] || status;
  };

  const getProcessedStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      processed: 'Processed',
      disposed: 'Disposed',
    };
    return statusMap[status] || status;
  };

  const getDisposalMethodLabel = (method: string | null): string => {
    if (!method) return '-';
    const methodMap: Record<string, string> = {
      recycled: 'Recycled',
      disposed: 'Disposed',
      sold_as_scrap: 'Sold as Scrap',
      repaired: 'Repaired',
    };
    return methodMap[method] || method;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = generatePrintHTML();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generatePrintHTML = (): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scrap Record ${scrap.scrapNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5in; size: A4; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
          }
          
          .print-btn {
            margin-bottom: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
          }
          
          .document {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .header h2 {
            font-size: 16px;
            color: #dc3545;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .info-box {
            border: 1px solid #ddd;
            padding: 12px;
          }
          
          .info-box.full-width {
            grid-column: 1 / -1;
          }
          
          .info-box h3 {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
          }
          
          .info-row .label {
            color: #666;
          }
          
          .info-row .value {
            font-weight: 500;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          
          .status-pending { background: #fff3cd; color: #856404; }
          .status-approved { background: #d4edda; color: #155724; }
          .status-rejected { background: #f8d7da; color: #721c24; }
          
          .cost-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .cost-table th,
          .cost-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          
          .cost-table th {
            background: #f5f5f5;
            font-weight: bold;
            width: 40%;
          }
          
          .cost-table .number {
            text-align: right;
          }
          
          .cost-table .highlight {
            background: #fff3cd;
            font-weight: bold;
          }
          
          .loss-box {
            background: #f8d7da;
            border: 2px solid #dc3545;
            padding: 15px;
            text-align: center;
            margin-bottom: 20px;
          }
          
          .loss-box h3 {
            color: #721c24;
            font-size: 14px;
            margin-bottom: 5px;
          }
          
          .loss-box .amount {
            color: #dc3545;
            font-size: 24px;
            font-weight: bold;
          }
          
          .remarks-section {
            border: 1px solid #ddd;
            padding: 12px;
            margin-bottom: 20px;
          }
          
          .remarks-section h3 {
            font-size: 12px;
            margin-bottom: 8px;
          }
          
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 40px;
          }
          
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #000;
          }
          
          .signature-box span {
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">Print Document</button>
        
        <div class="document">
          <div class="header">
            <h1>INMOISTURE PRIVATE LIMITED</h1>
            <h2>SCRAP / DAMAGE RECORD</h2>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Scrap Details</h3>
              <div class="info-row">
                <span class="label">Scrap No:</span>
                <span class="value">${scrap.scrapNumber}</span>
              </div>
              <div class="info-row">
                <span class="label">Scrap Date:</span>
                <span class="value">${format(new Date(scrap.scrapDate), 'dd/MM/yyyy')}</span>
              </div>
              <div class="info-row">
                <span class="label">Product:</span>
                <span class="value">${scrap.productName}</span>
              </div>
              <div class="info-row">
                <span class="label">Batch No:</span>
                <span class="value">${scrap.batchNumber || '-'}</span>
              </div>
              <div class="info-row">
                <span class="label">Quantity:</span>
                <span class="value">${scrap.quantity} units</span>
              </div>
            </div>
            
            <div class="info-box">
              <h3>Damage Information</h3>
              <div class="info-row">
                <span class="label">Damage Reason:</span>
                <span class="value">${getDamageReasonLabel(scrap.damageReason)}</span>
              </div>
              <div class="info-row">
                <span class="label">Approval Status:</span>
                <span class="value status-badge status-${scrap.approvalStatus}">${getApprovalStatusLabel(scrap.approvalStatus)}</span>
              </div>
              ${scrap.approvalDate ? `
              <div class="info-row">
                <span class="label">Approval Date:</span>
                <span class="value">${format(new Date(scrap.approvalDate), 'dd/MM/yyyy')}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="label">Processed Status:</span>
                <span class="value">${getProcessedStatusLabel(scrap.processedStatus)}</span>
              </div>
              ${scrap.disposalMethod ? `
              <div class="info-row">
                <span class="label">Disposal Method:</span>
                <span class="value">${getDisposalMethodLabel(scrap.disposalMethod)}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <table class="cost-table">
            <tr>
              <th>Unit Cost</th>
              <td class="number">${formatCurrency(scrap.unitCost)}</td>
            </tr>
            <tr>
              <th>Selling Price (per unit)</th>
              <td class="number">${formatCurrency(scrap.sellingPrice)}</td>
            </tr>
            <tr>
              <th>Total Cost Value (${scrap.quantity} × ${formatCurrency(scrap.unitCost)})</th>
              <td class="number">${formatCurrency(scrap.totalCostValue)}</td>
            </tr>
            <tr>
              <th>Total Selling Value (${scrap.quantity} × ${formatCurrency(scrap.sellingPrice)})</th>
              <td class="number">${formatCurrency(scrap.totalSellingValue)}</td>
            </tr>
            ${scrap.disposalValue && scrap.disposalValue > 0 ? `
            <tr>
              <th>Disposal Recovery Value</th>
              <td class="number">${formatCurrency(scrap.disposalValue)}</td>
            </tr>
            ` : ''}
            ${scrap.gstReversal && scrap.gstReversal > 0 ? `
            <tr>
              <th>GST Reversal Amount</th>
              <td class="number">${formatCurrency(scrap.gstReversal)}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="loss-box">
            <h3>TOTAL LOSS TO BUSINESS</h3>
            <div class="amount">${formatCurrency(scrap.lossAmount)}</div>
          </div>
          
          ${scrap.conditionDescription ? `
          <div class="remarks-section">
            <h3>Condition Description</h3>
            <p>${scrap.conditionDescription}</p>
          </div>
          ` : ''}
          
          ${scrap.approvalRemarks ? `
          <div class="remarks-section">
            <h3>Approval Remarks</h3>
            <p>${scrap.approvalRemarks}</p>
          </div>
          ` : ''}
          
          ${scrap.remarks ? `
          <div class="remarks-section">
            <h3>General Remarks</h3>
            <p>${scrap.remarks}</p>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <div class="signature-box">
              <span>Prepared By</span>
            </div>
            <div class="signature-box">
              <span>Approved By</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      data-testid={`button-print-scrap-${scrap.id}`}
    >
      <Printer className="w-4 h-4 mr-2" />
      Print
    </Button>
  );
}
