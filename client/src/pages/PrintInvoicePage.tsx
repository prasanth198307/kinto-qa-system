import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type InvoiceItem, type Product, type TermsConditions } from "@shared/schema";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";
import QRCode from "qrcode";

// Extended invoice type for print page
interface PrintInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerGstin: string | null;
  sellerState: string | null;
  sellerStateCode: string | null;
  buyerName: string;
  buyerAddress: string;
  buyerContact: string | null;
  buyerGstin: string | null;
  buyerState: string | null;
  buyerStateCode: string | null;
  shipToName: string | null;
  shipToAddress: string | null;
  shipToCity: string | null;
  shipToState: string | null;
  shipToPincode: string | null;
  placeOfSupply: string | null;
  subtotal: number;
  totalAmount: number;
  amountReceived: number | null;
  vehicleNumber: string | null;
  templateId: string | null;
  termsConditionsId: number | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  accountHolderName: string | null;
  upiId: string | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  transportCharges?: number | null;
  recordStatus?: number;
  remarks: string | null;
  [key: string]: any;
}

export default function PrintInvoicePage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id || null;
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery<PrintInvoice>({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Invoice not found');
      return response.json();
    },
    enabled: !!invoiceId,
    retry: false,
  });

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoice-items/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!invoiceId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<any[]>({
    queryKey: ['/api/uom'],
  });

  const { data: specificTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates', invoice?.templateId],
    queryFn: async () => {
      if (!invoice?.templateId) return null;
      const response = await fetch(`/api/invoice-templates/${invoice.templateId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!invoice?.templateId,
  });

  const { data: defaultTemplate } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });

  const template = specificTemplate || defaultTemplate;

  const { data: termsConditions } = useQuery<TermsConditions | null>({
    queryKey: ['/api/terms-conditions', invoice?.termsConditionsId],
    enabled: !!invoice?.termsConditionsId,
  });

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product?.productName || productId || 'Unknown Product';
  };

  const getUomName = (uomId: any): string => {
    if (!uomId) return 'Pcs';
    const uom = uoms.find((u: any) => u.id === uomId || String(u.id) === String(uomId));
    return uom?.name || 'Pcs';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  useEffect(() => {
    const generateQR = async () => {
      if (!invoice || !template) return;
      
      const accountHolderName = template?.defaultAccountHolderName || invoice.accountHolderName;
      const upiId = template?.defaultUpiId || invoice.upiId;
      const bankAccountNumber = template?.defaultBankAccountNumber || invoice.bankAccountNumber;
      const bankIfscCode = template?.defaultBankIfscCode || invoice.bankIfscCode;

      let upiString = '';
      const payeeName = encodeURIComponent(accountHolderName || invoice.sellerName || 'Company');
      
      if (upiId) {
        upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&cu=INR`;
      } else if (bankAccountNumber && bankIfscCode) {
        const accountNum = bankAccountNumber.replace(/\s/g, '');
        const ifsc = bankIfscCode.toUpperCase().replace(/\s/g, '');
        upiString = `upi://pay?pa=${accountNum}.${ifsc}.ifsc.npci&pn=${payeeName}&cu=INR`;
      }
      
      if (upiString) {
        try {
          const url = await QRCode.toDataURL(upiString, {
            width: 150,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' }
          });
          setQrCodeUrl(url);
        } catch (e) {
          console.error('QR generation failed', e);
        }
      }
      setIsReady(true);
    };

    if (invoice && template && items.length >= 0 && products.length >= 0) {
      generateQR();
    }
  }, [invoice, template, items, products]);

  const handleBack = () => {
    window.history.back();
  };

  const handlePrint = () => {
    window.print();
  };

  // Detect ALL iOS devices for display purposes (all iOS browsers need Share button instructions)
  const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);

  if (isLoadingInvoice) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white', padding: '20px' }}>
        <p style={{ color: '#dc2626', fontSize: '18px', marginBottom: '20px' }}>Failed to load invoice</p>
        <button 
          onClick={() => window.history.back()}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const isIntrastate = invoice.sellerStateCode === invoice.buyerStateCode;
  const amountReceived = invoice.amountReceived || 0;
  const balanceDue = invoice.totalAmount - amountReceived;

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

  const bankName = template?.defaultBankName || invoice.bankName;
  const bankAccountNumber = template?.defaultBankAccountNumber || invoice.bankAccountNumber;
  const bankIfscCode = template?.defaultBankIfscCode || invoice.bankIfscCode;
  const accountHolderName = template?.defaultAccountHolderName || invoice.accountHolderName;
  const upiId = template?.defaultUpiId || invoice.upiId;

  const isCancelled = invoice.recordStatus === 0;
  
  // Get recipient text for copy label
  const getCopyRecipient = (label: string) => {
    if (label === 'ORIGINAL') return 'RECIPIENT';
    if (label === 'DUPLICATE') return 'TRANSPORTER';
    return 'SUPPLIER';
  };

  // Function to render a single invoice copy
  const renderInvoiceCopy = (copyLabel: string) => (
    <div key={copyLabel} className="invoice-copy" style={{ pageBreakAfter: 'always', padding: '15px', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      {isCancelled && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '80px',
          fontWeight: 'bold',
          color: 'rgba(255, 0, 0, 0.15)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          CANCELLED
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>Tax Invoice</h1>
        <div style={{ 
          display: 'inline-block', 
          border: '1px solid #333', 
          padding: '2px 10px',
          marginTop: '5px',
          fontSize: '10px'
        }}>
          {copyLabel} FOR {getCopyRecipient(copyLabel)}
        </div>
      </div>

      {template?.logoUrl && (
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img src={template.logoUrl} alt="Company Logo" style={{ maxWidth: '150px', maxHeight: '60px', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '11px' }}>
        <strong style={{ fontSize: '14px' }}>{invoice.sellerName}</strong><br/>
        {invoice.sellerAddress}<br/>
        Phone: {invoice.sellerPhone} | Email: {invoice.sellerEmail}<br/>
        GSTIN: {invoice.sellerGstin} | State: {invoice.sellerStateCode}-{invoice.sellerState}
      </div>

      <table style={{ marginBottom: '10px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333', padding: '6px', fontSize: '11px' }}>
              <strong>Bill To:</strong><br/>
              {invoice.buyerName}<br/>
              {invoice.buyerAddress}<br/>
              {invoice.buyerContact && <>Contact No: {invoice.buyerContact}<br/></>}
              {invoice.buyerGstin && <>GSTIN: {invoice.buyerGstin}<br/></>}
              {invoice.buyerState && <>State: {invoice.buyerStateCode}-{invoice.buyerState}</>}
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333', padding: '6px', fontSize: '11px' }}>
              <strong>Invoice Details:</strong><br/>
              No: <strong>{invoice.invoiceNumber}</strong><br/>
              Date: {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}<br/>
              {invoice.vehicleNumber && <>Vehicle No: {invoice.vehicleNumber}<br/></>}
              {invoice.placeOfSupply && <>Place Of Supply: {invoice.placeOfSupply}</>}
            </td>
          </tr>
        </tbody>
      </table>

      {(invoice.shipToName || invoice.shipToAddress) && (
        <div style={{ marginBottom: '10px', border: '1px solid #333', padding: '6px', fontSize: '11px' }}>
          <strong>Ship To:</strong><br/>
          {invoice.shipToName && <>{invoice.shipToName}<br/></>}
          {invoice.shipToAddress && <>{invoice.shipToAddress}<br/></>}
          {(invoice.shipToCity || invoice.shipToState || invoice.shipToPincode) && (
            <>{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</>
          )}
        </div>
      )}

      <table style={{ marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>#</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0', textAlign: 'left' }}>Item name</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>HSN/SAC</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Qty</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Unit</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Price/Unit (₹)</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>GST%</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>GST (₹)</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const totalGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
            const gstPercent = ((item.cgstRate || 0) + (item.sgstRate || 0) + (item.igstRate || 0)) / 100;
            return (
              <tr key={item.id}>
                <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', textAlign: 'left' }}>{item.description || getProductName(item.productId)}</td>
                <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{item.hsnCode || item.sacCode || '-'}</td>
                <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{item.quantity}</td>
                <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{getUomName(item.uomId)}</td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(item.unitPrice / 100).toFixed(2)}</td>
                <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{gstPercent.toFixed(1)}%</td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(totalGst / 100).toFixed(2)}</td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(item.totalAmount / 100).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f0f0f0' }}>
            <td colSpan={8} style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>Total</strong></td>
            <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <table style={{ marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>HSN/SAC</th>
            <th rowSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Taxable amount (₹)</th>
            {isIntrastate ? (
              <>
                <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>CGST</th>
                <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>SGST</th>
              </>
            ) : (
              <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>IGST</th>
            )}
            <th rowSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Total Tax (₹)</th>
          </tr>
          <tr>
            {isIntrastate ? (
              <>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Amt (₹)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Amt (₹)</th>
              </>
            ) : (
              <>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px', background: '#f0f0f0' }}>Amt (₹)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {hsnSummary.map((row, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{row.hsn}</td>
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.taxableAmount / 100).toFixed(2)}</td>
              {isIntrastate ? (
                <>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.cgstRate / 100).toFixed(1)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.cgstAmount / 100).toFixed(2)}</td>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.sgstRate / 100).toFixed(1)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.sgstAmount / 100).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.igstRate / 100).toFixed(1)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}>{(row.igstAmount / 100).toFixed(2)}</td>
                </>
              )}
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{(row.totalTax / 100).toFixed(2)}</strong></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f0f0f0' }}>
            <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>TOTAL</strong></td>
            <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency(invoice.subtotal)}</strong></td>
            {isIntrastate ? (
              <>
                <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}></td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency(invoice.cgstAmount || 0)}</strong></td>
                <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}></td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency(invoice.sgstAmount || 0)}</strong></td>
              </>
            ) : (
              <>
                <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}></td>
                <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency(invoice.igstAmount || 0)}</strong></td>
              </>
            )}
            <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '10px' }}><strong>{formatCurrency((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0))}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        <div style={{ width: '55%' }}>
          {termsConditions && termsConditions.terms && termsConditions.terms.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '10px' }}>Terms & Conditions:</strong>
              <ol style={{ margin: '5px 0 0 15px', padding: 0, fontSize: '9px', lineHeight: '1.4' }}>
                {termsConditions.terms.map((term: string, idx: number) => (
                  <li key={idx}>{term}</li>
                ))}
              </ol>
            </div>
          )}
          <div style={{ fontSize: '10px', marginBottom: '5px' }}>
            <strong>Invoice Amount in words:</strong> {amountToWords(invoice.totalAmount / 100)} Rupees Only
          </div>
          {invoice.remarks && (
            <div style={{ fontSize: '9px', color: '#666' }}>
              <strong>Remarks:</strong> {invoice.remarks}
            </div>
          )}
        </div>
        <div style={{ width: '45%', textAlign: 'right' }}>
          <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', border: '1px solid #333' }}>
            <tbody>
              <tr>
                <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>Sub Total:</td>
                <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(invoice.subtotal)}</td>
              </tr>
              {((invoice.cgstAmount || 0) > 0 || (invoice.sgstAmount || 0) > 0) && (
                <>
                  <tr>
                    <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>CGST:</td>
                    <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(invoice.cgstAmount || 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>SGST:</td>
                    <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(invoice.sgstAmount || 0)}</td>
                  </tr>
                </>
              )}
              {(invoice.igstAmount || 0) > 0 && (
                <tr>
                  <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>IGST:</td>
                  <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(invoice.igstAmount || 0)}</td>
                </tr>
              )}
              {(invoice.transportCharges || 0) > 0 && (
                <tr>
                  <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>Transport Charges:</td>
                  <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(invoice.transportCharges || 0)}</td>
                </tr>
              )}
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}><strong>Total:</strong></td>
                <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
              </tr>
              {amountReceived > 0 && (
                <>
                  <tr>
                    <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>Amount Received:</td>
                    <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}>{formatCurrency(amountReceived)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}><strong>Balance Due:</strong></td>
                    <td style={{ textAlign: 'right', fontSize: '10px', padding: '2px 6px', border: '1px solid #333' }}><strong>{formatCurrency(balanceDue)}</strong></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <div style={{ width: '35%' }}>
          {(bankName || upiId) && (
            <div style={{ fontSize: '10px' }}>
              <strong>Bank Details:</strong><br/>
              {bankName && <>Bank: <strong>{bankName}</strong><br/></>}
              {bankAccountNumber && <>A/C No: {bankAccountNumber}<br/></>}
              {bankIfscCode && <>IFSC: {bankIfscCode}<br/></>}
              {accountHolderName && <>A/C Holder: {accountHolderName}<br/></>}
              {upiId && <>UPI: {upiId}</>}
            </div>
          )}
          {qrCodeUrl && (
            <div style={{ marginTop: '10px' }}>
              <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '100px', border: '1px solid #ddd' }} />
              <div style={{ fontSize: '9px' }}>Scan to Pay</div>
            </div>
          )}
        </div>
        <div style={{ width: '30%', textAlign: 'right' }}>
          <div style={{ fontSize: '9px', marginBottom: '5px' }}>For {invoice.sellerName || 'Company'}:</div>
          {(() => {
            const signatureType = (invoice as any).signatureType || 'default';
            const showSignature = (invoice as any).includeSignature === 1 || (invoice as any).includeSignature === undefined;
            
            if (!showSignature) {
              return <div style={{ height: '40px' }}></div>;
            }
            
            if (signatureType === 'alternate' && template?.alternateSignatureImage) {
              return <img src={template.alternateSignatureImage} alt="Signature" style={{ maxHeight: '50px', objectFit: 'contain' }} />;
            } else if (template?.defaultSignatureImage) {
              return <img src={template.defaultSignatureImage} alt="Signature" style={{ maxHeight: '50px', objectFit: 'contain' }} />;
            }
            return <div style={{ height: '40px' }}></div>;
          })()}
          <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '5px', fontSize: '10px' }}>
            {(() => {
              const signatureType = (invoice as any).signatureType || 'default';
              if (signatureType === 'alternate') {
                return template?.alternateSignatoryName || template?.authorizedSignatoryName || 'Authorized Signatory';
              }
              return template?.authorizedSignatoryName || 'Authorized Signatory';
            })()}
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div style={{ marginTop: '10px', padding: '8px', background: '#f9f9f9', border: '1px solid #ddd', fontSize: '9px' }}>
        <strong>Declaration:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          .print-header { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .invoice-copy { page-break-after: always; }
          .invoice-copy:last-child { page-break-after: auto; }
          /* Force borders to print */
          table { border-collapse: collapse !important; }
          table, th, td { border: 1px solid #000 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media screen {
          body { background: #f5f5f5; }
        }
        .print-content {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
        }
        .print-content table { border-collapse: collapse; }
        .print-content table, .print-content th, .print-content td { border: 1px solid #333; }
        @media screen {
          .print-content {
            margin-top: 70px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>
      
      <div className="print-header" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#1f2937',
        zIndex: 1000000,
        gap: '8px'
      }}>
        <button 
          onClick={handleBack}
          style={{
            padding: '12px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ← Back
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
            style={{
              padding: '12px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Print / Save PDF
          </button>
        )}
      </div>

      <div className="print-content">
        {renderInvoiceCopy('ORIGINAL FOR RECIPIENT')}
        {renderInvoiceCopy('DUPLICATE FOR TRANSPORTER')}
        {renderInvoiceCopy('TRIPLICATE FOR SUPPLIER')}
      </div>
    </>
  );
}
