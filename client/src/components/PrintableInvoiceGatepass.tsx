import { useRef } from "react";
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

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: uoms = [] } = useQuery<any[]>({
    queryKey: ['/api/uom'],
  });

  const { data: template, isLoading: isLoadingTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice.templateId],
    enabled: !!invoice.templateId,
  });

  const { data: termsConditions } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions', invoice.termsConditionsId],
    enabled: !!invoice.termsConditionsId,
  });

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
    return fg?.batchNumber || '-';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const isIntrastate = invoice.sellerStateCode === invoice.buyerStateCode;

  const handlePrint = async () => {
    if (invoice.templateId && isLoadingTemplate) {
      toast({
        title: "Please wait",
        description: "Template is still loading...",
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

    const amountReceived = invoice.amountReceived || 0;
    const balanceDue = invoice.totalAmount - amountReceived;

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
            ${invoice.shipToName ? `<div>${invoice.shipToName}</div>` : ''}
            ${invoice.shipToAddress ? `<div>${invoice.shipToAddress}, ${invoice.shipToCity || ''}</div>` : ''}
            ${invoice.shipToPincode ? `<div>Pincode: ${invoice.shipToPincode}</div>` : ''}
          </div>
        ` : ''}

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
            ${invoiceItems.map((item, idx) => {
              const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
              const gstPercent = (item.cgstRate + item.sgstRate + item.igstRate) / 100;
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

          <div class="totals-box">
            <table class="totals-table">
              <tbody>
                <tr>
                  <td>Sub Total:</td>
                  <td style="text-align:right;">${formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td><strong>Total:</strong></td>
                  <td style="text-align:right;"><strong>${formatCurrency(invoice.totalAmount)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="terms-payment-grid">
          <div class="terms-section">
            ${termsConditions && termsConditions.terms && termsConditions.terms.length > 0 ? `
              <div class="terms-title">Terms & Conditions:</div>
              <ol>
                ${termsConditions.terms.map(term => `<li>${term}</li>`).join('')}
              </ol>
            ` : ''}
          </div>
          
          <div class="payment-summary">
            <div class="payment-grid">
              <div>Received:</div>
              <div style="text-align:right;">${formatCurrency(amountReceived)}</div>
              <div><strong>Balance:</strong></div>
              <div style="text-align:right;"><strong>${formatCurrency(balanceDue)}</strong></div>
            </div>
          </div>
        </div>

        <div class="amount-in-words">
          Total Invoice Amount in words: <strong>${amountToWords(invoice.totalAmount)}</strong>
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
            <div class="signature-space"></div>
            <div class="signatory-label">Authorized Signatory</div>
          </div>
        </div>

        <div class="declaration">
          <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        </div>
      </div>
    `;

    const generateGatepassHTML = (copyType: string) => `
      <div class="gp-page">
        <div class="gp-header">
          <div class="gp-company-name">INMOISTURE PRIVATE LIMITED</div>
          <div style="font-size: 14px; margin-top: 5px;">Gate Pass for Finished Goods Dispatch</div>
          <div class="gp-copy-type">${copyType}</div>
          <div class="gp-number">Gate Pass No: ${gatepass.gatepassNumber}</div>
        </div>

        <div class="gp-details-section">
          <div class="gp-details-grid">
            <div class="gp-detail-item">
              <span class="gp-detail-label">Date:</span>
              <span class="gp-detail-value">${formattedGatepassDate}</span>
            </div>
            <div class="gp-detail-item">
              <span class="gp-detail-label">Vehicle No:</span>
              <span class="gp-detail-value">${gatepass.vehicleNumber}</span>
            </div>
            <div class="gp-detail-item">
              <span class="gp-detail-label">Driver Name:</span>
              <span class="gp-detail-value">${gatepass.driverName}</span>
            </div>
            <div class="gp-detail-item">
              <span class="gp-detail-label">Driver Contact:</span>
              <span class="gp-detail-value">${gatepass.driverContact || '-'}</span>
            </div>
            <div class="gp-detail-item">
              <span class="gp-detail-label">Transporter:</span>
              <span class="gp-detail-value">${gatepass.transporterName || '-'}</span>
            </div>
            <div class="gp-detail-item">
              <span class="gp-detail-label">Destination:</span>
              <span class="gp-detail-value">${gatepass.destination || '-'}</span>
            </div>
          </div>

          ${vendor ? `
            <div class="gp-vendor-box">
              <div style="font-weight: bold; margin-bottom: 5px;">Customer/Vendor Details:</div>
              <div class="gp-details-grid">
                <div class="gp-detail-item">
                  <span class="gp-detail-label">Name:</span>
                  <span class="gp-detail-value">${vendor.vendorName}</span>
                </div>
                <div class="gp-detail-item">
                  <span class="gp-detail-label">Mobile:</span>
                  <span class="gp-detail-value">${vendor.mobileNumber}</span>
                </div>
                <div class="gp-detail-item">
                  <span class="gp-detail-label">GST No:</span>
                  <span class="gp-detail-value">${vendor.gstNumber || '-'}</span>
                </div>
                <div class="gp-detail-item">
                  <span class="gp-detail-label">Address:</span>
                  <span class="gp-detail-value">${vendor.address || '-'}</span>
                </div>
              </div>
            </div>
          ` : ''}

          ${invoice.invoiceNumber ? `
            <div class="gp-detail-item">
              <span class="gp-detail-label">Invoice No:</span>
              <span class="gp-detail-value">${invoice.invoiceNumber}</span>
            </div>
          ` : ''}
        </div>

        <table class="gp-items-table">
          <thead>
            <tr>
              <th style="width: 50px;">Sr. No.</th>
              <th>Product Name</th>
              <th style="width: 120px;">Batch No.</th>
              <th style="width: 80px;">Quantity</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${gatepassItems.map((item, index) => `
              <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${getGatepassProductName(item)}</td>
                <td style="text-align: center;">${getBatchNumber(item)}</td>
                <td style="text-align: center;">${item.quantityDispatched}</td>
                <td>${item.remarks || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gatepass.remarks ? `
          <div style="margin-top: 20px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Remarks:</div>
            <div style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">
              ${gatepass.remarks}
            </div>
          </div>
        ` : ''}

        <div class="gp-signature-section">
          <div class="gp-signature-box">
            <div class="gp-signature-label">Prepared By</div>
          </div>
          <div class="gp-signature-box">
            <div class="gp-signature-label">Checked By</div>
          </div>
          <div class="gp-signature-box">
            <div class="gp-signature-label">Authorized Signatory</div>
          </div>
        </div>

        <div style="margin-top: 30px; font-size: 10px; text-align: center; color: #666;">
          This is a computer-generated gate pass. Please verify all details before accepting goods.
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice & Gatepass - ${invoice.invoiceNumber} / ${gatepass.gatepassNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; color: #000; }
            
            .page, .gp-page {
              position: relative;
              width: 210mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
              page-break-inside: avoid;
            }
            .page + .page, .page + .gp-page, .gp-page + .gp-page { page-break-before: always; }

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

            .terms-payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px; }
            .terms-section { font-size: 8px; }
            .terms-section ol { margin-left: 15px; }
            .terms-title { font-weight: bold; margin-bottom: 5px; }
            .payment-summary { text-align: right; }
            .payment-grid { display: grid; grid-template-columns: auto auto; gap: 5px; justify-content: end; font-size: 10px; }
            .amount-in-words { font-size: 9px; margin: 10px 0; padding: 5px; border: 1px solid #ddd; background: #f9f9f9; }
            .remarks { font-size: 9px; margin: 5px 0; padding: 5px; background: #fff3cd; border: 1px solid #ffc107; }

            .bank-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
            .bank-details-container { display: flex; gap: 20px; align-items: flex-start; }
            .bank-details { font-size: 9px; }
            .bank-label { font-weight: bold; margin-bottom: 5px; }
            .qr-code-section { flex-shrink: 0; }
            .qr-code { width: 100px; height: 100px; }
            .signature-section { text-align: right; }
            .company-for-line { font-size: 10px; margin-bottom: 40px; }
            .signature-space { height: 40px; }
            .signatory-label { font-size: 9px; border-top: 1px solid #000; padding-top: 5px; display: inline-block; }
            .declaration { font-size: 8px; margin-top: 15px; padding: 5px; border: 1px solid #ddd; background: #f9f9f9; }

            /* Gatepass Styles */
            .gp-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .gp-company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .gp-copy-type { font-size: 16px; font-weight: bold; margin: 10px 0; padding: 5px; background: #f0f0f0; border: 1px solid #000; }
            .gp-number { font-size: 18px; font-weight: bold; margin: 10px 0; }
            .gp-details-section { margin: 20px 0; }
            .gp-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .gp-detail-item { display: flex; padding: 5px 0; border-bottom: 1px solid #ddd; }
            .gp-detail-label { font-weight: bold; width: 140px; flex-shrink: 0; }
            .gp-detail-value { flex: 1; }
            .gp-vendor-box { margin-bottom: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
            .gp-items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .gp-items-table th, .gp-items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .gp-items-table th { background: #f0f0f0; font-weight: bold; }
            .gp-items-table td { vertical-align: top; }
            .gp-signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
            .gp-signature-box { text-align: center; padding-top: 40px; border-top: 1px solid #000; }
            .gp-signature-label { font-weight: bold; margin-top: 5px; }

            @media print {
              body { margin: 0; padding: 0; }
              .page, .gp-page { margin: 0; border: none; width: 100%; min-height: 100vh; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${generateInvoiceHTML('ORIGINAL')}
          ${generateInvoiceHTML('DUPLICATE')}
          ${generateInvoiceHTML('TRIPLICATE')}
          ${generateGatepassHTML('ORIGINAL')}
          ${generateGatepassHTML('DUPLICATE')}
          ${generateGatepassHTML('TRIPLICATE')}
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
