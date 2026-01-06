import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { amountToWords } from "@/lib/number-to-words";

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

interface PrintableCreditNoteProps {
  creditNote: CreditNote;
}

export default function PrintableCreditNote({ creditNote }: PrintableCreditNoteProps) {
  const { data: items = [] } = useQuery<CreditNoteItem[]>({
    queryKey: ['/api/credit-note-items', creditNote.id],
    queryFn: async () => {
      const res = await fetch(`/api/credit-note-items?creditNoteId=${creditNote.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch credit note items');
      return res.json();
    },
  });

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const formatRate = (rateInBasisPoints: number): string => {
    return `${(rateInBasisPoints / 100).toFixed(2)}%`;
  };

  const formatQuantity = (qty: number | null | undefined): string => {
    if (qty === null || qty === undefined) return '0';
    return Number(qty).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const isIntrastate = creditNote.sellerStateCode === creditNote.buyerStateCode;

  const handlePrint = () => {
    const htmlContent = generatePrintHTML();
    
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Detect ONLY Safari on iOS (not Chrome/Firefox/Edge which handle blob URLs fine)
    const isNonSafariIOSBrowser = /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    const isSafariIOS = isIOSDevice && !isNonSafariIOSBrowser;
    
    // Only Safari on iOS needs overlay - Chrome/Firefox/Edge on iOS work with blob URLs
    if (isSafariIOS) {
      const overlay = document.createElement('div');
      overlay.id = 'ios-print-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:#fff;';
      
      const header = document.createElement('div');
      header.style.cssText = 'position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;z-index:1000000;gap:8px;';
      
      const backBtn = document.createElement('button');
      backBtn.textContent = '← Back';
      backBtn.style.cssText = 'padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;';
      backBtn.onclick = () => {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
      };
      
      const printBtn = document.createElement('button');
      printBtn.textContent = '🖨️ Print / Save PDF';
      printBtn.style.cssText = 'padding:10px 16px;background:#10b981;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;';
      
      header.appendChild(backBtn);
      header.appendChild(printBtn);
      
      const iframeEl = document.createElement('iframe');
      iframeEl.style.cssText = 'position:absolute;top:56px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 56px);border:none;';
      iframeEl.srcdoc = htmlContent;
      
      printBtn.onclick = () => {
        if (iframeEl.contentWindow) {
          iframeEl.contentWindow.print();
        }
      };
      
      overlay.appendChild(header);
      overlay.appendChild(iframeEl);
      
      document.body.style.overflow = 'hidden';
      document.body.appendChild(overlay);
    } else if (isMobile) {
      // Android - blob URL navigation works
      const mobileHtmlContent = htmlContent.replace(
        '<body>',
        `<body>
          <div id="mobile-controls" style="position:fixed;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#1f2937;border-bottom:1px solid #374151;z-index:100000;gap:12px;">
            <button onclick="history.back()" style="padding:10px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">← Back</button>
            <div style="color:white;font-size:13px;text-align:center;flex:1;">Tap <strong>⋮ Menu</strong> → <strong>Print</strong></div>
          </div>
          <div style="padding-top:56px;">`
      ).replace('</body>', '</div></body>');
      
      const blob = new Blob([mobileHtmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.location.href = blobUrl;
    } else {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const generatePrintHTML = (): string => {
    const reasonMap: Record<string, string> = {
      pricing_error: 'Pricing Error',
      discount: 'Discount',
      damage: 'Damage',
      other: 'Other',
      sales_return: 'Sales Return',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Note ${creditNote.noteNumber}</title>
        <style>
          @media print {
            @page { 
              margin: 0.5in;
              size: A4;
            }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
          }
          
          .print-btn {
            margin-bottom: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
          }
          
          .print-btn:hover {
            background: #0056b3;
          }
          
          .document {
            max-width: 800px;
            margin: 0 auto;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .header p {
            font-size: 12px;
            color: #666;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          
          .info-box {
            border: 1px solid #ddd;
            padding: 12px;
          }
          
          .info-box h3 {
            font-size: 13px;
            font-weight: bold;
            background: #f5f5f5;
            padding: 6px;
            margin: -12px -12px 10px -12px;
            border-bottom: 1px solid #ddd;
          }
          
          .info-box p {
            font-size: 11px;
            margin: 4px 0;
          }
          
          .info-box strong {
            font-weight: 600;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
          }
          
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background: #f5f5f5;
            font-weight: bold;
            font-size: 11px;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .totals {
            float: right;
            width: 350px;
            margin-top: 10px;
          }
          
          .totals table {
            margin: 0;
          }
          
          .total-row {
            font-weight: bold;
            font-size: 13px;
            background: #f5f5f5;
          }
          
          .amount-words {
            margin: 20px 0;
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            font-style: italic;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
            text-align: center;
          }
          
          .clearfix::after {
            content: "";
            display: table;
            clear: both;
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" class="print-btn no-print">
          <span style="margin-right: 8px;">🖨️</span> Print Credit Note
        </button>
        
        <div class="document">
          <div class="header">
            <h1>CREDIT NOTE</h1>
            <p>Original for Recipient</p>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Seller Details</h3>
              <p><strong>${creditNote.sellerName || 'N/A'}</strong></p>
              <p>${creditNote.sellerAddress || 'N/A'}</p>
              ${creditNote.sellerGstin ? `<p><strong>GSTIN:</strong> ${creditNote.sellerGstin}</p>` : ''}
              ${creditNote.sellerStateCode ? `<p><strong>State Code:</strong> ${creditNote.sellerStateCode}</p>` : ''}
            </div>
            
            <div class="info-box">
              <h3>Credit Note Information</h3>
              <p><strong>Credit Note #:</strong> ${creditNote.noteNumber}</p>
              <p><strong>Date:</strong> ${format(new Date(creditNote.creditDate), 'dd MMM yyyy')}</p>
              <p><strong>Original Invoice #:</strong> ${creditNote.invoiceNumber}</p>
              <p><strong>Reason:</strong> ${reasonMap[creditNote.reason] || creditNote.reason}</p>
            </div>
            
            <div class="info-box" style="grid-column: span 2;">
              <h3>Buyer Details</h3>
              <p><strong>${creditNote.buyerName || 'N/A'}</strong></p>
              <p>${creditNote.buyerAddress || 'N/A'}</p>
              ${creditNote.buyerGstin ? `<p><strong>GSTIN:</strong> ${creditNote.buyerGstin}</p>` : ''}
              ${creditNote.buyerStateCode ? `<p><strong>State Code:</strong> ${creditNote.buyerStateCode}</p>` : ''}
            </div>
          </div>
          
          ${creditNote.notes ? `
            <div style="margin: 10px 0; padding: 10px; background: #fffbea; border-left: 4px solid #f59e0b;">
              <strong>Notes:</strong> ${creditNote.notes}
            </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">S.No</th>
                <th>Product Description</th>
                <th class="text-center" style="width: 80px;">Quantity</th>
                <th class="text-right" style="width: 100px;">Unit Price</th>
                <th class="text-right" style="width: 100px;">Taxable Value</th>
                ${isIntrastate ? `
                  <th class="text-center" style="width: 60px;">CGST</th>
                  <th class="text-right" style="width: 80px;">CGST Amt</th>
                  <th class="text-center" style="width: 60px;">SGST</th>
                  <th class="text-right" style="width: 80px;">SGST Amt</th>
                ` : `
                  <th class="text-center" style="width: 60px;">IGST</th>
                  <th class="text-right" style="width: 80px;">IGST Amt</th>
                `}
                <th class="text-right" style="width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>
                    <strong>${item.productName || 'N/A'}</strong>
                    ${item.description ? `<br/><small style="color: #666;">${item.description}</small>` : ''}
                  </td>
                  <td class="text-center">${formatQuantity(item.quantity)}</td>
                  <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                  <td class="text-right">${formatCurrency(item.taxableValue)}</td>
                  ${isIntrastate ? `
                    <td class="text-center">${formatRate(item.cgstRate)}</td>
                    <td class="text-right">${formatCurrency(item.cgstAmount)}</td>
                    <td class="text-center">${formatRate(item.sgstRate)}</td>
                    <td class="text-right">${formatCurrency(item.sgstAmount)}</td>
                  ` : `
                    <td class="text-center">${formatRate(item.igstRate)}</td>
                    <td class="text-right">${formatCurrency(item.igstAmount)}</td>
                  `}
                  <td class="text-right"><strong>${formatCurrency(item.totalAmount)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="clearfix">
            <div class="totals">
              <table>
                <tr>
                  <td>Subtotal:</td>
                  <td class="text-right">${formatCurrency(creditNote.subtotal)}</td>
                </tr>
                ${isIntrastate ? `
                  <tr>
                    <td>CGST:</td>
                    <td class="text-right">${formatCurrency(creditNote.cgstAmount)}</td>
                  </tr>
                  <tr>
                    <td>SGST:</td>
                    <td class="text-right">${formatCurrency(creditNote.sgstAmount)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td>IGST:</td>
                    <td class="text-right">${formatCurrency(creditNote.igstAmount)}</td>
                  </tr>
                `}
                <tr class="total-row">
                  <td><strong>Grand Total:</strong></td>
                  <td class="text-right"><strong>${formatCurrency(creditNote.grandTotal)}</strong></td>
                </tr>
              </table>
            </div>
          </div>
          
          <div class="clearfix"></div>
          
          <div class="amount-words">
            <strong>Amount in Words:</strong> ${amountToWords(creditNote.grandTotal / 100)} Only
          </div>
          
          <div style="margin-top: 60px; text-align: right;">
            <div style="border-top: 1px solid #000; display: inline-block; padding-top: 5px; min-width: 200px;">
              <strong>Authorized Signatory</strong>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated credit note and does not require a physical signature.</p>
            <p>Credit Note #${creditNote.noteNumber} | Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      data-testid={`button-print-credit-note-${creditNote.id}`}
      className="gap-2"
    >
      <Printer className="w-4 h-4" />
      Print Credit Note
    </Button>
  );
}
