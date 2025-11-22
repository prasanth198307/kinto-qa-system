import { useQuery } from "@tanstack/react-query";
import { type Invoice, type InvoiceItem, type Product, type TermsConditions } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface PrintableInvoiceProps {
  invoice: Invoice;
}

export default function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  const { toast } = useToast();

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoice.id],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<any[]>({
    queryKey: ['/api/uom'],
  });

  const { data: template, isLoading: isLoadingTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice.templateId],
    queryFn: async () => {
      if (!invoice.templateId) return null;
      const response = await fetch(`/api/invoice-templates/${invoice.templateId}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!invoice.templateId,
  });

  const { data: termsConditions } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions', invoice.termsConditionsId],
    enabled: !!invoice.termsConditionsId,
  });

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.productName || productId || 'Unknown Product';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  const formatAmount = (amount: number | null | undefined): string => {
    return formatCurrency(amount || 0);
  };

  const isIntrastate = invoice.sellerStateCode === invoice.buyerStateCode;

  const handlePrint = async () => {
    console.log('🖨️ Print button clicked!', { invoiceId: invoice.id, hasTemplate: !!invoice.templateId, isLoading: isLoadingTemplate });

    // Wait for template to load if templateId exists
    if (invoice.templateId && isLoadingTemplate) {
      console.log('⏳ Template still loading...');
      toast({
        title: "Please wait",
        description: "Template is still loading...",
        variant: "default",
      });
      return;
    }
    
    console.log('✅ Template loaded, generating HTML...', { template });

    // Calculate HSN-wise tax summary
    const hsnSummary = items.reduce((acc: any[], item) => {
      const hsnCode = item.hsnCode || item.sacCode || 'N/A';
      const existing = acc.find(h => h.hsn === hsnCode);
      
      if (existing) {
        existing.taxableAmount += item.taxableAmount;
        existing.cgstAmount += item.cgstAmount;
        existing.sgstAmount += item.sgstAmount;
        existing.igstAmount += item.igstAmount;
        existing.totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
      } else {
        acc.push({
          hsn: hsnCode,
          taxableAmount: item.taxableAmount,
          cgstRate: item.cgstRate,
          cgstAmount: item.cgstAmount,
          sgstRate: item.sgstRate,
          sgstAmount: item.sgstAmount,
          igstRate: item.igstRate,
          igstAmount: item.igstAmount,
          totalTax: item.cgstAmount + item.sgstAmount + item.igstAmount
        });
      }
      return acc;
    }, []);

    const amountReceived = invoice.amountReceived || 0;
    const balanceDue = invoice.totalAmount - amountReceived;

    let upiQRCodeDataUrl = '';
    if (invoice.upiId) {
      try {
        const upiString = `upi://pay?pa=${encodeURIComponent(invoice.upiId)}&pn=${encodeURIComponent(invoice.accountHolderName || invoice.sellerName || 'KINTO')}&cu=INR`;
        upiQRCodeDataUrl = await QRCode.toDataURL(upiString, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Failed to generate UPI QR code:', error);
      }
    }

    const generateInvoiceHTML = (copyType: string) => `
      <div class="page">
        <!-- Title and Copy Type -->
        <div class="title-section">
          <div class="title">Tax Invoice</div>
          <div class="copy-label">${copyType} FOR ${copyType === 'ORIGINAL' ? 'RECIPIENT' : copyType === 'DUPLICATE' ? 'TRANSPORTER' : 'SUPPLIER'}</div>
        </div>

        <!-- Company Header -->
        <div class="company-header">
          ${template?.logoUrl ? `
            <div class="company-logo">
              <img src="${template.logoUrl}" alt="Company Logo" />
            </div>
          ` : ''}
          <div class="company-info">
            <div class="company-name">${invoice.sellerName || 'KINTO Manufacturing Pvt Ltd'}</div>
            <div>${invoice.sellerAddress || ''}</div>
            <div class="company-contact">
              ${invoice.sellerPhone ? `Phone: ${invoice.sellerPhone}` : ''}
              ${invoice.sellerPhone && invoice.sellerEmail ? ' | ' : ''}
              ${invoice.sellerEmail ? `Email: ${invoice.sellerEmail}` : ''}
            </div>
            <div class="company-gst">
              ${invoice.sellerGstin ? `GSTIN: ${invoice.sellerGstin}` : ''}
              ${invoice.sellerGstin && invoice.sellerState ? ' | ' : ''}
              ${invoice.sellerState ? `State: ${invoice.sellerStateCode}-${invoice.sellerState}` : ''}
            </div>
          </div>
        </div>

        <!-- Bill To and Invoice Details -->
        <div class="details-grid">
          <div class="bill-to">
            <div class="section-label">Bill To:</div>
            <div class="party-name">${invoice.buyerName}</div>
            ${invoice.buyerAddress ? `<div>${invoice.buyerAddress}</div>` : ''}
            ${invoice.buyerContact ? `<div>Contact No: ${invoice.buyerContact}</div>` : ''}
            ${invoice.buyerGstin ? `<div>GSTIN: ${invoice.buyerGstin}</div>` : ''}
            ${invoice.buyerState ? `<div>State: ${invoice.buyerStateCode}-${invoice.buyerState}</div>` : ''}
          </div>
          
          <div class="invoice-details">
            <div class="section-label">Invoice Details:</div>
            <div>No: <strong>${invoice.invoiceNumber}</strong></div>
            ${invoice.vehicleNumber ? `<div>Vehicle No: ${invoice.vehicleNumber}</div>` : ''}
            <div>Date: ${format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</div>
            ${invoice.placeOfSupply ? `<div>Place Of Supply: ${invoice.placeOfSupply}</div>` : ''}
          </div>
        </div>

        <!-- Ship To (if different) -->
        ${invoice.shipToName || invoice.shipToAddress ? `
          <div class="ship-to">
            <div class="section-label">Ship To:</div>
            ${invoice.shipToName ? `<div>${invoice.shipToName}</div>` : ''}
            ${invoice.shipToAddress ? `<div>${invoice.shipToAddress}, ${invoice.shipToCity || ''}</div>` : ''}
            ${invoice.shipToPincode ? `<div>Pincode: ${invoice.shipToPincode}</div>` : ''}
          </div>
        ` : ''}

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th style="text-align:left;">Item name</th>
              <th>HSN/SAC</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Price/Unit (₹)</th>
              <th>GST%</th>
              <th>GST (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
              const gstPercent = (item.cgstRate + item.sgstRate + item.igstRate) / 100;
              const productName = getProductName(item.productId);
              const uom = uoms.find(u => u.id === item.uomId);
              const unit = uom?.name || 'Nos';
              return `
              <tr>
                <td>${idx + 1}</td>
                <td style="text-align:left;">${item.description}</td>
                <td>${item.hsnCode || item.sacCode || '-'}</td>
                <td>${item.quantity}</td>
                <td>${unit}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td>${gstPercent.toFixed(1)}%</td>
                <td>${formatCurrency(totalGst)}</td>
                <td>${formatCurrency(item.totalAmount)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="8" style="text-align:right;"><strong>Total</strong></td>
              <td><strong>${formatCurrency(invoice.totalAmount)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <!-- Tax Summary Section -->
        <div class="summary-section">
          <div class="totals-box">
            <div class="totals-grid">
              <div>Sub Total:</div>
              <div style="text-align:right;">${formatCurrency(invoice.subtotal)}</div>
              <div>Total:</div>
              <div style="text-align:right;"><strong>${formatCurrency(invoice.totalAmount)}</strong></div>
            </div>
          </div>

          <!-- HSN Tax Summary Table -->
          <div class="hsn-summary">
            <table class="hsn-table">
              <thead>
                <tr>
                  <th rowspan="2">HSN/SAC</th>
                  <th rowspan="2">Taxable amount (₹)</th>
                  ${isIntrastate ? `
                    <th colspan="2">CGST</th>
                    <th colspan="2">SGST</th>
                  ` : `
                    <th colspan="2">IGST</th>
                  `}
                  <th rowspan="2">Total Tax (₹)</th>
                </tr>
                <tr>
                  ${isIntrastate ? `
                    <th>Rate (%)</th>
                    <th>Amt (₹)</th>
                    <th>Rate (%)</th>
                    <th>Amt (₹)</th>
                  ` : `
                    <th>Rate (%)</th>
                    <th>Amt (₹)</th>
                  `}
                </tr>
              </thead>
              <tbody>
                ${hsnSummary.map(hsn => `
                  <tr>
                    <td>${hsn.hsn}</td>
                    <td style="text-align:right;">${formatCurrency(hsn.taxableAmount)}</td>
                    ${isIntrastate ? `
                      <td>${(hsn.cgstRate / 100).toFixed(1)}</td>
                      <td style="text-align:right;">${formatCurrency(hsn.cgstAmount)}</td>
                      <td>${(hsn.sgstRate / 100).toFixed(1)}</td>
                      <td style="text-align:right;">${formatCurrency(hsn.sgstAmount)}</td>
                    ` : `
                      <td>${(hsn.igstRate / 100).toFixed(1)}</td>
                      <td style="text-align:right;">${formatCurrency(hsn.igstAmount)}</td>
                    `}
                    <td style="text-align:right;"><strong>${formatCurrency(hsn.totalTax)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td style="text-align:right;"><strong>${formatCurrency(invoice.subtotal)}</strong></td>
                  ${isIntrastate ? `
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(invoice.cgstAmount)}</strong></td>
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(invoice.sgstAmount)}</strong></td>
                  ` : `
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(invoice.igstAmount)}</strong></td>
                  `}
                  <td style="text-align:right;"><strong>${formatCurrency(invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Terms & Conditions (Left) and Received/Balance (Right) -->
        <div class="terms-payment-grid">
          <!-- Terms & Conditions (Left Column) -->
          <div class="terms-section">
            ${termsConditions && termsConditions.terms && termsConditions.terms.length > 0 ? `
              <div class="terms-title">Terms & Conditions:</div>
              <ol>
                ${termsConditions.terms.map(term => `<li>${term}</li>`).join('')}
              </ol>
            ` : ''}
          </div>
          
          <!-- Received and Balance (Right Column) -->
          <div class="payment-summary">
            <div class="payment-grid">
              <div>Received:</div>
              <div style="text-align:right;">${formatCurrency(amountReceived)}</div>
              <div><strong>Balance:</strong></div>
              <div style="text-align:right;"><strong>${formatCurrency(balanceDue)}</strong></div>
            </div>
          </div>
        </div>

        <!-- Amount in Words -->
        <div class="amount-in-words">
          Total Invoice Amount in words: <strong>${amountToWords(invoice.totalAmount)}</strong>
        </div>

        ${invoice.remarks ? `<div class="remarks">Note: ${invoice.remarks}</div>` : ''}

        <!-- Bank Details and Signature Section (Side by Side) -->
        <div class="bank-signature-grid">
          <!-- Bank Details (Left) -->
          ${invoice.bankName || invoice.upiId ? `
            <div class="bank-details-container">
              <div class="bank-details">
                <div class="bank-label">Bank Details:</div>
                ${invoice.bankName ? `<div>Name : <strong>${invoice.bankName}</strong></div>` : ''}
                ${invoice.bankAccountNumber ? `<div>Account No. : ${invoice.bankAccountNumber}</div>` : ''}
                ${invoice.bankIfscCode ? `<div>IFSC code : ${invoice.bankIfscCode}</div>` : ''}
                ${invoice.accountHolderName ? `<div>Account holder's name : ${invoice.accountHolderName}</div>` : ''}
              </div>
              ${upiQRCodeDataUrl ? `
                <div class="qr-code-section">
                  <img src="${upiQRCodeDataUrl}" alt="UPI QR Code" class="qr-code" />
                </div>
              ` : ''}
            </div>
          ` : '<div></div>'}
          
          <!-- Signature Section (Right) -->
          <div class="signature-section">
            <div class="company-for-line">For <strong>${invoice.sellerName || 'Inmoisture Private Limited'}:</strong></div>
            <div class="signature-space"></div>
            <div class="signatory-label">Authorized Signatory</div>
          </div>
        </div>

        <!-- Declaration -->
        <div class="declaration">
          <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>
      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.3;
              color: #000;
            }

            .page {
              width: 210mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
              page-break-inside: avoid;
            }

            .page + .page {
              page-break-before: always;
            }

            /* Title Section */
            .title-section {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }

            .title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 3px;
            }

            .copy-label {
              font-size: 10px;
              font-weight: bold;
              padding: 2px 10px;
              border: 1px solid #000;
              display: inline-block;
            }

            /* Company Header */
            .company-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
              border: 1px solid #000;
              padding: 8px;
              margin-bottom: 10px;
            }

            .company-logo {
              flex-shrink: 0;
            }

            .company-logo img {
              max-width: 150px;
              max-height: 60px;
              object-fit: contain;
            }

            .company-info {
              text-align: center;
              flex-grow: 1;
            }

            .company-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 3px;
            }

            .company-contact {
              font-size: 9px;
              margin: 2px 0;
            }

            .company-gst {
              font-size: 9px;
              margin-top: 3px;
            }

            /* Details Grid */
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              border: 1px solid #000;
              margin-bottom: 10px;
            }

            .bill-to,
            .invoice-details {
              padding: 8px;
              font-size: 9px;
            }

            .bill-to {
              border-right: 1px solid #000;
            }

            .section-label {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 4px;
              text-decoration: underline;
            }

            .party-name {
              font-weight: bold;
              font-size: 10px;
            }

            .invoice-details div {
              margin-bottom: 2px;
            }

            /* Ship To */
            .ship-to {
              border: 1px solid #000;
              padding: 8px;
              margin-bottom: 10px;
              font-size: 9px;
            }

            /* Items Table */
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 9px;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 4px 3px;
              text-align: center;
            }

            .items-table th {
              background: #e8e8e8;
              font-weight: bold;
              font-size: 9px;
            }

            .total-row td {
              font-weight: bold;
              background: #f5f5f5;
            }

            /* Summary Section */
            .summary-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              gap: 10px;
            }

            .totals-box {
              flex: 0 0 200px;
              border: 1px solid #000;
              padding: 8px;
            }

            .totals-grid {
              display: grid;
              grid-template-columns: auto auto;
              gap: 5px;
              font-size: 10px;
            }

            .hsn-summary {
              flex: 1;
            }

            /* HSN Table */
            .hsn-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
            }

            .hsn-table th,
            .hsn-table td {
              border: 1px solid #000;
              padding: 3px 2px;
              text-align: center;
            }

            .hsn-table th {
              background: #e8e8e8;
              font-weight: bold;
            }

            .hsn-table .total-row td {
              font-weight: bold;
              background: #f5f5f5;
            }

            /* Terms & Payment Grid (Two Columns) */
            .terms-payment-grid {
              display: grid;
              grid-template-columns: 1fr 200px;
              gap: 10px;
              margin-bottom: 10px;
            }

            /* Payment Summary */
            .payment-summary {
              border: 1px solid #000;
              padding: 8px;
            }

            .payment-grid {
              display: grid;
              grid-template-columns: auto auto;
              gap: 5px;
              font-size: 10px;
            }

            /* Amount in Words */
            .amount-in-words {
              border: 1px solid #000;
              padding: 6px;
              margin-bottom: 10px;
              font-size: 9px;
              background: #fafafa;
            }

            /* Bank and Signature Grid (Two Columns) */
            .bank-signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 10px;
            }

            /* Bank Details Container */
            .bank-details-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border: 1px solid #000;
              padding: 8px;
              gap: 10px;
            }

            .bank-details {
              flex: 1;
              font-size: 9px;
            }

            .bank-label {
              font-weight: bold;
              margin-bottom: 4px;
            }

            .bank-details div {
              margin-bottom: 2px;
            }

            .qr-code-section {
              text-align: center;
              flex-shrink: 0;
            }

            .qr-code {
              width: 80px;
              height: 80px;
              border: 1px solid #000;
            }

            /* Terms Section */
            .terms-section {
              border: 1px solid #000;
              padding: 8px;
            }

            .terms-title {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 4px;
            }

            .terms-section ol {
              margin-left: 15px;
              font-size: 8px;
            }

            .terms-section li {
              margin-bottom: 3px;
            }

            /* Remarks */
            .remarks {
              padding: 6px;
              margin-bottom: 10px;
              font-size: 9px;
              font-style: italic;
            }

            /* Signature Section */
            .signature-section {
              text-align: right;
              border: 1px solid #000;
              padding: 8px;
              font-size: 9px;
            }

            .company-for-line {
              margin-bottom: 5px;
              text-align: left;
            }

            .signature-space {
              height: 50px;
              margin: 5px 0;
            }

            .signatory-label {
              text-align: center;
            }

            /* Declaration */
            .declaration {
              border-top: 1px solid #000;
              padding-top: 6px;
              font-size: 8px;
              text-align: center;
            }

            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              
              html, body {
                margin: 0;
                padding: 0;
                height: auto;
              }
              
              .page {
                margin: 0;
                padding: 10mm;
                width: 100%;
                page-break-inside: avoid;
              }
              
              .page + .page {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${generateInvoiceHTML('ORIGINAL')}
          ${generateInvoiceHTML('DUPLICATE')}
          ${generateInvoiceHTML('TRIPLICATE')}
        </body>
      </html>
    `;

    console.log('📝 HTML content generated, length:', htmlContent.length);

    // Create blob URL to avoid popup blockers
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('🔗 Blob URL created:', blobUrl);
    
    // Open in new tab/window (blob URLs are not blocked)
    const printWindow = window.open(blobUrl, '_blank');
    
    console.log('🪟 Window.open result:', printWindow);
    
    if (!printWindow) {
      console.log('❌ Failed to open window - popup blocked');
      toast({
        title: "Unable to Open Print Preview",
        description: "Please check your browser settings and allow popups for this site.",
        variant: "destructive",
      });
      URL.revokeObjectURL(blobUrl);
      return;
    }

    console.log('✅ Print window opened successfully!');

    // Clean up blob URL after window loads
    setTimeout(() => {
      console.log('🧹 Cleaning up blob URL');
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handlePrint}
        disabled={isLoadingTemplate || items.length === 0}
        data-testid={`button-print-invoice-${invoice.id}`}
        className="gap-2"
      >
        <Printer className="w-4 h-4" />
        {isLoadingTemplate ? 'Loading...' : 'Print / Download PDF'}
      </Button>
      <span className="text-xs text-muted-foreground">
        {isLoadingTemplate ? 'Preparing invoice...' : '(Click to print or save as PDF)'}
      </span>
    </div>
  );
}
