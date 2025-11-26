import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, ArrowLeft } from 'lucide-react';
import type { ExpenseVoucher, ExpenseItem } from '@shared/schema';

interface VoucherWithItems extends ExpenseVoucher {
  items: ExpenseItem[];
}

const formatCurrency = (paise: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
};

const formatCurrencyPlain = (paise: number) => {
  return (paise / 100).toFixed(2);
};

const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise) + ' Paise';
  }
  return result + ' Only';
};

export default function CashRegisterVoucherPrint() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const voucherId = params.get('id');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const mode = params.get('mode') || 'single'; // 'single', 'day', 'range'

  const { data: vouchers, isLoading } = useQuery<VoucherWithItems[]>({
    queryKey: ['/api/cash-register/vouchers/print', voucherId, startDate, endDate, mode],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (voucherId) queryParams.set('id', voucherId);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      queryParams.set('mode', mode);
      
      const response = await fetch(`/api/cash-register/vouchers/print?${queryParams}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch vouchers');
      return response.json();
    },
  });

  const handlePrint = () => {
    if (!vouchers || vouchers.length === 0) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const vouchersPerPage = vouchers.length === 1 ? 1 : 2;
    
    const generateVoucherHTML = (voucher: VoucherWithItems, isHalf: boolean) => {
      // A4 = 297mm, page padding = 10mm each side, usable = 277mm
      // For 2 vouchers: 277mm / 2 = 138.5mm each, with 3mm gap = 135mm each
      const height = isHalf ? '133mm' : '277mm';
      const padding = isHalf ? '6mm 8mm' : '12mm 15mm';
      
      return `
        <div class="voucher" style="height: ${height}; padding: ${padding}; page-break-inside: avoid; border-bottom: ${isHalf ? '1px dashed #999' : 'none'};">
          <div class="header">
            <div class="company-name">KINTO OPERATIONS</div>
            <div class="document-title">EXPENSE VOUCHER</div>
          </div>
          
          <div class="info-grid">
            <div class="info-row">
              <div class="info-item">
                <span class="label">Voucher No:</span>
                <span class="value">${voucher.voucherNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">Date:</span>
                <span class="value">${format(new Date(voucher.voucherDate), 'dd/MM/yyyy')}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <span class="label">Paid To:</span>
                <span class="value">${voucher.payeeName}</span>
              </div>
              <div class="info-item">
                <span class="label">Payment Mode:</span>
                <span class="value">${voucher.paymentMode.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>
            ${voucher.transactionReference ? `
            <div class="info-row">
              <div class="info-item full-width">
                <span class="label">Reference:</span>
                <span class="value">${voucher.transactionReference}</span>
              </div>
            </div>
            ` : ''}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%">#</th>
                <th style="width: 52%">Description</th>
                <th style="width: 20%" class="right">Amount</th>
                <th style="width: 20%" class="right">GST</th>
              </tr>
            </thead>
            <tbody>
              ${voucher.items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.description}</td>
                  <td class="right">${formatCurrencyPlain(item.amount)}</td>
                  <td class="right">${formatCurrencyPlain(item.gstAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2" class="right">Subtotal:</td>
                <td class="right">${formatCurrencyPlain(voucher.subtotal)}</td>
                <td class="right">${formatCurrencyPlain(voucher.gstAmount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" class="right"><strong>Total Amount:</strong></td>
                <td colspan="2" class="right"><strong>${formatCurrency(voucher.totalAmount)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div class="amount-words">
            <span class="label">Amount in Words:</span>
            <span class="value">${numberToWords(voucher.totalAmount / 100)}</span>
          </div>

          ${voucher.purpose ? `
          <div class="purpose">
            <span class="label">Purpose:</span>
            <span class="value">${voucher.purpose}</span>
          </div>
          ` : ''}

          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Prepared By</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Received By</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Approved By</div>
            </div>
          </div>
        </div>
      `;
    };

    const pages: string[] = [];
    const isMultiple = vouchers.length > 1;
    
    for (let i = 0; i < vouchers.length; i += vouchersPerPage) {
      const pageVouchers = vouchers.slice(i, i + vouchersPerPage);
      let pageContent = '';
      
      pageVouchers.forEach((v, idx) => {
        // Use half-size format for all vouchers when printing multiple (even if odd number on last page)
        pageContent += generateVoucherHTML(v, isMultiple);
      });
      
      // Add empty space if odd number and not last page
      if (isMultiple && pageVouchers.length === 1 && i + vouchersPerPage < vouchers.length) {
        pageContent += '<div style="height: 133mm;"></div>';
      }
      
      pages.push(`<div class="page">${pageContent}</div>`);
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Expense Vouchers - ${startDate || vouchers[0]?.voucherDate}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4;
              margin: 0;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
            }

            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 10mm;
              margin: 0 auto;
              background: white;
              page-break-after: always;
            }

            .page:last-child {
              page-break-after: auto;
            }

            .voucher {
              border: 1px solid #333;
              margin-bottom: 5mm;
              background: #fff;
            }

            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }

            .company-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 2px;
            }

            .document-title {
              font-size: 14px;
              font-weight: bold;
              color: #333;
            }

            .info-grid {
              margin-bottom: 10px;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }

            .info-item {
              display: flex;
              gap: 5px;
            }

            .info-item.full-width {
              width: 100%;
            }

            .info-item .label {
              font-weight: bold;
              color: #555;
            }

            .info-item .value {
              color: #000;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }

            .items-table th,
            .items-table td {
              border: 1px solid #999;
              padding: 5px 8px;
              text-align: left;
            }

            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
            }

            .items-table .right {
              text-align: right;
            }

            .items-table tfoot tr {
              background: #f9f9f9;
            }

            .items-table .total-row {
              background: #e8e8e8;
            }

            .amount-words {
              border: 1px solid #999;
              padding: 6px 10px;
              margin-bottom: 8px;
              background: #fafafa;
            }

            .amount-words .label {
              font-weight: bold;
              margin-right: 5px;
            }

            .purpose {
              margin-bottom: 10px;
              padding: 5px 0;
            }

            .purpose .label {
              font-weight: bold;
              margin-right: 5px;
            }

            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              padding-top: 10px;
            }

            .signature-box {
              text-align: center;
              width: 30%;
            }

            .signature-line {
              border-bottom: 1px solid #333;
              height: 30px;
              margin-bottom: 5px;
            }

            .signature-label {
              font-size: 10px;
              color: #555;
            }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .page {
                margin: 0;
                padding: 10mm;
              }
            }
          </style>
        </head>
        <body>
          ${pages.join('')}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vouchers || vouchers.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No vouchers found for the selected criteria</p>
            <Button variant="outline" onClick={() => setLocation('/cash-register/report')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Print Expense Vouchers</h1>
          <p className="text-sm text-muted-foreground">
            {vouchers.length} voucher{vouchers.length > 1 ? 's' : ''} ready to print
            {startDate && endDate && startDate !== endDate && (
              <span> ({format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')})</span>
            )}
            {startDate && endDate && startDate === endDate && (
              <span> ({format(new Date(startDate), 'MMM d, yyyy')})</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation('/cash-register/report')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handlePrint} data-testid="button-print-vouchers">
            <Printer className="w-4 h-4 mr-2" />
            Print {vouchers.length > 1 ? 'All' : 'Voucher'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {vouchers.map((voucher) => (
          <Card key={voucher.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{voucher.voucherNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(voucher.voucherDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(voucher.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">{voucher.paymentMode.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-sm">
                <p><span className="text-muted-foreground">Paid to:</span> {voucher.payeeName}</p>
                {voucher.purpose && (
                  <p className="mt-1"><span className="text-muted-foreground">Purpose:</span> {voucher.purpose}</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Items ({voucher.items.length})</p>
                <div className="space-y-1">
                  {voucher.items.slice(0, 3).map((item, idx) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="truncate flex-1">{item.description}</span>
                      <span className="ml-2">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {voucher.items.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{voucher.items.length - 3} more items</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
