import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type PurchaseOrder, type SparePartCatalog, type User, type Vendor } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import inmoistureLogo from "@assets/inmoisture-logo.png";

interface PrintablePurchaseOrderProps {
  po: PurchaseOrder;
}

const COMPANY_DETAILS = {
  name: "INMOISTURE PRIVATE LIMITED",
  gstin: "37AAHCI5047B1ZR",
  address: "356-2, Chintalapalem, Kothavalasa",
  city: "Andhra Pradesh - 535183",
  stateCode: "37",
  phone: "",
  email: ""
};

export default function PrintablePurchaseOrder({ po }: PrintablePurchaseOrderProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: spareParts = [] } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const sparePart = spareParts.find(sp => sp.id === po.sparePartId);
  const vendor = vendors.find(v => v.id === po.vendorId);

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
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 15px;
            }

            .logo {
              width: 80px;
              height: auto;
            }

            .company-info {
              text-align: left;
            }

            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }

            .company-details {
              font-size: 11px;
              color: #333;
            }

            .company-details div {
              margin: 2px 0;
            }

            .gstin {
              font-weight: bold;
            }

            .header-right {
              text-align: right;
            }

            .document-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }

            .po-number {
              font-size: 14px;
              font-weight: bold;
              margin: 5px 0;
            }

            .po-date {
              font-size: 12px;
              color: #555;
            }

            .vendor-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 20px 0;
            }

            .vendor-box, .delivery-box {
              border: 1px solid #ddd;
              padding: 12px;
              border-radius: 4px;
            }

            .section-label {
              font-size: 10px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 8px;
              border-bottom: 1px solid #eee;
              padding-bottom: 4px;
            }

            .vendor-name {
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
            }

            .vendor-details {
              font-size: 11px;
              line-height: 1.5;
            }

            .section-title {
              font-size: 13px;
              font-weight: bold;
              margin: 20px 0 10px 0;
              padding: 6px 10px;
              background: #f5f5f5;
              border-left: 4px solid #333;
            }

            .order-info {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }

            .info-item {
              padding: 8px;
              background: #fafafa;
              border-radius: 4px;
            }

            .info-label {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
            }

            .info-value {
              font-size: 12px;
              font-weight: bold;
              margin-top: 3px;
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
              font-size: 11px;
              text-transform: uppercase;
            }

            .items-table td.number {
              text-align: right;
            }

            .items-table td.center {
              text-align: center;
            }

            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin: 20px 0;
            }

            .totals-box {
              width: 300px;
              border: 2px solid #333;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              border-bottom: 1px solid #ddd;
            }

            .total-row:last-child {
              border-bottom: none;
              background: #f5f5f5;
              font-weight: bold;
              font-size: 14px;
            }

            .total-row.sub-total {
              background: #fafafa;
            }

            .terms-section {
              margin: 25px 0;
              padding: 15px;
              background: #fafafa;
              border: 1px solid #ddd;
              border-radius: 4px;
            }

            .terms-title {
              font-weight: bold;
              margin-bottom: 10px;
              font-size: 12px;
            }

            .terms-content {
              font-size: 11px;
              white-space: pre-line;
              line-height: 1.6;
            }

            .remarks-section {
              margin: 15px 0;
              padding: 10px;
              background: #fff8dc;
              border: 1px solid #ddd;
              border-radius: 4px;
            }

            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }

            .signature-box {
              width: 30%;
              text-align: center;
            }

            .signature-image-area {
              height: 60px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
            }

            .signature-image {
              max-height: 50px;
              max-width: 150px;
            }

            .signature-line {
              border-top: 1px solid #000;
              margin-top: 10px;
              padding-top: 5px;
            }

            .signature-label {
              font-weight: bold;
              font-size: 11px;
              margin-top: 5px;
            }

            .footer-note {
              margin-top: 30px;
              font-size: 10px;
              text-align: center;
              color: #888;
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

  const formattedPODate = po.poDate 
    ? format(new Date(po.poDate), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  const formattedExpectedDelivery = po.expectedDeliveryDate
    ? format(new Date(po.expectedDeliveryDate), 'dd/MM/yyyy')
    : '-';

  // Calculate amounts
  const unitPrice = (po.unitPrice || po.estimatedCost || 0) / 100;
  const quantity = po.quantity || 0;
  const subtotal = po.totalAmount ? po.totalAmount / 100 : unitPrice * quantity;
  const cgstAmount = (po.cgstAmount || 0) / 100;
  const sgstAmount = (po.sgstAmount || 0) / 100;
  const igstAmount = (po.igstAmount || 0) / 100;
  const grandTotal = po.grandTotal ? po.grandTotal / 100 : subtotal + cgstAmount + sgstAmount + igstAmount;
  const gstRate = po.gstRate || 1800;

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
            <div className="header-left">
              <img src={inmoistureLogo} alt="Company Logo" className="logo" />
              <div className="company-info">
                <div className="company-name">{COMPANY_DETAILS.name}</div>
                <div className="company-details">
                  <div>{COMPANY_DETAILS.address}</div>
                  <div>{COMPANY_DETAILS.city}</div>
                  <div className="gstin">GSTIN: {COMPANY_DETAILS.gstin}</div>
                  <div>State Code: {COMPANY_DETAILS.stateCode}</div>
                </div>
              </div>
            </div>
            <div className="header-right">
              <div className="document-title">PURCHASE ORDER</div>
              <div className="po-number">PO No: {po.poNumber}</div>
              <div className="po-date">Date: {formattedPODate}</div>
            </div>
          </div>

          <div className="vendor-section">
            <div className="vendor-box">
              <div className="section-label">Vendor / Supplier Details</div>
              {vendor ? (
                <>
                  <div className="vendor-name">{vendor.vendorName}</div>
                  <div className="vendor-details">
                    {vendor.address && <div>{vendor.address}</div>}
                    {vendor.city && <div>{vendor.city}{vendor.state ? `, ${vendor.state}` : ''}</div>}
                    {vendor.pincode && <div>PIN: {vendor.pincode}</div>}
                    {vendor.gstNumber && <div><strong>GSTIN:</strong> {vendor.gstNumber}</div>}
                    {vendor.mobileNumber && <div><strong>Phone:</strong> {vendor.mobileNumber}</div>}
                    {vendor.email && <div><strong>Email:</strong> {vendor.email}</div>}
                    {vendor.contactPerson && <div><strong>Contact:</strong> {vendor.contactPerson}</div>}
                  </div>
                </>
              ) : (
                <div className="vendor-name">{po.supplier || 'To Be Determined'}</div>
              )}
            </div>
            <div className="delivery-box">
              <div className="section-label">Delivery Address</div>
              <div className="vendor-name">{COMPANY_DETAILS.name}</div>
              <div className="vendor-details">
                {po.deliveryAddress ? (
                  <div style={{ whiteSpace: 'pre-line' }}>{po.deliveryAddress}</div>
                ) : (
                  <>
                    <div>{COMPANY_DETAILS.address}</div>
                    <div>{COMPANY_DETAILS.city}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="order-info">
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value" style={{ textTransform: 'capitalize' }}>{po.status || 'Pending'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Urgency</div>
              <div className="info-value" style={{ textTransform: 'capitalize' }}>{po.urgency || 'Medium'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Expected Delivery</div>
              <div className="info-value">{formattedExpectedDelivery}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Payment Terms</div>
              <div className="info-value">{po.paymentTerms || '30 Days'}</div>
            </div>
          </div>

          <div className="section-title">Order Items</div>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>Sr.</th>
                <th style={{ width: '35%' }}>Item Description</th>
                <th style={{ width: '15%' }}>Part Number</th>
                <th style={{ width: '10%' }} className="center">Qty</th>
                <th style={{ width: '15%' }} className="number">Unit Price (₹)</th>
                <th style={{ width: '20%' }} className="number">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">1</td>
                <td>
                  <strong>{sparePart?.partName || 'Unknown Part'}</strong>
                  {sparePart?.category && <div style={{ fontSize: '10px', color: '#666' }}>Category: {sparePart.category}</div>}
                </td>
                <td>{sparePart?.partNumber || '-'}</td>
                <td className="center">{quantity}</td>
                <td className="number">{unitPrice.toFixed(2)}</td>
                <td className="number"><strong>{subtotal.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="totals-section">
            <div className="totals-box">
              <div className="total-row sub-total">
                <span>Subtotal</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </div>
              {po.gstApplicable === 1 && (
                <>
                  <div className="total-row">
                    <span>CGST ({(gstRate / 200).toFixed(1)}%)</span>
                    <span>₹ {cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>SGST ({(gstRate / 200).toFixed(1)}%)</span>
                    <span>₹ {sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="total-row">
                <span>Grand Total</span>
                <span>₹ {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {po.remarks && (
            <div className="remarks-section">
              <div className="terms-title">Remarks:</div>
              <div style={{ fontSize: '11px' }}>{po.remarks}</div>
            </div>
          )}

          <div className="terms-section">
            <div className="terms-title">Terms & Conditions:</div>
            <div className="terms-content">
              {po.termsAndConditions || `1. All items must be delivered in good condition.
2. Delivery should be made to the specified address.
3. Invoice must be provided along with delivery.
4. Payment will be made as per agreed terms.
5. Any discrepancies must be reported within 7 days of delivery.`}
            </div>
          </div>

          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-image-area"></div>
              <div className="signature-line"></div>
              <div className="signature-label">Prepared By</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{getUsername(po.requestedBy)}</div>
            </div>
            <div className="signature-box">
              <div className="signature-image-area"></div>
              <div className="signature-line"></div>
              <div className="signature-label">Approved By</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{getUsername(po.approvedBy)}</div>
            </div>
            <div className="signature-box">
              <div className="signature-image-area">
                {po.includeSignature === 1 && po.signatureImage && (
                  <img src={po.signatureImage} alt="Authorized Signature" className="signature-image" />
                )}
              </div>
              <div className="signature-line"></div>
              <div className="signature-label">Authorized Signatory</div>
              <div style={{ fontSize: '10px', color: '#666' }}>{COMPANY_DETAILS.name}</div>
            </div>
          </div>

          <div className="footer-note">
            This is a computer-generated purchase order. {po.includeSignature !== 1 && "No signature is required."}
          </div>
        </div>
      </div>
    </>
  );
}
