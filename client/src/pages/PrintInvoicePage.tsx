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
  buyerGstin: string | null;
  buyerState: string | null;
  buyerStateCode: string | null;
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

  // Function to render a single invoice copy
  const renderInvoiceCopy = (copyLabel: string) => (
    <div key={copyLabel} className="invoice-copy" style={{ pageBreakAfter: 'always', padding: '15px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>Tax Invoice</h1>
        <div style={{ 
          display: 'inline-block', 
          border: '1px solid #333', 
          padding: '2px 10px',
          marginTop: '5px',
          fontSize: '10px'
        }}>
          {copyLabel}
        </div>
      </div>

      {template?.defaultLogoImage && (
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img src={template.defaultLogoImage} alt="Logo" style={{ maxHeight: '60px' }} />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '11px' }}>
        <strong style={{ fontSize: '14px' }}>{invoice.sellerName}</strong><br/>
        {invoice.sellerAddress}<br/>
        Phone: {invoice.sellerPhone} | Email: {invoice.sellerEmail}<br/>
        GSTIN: {invoice.sellerGstin} | State: {invoice.sellerStateCode}-{invoice.sellerState}
      </div>

      <table style={{ marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333', padding: '6px', fontSize: '11px' }}>
              <strong>Bill To:</strong><br/>
              {invoice.buyerName}<br/>
              {invoice.buyerAddress}<br/>
              GSTIN: {invoice.buyerGstin}<br/>
              State: {invoice.buyerStateCode}-{invoice.buyerState}
            </td>
            <td style={{ width: '50%', verticalAlign: 'top', border: '1px solid #333', padding: '6px', fontSize: '11px' }}>
              <strong>Invoice Details:</strong><br/>
              No: {invoice.invoiceNumber}<br/>
              Date: {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}<br/>
              {invoice.vehicleNumber && <>Vehicle: {invoice.vehicleNumber}<br/></>}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>#</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Product</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>HSN/SAC</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Qty</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Unit</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Price/Unit (₹)</th>
            <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id}>
              <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{getProductName(item.productId)}</td>
              <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{item.hsnCode || item.sacCode || 'N/A'}</td>
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{getUomName(item.uomId)}</td>
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(item.unitPrice / 100).toFixed(2)}</td>
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(item.taxableAmount / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ marginBottom: '15px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Taxable amount (₹)</th>
            {isIntrastate ? (
              <>
                <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>CGST</th>
                <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>SGST</th>
              </>
            ) : (
              <th colSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>IGST</th>
            )}
            <th rowSpan={2} style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Total Tax (₹)</th>
          </tr>
          <tr>
            {isIntrastate ? (
              <>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Amt (₹)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Amt (₹)</th>
              </>
            ) : (
              <>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Rate (%)</th>
                <th style={{ border: '1px solid #333', padding: '4px 6px', fontSize: '11px', background: '#f0f0f0' }}>Amt (₹)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {hsnSummary.map((row, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(row.taxableAmount / 100).toFixed(2)}</td>
              {isIntrastate ? (
                <>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{formatRate(row.cgstRate)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(row.cgstAmount / 100).toFixed(2)}</td>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{formatRate(row.sgstRate)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(row.sgstAmount / 100).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td style={{ textAlign: 'center', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{formatRate(row.igstRate)}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(row.igstAmount / 100).toFixed(2)}</td>
                </>
              )}
              <td style={{ textAlign: 'right', border: '1px solid #333', padding: '4px 6px', fontSize: '11px' }}>{(row.totalTax / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        <div style={{ width: '65%' }}>
          <div style={{ fontSize: '11px', marginBottom: '5px' }}>
            <strong>Invoice Amount in words:</strong> {amountToWords(invoice.totalAmount / 100)} Rupees Only
          </div>
          {invoice.remarks && (
            <div style={{ fontSize: '10px', color: '#666' }}>
              <strong>Remarks:</strong> {invoice.remarks}
            </div>
          )}
        </div>
        <div style={{ width: '35%', textAlign: 'right' }}>
          <table style={{ marginLeft: 'auto', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ fontSize: '11px', padding: '2px 6px' }}><strong>Subtotal:</strong></td>
                <td style={{ textAlign: 'right', fontSize: '11px', padding: '2px 6px' }}>{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td style={{ fontSize: '11px', padding: '2px 6px' }}><strong>Total Tax:</strong></td>
                <td style={{ textAlign: 'right', fontSize: '11px', padding: '2px 6px' }}>{formatCurrency((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0))}</td>
              </tr>
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ fontSize: '11px', padding: '2px 6px' }}><strong>Grand Total:</strong></td>
                <td style={{ textAlign: 'right', fontSize: '11px', padding: '2px 6px' }}><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
              </tr>
              {amountReceived > 0 && (
                <>
                  <tr>
                    <td style={{ fontSize: '11px', padding: '2px 6px' }}>Amount Received:</td>
                    <td style={{ textAlign: 'right', fontSize: '11px', padding: '2px 6px' }}>{formatCurrency(amountReceived)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: '11px', padding: '2px 6px' }}><strong>Balance Due:</strong></td>
                    <td style={{ textAlign: 'right', fontSize: '11px', padding: '2px 6px' }}><strong>{formatCurrency(balanceDue)}</strong></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <div style={{ width: '30%' }}>
          {bankName && (
            <div style={{ fontSize: '10px' }}>
              <strong>Bank Details:</strong><br/>
              Bank: {bankName}<br/>
              A/C: {bankAccountNumber}<br/>
              IFSC: {bankIfscCode}
            </div>
          )}
          {qrCodeUrl && (
            <div style={{ marginTop: '10px' }}>
              <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '100px' }} />
              <div style={{ fontSize: '9px' }}>Scan to Pay</div>
            </div>
          )}
        </div>
        <div style={{ width: '30%', textAlign: 'right' }}>
          {template?.defaultSignatureImage && (
            <div>
              <img src={template.defaultSignatureImage} alt="Signature" style={{ maxHeight: '50px' }} />
              <div style={{ borderTop: '1px solid #333', marginTop: '5px', paddingTop: '5px', fontSize: '10px' }}>
                Authorized Signatory
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          .print-header { display: none !important; }
          body { margin: 0; padding: 0; }
          .invoice-copy { page-break-after: always; }
          .invoice-copy:last-child { page-break-after: auto; }
        }
        @media screen {
          body { background: #f5f5f5; }
        }
        .print-content {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
        }
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
            fontSize: '12px', 
            textAlign: 'center', 
            flex: 1, 
            lineHeight: 1.4 
          }}>
            <div style={{ fontWeight: 600 }}>To Save PDF:</div>
            <div>Menu (⋮) → Share → Print → Pinch to zoom preview</div>
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
