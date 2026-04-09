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

  const { data: invoicePayments = [] } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments', invoice.id],
    enabled: !!invoice.id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [], isLoading: isLoadingUoms } = useQuery<any[]>({
    queryKey: ['/api/uom'],
  });

  // Fetch specific template if invoice has one
  const { data: specificTemplate, isLoading: isLoadingSpecificTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice.templateId],
    queryFn: async () => {
      if (!invoice.templateId) return null;
      const response = await fetch(`/api/invoice-templates/${invoice.templateId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!invoice.templateId,
  });

  // Always fetch default template as fallback
  const { data: defaultTemplate, isLoading: isLoadingDefaultTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });

  // Use specific template if available, otherwise fall back to default
  const template = specificTemplate || defaultTemplate;
  const isLoadingTemplate = isLoadingSpecificTemplate || isLoadingDefaultTemplate;

  // Fetch terms & conditions by ID
  const { data: termsConditions, isLoading: isLoadingSpecificTC } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions', invoice.termsConditionsId],
    queryFn: async () => {
      if (!invoice.termsConditionsId) return null;
      const response = await fetch(`/api/terms-conditions/${invoice.termsConditionsId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch terms & conditions');
      return response.json();
    },
    enabled: !!invoice.termsConditionsId,
  });

  // Fallback to default terms & conditions if invoice doesn't have specific one
  const { data: defaultTermsConditions, isLoading: isLoadingDefaultTC } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions/default'],
    enabled: !invoice.termsConditionsId,
  });

  const isLoadingTC = isLoadingSpecificTC || isLoadingDefaultTC;

  // Use specific terms or default
  const activeTermsConditions = termsConditions || defaultTermsConditions;

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
    try {
      // Detect ALL iOS devices and redirect to print page (blob URLs don't work on any iOS browser)
      const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
        (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
      
      if (isIOSDevice) {
        // ALL iOS browsers: Navigate directly to print page (blob URLs can't be shared/printed on iOS)
        window.location.href = `/print/invoice/${invoice.id}`;
        return;
      }

      console.log('🖨️ Print button clicked!', { 
        invoiceId: invoice.id, 
        hasTemplateId: !!invoice.templateId, 
        isLoadingTemplate,
        isLoadingUoms,
        uomsCount: uoms.length,
        hasTemplate: !!template,
        hasSignature: !!template?.defaultSignatureImage
      });

      // Show immediate feedback (non-iOS only)
      toast({
        title: "Preparing document...",
        description: "Please wait",
      });

      // Wait for template and UOMs to load
      if (isLoadingTemplate || isLoadingUoms || isLoadingTC) {
        console.log('⏳ Data still loading...', { isLoadingTemplate, isLoadingUoms, isLoadingTC });
        toast({
          title: "Please wait",
          description: "Loading print data...",
          variant: "default",
        });
        return;
      }
    
    console.log('✅ Data loaded, generating HTML...', { 
      template,
      hasSignature: !!template?.defaultSignatureImage,
      signatureLength: template?.defaultSignatureImage?.length,
      uomsLoaded: uoms.length,
      uomsList: uoms.map(u => ({ id: u.id, name: u.name })),
      itemUomIds: items.map(i => i.uomId)
    });

    // Safe numeric helper — prevents NaN if DB field is null/undefined
    const safeNum = (v: number | null | undefined): number => v || 0;

    // Check if any item has a discount applied — inferred from grossLine vs taxableAmount
    // This works even for older invoices where item.discount field was stored as 0
    const hasDiscount = items.some(item => {
      const grossLine = safeNum(item.unitPrice) * safeNum(item.quantity);
      return grossLine > safeNum(item.taxableAmount);
    });

    // Calculate HSN-wise tax summary
    const hsnSummary = items.reduce((acc: any[], item) => {
      const hsnCode = item.hsnCode || item.sacCode || 'N/A';
      const existing = acc.find(h => h.hsn === hsnCode);
      const cgst = safeNum(item.cgstAmount);
      const sgst = safeNum(item.sgstAmount);
      const igst = safeNum(item.igstAmount);
      const taxable = safeNum(item.taxableAmount);
      
      if (existing) {
        existing.taxableAmount += taxable;
        existing.cgstAmount += cgst;
        existing.sgstAmount += sgst;
        existing.igstAmount += igst;
        existing.totalTax += (cgst + sgst + igst);
      } else {
        acc.push({
          hsn: hsnCode,
          taxableAmount: taxable,
          cgstRate: safeNum(item.cgstRate),
          cgstAmount: cgst,
          sgstRate: safeNum(item.sgstRate),
          sgstAmount: sgst,
          igstRate: safeNum(item.igstRate),
          igstAmount: igst,
          totalTax: cgst + sgst + igst
        });
      }
      return acc;
    }, []);

    const amountReceived = invoice.amountReceived || 0;
    const balanceDue = invoice.totalAmount - amountReceived;

    // Calculate advance applied from payment records
    const advanceApplied = invoicePayments
      .filter((p: any) => p.paymentType === 'Advance')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const writeOffTotal = invoicePayments
      .filter((p: any) => p.paymentType === 'Write-off')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const directReceived = Math.max(0, amountReceived - advanceApplied - writeOffTotal);

    // Get bank details - prioritize template (default) for QR code, fall back to invoice
    const bankName = template?.defaultBankName || invoice.bankName;
    const bankAccountNumber = template?.defaultBankAccountNumber || invoice.bankAccountNumber;
    const bankIfscCode = template?.defaultBankIfscCode || invoice.bankIfscCode;
    const accountHolderName = template?.defaultAccountHolderName || invoice.accountHolderName;
    const upiId = template?.defaultUpiId || invoice.upiId;

    let upiQRCodeDataUrl = '';
    try {
      let upiString = '';
      const payeeName = encodeURIComponent(accountHolderName || invoice.sellerName || 'Inmoisture Private Limited');
      
      if (upiId) {
        // Use UPI ID if available
        upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`;
      } else if (bankAccountNumber && bankIfscCode) {
        // Generate UPI QR from bank account + IFSC (NPCI format)
        // Format: account-number.ifsc.ifsc.npci
        const accountNum = bankAccountNumber.replace(/\s/g, '');
        const ifsc = bankIfscCode.toUpperCase().replace(/\s/g, '');
        upiString = `upi://pay?pa=${accountNum}.${ifsc}.ifsc.npci&pn=${payeeName}&cu=INR`;
      }
      
      if (upiString) {
        upiQRCodeDataUrl = await QRCode.toDataURL(upiString, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate UPI QR code:', error);
    }

    const isCancelled = invoice.recordStatus === 0;
    
    const generateInvoiceHTML = (copyType: string) => `
      <div class="page">
        ${isCancelled ? `
          <div class="cancelled-watermark">CANCELLED</div>
        ` : ''}
        <!-- Title and Copy Type -->
        <div class="title-section">
          <div class="title">Tax Invoice</div>
          <div class="copy-label">${copyType} FOR ${copyType === 'ORIGINAL' ? 'RECIPIENT' : copyType === 'DUPLICATE' ? 'TRANSPORTER' : 'SUPPLIER'}</div>
        </div>

        <!-- Company Header -->
        <div class="company-header${template?.logoUrl ? ' has-logo' : ''}">
          ${template?.logoUrl ? `
            <div class="company-logo">
              <img src="${template.logoUrl}" alt="Company Logo" />
            </div>
          ` : ''}
          <div class="company-info">
            <div class="company-name">${invoice.sellerName || template?.defaultSellerName || 'Company Name'}</div>
            <div>${invoice.sellerAddress || template?.defaultSellerAddress || ''}</div>
            <div class="company-contact">
              ${(invoice.sellerPhone || template?.defaultSellerPhone) ? `Phone: ${invoice.sellerPhone || template?.defaultSellerPhone}` : ''}
              ${(invoice.sellerPhone || template?.defaultSellerPhone) && (invoice.sellerEmail || template?.defaultSellerEmail) ? ' | ' : ''}
              ${(invoice.sellerEmail || template?.defaultSellerEmail) ? `Email: ${invoice.sellerEmail || template?.defaultSellerEmail}` : ''}
            </div>
            <div class="company-gst">
              ${(invoice.sellerGstin || template?.defaultSellerGstin) ? `GSTIN: ${invoice.sellerGstin || template?.defaultSellerGstin}` : ''}
              ${(invoice.sellerGstin || template?.defaultSellerGstin) && (invoice.sellerState || template?.defaultSellerState) ? ' | ' : ''}
              ${(invoice.sellerState || template?.defaultSellerState) ? `State: ${invoice.sellerStateCode || template?.defaultSellerStateCode}-${invoice.sellerState || template?.defaultSellerState}` : ''}
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
${invoice.shipToName || invoice.shipToAddress ? `
        <div class="ship-to">
          <div class="section-label">Ship To:</div>
          ${invoice.shipToName ? `<div class="party-name">${invoice.shipToName}</div>` : ''}
          ${invoice.shipToAddress ? `<div>${invoice.shipToAddress}</div>` : ''}
          ${invoice.shipToCity || invoice.shipToState || invoice.shipToPincode ? `<div>${[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>` : ''}
        </div>` : ''}
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
              ${hasDiscount ? '<th>Discount (₹)</th>' : ''}
              <th>GST%</th>
              <th>GST (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const cgst = safeNum(item.cgstAmount);
              const sgst = safeNum(item.sgstAmount);
              const igst = safeNum(item.igstAmount);
              const totalGst = cgst + sgst + igst;
              const gstPercent = (safeNum(item.cgstRate) + safeNum(item.sgstRate) + safeNum(item.igstRate)) / 100;
              // Derive discount amount: gross line (unitPrice × qty) minus taxableAmount
              const grossLine = safeNum(item.unitPrice) * safeNum(item.quantity);
              const taxable = safeNum(item.taxableAmount);
              const lineDiscount = Math.max(0, grossLine - taxable);
              // Find UOM by ID, fallback to "Cases" for invoice items (default for finished goods)
              let unit = 'Cases';
              if (item.uomId) {
                const uom = uoms.find(u => u.id === item.uomId);
                unit = uom?.name || 'Cases';
              } else {
                const casesUom = uoms.find(u => u.code === 'CASES' || u.name === 'Cases');
                unit = casesUom?.name || 'Cases';
              }
              return `
              <tr>
                <td>${idx + 1}</td>
                <td style="text-align:left;">${item.description}</td>
                <td>${item.hsnCode || item.sacCode || '-'}</td>
                <td>${safeNum(item.quantity)}</td>
                <td>${unit}</td>
                <td>${formatCurrency(safeNum(item.unitPrice))}</td>
                ${hasDiscount ? `<td>${lineDiscount > 0 ? formatCurrency(lineDiscount) : '-'}</td>` : ''}
                <td>${gstPercent.toFixed(1)}%</td>
                <td>${formatCurrency(totalGst)}</td>
                <td>${formatCurrency(safeNum(item.totalAmount))}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="${hasDiscount ? 9 : 8}" style="text-align:right;"><strong>Total</strong></td>
              <td><strong>${formatCurrency(safeNum(invoice.totalAmount))}</strong></td>
            </tr>
          </tfoot>
        </table>

        <!-- Tax Summary Section -->
        <div class="summary-section">
          <!-- HSN Tax Breakdown (LEFT) -->
          <div class="hsn-table-wrapper">
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
                  <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.subtotal))}</strong></td>
                  ${isIntrastate ? `
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.cgstAmount))}</strong></td>
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.sgstAmount))}</strong></td>
                  ` : `
                    <td></td>
                    <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.igstAmount))}</strong></td>
                  `}
                  <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.cgstAmount) + safeNum(invoice.sgstAmount) + safeNum(invoice.igstAmount))}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Sub Total / Total (RIGHT) -->
          <div class="totals-box">
            <table class="totals-table">
              <tbody>
                ${hasDiscount ? `
                  <tr>
                    <td>Gross Amount:</td>
                    <td style="text-align:right;">${formatCurrency(items.reduce((s, i) => s + safeNum(i.unitPrice) * safeNum(i.quantity), 0))}</td>
                  </tr>
                  <tr>
                    <td>Discount:</td>
                    <td style="text-align:right;">- ${formatCurrency(items.reduce((s, i) => s + Math.max(0, safeNum(i.unitPrice) * safeNum(i.quantity) - safeNum(i.taxableAmount)), 0))}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td>Sub Total:</td>
                  <td style="text-align:right;">${formatCurrency(safeNum(invoice.subtotal))}</td>
                </tr>
                ${safeNum(invoice.cgstAmount) > 0 || safeNum(invoice.sgstAmount) > 0 ? `
                  <tr>
                    <td>CGST:</td>
                    <td style="text-align:right;">${formatCurrency(safeNum(invoice.cgstAmount))}</td>
                  </tr>
                  <tr>
                    <td>SGST:</td>
                    <td style="text-align:right;">${formatCurrency(safeNum(invoice.sgstAmount))}</td>
                  </tr>
                ` : ''}
                ${safeNum(invoice.igstAmount) > 0 ? `
                  <tr>
                    <td>IGST:</td>
                    <td style="text-align:right;">${formatCurrency(safeNum(invoice.igstAmount))}</td>
                  </tr>
                ` : ''}
                ${safeNum(invoice.transportCharges) > 0 ? `
                  <tr>
                    <td>Transport Charges:</td>
                    <td style="text-align:right;">${formatCurrency(safeNum(invoice.transportCharges))}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td><strong>Total:</strong></td>
                  <td style="text-align:right;"><strong>${formatCurrency(safeNum(invoice.totalAmount))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Terms & Conditions (Left) and Received/Balance (Right) -->
        <div class="terms-payment-grid">
          <!-- Terms & Conditions (Left Column) -->
          <div class="${activeTermsConditions && activeTermsConditions.terms && activeTermsConditions.terms.length > 0 ? 'terms-section' : ''}">
            ${activeTermsConditions && activeTermsConditions.terms && activeTermsConditions.terms.length > 0 ? `
              <div class="terms-title">Terms & Conditions:</div>
              <ol>
                ${activeTermsConditions.terms.map(term => `<li>${term}</li>`).join('')}
              </ol>
            ` : ''}
          </div>
          
          <!-- Received and Balance (Right Column) -->
          <div class="payment-summary">
            <div class="payment-grid">
              ${directReceived > 0 ? `
              <div>Received:</div>
              <div style="text-align:right;">${formatCurrency(directReceived)}</div>
              ` : ''}
              ${advanceApplied > 0 ? `
              <div>Advance Applied:</div>
              <div style="text-align:right;">${formatCurrency(advanceApplied)}</div>
              ` : ''}
              ${writeOffTotal > 0 ? `
              <div>Written Off:</div>
              <div style="text-align:right;">${formatCurrency(writeOffTotal)}</div>
              ` : ''}
              ${amountReceived === 0 && advanceApplied === 0 && writeOffTotal === 0 ? `
              <div>Received:</div>
              <div style="text-align:right;">${formatCurrency(0)}</div>
              ` : ''}
              <div style="border-top:1px solid #000; padding-top:3px;"><strong>Balance Due:</strong></div>
              <div style="text-align:right; border-top:1px solid #000; padding-top:3px;"><strong>${formatCurrency(balanceDue)}</strong></div>
            </div>
          </div>
        </div>

        <!-- Amount in Words -->
        <div class="amount-in-words">
          Total Invoice Amount in words: <strong>${amountToWords(safeNum(invoice.totalAmount))}</strong>
        </div>

        ${invoice.remarks ? `<div class="remarks">Note: ${invoice.remarks}</div>` : ''}

        <!-- Bank Details and Signature Section (Side by Side) -->
        <div class="bank-signature-grid">
          <!-- Bank Details (Left) - Uses invoice bank details or falls back to template -->
          ${bankName || upiId || bankAccountNumber ? `
            <div class="bank-details-container">
              <div class="bank-details">
                <div class="bank-label">Bank Details:</div>
                ${bankName ? `<div>Name : <strong>${bankName}</strong></div>` : ''}
                ${bankAccountNumber ? `<div>Account No. : ${bankAccountNumber}</div>` : ''}
                ${bankIfscCode ? `<div>IFSC code : ${bankIfscCode}</div>` : ''}
                ${accountHolderName ? `<div>Account holder's name : ${accountHolderName}</div>` : ''}
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
            ${(() => {
              const signatureType = (invoice as any).signatureType || 'default';
              const showSignature = invoice.includeSignature === 1 || invoice.includeSignature === undefined;
              
              if (!showSignature) {
                return '<div class="signature-space"></div>';
              }
              
              // Different signature content based on type (Signature 1 = default, Signature 2 = alternate)
              if (signatureType === 'alternate') {
                // Signature 2 (alternate)
                return (template as any)?.alternateSignatureImage 
                  ? `<div class="signature-image"><img src="${(template as any).alternateSignatureImage}" alt="Authorized Signature" style="max-height: 50px; object-fit: contain;" /></div>`
                  : template?.defaultSignatureImage 
                    ? `<div class="signature-image"><img src="${template.defaultSignatureImage}" alt="Authorized Signature" style="max-height: 50px; object-fit: contain;" /></div>`
                    : '<div class="signature-space"></div>';
              } else {
                // Signature 1 (default)
                return template?.defaultSignatureImage 
                  ? `<div class="signature-image"><img src="${template.defaultSignatureImage}" alt="Authorized Signature" style="max-height: 50px; object-fit: contain;" /></div>`
                  : '<div class="signature-space"></div>';
              }
            })()}
            <div class="signatory-label">${(() => {
              const signatureType = (invoice as any).signatureType || 'default';
              if (signatureType === 'alternate') {
                return (template as any)?.alternateSignatoryName || template?.authorizedSignatoryName || 'Authorized Signatory';
              }
              return template?.authorizedSignatoryName || 'Authorized Signatory';
            })()}</div>
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
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Ensure all borders print properly */
            table, th, td {
              border-collapse: collapse;
            }

            .page {
              position: relative;
              width: 210mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
              page-break-inside: avoid;
            }

            .page + .page {
              page-break-before: always;
            }

            /* Cancelled Watermark */
            .cancelled-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              font-weight: bold;
              color: rgba(255, 0, 0, 0.25);
              pointer-events: none;
              z-index: 1000;
              text-transform: uppercase;
              letter-spacing: 10px;
              white-space: nowrap;
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
              border: 1px solid #000;
              padding: 8px;
              margin-bottom: 10px;
              text-align: center;
            }

            .company-header.has-logo {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
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

            .hsn-table-wrapper {
              flex: 1;
            }

            .totals-box {
              flex: 0 0 200px;
            }

            .totals-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            .totals-table td {
              border: 1px solid #000;
              padding: 4px 6px;
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
              text-align: center;
              border: 1px solid #000;
              padding: 8px;
              font-size: 9px;
            }

            .company-for-line {
              margin-bottom: 8px;
              text-align: left;
            }
            
            .signature-image {
              margin: 10px auto;
              min-height: 40px;
            }
            
            .signature-image img {
              max-height: 50px;
              object-fit: contain;
              background: transparent;
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
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
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

              /* Ensure all table borders print */
              table, th, td {
                border-collapse: collapse !important;
              }

              .items-table th,
              .items-table td {
                border: 1px solid #000 !important;
              }

              .hsn-table th,
              .hsn-table td {
                border: 1px solid #000 !important;
              }

              .totals-table td {
                border: 1px solid #000 !important;
              }

              .details-grid {
                border: 1px solid #000 !important;
              }

              .bill-to {
                border-right: 1px solid #000 !important;
              }

              .company-header {
                border: 1px solid #000 !important;
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

    // Detect mobile device (note: iOS Safari already handled at start of function)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create blob URL
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('🔗 Blob URL created:', blobUrl, 'Mobile:', isMobile);
    
    // Android and other mobile browsers - blob URL navigation works
    if (isMobile) {
      console.log('📱 Android/other mobile detected, using blob URL navigation');
      
      const mobileHtmlContent = htmlContent.replace(
        '<body>',
        `<body>
          <div id="mobile-controls" style="position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;border-bottom:1px solid #374151;z-index:100000;gap:12px;">
            <button onclick="history.back()" style="padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">← Back</button>
            <div style="color:white;font-size:13px;text-align:center;flex:1;">Tap <strong>⋮ Menu</strong> → <strong>Print</strong></div>
          </div>
          <div style="padding-top:56px;">`
      ).replace('</body>', '</div></body>');
      
      const mobileBlob = new Blob([mobileHtmlContent], { type: 'text/html' });
      const mobileBlobUrl = URL.createObjectURL(mobileBlob);
      window.location.href = mobileBlobUrl;
    } else {
      // Desktop approach: Open in new tab
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
    }
    } catch (error) {
      console.error('❌ Print error:', error);
      toast({
        title: "Print Error",
        description: `Failed to generate print: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
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
