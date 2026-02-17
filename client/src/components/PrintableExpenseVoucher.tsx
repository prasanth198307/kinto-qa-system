import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseVoucher, ExpenseItem, ExpenseCategory } from "@shared/schema";

interface PrintableExpenseVoucherProps {
  voucher: ExpenseVoucher;
}

export default function PrintableExpenseVoucher({ voucher }: PrintableExpenseVoucherProps) {
  const { data: voucherDetail, isLoading: itemsLoading } = useQuery<{ items: ExpenseItem[] }>({
    queryKey: ['/api/expense-vouchers', voucher.id],
    queryFn: async () => {
      const res = await fetch(`/api/expense-vouchers/${voucher.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch expense voucher details');
      return res.json();
    },
  });
  const items = voucherDetail?.items || [];

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ['/api/expense-categories'],
  });

  const isLoading = itemsLoading || categoriesLoading;

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const getPaymentModeLabel = (mode: string): string => {
    const modeMap: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      upi: 'UPI',
      cheque: 'Cheque',
    };
    return modeMap[mode] || mode;
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid',
    };
    return statusMap[status] || status;
  };

  const getPayeeTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      employee: 'Employee',
      vendor: 'Vendor',
      other: 'Other',
    };
    return typeMap[type] || type;
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = generatePrintHTML();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generatePrintHTML = (): string => {
    const amountInRupees = voucher.totalAmount / 100;
    const amountInWords = numberToWords(amountInRupees);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Voucher ${voucher.voucherNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5in; size: A4; }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
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
          
          .document {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 2px solid #000;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .header h2 {
            font-size: 16px;
            color: #333;
            text-decoration: underline;
          }
          
          .voucher-number {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 12px;
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
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
          }
          
          .info-row .label {
            color: #666;
          }
          
          .info-row .value {
            font-weight: 500;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 10pt;
          }
          
          .items-table th {
            background: #f0f0f0;
            font-weight: bold;
          }
          
          .items-table .number {
            text-align: right;
          }
          
          .items-table tfoot td {
            font-weight: bold;
            background: #f5f5f5;
          }
          
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          
          .status-draft { background: #e9ecef; color: #495057; }
          .status-submitted { background: #cce5ff; color: #004085; }
          .status-approved { background: #d4edda; color: #155724; }
          .status-rejected { background: #f8d7da; color: #721c24; }
          .status-paid { background: #28a745; color: white; }
          
          .amount-words {
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 20px;
            font-style: italic;
          }
          
          .amount-words strong {
            font-style: normal;
          }
          
          .total-box {
            background: #f5f5f5;
            border: 2px solid #000;
            padding: 15px;
            text-align: right;
            margin-bottom: 20px;
          }
          
          .total-box .label {
            font-size: 14px;
          }
          
          .total-box .amount {
            font-size: 20px;
            font-weight: bold;
          }
          
          .purpose-section {
            border: 1px solid #ddd;
            padding: 12px;
            margin-bottom: 20px;
          }
          
          .purpose-section h3 {
            font-size: 12px;
            margin-bottom: 8px;
          }
          
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 40px;
          }
          
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #000;
          }
          
          .signature-box span {
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">Print Document</button>
        
        <div class="document">
          <div class="header">
            <h1>INMOISTURE PRIVATE LIMITED</h1>
            <h2>EXPENSE VOUCHER</h2>
          </div>
          
          <div class="voucher-number">
            <div><strong>Voucher No:</strong> ${voucher.voucherNumber}</div>
            <div><strong>Date:</strong> ${format(new Date(voucher.voucherDate), 'dd/MM/yyyy')}</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Payee Details</h3>
              <div class="info-row">
                <span class="label">Payee Name:</span>
                <span class="value">${voucher.payeeName}</span>
              </div>
              <div class="info-row">
                <span class="label">Payee Type:</span>
                <span class="value">${getPayeeTypeLabel(voucher.payeeType)}</span>
              </div>
            </div>
            
            <div class="info-box">
              <h3>Payment Details</h3>
              <div class="info-row">
                <span class="label">Payment Mode:</span>
                <span class="value">${getPaymentModeLabel(voucher.paymentMode)}</span>
              </div>
              ${voucher.bankName ? `
              <div class="info-row">
                <span class="label">Bank:</span>
                <span class="value">${voucher.bankName}</span>
              </div>
              ` : ''}
              ${voucher.chequeNumber ? `
              <div class="info-row">
                <span class="label">Cheque No:</span>
                <span class="value">${voucher.chequeNumber}</span>
              </div>
              ` : ''}
              ${voucher.transactionReference ? `
              <div class="info-row">
                <span class="label">Reference:</span>
                <span class="value">${voucher.transactionReference}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="label">Status:</span>
                <span class="value status-badge status-${voucher.status}">${getStatusLabel(voucher.status)}</span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 35%;">Description</th>
                <th style="width: 15%;">Category</th>
                <th style="width: 8%;" class="number">Qty</th>
                <th style="width: 12%;" class="number">Rate</th>
                <th style="width: 10%;" class="number">GST</th>
                <th style="width: 15%;" class="number">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${getCategoryName(item.categoryId)}</td>
                  <td class="number">${item.quantity}</td>
                  <td class="number">${formatCurrency(item.unitPrice)}</td>
                  <td class="number">${formatCurrency(item.gstAmount)}</td>
                  <td class="number">${formatCurrency(item.amount + item.gstAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"></td>
                <td class="number">Subtotal:</td>
                <td class="number">${formatCurrency(voucher.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="5"></td>
                <td class="number">GST:</td>
                <td class="number">${formatCurrency(voucher.gstAmount)}</td>
              </tr>
              <tr>
                <td colspan="5"></td>
                <td class="number"><strong>Total:</strong></td>
                <td class="number"><strong>${formatCurrency(voucher.totalAmount)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="amount-words">
            <strong>Amount in Words:</strong> ${amountInWords}
          </div>
          
          ${voucher.purpose ? `
          <div class="purpose-section">
            <h3>Purpose</h3>
            <p>${voucher.purpose}</p>
          </div>
          ` : ''}
          
          ${voucher.remarks ? `
          <div class="purpose-section">
            <h3>Remarks</h3>
            <p>${voucher.remarks}</p>
          </div>
          ` : ''}
          
          <div class="signature-section">
            <div class="signature-box">
              <span>Prepared By</span>
            </div>
            <div class="signature-box">
              <span>Approved By</span>
            </div>
            <div class="signature-box">
              <span>Received By</span>
            </div>
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
      disabled={isLoading}
      title={isLoading ? "Loading data..." : "Print Expense Voucher"}
      data-testid={`button-print-expense-voucher-${voucher.id}`}
    >
      <Printer className="w-4 h-4 mr-2" />
      {isLoading ? "Loading..." : "Print"}
    </Button>
  );
}
