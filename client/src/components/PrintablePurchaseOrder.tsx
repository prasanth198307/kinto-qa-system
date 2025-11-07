import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type PurchaseOrder, type SparePartCatalog, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface PrintablePurchaseOrderProps {
  po: PurchaseOrder;
}

export default function PrintablePurchaseOrder({ po }: PrintablePurchaseOrderProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const sparePart = spareParts.find(sp => sp.id === po.sparePartId);

  const getUsername = (userId: string | null | undefined): string => {
    if (!userId) return '-';
    const user = users.find(u => u.id === userId);
    return user?.username || '-';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order - ${po.poNumber}</title>
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

            .document-title {
              font-size: 16px;
              font-weight: bold;
              margin: 10px 0;
            }

            .po-number {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }

            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin: 20px 0 10px 0;
              padding: 5px;
              background: #f0f0f0;
              border-left: 4px solid #000;
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
              min-width: 150px;
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
              padding: 10px;
              text-align: left;
            }

            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
            }

            .items-table td.number {
              text-align: right;
            }

            .items-table td.center {
              text-align: center;
            }

            .total-section {
              margin: 20px 0;
              padding: 10px;
              background: #f9f9f9;
              border: 2px solid #000;
              text-align: right;
            }

            .total-row {
              display: flex;
              justify-content: flex-end;
              padding: 5px 0;
            }

            .total-label {
              font-weight: bold;
              min-width: 200px;
            }

            .total-value {
              min-width: 150px;
              text-align: right;
            }

            .terms-section {
              margin: 20px 0;
              padding: 10px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }

            .terms-title {
              font-weight: bold;
              margin-bottom: 10px;
            }

            .terms-list {
              list-style-position: inside;
              padding-left: 10px;
            }

            .terms-list li {
              margin: 5px 0;
            }

            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }

            .signature-box {
              width: 30%;
              text-align: center;
            }

            .signature-line {
              border-top: 1px solid #000;
              margin-top: 50px;
              padding-top: 5px;
            }

            .signature-label {
              font-weight: bold;
              margin-top: 5px;
            }

            .footer-note {
              margin-top: 30px;
              font-size: 10px;
              text-align: center;
              color: #666;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }

              .page {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formattedExpectedDelivery = po.expectedDeliveryDate
    ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '-';

  const estimatedCostAmount = po.estimatedCost ? (po.estimatedCost / 100).toFixed(2) : '0.00';
  const totalAmount = po.quantity && po.estimatedCost 
    ? ((po.quantity * po.estimatedCost) / 100).toFixed(2)
    : '0.00';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-po-${po.id}`}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>

      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page">
          <div className="header">
            <div className="company-name">KINTO MANUFACTURING</div>
            <div className="document-title">PURCHASE ORDER</div>
            <div className="po-number">PO Number: {po.poNumber}</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>Date: {formattedDate}</div>
          </div>

          <div className="section-title">Supplier Details</div>
          <div className="details-grid">
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">Supplier Name:</span>
              <span className="detail-value">{po.supplier || 'To Be Determined'}</span>
            </div>
          </div>

          <div className="section-title">Order Details</div>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {po.status || 'Pending'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Urgency:</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {po.urgency}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Expected Delivery:</span>
              <span className="detail-value">{formattedExpectedDelivery}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Requested By:</span>
              <span className="detail-value">{getUsername(po.requestedBy)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Approved By:</span>
              <span className="detail-value">{getUsername(po.approvedBy)}</span>
            </div>
          </div>

          <div className="section-title">Items</div>
          <table className="items-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Part Name</th>
                <th>Part Number</th>
                <th>Category</th>
                <th className="number">Quantity</th>
                <th className="number">Unit Price (₹)</th>
                <th className="number">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">1</td>
                <td>{sparePart?.partName || 'Unknown Part'}</td>
                <td>{sparePart?.partNumber || '-'}</td>
                <td>{sparePart?.category || '-'}</td>
                <td className="number">{po.quantity}</td>
                <td className="number">{estimatedCostAmount}</td>
                <td className="number"><strong>{totalAmount}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="total-section">
            <div className="total-row">
              <div className="total-label">Total Amount:</div>
              <div className="total-value" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                ₹ {totalAmount}
              </div>
            </div>
          </div>

          {po.remarks && (
            <>
              <div className="section-title">Remarks</div>
              <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #ddd' }}>
                {po.remarks}
              </div>
            </>
          )}

          <div className="terms-section">
            <div className="terms-title">Terms & Conditions:</div>
            <ol className="terms-list">
              <li>Payment terms: As per agreed terms with supplier</li>
              <li>Delivery should be made to KINTO Manufacturing facility</li>
              <li>All items must be inspected upon delivery</li>
              <li>Supplier must provide warranty/guarantee as applicable</li>
              <li>Any discrepancies must be reported within 7 days of delivery</li>
              <li>Late delivery penalties may apply as per contract</li>
            </ol>
          </div>

          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Prepared By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Approved By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Authorized Signatory</div>
            </div>
          </div>

          <div className="footer-note">
            This is a computer-generated purchase order document. No signature is required.
          </div>
        </div>
      </div>
    </>
  );
}
