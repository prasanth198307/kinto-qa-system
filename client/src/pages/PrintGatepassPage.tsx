import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { type Gatepass, type GatepassItem, type Product, type Vendor, type FinishedGood, type Invoice } from "@shared/schema";
import { Loader2, ArrowLeft, Printer } from "lucide-react";

export default function PrintGatepassPage() {
  const params = useParams<{ id: string }>();
  const gatepassId = params.id;

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

  const { data: items = [] } = useQuery<GatepassItem[]>({
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

  const { data: invoice } = useQuery<Invoice>({
    queryKey: ['/api/invoices', gatepass?.invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${gatepass?.invoiceId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!gatepass?.invoiceId,
  });

  if (isLoadingGatepass) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" style={{ width: '48px', height: '48px', color: '#3b82f6' }} />
      </div>
    );
  }

  if (gatepassError || !gatepass) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'white', padding: '20px' }}>
        <p style={{ color: '#dc2626', fontSize: '18px', marginBottom: '20px' }}>Failed to load gatepass</p>
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

  const getProductName = (item: GatepassItem): string => {
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

  const formattedDate = format(new Date(gatepass.gatepassDate), 'dd/MM/yyyy');

  const handleBack = () => {
    window.history.back();
  };

  const handlePrint = () => {
    window.print();
  };

  const generateGatepassCopy = (copyType: string, copyFor: string) => (
    <div className="gp-page" style={{ pageBreakAfter: 'always', padding: '10mm', fontFamily: 'Arial, sans-serif' }}>
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
              <tr><td style={{ padding: '3px 0', color: '#666', width: '80px' }}>Date:</td><td>{formattedDate}</td></tr>
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

      {(invoice?.shipToName || invoice?.shipToAddress) && (
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#666', marginBottom: '5px' }}>Ship To</div>
          {invoice.shipToName && <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{invoice.shipToName}</div>}
          {invoice.shipToAddress && <div style={{ fontSize: '11px' }}>{invoice.shipToAddress}</div>}
          {(invoice.shipToCity || invoice.shipToState || invoice.shipToPincode) && (
            <div style={{ fontSize: '11px' }}>{[invoice.shipToCity, invoice.shipToState, invoice.shipToPincode].filter(Boolean).join(', ')}</div>
          )}
        </div>
      )}

      {invoice?.invoiceNumber && (
        <div style={{ marginBottom: '10px', fontSize: '12px' }}>
          Invoice No: <strong>{invoice.invoiceNumber}</strong>
        </div>
      )}

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
          {items.map((item, index) => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: '6px' }}>{getProductName(item)}</td>
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
    </div>
  );

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          #print-controls { display: none !important; }
          body { margin: 0; padding: 0; }
          .gp-page { page-break-after: always; }
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
        <div style={{ maxWidth: '210mm', margin: '0 auto', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {generateGatepassCopy('ORIGINAL', 'Customer Copy')}
          {generateGatepassCopy('DUPLICATE', 'Transporter Copy')}
          {generateGatepassCopy('TRIPLICATE', 'Office Copy')}
        </div>
      </div>
    </div>
  );
}
