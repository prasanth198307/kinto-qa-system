import { useQuery } from "@tanstack/react-query";
import { type Gatepass, type GatepassItem, type Product, type Vendor, type FinishedGood, type Invoice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

interface PrintableGatepassProps {
  gatepass: Gatepass;
}

export default function PrintableGatepass({ gatepass }: PrintableGatepassProps) {

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

  const { data: invoice } = useQuery<Invoice>({
    queryKey: ['/api/invoices', gatepass.invoiceId],
    enabled: !!gatepass.invoiceId,
  });

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

  const handlePrint = () => {
    const formattedDate = format(new Date(gatepass.gatepassDate), 'dd/MM/yyyy');

    const generateGatepassHTML = (copyType: string, copyFor: string) => `
      <div class="gp-page">
        <div class="header">
          <div class="company-name">INMOISTURE PRIVATE LIMITED</div>
          <div class="subtitle">Gate Pass for Finished Goods Dispatch</div>
        </div>

        <div class="copy-label">${copyType} - ${copyFor}</div>

        <div class="gp-number">Gate Pass No: <strong>${gatepass.gatepassNumber}</strong></div>

        <div class="details-grid">
          <div class="left-col">
            <table class="info-table">
              <tr><td class="label">Date:</td><td>${formattedDate}</td></tr>
              <tr><td class="label">Vehicle No:</td><td><strong>${gatepass.vehicleNumber}</strong></td></tr>
              <tr><td class="label">Driver:</td><td>${gatepass.driverName}</td></tr>
              <tr><td class="label">Contact:</td><td>${gatepass.driverContact || '-'}</td></tr>
              <tr><td class="label">Transporter:</td><td>${gatepass.transporterName || '-'}</td></tr>
            </table>
          </div>
          <div class="right-col">
            <div class="customer-box">
              <div class="box-title">Customer Details</div>
              <div class="customer-name">${vendor?.vendorName || gatepass.customerName || '-'}</div>
              ${vendor?.mobileNumber ? `<div class="customer-detail">Mobile: ${vendor.mobileNumber}</div>` : ''}
              ${vendor?.gstNumber ? `<div class="customer-detail">GST: ${vendor.gstNumber}</div>` : ''}
              ${vendor?.address ? `<div class="customer-address">${vendor.address}</div>` : ''}
              ${gatepass.destination ? `<div class="customer-detail"><strong>Destination:</strong> ${gatepass.destination}</div>` : ''}
            </div>
          </div>
        </div>

${invoice?.shipToName || invoice?.shipToAddress ? `
        <div class="ship-to-box">
          <div class="box-title">Ship To</div>
          ${invoice?.shipToName ? `<div class="customer-name">${invoice.shipToName}</div>` : ''}
          ${invoice?.shipToAddress ? `<div class="customer-address">${invoice.shipToAddress}</div>` : ''}
          ${invoice?.shipToCity || invoice?.shipToState || invoice?.shipToPincode ? `<div class="customer-detail">${[invoice?.shipToCity, invoice?.shipToState, invoice?.shipToPincode].filter(Boolean).join(', ')}</div>` : ''}
        </div>
` : ''}
        ${invoice?.invoiceNumber ? `<div class="invoice-ref">Invoice No: <strong>${invoice.invoiceNumber}</strong></div>` : ''}

        <table class="items-table">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th style="text-align:left;">Product Name</th>
              <th style="width:100px;">Batch No.</th>
              <th style="width:70px;">Qty</th>
              <th style="text-align:left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td>${getProductName(item)}</td>
                <td style="text-align:center;">${getBatchNumber(item)}</td>
                <td style="text-align:center;">${item.quantityDispatched}</td>
                <td>${item.remarks || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${gatepass.casesCount ? `<div class="cases-info">Total Cases/Boxes: <strong>${gatepass.casesCount}</strong></div>` : ''}
        ${gatepass.securitySealNo ? `<div class="seal-info">Security Seal No: <strong>${gatepass.securitySealNo}</strong></div>` : ''}

        ${gatepass.remarks ? `
          <div class="remarks-section">
            <strong>Remarks:</strong> ${gatepass.remarks}
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Receiver's Signature</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Security/Gate</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">Authorized Signatory</div>
          </div>
        </div>

        <div class="footer">
          This is a computer-generated gate pass. Please verify all details before accepting goods.
        </div>
      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <title>Gatepass - ${gatepass.gatepassNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.3;
              color: #333;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Ensure all borders print properly */
            table, th, td { border-collapse: collapse; }

            .gp-page {
              width: 210mm;
              min-height: 270mm;
              padding: 12mm 15mm;
              margin: 0 auto;
              background: white;
            }

            .gp-page + .gp-page {
              page-break-before: always;
            }

            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }

            .company-name {
              font-size: 20px;
              font-weight: bold;
              letter-spacing: 1px;
            }

            .subtitle {
              font-size: 12px;
              color: #555;
              margin-top: 3px;
            }

            .copy-label {
              text-align: center;
              font-size: 11px;
              font-weight: bold;
              background: #f5f5f5;
              border: 1px solid #000;
              padding: 4px 10px;
              display: inline-block;
              margin: 8px auto;
              display: block;
              width: fit-content;
            }

            .gp-number {
              text-align: center;
              font-size: 13px;
              margin-bottom: 12px;
            }

            .details-grid {
              display: flex;
              gap: 15px;
              margin-bottom: 12px;
            }

            .left-col {
              flex: 1;
            }

            .right-col {
              flex: 1;
            }

            .info-table {
              width: 100%;
              border-collapse: collapse;
            }

            .info-table td {
              padding: 4px 6px;
              border: 1px solid #000;
            }

            .info-table .label {
              font-weight: bold;
              width: 90px;
              background: #f9f9f9;
            }

            .customer-box {
              border: 1px solid #000;
              padding: 8px;
              height: 100%;
              background: #fafafa;
            }

            .box-title {
              font-weight: bold;
              font-size: 10px;
              color: #666;
              margin-bottom: 5px;
              text-transform: uppercase;
            }

            .customer-name {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 4px;
            }

            .customer-detail {
              font-size: 10px;
              margin-bottom: 2px;
            }

            .customer-address {
              font-size: 10px;
              color: #555;
              margin-top: 4px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            .ship-to-box {
              border: 1px solid #000;
              padding: 8px;
              background: #f5f9ff;
              margin-bottom: 10px;
            }

            .invoice-ref {
              font-size: 11px;
              margin-bottom: 10px;
              padding: 4px 8px;
              background: #e8f4e8;
              border: 1px solid #c3e0c3;
              display: inline-block;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 6px 8px;
            }

            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
              font-size: 10px;
            }

            .items-table td {
              font-size: 11px;
            }

            .cases-info, .seal-info {
              font-size: 11px;
              margin-bottom: 5px;
            }

            .remarks-section {
              font-size: 10px;
              padding: 6px 8px;
              background: #f9f9f9;
              border: 1px solid #000;
              margin: 10px 0;
            }

            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding-top: 10px;
            }

            .sig-box {
              text-align: center;
              width: 30%;
            }

            .sig-line {
              border-bottom: 1px solid #000;
              height: 40px;
              margin-bottom: 5px;
            }

            .sig-label {
              font-size: 10px;
              font-weight: bold;
            }

            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 9px;
              color: #666;
            }

            @media print {
              body { 
                margin: 0; 
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .gp-page { 
                margin: 0; 
                width: 100%; 
                min-height: auto;
                padding: 10mm;
              }

              /* Ensure all table borders print properly */
              table, th, td { border-collapse: collapse !important; }
              .items-table th, .items-table td { border: 1px solid #000 !important; }
              .info-table td { border: 1px solid #000 !important; }
              .customer-box { border: 1px solid #000 !important; }
              .ship-to-box { border: 1px solid #000 !important; }
              .copy-label { border: 1px solid #000 !important; }
              .remarks-section { border: 1px solid #000 !important; }
              .header { border-bottom: 2px solid #000 !important; }
              .sig-line { border-bottom: 1px solid #000 !important; }
            }
          </style>
        </head>
        <body>
          ${generateGatepassHTML('ORIGINAL', 'CUSTOMER')}
          ${generateGatepassHTML('DUPLICATE', 'TRANSPORTER')}
          ${generateGatepassHTML('TRIPLICATE', 'OFFICE')}
        </body>
      </html>
    `;

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create iframe for printing
    const existingFrame = document.getElementById('gatepass-print-frame');
    if (existingFrame) {
      document.body.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'gatepass-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '99999';
    iframe.style.backgroundColor = 'white';
    
    if (isMobile) {
      // Mobile: Show full-screen preview with buttons
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    } else {
      // Desktop: Hidden iframe, auto-print
      iframe.style.width = '0';
      iframe.style.height = '0';
    }
    
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      if (isMobile) {
        // Add close button for mobile
        const closeBtn = iframeDoc.createElement('button');
        closeBtn.innerHTML = '✕ Close Preview';
        closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
        closeBtn.onclick = () => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        };
        iframeDoc.body.insertBefore(closeBtn, iframeDoc.body.firstChild);
        
        // Add print button for mobile
        const printBtn = iframeDoc.createElement('button');
        printBtn.innerHTML = '🖨️ Print / Save PDF';
        printBtn.style.cssText = 'position:fixed;top:10px;right:150px;z-index:100000;padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
        printBtn.onclick = () => {
          iframe.contentWindow?.print();
        };
        iframeDoc.body.insertBefore(printBtn, iframeDoc.body.firstChild);
      } else {
        // Desktop: Use requestAnimationFrame to ensure content is rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              console.error('Print failed:', e);
            }
            // Cleanup after print dialog closes
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 2000);
          }, 300);
        });
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      data-testid={`button-print-gatepass-${gatepass.id}`}
    >
      <Printer className="w-4 h-4 mr-2" />
      Print
    </Button>
  );
}
