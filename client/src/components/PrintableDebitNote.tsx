import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";
import { useToast } from "@/hooks/use-toast";

interface DebitNoteItem {
  id: string;
  description: string;
  hsnCode: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
}

interface VendorDebitNote {
  id: string;
  noteNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGst: string | null;
  debitDate: string;
  reason: string;
  status: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  settledAmount: number;
  notes: string | null;
  items?: DebitNoteItem[];
}

interface PrintableDebitNoteProps {
  debitNote: VendorDebitNote;
}

const REASON_LABELS: Record<string, string> = {
  processing_charges: "Processing Charges",
  job_work_charges: "Job Work Charges",
  freight_charges: "Freight/Transport Charges",
  quality_premium: "Quality Premium/Bonus",
  material_conversion: "Material Conversion Charges",
  defective_goods: "Defective Goods",
  short_receipt: "Short Receipt",
  quality_rejection: "Quality Rejection",
  price_dispute: "Price Dispute",
  other: "Other",
};

export default function PrintableDebitNote({ debitNote }: PrintableDebitNoteProps) {
  const { toast } = useToast();

  // Fetch full debit note with items
  const { data: fullNote, isLoading } = useQuery<VendorDebitNote & { items: DebitNoteItem[] }>({
    queryKey: ['/api/vendor-debit-notes', debitNote.id],
  });

  // Fetch vendor details
  const { data: vendor } = useQuery<any>({
    queryKey: ['/api/vendors', debitNote.vendorId],
  });

  // Fetch invoice template for company details
  const { data: template } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  const items = fullNote?.items || [];
  const isIntrastate = !debitNote.igstAmount || debitNote.igstAmount === 0;

  const handlePrint = async () => {
    if (isLoading) {
      toast({
        title: "Please wait",
        description: "Loading print data...",
        variant: "default",
      });
      return;
    }

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Get company details from template or use defaults
    const companyName = template?.defaultSellerName || 'Inmoisture Private Limited';
    const companyAddress = template?.defaultSellerAddress || 'Guntur, Andhra Pradesh';
    const companyGstin = template?.defaultSellerGstin || '37AAHCI5047B1ZR';
    const companyState = template?.defaultSellerState || 'Andhra Pradesh';
    const companyStateCode = template?.defaultSellerStateCode || '37';
    const companyPhone = template?.defaultSellerPhone || '';
    const companyEmail = template?.defaultSellerEmail || '';
    const logoUrl = template?.logoUrl || '';

    // Vendor details
    const vendorName = vendor?.vendorName || debitNote.vendorName;
    const vendorAddress = vendor?.address || '';
    const vendorCity = vendor?.city || '';
    const vendorState = vendor?.state || '';
    const vendorPincode = vendor?.pincode || '';
    const vendorGst = vendor?.gstNumber || debitNote.vendorGst || '';
    const vendorPhone = vendor?.mobileNumber || '';
    const vendorEmail = vendor?.email || '';

    const fullVendorAddress = [vendorAddress, vendorCity, vendorState, vendorPincode]
      .filter(Boolean)
      .join(', ');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Debit Note - ${debitNote.noteNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 15px;
      border: 2px solid #333;
    }
    
    /* Header */
    .header {
      display: flex;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    
    .logo-section {
      width: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo-section img {
      max-width: 70px;
      max-height: 70px;
    }
    
    .company-section {
      flex: 1;
      text-align: center;
    }
    
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #1a365d;
      margin-bottom: 3px;
    }
    
    .company-address {
      font-size: 10px;
      margin-bottom: 2px;
    }
    
    .company-gst {
      font-size: 10px;
      font-weight: 600;
    }
    
    /* Document Title */
    .document-title {
      text-align: center;
      background: #1a365d;
      color: white;
      padding: 8px;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .info-box {
      border: 1px solid #ccc;
      padding: 10px;
    }
    
    .info-box-title {
      font-weight: bold;
      font-size: 11px;
      background: #f0f0f0;
      padding: 4px 8px;
      margin: -10px -10px 8px -10px;
      border-bottom: 1px solid #ccc;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 3px;
    }
    
    .info-label {
      font-weight: 600;
      min-width: 100px;
    }
    
    .info-value {
      flex: 1;
    }
    
    /* Note Details */
    .note-details {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f8f8;
      border: 1px solid #ddd;
    }
    
    .note-detail-item {
      text-align: center;
    }
    
    .note-detail-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
    }
    
    .note-detail-value {
      font-weight: bold;
      font-size: 12px;
    }
    
    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    .items-table th {
      background: #1a365d;
      color: white;
      padding: 8px 5px;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
    }
    
    .items-table td {
      padding: 6px 5px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    
    .items-table .text-right {
      text-align: right;
    }
    
    .items-table .text-center {
      text-align: center;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    /* Summary Section */
    .summary-section {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .reason-box {
      flex: 1;
      border: 1px solid #ddd;
      padding: 10px;
    }
    
    .reason-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .totals-box {
      width: 250px;
      border: 1px solid #333;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      border-bottom: 1px solid #ddd;
    }
    
    .total-row:last-child {
      border-bottom: none;
    }
    
    .total-row.grand-total {
      background: #1a365d;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }
    
    /* Amount in Words */
    .amount-words {
      background: #f8f8f8;
      padding: 10px;
      border: 1px solid #ddd;
      margin-bottom: 15px;
    }
    
    .amount-words-label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
    }
    
    .amount-words-value {
      font-weight: bold;
      font-size: 11px;
    }
    
    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    
    .footer-left {
      font-size: 9px;
      color: #666;
    }
    
    .footer-right {
      text-align: right;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      width: 150px;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 10px;
    }
    
    .notes-section {
      margin-top: 10px;
      padding: 8px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      font-size: 10px;
    }
    
    .notes-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .container {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      ${logoUrl ? `<div class="logo-section"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
      <div class="company-section">
        <div class="company-name">${companyName}</div>
        <div class="company-address">${companyAddress}</div>
        ${companyPhone || companyEmail ? `<div class="company-address">${companyPhone ? `Phone: ${companyPhone}` : ''}${companyPhone && companyEmail ? ' | ' : ''}${companyEmail ? `Email: ${companyEmail}` : ''}</div>` : ''}
        <div class="company-gst">GSTIN: ${companyGstin} | State: ${companyStateCode}-${companyState}</div>
      </div>
    </div>
    
    <!-- Document Title -->
    <div class="document-title">DEBIT NOTE</div>
    
    <!-- Note Details -->
    <div class="note-details">
      <div class="note-detail-item">
        <div class="note-detail-label">Debit Note No.</div>
        <div class="note-detail-value">${debitNote.noteNumber}</div>
      </div>
      <div class="note-detail-item">
        <div class="note-detail-label">Date</div>
        <div class="note-detail-value">${format(new Date(debitNote.debitDate), 'dd MMM yyyy')}</div>
      </div>
      <div class="note-detail-item">
        <div class="note-detail-label">Status</div>
        <div class="note-detail-value">${debitNote.status.toUpperCase()}</div>
      </div>
      <div class="note-detail-item">
        <div class="note-detail-label">Place of Supply</div>
        <div class="note-detail-value">${companyStateCode}-${companyState}</div>
      </div>
    </div>
    
    <!-- Party Details -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">FROM (Issuer)</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${companyName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">${companyAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">GSTIN:</span>
          <span class="info-value">${companyGstin}</span>
        </div>
        <div class="info-row">
          <span class="info-label">State:</span>
          <span class="info-value">${companyStateCode}-${companyState}</span>
        </div>
      </div>
      
      <div class="info-box">
        <div class="info-box-title">TO (Vendor)</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${vendorName}</span>
        </div>
        ${fullVendorAddress ? `<div class="info-row">
          <span class="info-label">Address:</span>
          <span class="info-value">${fullVendorAddress}</span>
        </div>` : ''}
        ${vendorGst ? `<div class="info-row">
          <span class="info-label">GSTIN:</span>
          <span class="info-value">${vendorGst}</span>
        </div>` : ''}
        ${vendorPhone ? `<div class="info-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${vendorPhone}</span>
        </div>` : ''}
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">S.No</th>
          <th style="width: auto;">Description</th>
          <th style="width: 60px;">HSN/SAC</th>
          <th style="width: 50px;">Qty</th>
          <th style="width: 40px;">Unit</th>
          <th style="width: 70px;">Rate</th>
          <th style="width: 80px;">Taxable Value</th>
          ${isIntrastate ? `
          <th style="width: 50px;">CGST %</th>
          <th style="width: 60px;">CGST Amt</th>
          <th style="width: 50px;">SGST %</th>
          <th style="width: 60px;">SGST Amt</th>
          ` : `
          <th style="width: 50px;">IGST %</th>
          <th style="width: 70px;">IGST Amt</th>
          `}
          <th style="width: 80px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${item.description}</td>
            <td class="text-center">${item.hsnCode || '-'}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-center">${item.unit}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right">${formatCurrency(item.taxableValue)}</td>
            ${isIntrastate ? `
            <td class="text-center">${formatRate(item.cgstRate)}</td>
            <td class="text-right">${formatCurrency(item.cgstAmount)}</td>
            <td class="text-center">${formatRate(item.sgstRate)}</td>
            <td class="text-right">${formatCurrency(item.sgstAmount)}</td>
            ` : `
            <td class="text-center">${formatRate(item.igstRate)}</td>
            <td class="text-right">${formatCurrency(item.igstAmount)}</td>
            `}
            <td class="text-right">${formatCurrency(item.totalAmount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Summary Section -->
    <div class="summary-section">
      <div class="reason-box">
        <div class="reason-title">Reason for Debit Note:</div>
        <div>${REASON_LABELS[debitNote.reason] || debitNote.reason}</div>
        ${debitNote.notes ? `
        <div class="notes-section">
          <div class="notes-label">Remarks:</div>
          <div>${debitNote.notes}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(debitNote.subtotal)}</span>
        </div>
        ${isIntrastate ? `
        <div class="total-row">
          <span>CGST:</span>
          <span>${formatCurrency(debitNote.cgstAmount)}</span>
        </div>
        <div class="total-row">
          <span>SGST:</span>
          <span>${formatCurrency(debitNote.sgstAmount)}</span>
        </div>
        ` : `
        <div class="total-row">
          <span>IGST:</span>
          <span>${formatCurrency(debitNote.igstAmount)}</span>
        </div>
        `}
        <div class="total-row grand-total">
          <span>Grand Total:</span>
          <span>${formatCurrency(debitNote.grandTotal)}</span>
        </div>
      </div>
    </div>
    
    <!-- Amount in Words -->
    <div class="amount-words">
      <div class="amount-words-label">Amount in Words</div>
      <div class="amount-words-value">${amountToWords(debitNote.grandTotal / 100)} Only</div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <div>This is a computer-generated document.</div>
        <div>Printed on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</div>
      </div>
      <div class="footer-right">
        <div>For <strong>${companyName}</strong></div>
        <div class="signature-line">Authorized Signatory</div>
      </div>
    </div>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    if (isMobile) {
      // Mobile-friendly approach: Add navigation controls and open in same tab
      const mobileHtmlContent = htmlContent.replace(
        '<body>',
        `<body>
          <div id="mobile-controls" style="position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;border-bottom:1px solid #374151;z-index:100000;gap:12px;">
            <button onclick="history.back()" style="padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">← Back</button>
            <div style="color:white;font-size:13px;text-align:center;flex:1;">Tap <strong>Share ↗</strong> then <strong>Print</strong></div>
          </div>
          <div style="padding-top:56px;">`
      ).replace('</body>', '</div></body>');
      
      // iOS Safari doesn't work with blob URLs - use iframe overlay instead
      // Including iPadOS which may report as Mac but has touch points
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
      
      if (isIOS) {
        // Create a full-screen overlay with iframe for iOS Safari
        const overlay = document.createElement('div');
        overlay.id = 'ios-print-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:#fff;';
        
        const header = document.createElement('div');
        header.style.cssText = 'position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;z-index:1000000;gap:8px;';
        
        const backBtn = document.createElement('button');
        backBtn.textContent = '← Back';
        backBtn.style.cssText = 'padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;';
        backBtn.onclick = () => {
          document.body.removeChild(overlay);
          document.body.style.overflow = '';
        };
        
        const instructions = document.createElement('div');
        instructions.innerHTML = 'Tap <strong>Share ↗</strong> → <strong>Print</strong>';
        instructions.style.cssText = 'color:white;font-size:13px;text-align:center;flex:1;';
        
        header.appendChild(backBtn);
        header.appendChild(instructions);
        
        const iframeEl = document.createElement('iframe');
        iframeEl.style.cssText = 'position:absolute;top:56px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 56px);border:none;';
        iframeEl.srcdoc = htmlContent;
        
        overlay.appendChild(header);
        overlay.appendChild(iframeEl);
        
        document.body.style.overflow = 'hidden';
        document.body.appendChild(overlay);
      } else {
        const blob = new Blob([mobileHtmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        window.location.href = blobUrl;
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Unable to open print window. Please allow popups.",
          variant: "destructive",
        });
        return;
      }
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handlePrint}
      disabled={isLoading}
      title="Print Debit Note"
      data-testid={`button-print-${debitNote.id}`}
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
