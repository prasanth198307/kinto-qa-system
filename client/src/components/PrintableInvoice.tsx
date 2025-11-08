import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Invoice, type InvoiceItem, type Product, type TermsConditions } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";

interface PrintableInvoiceProps {
  invoice: Invoice;
}

export default function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoice.id],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: template } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice.templateId],
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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const generateInvoiceHTML = (copyType: string) => `
      <div class="page">
        <div class="header">
          ${template?.logoUrl ? `<div class="logo-container"><img src="${template.logoUrl}" alt="Company Logo" class="company-logo" /></div>` : ''}
          <div class="company-name">TAX INVOICE</div>
          <div class="copy-type">${copyType} FOR ${copyType === 'ORIGINAL' ? 'BUYER' : copyType === 'DUPLICATE' ? 'TRANSPORTER' : 'SELLER'}</div>
        </div>

        <!-- Seller and Buyer Details -->
        <div class="party-details">
          <div class="seller-section">
            <div class="section-title">Seller Details</div>
            <div class="detail-row"><strong>${invoice.sellerName || 'KINTO Manufacturing'}</strong></div>
            <div class="detail-row">${invoice.sellerAddress || ''}</div>
            <div class="detail-row">State: ${invoice.sellerState || ''} (${invoice.sellerStateCode || ''})</div>
            ${invoice.sellerGstin ? `<div class="detail-row">GSTIN: <strong>${invoice.sellerGstin}</strong></div>` : ''}
            ${invoice.sellerPhone ? `<div class="detail-row">Phone: ${invoice.sellerPhone}</div>` : ''}
            ${invoice.sellerEmail ? `<div class="detail-row">Email: ${invoice.sellerEmail}</div>` : ''}
          </div>

          <div class="buyer-section">
            <div class="section-title">Buyer Details</div>
            <div class="detail-row"><strong>${invoice.buyerName}</strong></div>
            ${invoice.buyerAddress ? `<div class="detail-row">${invoice.buyerAddress}</div>` : ''}
            ${invoice.buyerState ? `<div class="detail-row">State: ${invoice.buyerState} (${invoice.buyerStateCode || ''})</div>` : ''}
            ${invoice.buyerGstin ? `<div class="detail-row">GSTIN: <strong>${invoice.buyerGstin}</strong></div>` : ''}
          </div>
        </div>

        <!-- Ship-To Address (if different from buyer) -->
        ${invoice.shipToName || invoice.shipToAddress ? `
          <div class="ship-to-details">
            <div class="section-title">Ship-To Address</div>
            ${invoice.shipToName ? `<div class="detail-row"><strong>${invoice.shipToName}</strong></div>` : ''}
            ${invoice.shipToAddress ? `<div class="detail-row">${invoice.shipToAddress}</div>` : ''}
            ${invoice.shipToCity || invoice.shipToState ? `<div class="detail-row">${invoice.shipToCity || ''}${invoice.shipToCity && invoice.shipToState ? ', ' : ''}${invoice.shipToState || ''}</div>` : ''}
            ${invoice.shipToPincode ? `<div class="detail-row">Pincode: ${invoice.shipToPincode}</div>` : ''}
          </div>
        ` : ''}

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="info-row">
            <span><strong>Invoice No:</strong> ${invoice.invoiceNumber}</span>
            <span><strong>Date:</strong> ${format(new Date(invoice.invoiceDate), 'dd-MMM-yyyy')}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description of Goods</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              ${isIntrastate ? '<th>CGST</th><th>SGST</th>' : '<th>IGST</th>'}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description}</td>
                <td>${item.hsnCode || item.sacCode || '-'}</td>
                <td>${item.quantity}</td>
                <td>${formatAmount(item.unitPrice)}</td>
                <td>${formatAmount(item.taxableAmount)}</td>
                ${isIntrastate 
                  ? `<td>${formatRate(item.cgstRate)}<br>${formatAmount(item.cgstAmount)}</td>
                     <td>${formatRate(item.sgstRate)}<br>${formatAmount(item.sgstAmount)}</td>`
                  : `<td>${formatRate(item.igstRate)}<br>${formatAmount(item.igstAmount)}</td>`
                }
                <td><strong>${formatAmount(item.totalAmount)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="${isIntrastate ? 5 : 5}"><strong>Total</strong></td>
              <td><strong>${formatAmount(invoice.subtotal)}</strong></td>
              ${isIntrastate 
                ? `<td><strong>${formatAmount(invoice.cgstAmount)}</strong></td>
                   <td><strong>${formatAmount(invoice.sgstAmount)}</strong></td>`
                : `<td><strong>${formatAmount(invoice.igstAmount)}</strong></td>`
              }
              <td><strong>${formatAmount(invoice.totalAmount)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <!-- Tax Summary -->
        <div class="tax-summary">
          <div class="summary-row">
            <span>Taxable Amount:</span>
            <span>${formatAmount(invoice.subtotal)}</span>
          </div>
          ${isIntrastate ? `
            <div class="summary-row">
              <span>CGST:</span>
              <span>${formatAmount(invoice.cgstAmount)}</span>
            </div>
            <div class="summary-row">
              <span>SGST:</span>
              <span>${formatAmount(invoice.sgstAmount)}</span>
            </div>
          ` : `
            <div class="summary-row">
              <span>IGST:</span>
              <span>${formatAmount(invoice.igstAmount)}</span>
            </div>
          `}
          ${invoice.cessAmount ? `
            <div class="summary-row">
              <span>Cess:</span>
              <span>${formatAmount(invoice.cessAmount)}</span>
            </div>
          ` : ''}
          ${invoice.roundOff ? `
            <div class="summary-row">
              <span>Round Off:</span>
              <span>${formatAmount(invoice.roundOff)}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span><strong>Total Amount:</strong></span>
            <span><strong>${formatAmount(invoice.totalAmount)}</strong></span>
          </div>
        </div>

        <!-- Amount in Words -->
        <div class="amount-in-words">
          <strong>Amount in Words:</strong> ${amountToWords(invoice.totalAmount)}
        </div>

        <!-- Bank Details -->
        ${invoice.bankName || invoice.upiId ? `
          <div class="bank-details">
            <div class="section-title">Bank Details for Payment</div>
            ${invoice.bankName ? `
              <div class="detail-row">Bank: ${invoice.bankName}</div>
              ${invoice.accountHolderName ? `<div class="detail-row">Account Holder: ${invoice.accountHolderName}</div>` : ''}
              ${invoice.bankAccountNumber ? `<div class="detail-row">A/C No: ${invoice.bankAccountNumber}</div>` : ''}
              ${invoice.bankIfscCode ? `<div class="detail-row">IFSC: ${invoice.bankIfscCode}</div>` : ''}
              ${invoice.branchName ? `<div class="detail-row">Branch: ${invoice.branchName}</div>` : ''}
            ` : ''}
            ${invoice.upiId ? `
              <div class="detail-row">UPI ID: ${invoice.upiId}</div>
              <div class="qr-code-placeholder">
                [QR CODE]<br>
                <small>Scan to pay</small>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Terms & Conditions -->
        ${termsConditions && termsConditions.terms ? `
          <div class="terms-conditions">
            <div class="section-title">Terms & Conditions</div>
            <ol class="terms-list">
              ${termsConditions.terms.map(term => `<li>${term}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          ${invoice.remarks ? `<div class="remarks">Remarks: ${invoice.remarks}</div>` : ''}
          <div class="signature">
            <div>For ${invoice.sellerName || 'KINTO Manufacturing'}</div>
            <div class="signature-line"></div>
            <div>Authorized Signatory</div>
          </div>
        </div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
            }

            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 15mm;
              margin: 0 auto;
              background: white;
              page-break-after: always;
            }

            .page:last-child {
              page-break-after: auto;
            }

            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }

            .logo-container {
              margin-bottom: 10px;
            }

            .company-logo {
              max-height: 60px;
              max-width: 200px;
              height: auto;
              width: auto;
              object-fit: contain;
            }

            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .copy-type {
              font-size: 14px;
              font-weight: bold;
              margin: 8px 0;
              padding: 5px;
              background: #f0f0f0;
              border: 1px solid #000;
              display: inline-block;
            }

            .party-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
              border: 1px solid #000;
            }

            .seller-section,
            .buyer-section {
              padding: 10px;
              border-right: 1px solid #000;
            }

            .buyer-section {
              border-right: none;
            }

            .section-title {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 8px;
              text-decoration: underline;
            }

            .detail-row {
              margin-bottom: 4px;
            }

            .invoice-info {
              margin-bottom: 15px;
              border: 1px solid #000;
              padding: 8px;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 10px;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 6px 4px;
              text-align: center;
            }

            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
            }

            .items-table td:nth-child(2) {
              text-align: left;
            }

            .total-row td {
              font-weight: bold;
              background: #f9f9f9;
            }

            .tax-summary {
              width: 50%;
              margin-left: auto;
              margin-bottom: 15px;
              border: 1px solid #000;
              padding: 10px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }

            .summary-row.total {
              border-top: 2px solid #000;
              padding-top: 5px;
              margin-top: 5px;
              font-size: 12px;
            }

            .ship-to-details {
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 10px;
            }

            .amount-in-words {
              padding: 10px;
              margin: 10px 0;
              background: #f9f9f9;
              border: 1px solid #ddd;
              font-size: 11px;
            }

            .bank-details {
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 15px;
            }

            .qr-code-placeholder {
              width: 80px;
              height: 80px;
              border: 2px dashed #666;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin-top: 8px;
              font-size: 10px;
              text-align: center;
            }

            .terms-conditions {
              border: 1px solid #000;
              padding: 10px;
              margin-bottom: 15px;
            }

            .terms-list {
              margin: 5px 0 0 15px;
              padding: 0;
            }

            .terms-list li {
              margin-bottom: 5px;
              font-size: 10px;
              line-height: 1.4;
            }

            .footer {
              margin-top: 20px;
            }

            .remarks {
              margin-bottom: 15px;
              font-style: italic;
            }

            .signature {
              text-align: right;
              margin-top: 30px;
            }

            .signature-line {
              width: 200px;
              height: 40px;
              border-bottom: 1px solid #000;
              margin: 10px 0 5px auto;
            }

            @media print {
              body {
                margin: 0;
              }
              
              .page {
                margin: 0;
                border: none;
                box-shadow: none;
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
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-invoice-${invoice.id}`}
        className="gap-2"
      >
        <Printer className="w-4 h-4" />
        Print / Download PDF
      </Button>
      <span className="text-xs text-muted-foreground">
        (Click to print or save as PDF)
      </span>
    </div>
  );
}
