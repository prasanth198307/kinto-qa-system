import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Gatepass, type GatepassItem, type Product, type Vendor, type FinishedGood } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintableGatepassProps {
  gatepass: Gatepass;
}

export default function PrintableGatepass({ gatepass }: PrintableGatepassProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<GatepassItem[]>({
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

  const vendor = vendors.find(v => v.id === gatepass.vendorId);

  const getProductName = (item: GatepassItem): string => {
    // First try to get product through finished good
    const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
    const product = fg 
      ? products.find(p => p.id === fg.productId) 
      : products.find(p => p.id === item.productId);
    
    return product?.productName || item.productId || 'Unknown Product';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Gatepass - ${gatepass.gatepassNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }

            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 15mm;
              margin: 0 auto;
              background: white;
              page-break-after: always;
            }

            .page:last-child {
              page-break-after: auto;
            }

            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }

            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .copy-type {
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
              padding: 5px;
              background: #f0f0f0;
              border: 1px solid #000;
            }

            .gatepass-number {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }

            .details-section {
              margin: 20px 0;
            }

            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 20px;
            }

            .detail-item {
              display: flex;
              padding: 5px 0;
              border-bottom: 1px solid #ddd;
            }

            .detail-label {
              font-weight: bold;
              width: 140px;
              flex-shrink: 0;
            }

            .detail-value {
              flex: 1;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }

            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
            }

            .items-table td {
              vertical-align: top;
            }

            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
            }

            .signature-box {
              text-align: center;
              padding-top: 40px;
              border-top: 1px solid #000;
            }

            .signature-label {
              font-weight: bold;
              margin-top: 5px;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }

              .page {
                margin: 0;
                border: none;
                width: 100%;
                min-height: 100vh;
              }

              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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

  const renderGatepassCopy = (copyType: string) => {
    const formattedDate = new Date(gatepass.gatepassDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return (
      <div className="page" key={copyType}>
        <div className="header">
          <div className="company-name">KINTO MANUFACTURING</div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>Gate Pass for Finished Goods Dispatch</div>
          <div className="copy-type">{copyType}</div>
          <div className="gatepass-number">Gate Pass No: {gatepass.gatepassNumber}</div>
        </div>

        <div className="details-section">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{formattedDate}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Vehicle No:</span>
              <span className="detail-value">{gatepass.vehicleNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Driver Name:</span>
              <span className="detail-value">{gatepass.driverName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Driver Contact:</span>
              <span className="detail-value">{gatepass.driverContact || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Transporter:</span>
              <span className="detail-value">{gatepass.transporterName || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Destination:</span>
              <span className="detail-value">{gatepass.destination || '-'}</span>
            </div>
          </div>

          {vendor ? (
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f9f9f9', border: '1px solid #ddd' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Customer/Vendor Details:</div>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{vendor.vendorName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mobile:</span>
                  <span className="detail-value">{vendor.mobileNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">GST No:</span>
                  <span className="detail-value">{vendor.gstNumber || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{vendor.address || '-'}</span>
                </div>
              </div>
            </div>
          ) : (
            gatepass.customerName && (
              <div style={{ marginBottom: '20px' }}>
                <div className="detail-item">
                  <span className="detail-label">Customer:</span>
                  <span className="detail-value">{gatepass.customerName}</span>
                </div>
              </div>
            )
          )}

          {gatepass.invoiceNumber && (
            <div className="detail-item">
              <span className="detail-label">Invoice No:</span>
              <span className="detail-value">{gatepass.invoiceNumber}</span>
            </div>
          )}
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Sr. No.</th>
              <th>Product Name</th>
              <th style={{ width: '100px' }}>Quantity</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>{getProductName(item)}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantityDispatched}</td>
                  <td>{item.remarks || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {gatepass.remarks && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Remarks:</div>
            <div style={{ padding: '8px', border: '1px solid #ddd', background: '#f9f9f9' }}>
              {gatepass.remarks}
            </div>
          </div>
        )}

        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-label">Prepared By</div>
          </div>
          <div className="signature-box">
            <div className="signature-label">Checked By</div>
          </div>
          <div className="signature-box">
            <div className="signature-label">Authorized Signatory</div>
          </div>
        </div>

        <div style={{ marginTop: '30px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
          This is a computer-generated gate pass. Please verify all details before accepting goods.
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-gatepass-${gatepass.id}`}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>

      <div ref={printRef} style={{ display: 'none' }}>
        {renderGatepassCopy('ORIGINAL')}
        {renderGatepassCopy('DUPLICATE')}
        {renderGatepassCopy('TRIPLICATE')}
      </div>
    </>
  );
}
