import { useRef } from "react";
import { type Invoice, type Gatepass } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintableInvoiceGatepassProps {
  invoice: Invoice;
  gatepass: Gatepass;
}

export default function PrintableInvoiceGatepass({ invoice, gatepass }: PrintableInvoiceGatepassProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice & Gatepass - ${invoice.invoiceNumber} / ${gatepass.gatepassNumber}</title>
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

            .document {
              width: 210mm;
              min-height: 297mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
              page-break-after: always;
            }

            .document:last-child {
              page-break-after: auto;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }

              .document {
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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        data-testid={`button-print-combined-${invoice.id}-${gatepass.id}`}
        title="Print Invoice & Gatepass"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print Both
      </Button>

      <div ref={printRef} style={{ display: 'none' }}>
        <div className="document">
          <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            TAX INVOICE
          </div>
          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #000' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
              Invoice: {invoice.invoiceNumber}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Invoice Details:</div>
                <div>Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
                <div>Buyer: {invoice.buyerName}</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Amounts:</div>
                <div>Subtotal: ₹{(invoice.subtotal / 100).toFixed(2)}</div>
                <div>Tax: ₹{((invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount) / 100).toFixed(2)}</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Total: ₹{(invoice.totalAmount / 100).toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '20px' }}>
            Complete invoice details can be printed separately using the Print Invoice button.
          </div>
        </div>

        <div className="document">
          <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            GATE PASS
          </div>
          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #000' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
              Gate Pass: {gatepass.gatepassNumber}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Vehicle Details:</div>
                <div>Vehicle: {gatepass.vehicleNumber}</div>
                <div>Driver: {gatepass.driverName}</div>
                {gatepass.driverContact && <div>Contact: {gatepass.driverContact}</div>}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Dispatch Info:</div>
                <div>Date: {new Date(gatepass.gatepassDate).toLocaleDateString('en-IN')}</div>
                <div>Invoice: {invoice.invoiceNumber}</div>
                {gatepass.destination && <div>Destination: {gatepass.destination}</div>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '20px' }}>
            Complete gatepass details can be printed separately using the Print Gatepass button.
          </div>
        </div>
      </div>
    </>
  );
}
