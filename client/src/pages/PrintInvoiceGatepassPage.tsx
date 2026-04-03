import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { type Invoice, type Gatepass, type InvoiceItem, type GatepassItem, type Product, type Vendor, type FinishedGood, type TermsConditions } from "@shared/schema";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import { amountToWords } from "@/lib/number-to-words";
import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function PrintInvoiceGatepassPage() {
  const params = useParams<{ invoiceId: string; gatepassId: string }>();
  const invoiceId = params.invoiceId;
  const gatepassId = params.gatepassId;

  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery<Invoice>({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Invoice not found');
      return response.json();
    },
    enabled: !!invoiceId,
    retry: false,
  });

  const { data: gatepass, isLoading: isLoadingGatepass, error: gatepassError } = useQuery<Gatepass>({
    queryKey: ['/api/gatepasses', gatepassId],
    queryFn: async () => {
      const response = await fetch(`/api/gatepasses/${gatepassId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Gatepass not found');
      return response.json();
    },
    enabled: !!gatepassId,
    retry: false,
  });

  const { data: invoiceItems = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoice-items?invoiceId=${invoiceId}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!invoiceId,
  });

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', gatepassId],
    queryFn: async () => {
      const response = await fetch(`/api/gatepass-items?gatepassId=${gatepassId}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!gatepassId,
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

  const { data: template } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice?.templateId],
    queryFn: async () => {
      if (!invoice?.templateId) return null;
      const response = await fetch(`/api/invoice-templates/${invoice.templateId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!invoice?.templateId,
  });

  const { data: defaultTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });

  const { data: termsConditions } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions', invoice?.termsConditionsId],
    enabled: !!invoice?.termsConditionsId,
  });

  const activeTemplate = template || defaultTemplate;

  const [upiQRCodeDataUrl, setUpiQRCodeDataUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);

  const upiId = activeTemplate?.defaultUpiId || invoice?.upiId;
  const bankNameForQR = activeTemplate?.defaultBankName || invoice?.bankName;
  const bankAccountForQR = activeTemplate?.defaultBankAccountNumber || invoice?.bankAccountNumber;
  const bankIfscForQR = activeTemplate?.defaultBankIfscCode || invoice?.bankIfscCode;
  const accountHolderForQR = activeTemplate?.defaultAccountHolderName || invoice?.accountHolderName;

  useEffect(() => {
    const generateQR = async () => {
      if (!invoice) {
        setQrLoading(false);
        return;
      }
      
      try {
        let upiString = '';
        const payeeName = encodeURIComponent(accountHolderForQR || invoice.sellerName || 'Inmoisture Private Limited');
        
        if (upiId) {
          upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`;
        } else if (bankAccountForQR && bankIfscForQR) {
          const accountNum = bankAccountForQR.replace(/\s/g, '');
          const ifsc = bankIfscForQR.toUpperCase().replace(/\s/g, '');
          upiString = `upi://pay?pa=${accountNum}.${ifsc}.ifsc.npci&pn=${payeeName}&cu=INR`;
        }
        
        if (upiString) {
          const dataUrl = await QRCode.toDataURL(upiString, {
            width: 100,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          setUpiQRCodeDataUrl(dataUrl);
        }
      } catch (error) {
        console.error('Failed to generate UPI QR code:', error);
      } finally {
        setQrLoading(false);
      }
    };
    
    generateQR();
  }, [invoice, upiId, bankAccountForQR, bankIfscForQR, accountHolderForQR]);

  if (isLoadingInvoice || isLoadingGatepass || qrLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" style={{ width: '48px', height: '48px', color: '#3b82f6' }} />
      </div>
    );
  }

  if (invoiceError || gatepassError || !invoice || !gatepass) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white', padding: '20px' }}>
        <p style={{ color: '#dc2626', fontSize: '18px', marginBottom: '20px' }}>Failed to load invoice or gatepass</p>
        <button 
          onClick={() => window.history.back()}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const vendor = vendors.find(v => v.id === gatepass.vendorId);

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
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

  const isIntrastate = invoice.sellerStateCode === invoice.buyerStateCode;
  const isCancelled = invoice.recordStatus === 0;
  const formattedInvoiceDate = format(new Date(invoice.invoiceDate), 'dd/MM/yyyy');
  const formattedGatepassDate = format(new Date(gatepass.gatepassDate), 'dd/MM/yyyy');

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

  const handleBack = () => {
    window.history.back();
  };

  const handlePrint = () => {
    window.print();
  };

  const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);

  const bankName = activeTemplate?.defaultBankName || invoice.bankName;
  const bankAccountNumber = activeTemplate?.defaultBankAccountNumber || invoice.bankAccountNumber;
  const bankIfscCode = activeTemplate?.defaultBankIfscCode || invoice.bankIfscCode;
  const accountHolderName = activeTemplate?.defaultAccountHolderName || invoice.accountHolderName;

  const amountReceived = invoice.amountReceived || 0;
  const balanceDue = invoice.totalAmount - amountReceived;

  const renderInvoiceCopy = (copyType: string, copyFor: string) => (
    <div key={`invoice-${copyType}`} className="invoice-page" style={{ pageBreakAfter: 'always', padding: '10mm', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      {isCancelled && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '80px', fontWeight: 'bold', color: 'rgba(255, 0, 0, 0.2)',
          pointerEvents: 'none', zIndex: 1000, textTransform: 'uppercase',
          letterSpacing: '10px', whiteSpace: 'nowrap'
        }}>CANCELLED</div>
      )}

      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '5px', marginBottom: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Tax Invoice</div>
        <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 10px', border: '1px solid #000', display: 'inline-block', marginTop: '3px' }}>
          {copyType} FOR {copyFor}
        </div>
      </div>

      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        {activeTemplate?.logoUrl && (
          <div style={{ flexShrink: 0 }}>
            <img src={activeTemplate.logoUrl} alt="Company Logo" style={{ maxWidth: '120px', maxHeight: '50px', objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{invoice.sellerName || 'Inmoisture Private Limited'}</div>
          <div style={{ fontSize: '9px' }}>{invoice.sellerAddress}</div>
          <div style={{ fontSize: '9px' }}>
            {invoice.sellerPhone && `Phone: ${invoice.sellerPhone}`}
            {invoice.sellerPhone && invoice.sellerEmail && ' | '}
            {invoice.sellerEmail && `Email: ${invoice.sellerEmail}`}
          </div>
          {invoice.sellerGstin && <div style={{ fontSize: '9px' }}>GSTIN: {invoice.sellerGstin}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: '8px', fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', textDecoration: 'underline' }}>Bill To:</div>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{invoice.buyerName}</div>
          {invoice.buyerAddress && <div>{invoice.buyerAddress}</div>}
          {invoice.buyerContact && <div>Contact: {invoice.buyerContact}</div>}
          {invoice.buyerGstin && <div>GSTIN: {invoice.buyerGstin}</div>}
          {invoice.buyerState && <div>State: {invoice.buyerStateCode}-{invoice.buyerState}</div>}
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: '8px', fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', textDecoration: 'underline' }}>Invoice Details:</div>
          <div>No: <strong>{invoice.invoiceNumber}</strong></div>
          <div>Date: {formattedInvoiceDate}</div>
          {invoice.vehicleNumber && <div>Vehicle No: {invoice.vehicleNumber}</div>}
          {invoice.placeOfSupply && <div>Place Of Supply: {invoice.placeOfSupply}</div>}
        </div>
      </div>

      {(invoice.shipToName || invoice.shipToAddress) && (
        <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '10px', fontSize: '9px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', textDecoration: 'underline' }}>Ship To:</div>
          {invoice.shipToName && <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{invoice.shipToName}</div>}
          {invoice.shipToAddress && <div>{invoice.shipToAddress}</div>}
          {(invoice.shipToCity || invoice.shipToState || invoice.shipToPincode) && (
            <div>{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>
          )}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '9px' }}>
        <thead>
          <tr style={{ background: '#e8e8e8' }}>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '25px' }}>#</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>Item</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '55px' }}>HSN/SAC</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>Qty</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '35px' }}>Unit</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '60px' }}>Rate</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '45px' }}>Discount</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>GST%</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '55px' }}>GST</th>
            <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '65px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, idx) => {
            const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
            const gstPercent = (item.cgstRate + item.sgstRate + item.igstRate) / 100;
            const uom = uoms.find(u => u.id === item.uomId);
            const unit = uom?.name || 'Nos';
            const discountMode = (item as any).discountMode || '%';
            const discountDisplay = item.discount > 0 
              ? `${(item.discount / 100).toFixed(2)} ${discountMode}` 
              : '-';
            return (
              <tr key={item.id}>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'left' }}>{item.description}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{item.hsnCode || item.sacCode || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{unit}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{discountDisplay}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{gstPercent.toFixed(1)}%</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(totalGst)}</td>
                <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(item.totalAmount)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
            <td colSpan={8} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Total</td>
            <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatCurrency(invoice.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
            <thead>
              <tr style={{ background: '#e8e8e8' }}>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px' }}>HSN/SAC</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px' }}>Taxable</th>
                {isIntrastate ? (
                  <>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '2px' }}>CGST</th>
                    <th colSpan={2} style={{ border: '1px solid #000', padding: '2px' }}>SGST</th>
                  </>
                ) : (
                  <th colSpan={2} style={{ border: '1px solid #000', padding: '2px' }}>IGST</th>
                )}
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px' }}>Tax</th>
              </tr>
              <tr style={{ background: '#e8e8e8' }}>
                {isIntrastate ? (
                  <>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>%</th>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>Amt</th>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>%</th>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>Amt</th>
                  </>
                ) : (
                  <>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>%</th>
                    <th style={{ border: '1px solid #000', padding: '2px' }}>Amt</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {hsnSummary.map((hsn, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center' }}>{hsn.hsn}</td>
                  <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'right' }}>{formatCurrency(hsn.taxableAmount)}</td>
                  {isIntrastate ? (
                    <>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center' }}>{(hsn.cgstRate / 100).toFixed(1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'right' }}>{formatCurrency(hsn.cgstAmount)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center' }}>{(hsn.sgstRate / 100).toFixed(1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'right' }}>{formatCurrency(hsn.sgstAmount)}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center' }}>{(hsn.igstRate / 100).toFixed(1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'right' }}>{formatCurrency(hsn.igstAmount)}</td>
                    </>
                  )}
                  <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(hsn.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ width: '180px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <tbody>
              <tr><td style={{ border: '1px solid #000', padding: '3px' }}>Subtotal:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(invoice.subtotal)}</td></tr>
              {isIntrastate ? (
                <>
                  <tr><td style={{ border: '1px solid #000', padding: '3px' }}>CGST:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(invoice.cgstAmount)}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '3px' }}>SGST:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(invoice.sgstAmount)}</td></tr>
                </>
              ) : (
                <tr><td style={{ border: '1px solid #000', padding: '3px' }}>IGST:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(invoice.igstAmount)}</td></tr>
              )}
              {(invoice.transportCharges ?? 0) > 0 && (
                <tr><td style={{ border: '1px solid #000', padding: '3px' }}>Transport:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(invoice.transportCharges || 0)}</td></tr>
              )}
              <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}><td style={{ border: '1px solid #000', padding: '4px' }}>Grand Total:</td><td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatCurrency(invoice.totalAmount)}</td></tr>
              <tr><td style={{ border: '1px solid #000', padding: '3px' }}>Received:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(amountReceived)}</td></tr>
              <tr style={{ fontWeight: 'bold' }}><td style={{ border: '1px solid #000', padding: '3px' }}>Balance:</td><td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right' }}>{formatCurrency(balanceDue)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: '10px', marginBottom: '10px', fontStyle: 'italic' }}>
        Amount in words: <strong>{amountToWords(invoice.totalAmount)}</strong>
      </div>

      {termsConditions && (
        <div style={{ fontSize: '8px', marginBottom: '10px', padding: '6px', border: '1px solid #ddd', background: '#fafafa' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Terms & Conditions:</div>
          <ol style={{ paddingLeft: '15px', margin: 0 }}>
            {termsConditions.terms.map((term, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>{term}</li>
            ))}
          </ol>
        </div>
      )}

      {(bankName || bankAccountNumber || upiId) && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', padding: '6px', border: '1px solid #ddd', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, fontSize: '9px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Bank Details:</div>
            {bankName && <div>Bank: <strong>{bankName}</strong></div>}
            {bankAccountNumber && <div>A/C No: {bankAccountNumber}</div>}
            {bankIfscCode && <div>IFSC: {bankIfscCode}</div>}
            {accountHolderName && <div>A/C Holder: {accountHolderName}</div>}
            {upiId && <div>UPI: {upiId}</div>}
          </div>
          {upiQRCodeDataUrl && (
            <div style={{ textAlign: 'center' }}>
              <img src={upiQRCodeDataUrl} alt="UPI QR Code" style={{ width: '80px', height: '80px', border: '1px solid #ddd' }} />
              <div style={{ fontSize: '7px', marginTop: '2px', color: '#666' }}>Scan to Pay</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '9px', marginBottom: '5px' }}>For {invoice.sellerName || 'Inmoisture Private Limited'}:</div>
          {(() => {
            const signatureType = (invoice as any).signatureType || 'default';
            const showSignature = (invoice as any).includeSignature === 1 || (invoice as any).includeSignature === undefined;
            
            if (!showSignature) {
              return <div style={{ height: '40px' }}></div>;
            }
            
            if (signatureType === 'alternate' && activeTemplate?.alternateSignatureImage) {
              return <img src={activeTemplate.alternateSignatureImage} alt="Signature" style={{ maxHeight: '50px', objectFit: 'contain' }} />;
            } else if (activeTemplate?.defaultSignatureImage) {
              return <img src={activeTemplate.defaultSignatureImage} alt="Signature" style={{ maxHeight: '50px', objectFit: 'contain' }} />;
            }
            return <div style={{ height: '40px' }}></div>;
          })()}
          <div style={{ borderTop: '1px solid #000', paddingTop: '5px', minWidth: '150px', fontSize: '9px' }}>
            {(() => {
              const signatureType = (invoice as any).signatureType || 'default';
              if (signatureType === 'alternate') {
                return activeTemplate?.alternateSignatoryName || activeTemplate?.authorizedSignatoryName || 'Authorized Signatory';
              }
              return activeTemplate?.authorizedSignatoryName || 'Authorized Signatory';
            })()}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '8px', marginTop: '15px', padding: '6px', background: '#f9f9f9', border: '1px solid #ddd' }}>
        <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
      </div>
    </div>
  );

  const renderGatepassCopy = (copyType: string, copyFor: string) => (
    <div key={`gatepass-${copyType}`} className="gatepass-page" style={{ pageBreakAfter: 'always', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>INMOISTURE PRIVATE LIMITED</div>
        <div style={{ fontSize: '12px', color: '#666' }}>Gate Pass for Finished Goods Dispatch</div>
      </div>

      <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>{copyType} - {copyFor}</div>

      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        Gate Pass No: <strong>{gatepass.gatepassNumber}</strong>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <tbody>
              <tr><td style={{ padding: '3px 0', color: '#666', width: '90px' }}>Date:</td><td>{formattedGatepassDate}</td></tr>
              <tr><td style={{ padding: '3px 0', color: '#666' }}>Vehicle No:</td><td><strong>{gatepass.vehicleNumber}</strong></td></tr>
              <tr><td style={{ padding: '3px 0', color: '#666' }}>Driver:</td><td>{gatepass.driverName}</td></tr>
              <tr><td style={{ padding: '3px 0', color: '#666' }}>Contact:</td><td>{gatepass.driverContact || '-'}</td></tr>
              <tr><td style={{ padding: '3px 0', color: '#666' }}>Transporter:</td><td>{gatepass.transporterName || '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>Customer Details</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{vendor?.vendorName || gatepass.customerName || '-'}</div>
            {vendor?.mobileNumber && <div style={{ fontSize: '11px' }}>Mobile: {vendor.mobileNumber}</div>}
            {vendor?.gstNumber && <div style={{ fontSize: '11px' }}>GST: {vendor.gstNumber}</div>}
            {vendor?.address && <div style={{ fontSize: '11px' }}>{vendor.address}</div>}
            {gatepass.destination && <div style={{ fontSize: '11px' }}><strong>Destination:</strong> {gatepass.destination}</div>}
          </div>
        </div>
      </div>

      {(invoice.shipToName || invoice.shipToAddress) && (
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>Ship To</div>
          {invoice.shipToName && <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{invoice.shipToName}</div>}
          {invoice.shipToAddress && <div style={{ fontSize: '11px' }}>{invoice.shipToAddress}</div>}
          {(invoice.shipToCity || invoice.shipToState || invoice.shipToPincode) && (
            <div style={{ fontSize: '11px' }}>{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '10px', fontSize: '12px' }}>
        Invoice No: <strong>{invoice.invoiceNumber}</strong>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '40px' }}>#</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Product Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '100px' }}>Batch No.</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', width: '70px' }}>Qty</th>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {gatepassItems.map((item, index) => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px' }}>{getGatepassProductName(item)}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{getBatchNumber(item)}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{item.quantityDispatched}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px' }}>{item.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {gatepass.casesCount && (
        <div style={{ fontSize: '12px', marginBottom: '5px' }}>Total Cases/Boxes: <strong>{gatepass.casesCount}</strong></div>
      )}
      {gatepass.securitySealNo && (
        <div style={{ fontSize: '12px', marginBottom: '5px' }}>Security Seal No: <strong>{gatepass.securitySealNo}</strong></div>
      )}

      {gatepass.remarks && (
        <div style={{ fontSize: '12px', marginBottom: '15px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
          <strong>Remarks:</strong> {gatepass.remarks}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '12px' }}>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px' }}>Prepared By</div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px' }}>Security</div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px' }}>Receiver Signature</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#666' }}>
        This is a computer-generated gate pass. Please verify all details before accepting goods.
      </div>
    </div>
  );

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #print-controls, [id="print-controls"], div[style*="position: fixed"] { 
            display: none !important; 
            visibility: hidden !important; 
            height: 0 !important; 
            overflow: hidden !important;
            position: absolute !important;
            top: -9999px !important;
          }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .invoice-page, .gatepass-page { page-break-after: always; page-break-inside: avoid; }
          table { border-collapse: collapse !important; border: 1px solid #000 !important; }
          th, td { border: 1px solid #000 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          div[style*="border"] { border-color: #000 !important; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
        table { border-collapse: collapse; }
        table, th, td { border: 1px solid #333; }
      `}} />
      
      <div id="print-controls" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#1f2937',
        zIndex: 100000,
        gap: '12px'
      }}>
        <button
          onClick={handleBack}
          data-testid="button-back"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Back
        </button>
        {isIOSDevice ? (
          <div style={{ 
            color: 'white', 
            fontSize: '11px', 
            textAlign: 'center', 
            flex: 1, 
            lineHeight: 1.4 
          }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>To Save PDF:</div>
            <div>Share (↑ in URL bar) → Print → Hold preview → Share → Save</div>
          </div>
        ) : (
          <button
            onClick={handlePrint}
            data-testid="button-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Printer style={{ width: '16px', height: '16px' }} />
            Print
          </button>
        )}
      </div>
      
      <div style={{ paddingTop: '70px', background: '#f3f4f6', minHeight: '100vh' }}>
        <div style={{ maxWidth: '210mm', margin: '0 auto', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {renderInvoiceCopy('ORIGINAL', 'RECIPIENT')}
          {renderInvoiceCopy('DUPLICATE', 'TRANSPORTER')}
          {renderInvoiceCopy('TRIPLICATE', 'SUPPLIER')}
          {renderGatepassCopy('ORIGINAL', 'Customer Copy')}
          {renderGatepassCopy('DUPLICATE', 'Transporter Copy')}
          {renderGatepassCopy('TRIPLICATE', 'Office Copy')}
        </div>
      </div>
    </div>
  );
}
