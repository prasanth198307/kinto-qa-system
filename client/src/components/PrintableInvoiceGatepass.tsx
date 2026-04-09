import { useQuery } from "@tanstack/react-query";
import { type Invoice, type Gatepass, type InvoiceItem, type GatepassItem, type Product, type Vendor, type FinishedGood, type TermsConditions } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface PrintableInvoiceGatepassProps {
  invoice: Invoice;
  gatepass: Gatepass;
}

export default function PrintableInvoiceGatepass({ invoice, gatepass }: PrintableInvoiceGatepassProps) {
  const { toast } = useToast();

  const { data: invoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoice.id],
  });

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', gatepass.id],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Get unique finished good IDs from gatepass items - for fetching batch numbers
  const finishedGoodIds = gatepassItems
    .map(item => item.finishedGoodId)
    .filter((id): id is string => !!id);
  const finishedGoodIdsKey = finishedGoodIds.join(',');

  // Fetch specific finished goods by IDs (includes consumed/cancelled records for batch number lookup)
  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods/by-ids', finishedGoodIdsKey],
    queryFn: async () => {
      if (!finishedGoodIdsKey) return [];
      const response = await fetch(`/api/finished-goods/by-ids/${finishedGoodIdsKey}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!finishedGoodIdsKey,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: uoms = [] } = useQuery<any[]>({
    queryKey: ['/api/uom'],
  });

  const { data: invoicePayments = [] } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments', invoice.id],
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

  // Fallback to default terms & conditions
  const { data: defaultTermsConditions, isLoading: isLoadingDefaultTC } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions/default'],
    enabled: !invoice.termsConditionsId,
  });

  const isLoadingTC = invoice.termsConditionsId ? isLoadingSpecificTC : isLoadingDefaultTC;

  // Use specific terms or default
  const activeTermsConditions = termsConditions || defaultTermsConditions;

  const vendor = vendors.find(v => v.id === gatepass.vendorId);

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.productName || productId || 'Unknown Product';
  };

  const getGatepassProductName = (item: GatepassItem): string => {
    const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
    const product = fg 
      ? products.find(p => p.id === fg.productId) 
      : products.find(p => p.id === item.productId);
    return product?.productName || item.productId || 'Unknown Product';
  };

  const getBatchNumber = (item: GatepassItem): string => {
    const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
    // Use originalBatchNumber if available (for cancelled/reissued items), otherwise use batchNumber
    return fg?.originalBatchNumber || fg?.batchNumber || '-';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const safeNum = (v: any): number => v || 0;

  const isIntrastate = invoice.sellerStateCode === invoice.buyerStateCode;

  const handlePrint = async () => {
    // Wait for template and T&C to load
    if (isLoadingTemplate || isLoadingTC) {
      toast({
        title: "Please wait",
        description: "Loading print data...",
        variant: "default",
      });
      return;
    }

    const hsnSummary = invoiceItems.reduce((acc: any[], item) => {
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

    const directReceived = invoicePayments
      .filter((p: any) => p.paymentType !== 'Advance' && p.paymentType !== 'WriteOff')
      .reduce((s: number, p: any) => s + safeNum(p.amount), 0);
    const advanceApplied = invoicePayments
      .filter((p: any) => p.paymentType === 'Advance')
      .reduce((s: number, p: any) => s + safeNum(p.amount), 0);
    const writeOffTotal = invoicePayments
      .filter((p: any) => p.paymentType === 'WriteOff')
      .reduce((s: number, p: any) => s + safeNum(p.amount), 0);
    const balanceDue = Math.max(0, safeNum(invoice.totalAmount) - directReceived - advanceApplied - writeOffTotal);

    // Infer discount from grossLine vs taxableAmount — works even if item.discount field is 0
    const hasDiscount = invoiceItems.some(item => {
      const grossLine = safeNum(item.unitPrice) * safeNum(item.quantity);
      return grossLine > safeNum(item.taxableAmount);
    });

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
        upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`;
      } else if (bankAccountNumber && bankIfscCode) {
        const accountNum = bankAccountNumber.replace(/\s/g, '');
        const ifsc = bankIfscCode.toUpperCase().replace(/\s/g, '');
        upiString = `upi://pay?pa=${accountNum}.${ifsc}.ifsc.npci&pn=${payeeName}&cu=INR`;
      }
      
      if (upiString) {
        upiQRCodeDataUrl = await QRCode.toDataURL(upiString, {
          width: 150,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      }
    } catch (error) {
      console.error('Failed to generate UPI QR code:', error);
    }

    const isCancelled = invoice.recordStatus === 0;
    const formattedGatepassDate = format(new Date(gatepass.gatepassDate), 'dd/MM/yyyy');

    const generateInvoiceHTML = (copyType: string) => `
      <div class="page">
        ${isCancelled ? `<div class="cancelled-watermark">CANCELLED</div>` : ''}
        <div class="title-section">
          <div class="title">Tax Invoice</div>
          <div class="copy-label">${copyType} FOR ${copyType === 'ORIGINAL' ? 'RECIPIENT' : copyType === 'DUPLICATE' ? 'TRANSPORTER' : 'SUPPLIER'}</div>
        </div>

        <div class="company-header">
          ${template?.logoUrl ? `
            <div class="company-logo">
              <img src="${template.logoUrl}" alt="Company Logo" />
            </div>
          ` : ''}
          <div class="company-info">
            <div class="company-name">${invoice.sellerName || 'Inmoisture Private Limited'}</div>
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
            ${invoiceItems.map((item, idx) => {
              const totalGst = safeNum(item.cgstAmount) + safeNum(item.sgstAmount) + safeNum(item.igstAmount);
              const gstPercent = (safeNum(item.cgstRate) + safeNum(item.sgstRate) + safeNum(item.igstRate)) / 100;
              const uom = uoms.find((u: any) => u.id === item.uomId);
              const unit = uom?.name || 'Cases';
              const grossLine = safeNum(item.unitPrice) * safeNum(item.quantity);
              const taxable = safeNum(item.taxableAmount);
              const lineDiscount = Math.max(0, grossLine - taxable);
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

        <div class="summary-section">
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

          <div class="totals-box">
            <table class="totals-table">
              <tbody>
                ${hasDiscount ? `
                  <tr>
                    <td>Gross Amount:</td>
                    <td style="text-align:right;">${formatCurrency(invoiceItems.reduce((s: number, i: any) => s + safeNum(i.unitPrice) * safeNum(i.quantity), 0))}</td>
                  </tr>
                  <tr>
                    <td>Discount:</td>
                    <td style="text-align:right;">- ${formatCurrency(invoiceItems.reduce((s: number, i: any) => s + Math.max(0, safeNum(i.unitPrice) * safeNum(i.quantity) - safeNum(i.taxableAmount)), 0))}</td>
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

        <div class="terms-payment-grid">
          <div class="${activeTermsConditions && activeTermsConditions.terms && activeTermsConditions.terms.length > 0 ? 'terms-section' : ''}">
            ${activeTermsConditions && activeTermsConditions.terms && activeTermsConditions.terms.length > 0 ? `
              <div class="terms-title">Terms & Conditions:</div>
              <ol>
                ${activeTermsConditions.terms.map(term => `<li>${term}</li>`).join('')}
              </ol>
            ` : ''}
          </div>
          
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
              ${directReceived === 0 && advanceApplied === 0 && writeOffTotal === 0 ? `
              <div>Received:</div>
              <div style="text-align:right;">${formatCurrency(0)}</div>
              ` : ''}
              <div style="border-top:1px solid #000; padding-top:3px;"><strong>Balance Due:</strong></div>
              <div style="text-align:right; border-top:1px solid #000; padding-top:3px;"><strong>${formatCurrency(balanceDue)}</strong></div>
            </div>
          </div>
        </div>

        <div class="amount-in-words">
          Total Invoice Amount in words: <strong>${amountToWords(safeNum(invoice.totalAmount))}</strong>
        </div>

        ${invoice.remarks ? `<div class="remarks">Note: ${invoice.remarks}</div>` : ''}

        <div class="bank-signature-grid">
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

        <div class="declaration">
          <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>
      </div>
    `;

    const generateGatepassHTML = (copyType: string, copyFor: string) => `
      <div class="gp-page">
        <div class="gp-header">
          <div class="gp-company-name">INMOISTURE PRIVATE LIMITED</div>
          <div class="gp-subtitle">Gate Pass for Finished Goods Dispatch</div>
        </div>

        <div class="gp-copy-label">${copyType} - ${copyFor}</div>

        <div class="gp-number">Gate Pass No: <strong>${gatepass.gatepassNumber}</strong></div>

        <div class="gp-details-flex">
          <div class="gp-left-col">
            <table class="gp-info-table">
              <tr><td class="gp-label">Date:</td><td>${formattedGatepassDate}</td></tr>
              <tr><td class="gp-label">Vehicle No:</td><td><strong>${gatepass.vehicleNumber}</strong></td></tr>
              <tr><td class="gp-label">Driver:</td><td>${gatepass.driverName}</td></tr>
              <tr><td class="gp-label">Contact:</td><td>${gatepass.driverContact || '-'}</td></tr>
              <tr><td class="gp-label">Transporter:</td><td>${gatepass.transporterName || '-'}</td></tr>
            </table>
          </div>
          <div class="gp-right-col">
            <div class="gp-customer-box">
              <div class="gp-box-title">Customer Details</div>
              <div class="gp-customer-name">${vendor?.vendorName || gatepass.customerName || '-'}</div>
              ${vendor?.mobileNumber ? `<div class="gp-customer-detail">Mobile: ${vendor.mobileNumber}</div>` : ''}
              ${vendor?.gstNumber ? `<div class="gp-customer-detail">GST: ${vendor.gstNumber}</div>` : ''}
              ${vendor?.address ? `<div class="gp-customer-address">${vendor.address}</div>` : ''}
              ${gatepass.destination ? `<div class="gp-customer-detail"><strong>Destination:</strong> ${gatepass.destination}</div>` : ''}
            </div>
          </div>
        </div>

${invoice.shipToName || invoice.shipToAddress ? `
        <div class="gp-ship-to-box">
          <div class="gp-box-title">Ship To</div>
          ${invoice.shipToName ? `<div class="gp-customer-name">${invoice.shipToName}</div>` : ''}
          ${invoice.shipToAddress ? `<div class="gp-customer-address">${invoice.shipToAddress}</div>` : ''}
          ${invoice.shipToCity || invoice.shipToState || invoice.shipToPincode ? `<div class="gp-customer-detail">${[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>` : ''}
        </div>
` : ''}
        ${invoice.invoiceNumber ? `<div class="gp-invoice-ref">Invoice No: <strong>${invoice.invoiceNumber}</strong></div>` : ''}

        <table class="gp-items-table">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th style="text-align:left;">Product Name</th>
              <th style="width:100px;">Batch No.</th>
              <th style="width:70px;">Qty</th>
              <th style="text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${gatepassItems.map((item, index) => `
              <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${getGatepassProductName(item)}</td>
                <td style="text-align:center;">${getBatchNumber(item)}</td>
                <td style="text-align:center;">${item.quantityDispatched}</td>
                <td>${item.remarks || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gatepass.casesCount ? `<div class="gp-cases-info">Total Cases/Boxes: <strong>${gatepass.casesCount}</strong></div>` : ''}
        ${gatepass.securitySealNo ? `<div class="gp-seal-info">Security Seal No: <strong>${gatepass.securitySealNo}</strong></div>` : ''}

        ${gatepass.remarks ? `
          <div class="gp-remarks-section">
            <strong>Remarks:</strong> ${gatepass.remarks}
          </div>
        ` : ''}

        <div class="gp-signature-section">
          <div class="gp-sig-box">
            <div class="gp-sig-line"></div>
            <div class="gp-sig-label">Receiver's Signature</div>
          </div>
          <div class="gp-sig-box">
            <div class="gp-sig-line"></div>
            <div class="gp-sig-label">Security/Gate</div>
          </div>
          <div class="gp-sig-box">
            <div class="gp-sig-line"></div>
            <div class="gp-sig-label">Authorized Signatory</div>
          </div>
        </div>

        <div class="gp-footer">
          This is a computer-generated gate pass. Please verify all details before accepting goods.
        </div>
      </div>
    `;

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Detect ALL iOS devices - blob URLs can't be shared/printed on any iOS browser
    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    
    const fullHtmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice & Gatepass - ${invoice.invoiceNumber} / ${gatepass.gatepassNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10px; 
              line-height: 1.3; 
              color: #000;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Ensure all borders print properly */
            table, th, td { border-collapse: collapse; }
            
            .page, .gp-page {
              position: relative;
              width: 210mm;
              min-height: 270mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
            }
            .page + .page, .page + .gp-page, .gp-page + .page, .gp-page + .gp-page { page-break-before: always; }

            .cancelled-watermark {
              position: absolute; top: 50%; left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px; font-weight: bold; color: rgba(255, 0, 0, 0.25);
              pointer-events: none; z-index: 1000; text-transform: uppercase;
              letter-spacing: 10px; white-space: nowrap;
            }

            .title-section { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
            .copy-label { font-size: 10px; font-weight: bold; padding: 2px 10px; border: 1px solid #000; display: inline-block; }

            .company-header { display: flex; align-items: center; justify-content: center; gap: 15px; border: 1px solid #000; padding: 8px; margin-bottom: 10px; }
            .company-logo { flex-shrink: 0; }
            .company-logo img { max-width: 150px; max-height: 60px; object-fit: contain; }
            .company-info { text-align: center; flex-grow: 1; }
            .company-name { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
            .company-contact { font-size: 9px; margin: 2px 0; }
            .company-gst { font-size: 9px; margin-top: 3px; }

            .details-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 10px; }
            .bill-to, .invoice-details { padding: 8px; font-size: 9px; }
            .bill-to { border-right: 1px solid #000; }
            .section-label { font-weight: bold; font-size: 10px; margin-bottom: 4px; text-decoration: underline; }
            .party-name { font-weight: bold; font-size: 10px; }
            .invoice-details div { margin-bottom: 2px; }
            .ship-to { border: 1px solid #000; padding: 8px; margin-bottom: 10px; font-size: 9px; }

            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 4px 3px; text-align: center; }
            .items-table th { background: #e8e8e8; font-weight: bold; font-size: 9px; }
            .total-row td { font-weight: bold; background: #f5f5f5; }

            .summary-section { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
            .hsn-table-wrapper { flex: 1; }
            .totals-box { flex: 0 0 200px; }
            .totals-table { width: 100%; border-collapse: collapse; font-size: 10px; }
            .totals-table td { border: 1px solid #000; padding: 4px 6px; }
            .hsn-table { width: 100%; border-collapse: collapse; font-size: 8px; }
            .hsn-table th, .hsn-table td { border: 1px solid #000; padding: 3px 2px; text-align: center; }
            .hsn-table th { background: #e8e8e8; font-weight: bold; }
            .hsn-table .total-row td { font-weight: bold; background: #f5f5f5; }

            /* Terms & Payment Grid (Two Columns) */
            .terms-payment-grid { display: grid; grid-template-columns: 1fr 200px; gap: 10px; margin-bottom: 10px; }

            /* Payment Summary */
            .payment-summary { border: 1px solid #000; padding: 8px; }
            .payment-grid { display: grid; grid-template-columns: auto auto; gap: 5px; font-size: 10px; }

            /* Amount in Words */
            .amount-in-words { border: 1px solid #000; padding: 6px; margin-bottom: 10px; font-size: 9px; background: #fafafa; }

            /* Bank and Signature Grid (Two Columns) */
            .bank-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }

            /* Bank Details Container */
            .bank-details-container { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #000; padding: 8px; gap: 10px; }
            .bank-details { flex: 1; font-size: 9px; }
            .bank-label { font-weight: bold; margin-bottom: 4px; }
            .bank-details div { margin-bottom: 2px; }
            .qr-code-section { text-align: center; flex-shrink: 0; }
            .qr-code { width: 80px; height: 80px; border: 1px solid #000; }

            /* Terms Section */
            .terms-section { border: 1px solid #000; padding: 8px; }
            .terms-title { font-weight: bold; font-size: 10px; margin-bottom: 4px; }
            .terms-section ol { margin-left: 15px; font-size: 8px; }
            .terms-section li { margin-bottom: 3px; }

            /* Remarks */
            .remarks { padding: 6px; margin-bottom: 10px; font-size: 9px; font-style: italic; border: 1px solid #000; }

            /* Signature Section */
            .signature-section { text-align: center; border: 1px solid #000; padding: 8px; font-size: 9px; }
            .company-for-line { margin-bottom: 8px; text-align: left; }
            .signature-image { margin: 10px auto; min-height: 40px; }
            .signature-image img { max-height: 50px; object-fit: contain; background: transparent; }
            .signature-space { height: 50px; margin: 5px 0; }
            .signatory-label { text-align: center; }

            /* Declaration */
            .declaration { border-top: 1px solid #000; padding-top: 6px; font-size: 8px; text-align: center; }

            /* Gatepass Styles */
            .gp-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            .gp-company-name { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
            .gp-subtitle { font-size: 12px; color: #555; margin-top: 3px; }
            .gp-copy-label { text-align: center; font-size: 11px; font-weight: bold; background: #f5f5f5; border: 1px solid #000; padding: 4px 10px; display: block; width: fit-content; margin: 8px auto; }
            .gp-number { text-align: center; font-size: 13px; margin-bottom: 12px; }
            .gp-details-flex { display: flex; gap: 15px; margin-bottom: 12px; }
            .gp-left-col { flex: 1; }
            .gp-right-col { flex: 1; }
            .gp-info-table { width: 100%; border-collapse: collapse; }
            .gp-info-table td { padding: 4px 6px; border: 1px solid #000; }
            .gp-info-table .gp-label { font-weight: bold; width: 90px; background: #f9f9f9; }
            .gp-customer-box { border: 1px solid #000; padding: 8px; height: 100%; background: #fafafa; }
            .gp-box-title { font-weight: bold; font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
            .gp-customer-name { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
            .gp-customer-detail { font-size: 10px; margin-bottom: 2px; }
            .gp-customer-address { font-size: 10px; color: #555; margin-top: 4px; word-wrap: break-word; overflow-wrap: break-word; }
            .gp-ship-to-box { border: 1px solid #000; padding: 8px; background: #f5f9ff; margin-bottom: 10px; }
            .gp-invoice-ref { font-size: 11px; margin-bottom: 10px; padding: 4px 8px; background: #e8f4e8; border: 1px solid #c3e0c3; display: inline-block; }
            .gp-items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .gp-items-table th, .gp-items-table td { border: 1px solid #000; padding: 6px 8px; }
            .gp-items-table th { background: #f0f0f0; font-weight: bold; font-size: 10px; }
            .gp-items-table td { font-size: 11px; }
            .gp-cases-info, .gp-seal-info { font-size: 11px; margin-bottom: 5px; }
            .gp-remarks-section { font-size: 10px; padding: 6px 8px; background: #f9f9f9; border: 1px solid #000; margin: 10px 0; }
            .gp-signature-section { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; }
            .gp-sig-box { text-align: center; width: 30%; }
            .gp-sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
            .gp-sig-label { font-size: 10px; font-weight: bold; }
            .gp-footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; }

            @media print {
              body { 
                margin: 0; 
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page, .gp-page { margin: 0; border: none; width: 100%; min-height: auto; padding: 10mm; }
              .no-print { display: none !important; }

              /* Ensure all table borders print properly */
              table, th, td { border-collapse: collapse !important; }

              /* Invoice section borders */
              .items-table th, .items-table td { border: 1px solid #000 !important; }
              .hsn-table th, .hsn-table td { border: 1px solid #000 !important; }
              .totals-table td { border: 1px solid #000 !important; }
              .details-grid { border: 1px solid #000 !important; }
              .bill-to { border-right: 1px solid #000 !important; }
              .company-header { border: 1px solid #000 !important; }
              .ship-to { border: 1px solid #000 !important; }
              .amount-in-words { border: 1px solid #000 !important; }
              .declaration { border: 1px solid #000 !important; }
              .remarks { border: 1px solid #000 !important; }
              .terms-section { border: 1px solid #000 !important; }
              .payment-summary { border: 1px solid #000 !important; }
              .bank-details-container { border: 1px solid #000 !important; }
              .signature-section { border: 1px solid #000 !important; }
              .qr-code { border: 1px solid #000 !important; }

              /* Gatepass section borders */
              .gp-header { border-bottom: 2px solid #000 !important; }
              .gp-copy-label { border: 1px solid #000 !important; }
              .gp-items-table th, .gp-items-table td { border: 1px solid #000 !important; }
              .gp-info-table td { border: 1px solid #000 !important; }
              .gp-customer-box { border: 1px solid #000 !important; }
              .gp-remarks-section { border: 1px solid #000 !important; }
              .gp-sig-line { border-bottom: 1px solid #000 !important; }
            }
          </style>
        </head>
        <body>
          ${generateInvoiceHTML('ORIGINAL')}
          ${generateInvoiceHTML('DUPLICATE')}
          ${generateInvoiceHTML('TRIPLICATE')}
          ${generateGatepassHTML('ORIGINAL', 'CUSTOMER')}
          ${generateGatepassHTML('DUPLICATE', 'TRANSPORTER')}
          ${generateGatepassHTML('TRIPLICATE', 'OFFICE')}
        </body>
      </html>
    `;

    // ALL iOS browsers: Navigate directly to print page
    if (isIOSDevice) {
      window.location.href = `/print/invoice-gatepass/${invoice.id}/${gatepass.id}`;
      return;
    } else if (isMobile) {
      // Android - blob URL navigation works
      const mobileHtmlContent = fullHtmlContent.replace(
        '<body>',
        `<body>
          <div id="mobile-controls" style="position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;border-bottom:1px solid #374151;z-index:100000;gap:12px;">
            <button onclick="history.back()" style="padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">← Back</button>
            <div style="color:white;font-size:13px;text-align:center;flex:1;">Tap <strong>⋮ Menu</strong> → <strong>Print</strong></div>
          </div>
          <div style="padding-top:56px;">`
      ).replace('</body>', '</div></body>');
      
      const blob = new Blob([mobileHtmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.location.href = blobUrl;
    } else {
      // Desktop approach: Open in new window
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;

      printWindow.document.write(fullHtmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      data-testid={`button-print-combined-${invoice.id}-${gatepass.id}`}
      title="Print Invoice & Gatepass"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print Both
    </Button>
  );
}
