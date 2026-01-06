import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import { amountToWords } from "@/lib/number-to-words";

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

export default function PrintDebitNotePage() {
  const params = useParams<{ id: string }>();
  const debitNoteId = params.id;

  const { data: fullNote, isLoading, error } = useQuery<VendorDebitNote & { items: DebitNoteItem[] }>({
    queryKey: ['/api/vendor-debit-notes', debitNoteId],
    queryFn: async () => {
      const response = await fetch(`/api/vendor-debit-notes/${debitNoteId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Debit note not found');
      return response.json();
    },
    enabled: !!debitNoteId,
    retry: false,
  });

  const { data: vendor } = useQuery<any>({
    queryKey: ['/api/vendors', fullNote?.vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/vendors/${fullNote?.vendorId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!fullNote?.vendorId,
  });

  const { data: template } = useQuery<any>({
    queryKey: ['/api/invoice-templates/default'],
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" style={{ width: '48px', height: '48px', color: '#3b82f6' }} />
      </div>
    );
  }

  if (error || !fullNote) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white', padding: '20px' }}>
        <p style={{ color: '#dc2626', fontSize: '18px', marginBottom: '20px' }}>Failed to load debit note</p>
        <button 
          onClick={() => window.history.back()}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  const items = fullNote.items || [];
  const isIntrastate = !fullNote.igstAmount || fullNote.igstAmount === 0;
  const formattedDate = format(new Date(fullNote.debitDate), 'dd/MM/yyyy');

  const companyName = template?.defaultSellerName || 'Inmoisture Private Limited';
  const companyAddress = template?.defaultSellerAddress || 'Guntur, Andhra Pradesh';
  const companyGstin = template?.defaultSellerGstin || '37AAHCI5047B1ZR';
  const companyPhone = template?.defaultSellerPhone || '';
  const companyEmail = template?.defaultSellerEmail || '';

  const vendorName = vendor?.vendorName || fullNote.vendorName;
  const vendorAddress = vendor?.address || '';
  const vendorCity = vendor?.city || '';
  const vendorState = vendor?.state || '';
  const vendorPincode = vendor?.pincode || '';
  const vendorGst = vendor?.gstNumber || fullNote.vendorGst || '';

  const handleBack = () => {
    window.history.back();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #print-controls { display: none !important; }
          body { margin: 0; padding: 0; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
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
        <button
          onClick={handlePrint}
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
      </div>
      
      <div style={{ paddingTop: '70px', background: '#f3f4f6', minHeight: '100vh' }}>
        <div style={{ maxWidth: '210mm', margin: '0 auto', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '15mm', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{companyName}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{companyAddress}</div>
            {companyGstin && <div style={{ fontSize: '11px' }}>GSTIN: {companyGstin}</div>}
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px', padding: '5px', background: '#f5f5f5' }}>DEBIT NOTE</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '12px' }}>
            <div>
              <strong>Debit Note No:</strong> {fullNote.noteNumber}<br/>
              <strong>Date:</strong> {formattedDate}<br/>
              <strong>Reason:</strong> {REASON_LABELS[fullNote.reason] || fullNote.reason}
            </div>
            <div>
              <strong>Status:</strong> {fullNote.status.charAt(0).toUpperCase() + fullNote.status.slice(1)}
            </div>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>VENDOR</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{vendorName}</div>
            {vendorAddress && <div style={{ fontSize: '11px' }}>{vendorAddress}</div>}
            {(vendorCity || vendorState || vendorPincode) && (
              <div style={{ fontSize: '11px' }}>{[vendorCity, vendorState, vendorPincode].filter(Boolean).join(', ')}</div>
            )}
            {vendorGst && <div style={{ fontSize: '11px' }}>GSTIN: {vendorGst}</div>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '30px' }}>#</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Description</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '60px' }}>HSN</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '50px' }}>Qty</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '50px' }}>Unit</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', width: '80px' }}>Rate</th>
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', width: '80px' }}>Taxable</th>
                {isIntrastate ? (
                  <>
                    <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '60px' }}>CGST</th>
                    <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '60px' }}>SGST</th>
                  </>
                ) : (
                  <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '60px' }}>IGST</th>
                )}
                <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', width: '80px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px' }}>{item.description}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{item.hsnCode || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'right' }}>{formatCurrency(item.taxableValue)}</td>
                  {isIntrastate ? (
                    <>
                      <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{formatRate(item.cgstRate)}</td>
                      <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{formatRate(item.sgstRate)}</td>
                    </>
                  ) : (
                    <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{formatRate(item.igstRate)}</td>
                  )}
                  <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'right' }}>{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
            <table style={{ width: '250px', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0' }}>Subtotal:</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.subtotal)}</td>
                </tr>
                {isIntrastate ? (
                  <>
                    <tr>
                      <td style={{ padding: '4px 0' }}>CGST:</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0' }}>SGST:</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.sgstAmount)}</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td style={{ padding: '4px 0' }}>IGST:</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.igstAmount)}</td>
                  </tr>
                )}
                <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
                  <td style={{ padding: '6px 0' }}>Grand Total:</td>
                  <td style={{ textAlign: 'right', padding: '6px 0' }}>{formatCurrency(fullNote.grandTotal)}</td>
                </tr>
                {fullNote.settledAmount > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '4px 0' }}>Settled:</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.settledAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0' }}>Outstanding:</td>
                      <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(fullNote.grandTotal - fullNote.settledAmount)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '11px', marginBottom: '15px', fontStyle: 'italic' }}>
            Amount in words: <strong>{amountToWords(fullNote.grandTotal)}</strong>
          </div>

          {fullNote.notes && (
            <div style={{ fontSize: '11px', marginBottom: '15px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
              <strong>Notes:</strong> {fullNote.notes}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px', minWidth: '150px', fontSize: '11px' }}>
                Vendor Acknowledgment
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px', minWidth: '150px', fontSize: '11px' }}>
                For {companyName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
