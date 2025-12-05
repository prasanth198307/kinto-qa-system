import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type PurchaseOrder, type RawMaterial, type User, type Vendor, type PurchaseOrderItem, type Uom } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import kintoLogo from "@assets/kinto-logo.png";

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

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: uomList = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: poItems = [] } = useQuery<PurchaseOrderItem[]>({
    queryKey: ['/api/purchase-order-items', po.id],
    enabled: !!po.id,
  });

  const vendor = vendors.find(v => v.id === po.vendorId);

  const getUsername = (userId: string | null | undefined): string => {
    if (!userId) return '-';
    const user = users.find(u => u.id === userId);
    return user?.username || '-';
  };

  const getRawMaterialName = (rawMaterialId: string | null | undefined): string => {
    if (!rawMaterialId) return '-';
    const rm = rawMaterials.find(r => r.id === rawMaterialId);
    return rm?.materialName || '-';
  };

  const getUomName = (uomId: string | null | undefined): string => {
    if (!uomId) return '-';
    const u = uomList.find(x => x.id === uomId);
    return u?.name || '-';
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

  // Calculate totals from line items
  const hasLineItems = poItems.length > 0;
  
  // Calculate subtotal from all line items (amount = line item before GST)
  const subtotal = hasLineItems 
    ? poItems.reduce((sum, item) => sum + ((item.amount || 0) / 100), 0)
    : (po.totalAmount ? po.totalAmount / 100 : 0);

  // Calculate GST amounts from all line items
  const totalCgst = hasLineItems
    ? poItems.reduce((sum, item) => sum + ((item.cgstAmount || 0) / 100), 0)
    : (po.cgstAmount || 0) / 100;

  const totalSgst = hasLineItems
    ? poItems.reduce((sum, item) => sum + ((item.sgstAmount || 0) / 100), 0)
    : (po.sgstAmount || 0) / 100;

  const totalIgst = hasLineItems
    ? poItems.reduce((sum, item) => sum + ((item.igstAmount || 0) / 100), 0)
    : (po.igstAmount || 0) / 100;

  // Grand total (totalAmount = line item including GST)
  const grandTotal = hasLineItems
    ? poItems.reduce((sum, item) => sum + ((item.totalAmount || 0) / 100), 0)
    : (po.grandTotal ? po.grandTotal / 100 : subtotal + totalCgst + totalSgst + totalIgst);

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
              <img src={kintoLogo} alt="Company Logo" className="logo" />
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
              ) : (po as any).vendorName ? (
                <>
                  <div className="vendor-name">{(po as any).vendorName}</div>
                  <div className="vendor-details">
                    {(po as any).vendorAddress && <div style={{ whiteSpace: 'pre-line' }}>{(po as any).vendorAddress}</div>}
                    {(po as any).vendorGst && <div><strong>GSTIN:</strong> {(po as any).vendorGst}</div>}
                    {(po as any).vendorPhone && <div><strong>Phone:</strong> {(po as any).vendorPhone}</div>}
                    {(po as any).vendorEmail && <div><strong>Email:</strong> {(po as any).vendorEmail}</div>}
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
                <th style={{ width: '25%' }}>Item Description</th>
                <th style={{ width: '12%' }}>HSN Code</th>
                <th style={{ width: '8%' }} className="center">Qty</th>
                <th style={{ width: '8%' }} className="center">Unit</th>
                <th style={{ width: '12%' }} className="number">Rate (₹)</th>
                <th style={{ width: '8%' }} className="center">GST%</th>
                <th style={{ width: '12%' }} className="number">Tax (₹)</th>
                <th style={{ width: '14%' }} className="number">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {hasLineItems ? (
                poItems.map((item, index) => {
                  const itemRate = (item.unitPrice || 0) / 100;
                  const itemQty = parseFloat(String(item.quantity)) || 0;
                  const itemCgst = (item.cgstAmount || 0) / 100;
                  const itemSgst = (item.sgstAmount || 0) / 100;
                  const itemGstTotal = itemCgst + itemSgst;
                  const itemTotal = (item.totalAmount || 0) / 100;
                  const gstPercent = (item.gstRate || 0) / 100;
                  
                  return (
                    <tr key={item.id}>
                      <td className="center">{index + 1}</td>
                      <td>
                        <strong>{item.itemName || getRawMaterialName(item.rawMaterialId)}</strong>
                        {item.description && <div style={{ fontSize: '10px', color: '#666' }}>{item.description}</div>}
                      </td>
                      <td>{item.hsnCode || '-'}</td>
                      <td className="center">{itemQty}</td>
                      <td className="center">{item.unitName || getUomName(item.uomId)}</td>
                      <td className="number">{itemRate.toFixed(2)}</td>
                      <td className="center">{gstPercent.toFixed(0)}%</td>
                      <td className="number">{itemGstTotal.toFixed(2)}</td>
                      <td className="number"><strong>{itemTotal.toFixed(2)}</strong></td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="center">1</td>
                  <td colSpan={8} className="center" style={{ color: '#666', fontStyle: 'italic' }}>
                    No line items added to this purchase order
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="totals-section">
            <div className="totals-box">
              <div className="total-row sub-total">
                <span>Subtotal</span>
                <span>₹ {subtotal.toFixed(2)}</span>
              </div>
              {(totalCgst > 0 || totalSgst > 0) && (
                <>
                  <div className="total-row">
                    <span>CGST</span>
                    <span>₹ {totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>SGST</span>
                    <span>₹ {totalSgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {totalIgst > 0 && (
                <div className="total-row">
                  <span>IGST</span>
                  <span>₹ {totalIgst.toFixed(2)}</span>
                </div>
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
