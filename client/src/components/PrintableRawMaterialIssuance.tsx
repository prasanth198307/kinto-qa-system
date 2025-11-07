import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type RawMaterialIssuance, type RawMaterialIssuanceItem, type RawMaterial, type Product, type Uom } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintableRawMaterialIssuanceProps {
  issuance: RawMaterialIssuance;
}

export default function PrintableRawMaterialIssuance({ issuance }: PrintableRawMaterialIssuanceProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery<RawMaterialIssuanceItem[]>({
    queryKey: ['/api/raw-material-issuance-items', issuance.id],
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const getRawMaterialName = (materialId: string): string => {
    const material = rawMaterials.find(m => m.id === materialId);
    return material ? `${material.materialCode} - ${material.materialName}` : 'Unknown Material';
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.productCode} - ${product.productName}` : 'Unknown Product';
  };

  const getUomName = (uomId: string | null): string => {
    if (!uomId) return '';
    const uom = uoms.find(u => u.id === uomId);
    return uom?.code || '';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Raw Material Issuance - ${issuance.issuanceNumber}</title>
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

            .issuance-number {
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
              min-width: 120px;
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

            .items-table td.number {
              text-align: right;
            }

            .items-table td.center {
              text-align: center;
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
                page-break-after: always;
              }

              .page:last-child {
                page-break-after: auto;
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

  const formattedDate = new Date(issuance.issuanceDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const mainProduct = issuance.productId ? products.find(p => p.id === issuance.productId) : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-issuance-${issuance.id}`}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>

      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page">
          <div className="header">
            <div className="company-name">KINTO MANUFACTURING</div>
            <div className="document-title">Raw Material Issuance</div>
            <div className="issuance-number">Issuance No: {issuance.issuanceNumber}</div>
          </div>

          <div className="details-section">
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formattedDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Issued To:</span>
                <span className="detail-value">{issuance.issuedTo || '-'}</span>
              </div>
              {mainProduct && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">For Product:</span>
                  <span className="detail-value">
                    {mainProduct.productCode} - {mainProduct.productName}
                  </span>
                </div>
              )}
              {issuance.remarks && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Remarks:</span>
                  <span className="detail-value">{issuance.remarks}</span>
                </div>
              )}
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th className="center">Sr. No.</th>
                <th>Raw Material</th>
                <th>Product/Usage</th>
                <th className="number">Quantity Issued</th>
                <th className="center">Unit</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="center">{index + 1}</td>
                  <td>{getRawMaterialName(item.rawMaterialId)}</td>
                  <td>{getProductName(item.productId)}</td>
                  <td className="number">{item.quantityIssued}</td>
                  <td className="center">{getUomName(item.uomId)}</td>
                  <td>{item.remarks || '-'}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Issued By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Received By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Authorized Signatory</div>
            </div>
          </div>

          <div className="footer-note">
            This is a computer-generated raw material issuance document. Please verify all details before accepting materials.
          </div>
        </div>
      </div>
    </>
  );
}
