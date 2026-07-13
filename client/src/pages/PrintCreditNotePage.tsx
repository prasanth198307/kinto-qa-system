import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import { amountToWords } from "@/lib/number-to-words";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface CreditNote {
  id: string;
  noteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  creditDate: string | Date;
  buyerName: string;
  buyerAddress: string | null;
  buyerGstin: string | null;
  buyerStateCode: string | null;
  sellerName: string | null;
  sellerAddress: string | null;
  sellerGstin: string | null;
  sellerStateCode: string | null;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  reason: string;
  notes: string | null;
}

interface CreditNoteItem {
  id: string;
  creditNoteId: string;
  productName: string;
  description: string | null;
  quantity: number;
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

export default function PrintCreditNotePage() {
  const params = useParams<{ id: string }>();
  const creditNoteId = params.id;
  const tenantConfig = useTenantConfig();

  const { data: creditNote, isLoading, error } = useQuery<CreditNote>({
    queryKey: ['/api/credit-notes', creditNoteId],
    queryFn: async () => {
      const response = await fetch(`/api/credit-notes/${creditNoteId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Credit note not found');
      return response.json();
    },
    enabled: !!creditNoteId,
    retry: false,
  });

  const { data: items = [] } = useQuery<CreditNoteItem[]>({
    queryKey: ['/api/credit-note-items', creditNoteId],
    queryFn: async () => {
      const res = await fetch(`/api/credit-note-items?creditNoteId=${creditNoteId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch credit note items');
      return res.json();
    },
    enabled: !!creditNoteId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" style={{ width: '48px', height: '48px', color: '#3b82f6' }} />
      </div>
    );
  }

  if (error || !creditNote) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white', padding: '20px' }}>
        <p style={{ color: '#dc2626', fontSize: '18px', marginBottom: '20px' }}>Failed to load credit note</p>
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
    return fmtCur(amountInPaise / 100, tenantConfig);
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  const formatQuantity = (qty: number | null | undefined): string => {
    if (qty === null || qty === undefined) return '0';
    return Number(qty).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Inter-state if igstAmount > 0 (authoritative), else fall back to state code comparison
  const isIntrastate = (creditNote.igstAmount || 0) > 0
    ? false
    : (creditNote.sellerStateCode === creditNote.buyerStateCode);
  const formattedDate = format(new Date(creditNote.creditDate), 'dd/MM/yyyy');

  const handleBack = () => {
    window.history.back();
  };

  const handlePrint = () => {
    window.print();
  };

  // Detect ALL iOS devices for display purposes (all iOS browsers need Share button instructions)
  const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);

  // Function to render a single copy
  const renderCreditNoteCopy = (copyLabel: string) => (
    <div key={copyLabel} className="credit-note-copy" style={{ pageBreakAfter: 'always', padding: '15mm', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>CREDIT NOTE</div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '12px' }}>
        <div>
          <strong>Credit Note No:</strong> {creditNote.noteNumber}<br/>
          <strong>Date:</strong> {formattedDate}<br/>
          <strong>Against Invoice:</strong> {creditNote.invoiceNumber}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>FROM</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{creditNote.sellerName || 'MicroGrid'}</div>
          <div style={{ fontSize: '11px' }}>{creditNote.sellerAddress}</div>
          {creditNote.sellerGstin && <div style={{ fontSize: '11px' }}>GSTIN: {creditNote.sellerGstin}</div>}
        </div>
        <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>TO</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{creditNote.buyerName}</div>
          <div style={{ fontSize: '11px' }}>{creditNote.buyerAddress}</div>
          {creditNote.buyerGstin && <div style={{ fontSize: '11px' }}>GSTIN: {creditNote.buyerGstin}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '10px', fontSize: '12px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
        <strong>Reason:</strong> {creditNote.reason}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '30px' }}>#</th>
            <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'left' }}>Description</th>
            <th style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', width: '50px' }}>Qty</th>
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
              <td style={{ border: '1px solid #ddd', padding: '5px' }}>{item.productName}</td>
              <td style={{ border: '1px solid #ddd', padding: '5px', textAlign: 'center' }}>{formatQuantity(item.quantity)}</td>
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
              <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(creditNote.subtotal)}</td>
            </tr>
            {isIntrastate ? (
              <>
                <tr>
                  <td style={{ padding: '4px 0' }}>CGST:</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(creditNote.cgstAmount)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0' }}>SGST:</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(creditNote.sgstAmount)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td style={{ padding: '4px 0' }}>IGST:</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(creditNote.igstAmount)}</td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold', background: '#f5f5f5' }}>
              <td style={{ padding: '6px 0' }}>Grand Total:</td>
              <td style={{ textAlign: 'right', padding: '6px 0' }}>{formatCurrency(creditNote.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '11px', marginBottom: '15px', fontStyle: 'italic' }}>
        Amount in words: <strong>{amountToWords(creditNote.grandTotal)}</strong>
      </div>

      {creditNote.notes && (
        <div style={{ fontSize: '11px', marginBottom: '15px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
          <strong>Notes:</strong> {creditNote.notes}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #333', paddingTop: '5px', marginTop: '40px', minWidth: '150px', fontSize: '11px' }}>
            Authorized Signatory
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #000', fontSize: '10px', color: '#333', textAlign: 'center' }}>
        <div>This is a computer-generated credit note and does not require a physical signature.</div>
        <div style={{ marginTop: '3px' }}>Credit Note #{creditNote.noteNumber} | Date: {formattedDate}</div>
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
          .credit-note-copy { page-break-after: always; page-break-inside: avoid; }
          .credit-note-copy:last-child { page-break-after: auto; }
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
          {renderCreditNoteCopy('ORIGINAL FOR RECIPIENT')}
          {renderCreditNoteCopy('DUPLICATE FOR TRANSPORTER')}
          {renderCreditNoteCopy('TRIPLICATE FOR SUPPLIER')}
        </div>
      </div>
    </div>
  );
}
