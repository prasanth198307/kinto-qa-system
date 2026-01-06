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
  const invoiceId = params.id ? parseInt(params.id) : null;
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<PrintInvoice>({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!invoiceId,
  });

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', invoiceId],
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

  if (isLoadingInvoice || !invoice) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading invoice...</p>
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

  return (
    <>
      <style>{`
        @media print {
          .print-header { display: none !important; }
          body { margin: 0; padding: 0; }
        }
        @media screen {
          body { background: #f5f5f5; }
        }
        .print-content {
          font-family: Arial, sans-serif;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 15px;
        }
        @media screen {
          .print-content {
            margin-top: 70px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 4px 6px; font-size: 11px; }
        th { background: #f0f0f0; text-align: left; }
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
      </div>

      <div className="print-content">
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '18px' }}>Tax Invoice</h1>
          <div style={{ 
            display: 'inline-block', 
            border: '1px solid #333', 
            padding: '2px 10px',
            marginTop: '5px',
            fontSize: '10px'
          }}>
            ORIGINAL FOR RECIPIENT
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

        <table style={{ marginBottom: '15px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <strong>Bill To:</strong><br/>
                {invoice.buyerName}<br/>
                {invoice.buyerAddress}<br/>
                GSTIN: {invoice.buyerGstin}<br/>
                State: {invoice.buyerStateCode}-{invoice.buyerState}
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <strong>Invoice Details:</strong><br/>
                No: {invoice.invoiceNumber}<br/>
                Date: {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}<br/>
                {invoice.vehicleNumber && <>Vehicle: {invoice.vehicleNumber}<br/></>}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginBottom: '15px' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Price/Unit (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{getProductName(item.productId)}</td>
                <td>{item.hsnCode || item.sacCode || 'N/A'}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td>{getUomName(item.uomId)}</td>
                <td style={{ textAlign: 'right' }}>{(item.unitPrice / 100).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{(item.taxableAmount / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ marginBottom: '15px' }}>
          <thead>
            <tr>
              <th rowSpan={2}>Taxable amount (₹)</th>
              {isIntrastate ? (
                <>
                  <th colSpan={2}>CGST</th>
                  <th colSpan={2}>SGST</th>
                </>
              ) : (
                <th colSpan={2}>IGST</th>
              )}
              <th rowSpan={2}>Total Tax (₹)</th>
            </tr>
            <tr>
              {isIntrastate ? (
                <>
                  <th>Rate (%)</th>
                  <th>Amt (₹)</th>
                  <th>Rate (%)</th>
                  <th>Amt (₹)</th>
                </>
              ) : (
                <>
                  <th>Rate (%)</th>
                  <th>Amt (₹)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {hsnSummary.map((row, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'right' }}>{formatCurrency(row.taxableAmount)}</td>
                {isIntrastate ? (
                  <>
                    <td style={{ textAlign: 'center' }}>{formatRate(row.cgstRate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.cgstAmount)}</td>
                    <td style={{ textAlign: 'center' }}>{formatRate(row.sgstRate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.sgstAmount)}</td>
                  </>
                ) : (
                  <>
                    <td style={{ textAlign: 'center' }}>{formatRate(row.igstRate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.igstAmount)}</td>
                  </>
                )}
                <td style={{ textAlign: 'right' }}>{formatCurrency(row.totalTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ width: '60%' }}>
            {termsConditions && (
              <div style={{ fontSize: '10px' }}>
                <strong>Terms & Conditions:</strong>
                <ol style={{ margin: '5px 0', paddingLeft: '15px' }}>
                  {termsConditions.terms?.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <div style={{ width: '35%', textAlign: 'right' }}>
            <table style={{ marginLeft: 'auto' }}>
              <tbody>
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td><strong>Total Tax:</strong></td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0))}</td>
                </tr>
                <tr style={{ background: '#f0f0f0' }}>
                  <td><strong>Grand Total:</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{formatCurrency(invoice.totalAmount)}</strong></td>
                </tr>
                {amountReceived > 0 && (
                  <>
                    <tr>
                      <td>Amount Received:</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(amountReceived)}</td>
                    </tr>
                    <tr>
                      <td><strong>Balance Due:</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>{formatCurrency(balanceDue)}</strong></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          <strong>Invoice Amount in words:</strong> {amountToWords(invoice.totalAmount / 100)} Rupees Only
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
    </>
  );
}
