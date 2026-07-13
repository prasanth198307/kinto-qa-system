import type { TenantConfig } from "@/hooks/use-tenant-config";

/** Generate 80mm thermal receipt HTML from bill data */
export function generateReceiptHTML(billData: any, config: TenantConfig): string {
  const sym = config.currency_symbol ?? "₹";
  const LOCALE_MAP: Record<string, string> = {
    IN: "en-IN", US: "en-US", AE: "ar-AE", SA: "ar-SA",
    GB: "en-GB", EU: "de-DE", AU: "en-AU", SG: "en-SG",
  };
  const intlLocale = LOCALE_MAP[config.country_code ?? "IN"] ?? "en-US";
  const fmt = (n: any) => {
    const num = Number(n || 0);
    try {
      return new Intl.NumberFormat(intlLocale, { style: "currency", currency: config.currency_code || "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    } catch { return `${sym}${num.toFixed(2)}`; }
  };
  const now = new Date().toLocaleString(intlLocale, { timeZone: config.timezone || "Asia/Kolkata" });
  const items: any[] = Array.isArray(billData?.items) ? billData.items : [];

  const itemRows = items
    .map(
      (it: any) =>
        `<tr>
          <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name || it.item_name || "-"}</td>
          <td style="text-align:center">${it.qty}</td>
          <td style="text-align:right">${fmt(it.price ?? it.rate)}</td>
          <td style="text-align:right">${fmt((it.price ?? it.rate) * it.qty)}</td>
        </tr>`
    )
    .join("");

  const gstLine =
    config.tax_regime === "GST"
      ? `<tr><td colspan="3">CGST (2.5%)</td><td style="text-align:right">${fmt(billData?.gst / 2)}</td></tr>
         <tr><td colspan="3">SGST (2.5%)</td><td style="text-align:right">${fmt(billData?.gst / 2)}</td></tr>`
      : `<tr><td colspan="3">Tax</td><td style="text-align:right">${fmt(billData?.gst ?? 0)}</td></tr>`;

  const discount = billData?.discount ?? 0;
  const promo = billData?.promo_discount ?? 0;

  return `
    <div class="center bold" style="font-size:14px">${billData?.tenant_name ?? "Restaurant"}</div>
    ${billData?.address ? `<div class="center" style="font-size:10px">${billData.address}</div>` : ""}
    ${billData?.gstin ? `<div class="center" style="font-size:10px">GSTIN: ${billData.gstin}</div>` : ""}
    <div class="line"></div>
    <div style="font-size:10px">Bill #: ${billData?.bill_number ?? billData?.id ?? "-"}</div>
    <div style="font-size:10px">Date: ${now}</div>
    ${billData?.table_name ? `<div style="font-size:10px">Table: ${billData.table_name}</div>` : ""}
    <div class="line"></div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Rate</th>
          <th style="text-align:right">Amt</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="line"></div>
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <tr><td colspan="3">Subtotal</td><td style="text-align:right">${fmt(billData?.subtotal)}</td></tr>
      ${gstLine}
      ${billData?.service_charge > 0 ? `<tr><td colspan="3">Service Charge</td><td style="text-align:right">${fmt(billData.service_charge)}</td></tr>` : ""}
      ${discount > 0 ? `<tr><td colspan="3">Discount</td><td style="text-align:right">-${fmt(discount)}</td></tr>` : ""}
      ${promo > 0 ? `<tr><td colspan="3">Promo (${billData?.promo_code ?? ""})</td><td style="text-align:right">-${fmt(promo)}</td></tr>` : ""}
    </table>
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold">
      <span>TOTAL</span><span>${fmt(billData?.grand_total ?? billData?.total)}</span>
    </div>
    ${billData?.payment_mode ? `<div style="font-size:10px;margin-top:4px">Payment: ${billData.payment_mode.toUpperCase()}</div>` : ""}
    <div class="line"></div>
    <div class="center" style="font-size:11px">Thank you! Visit again.</div>
  `;
}

/** Print via window.open with thermal CSS */
export function printReceipt(html: string): void {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head>
    <style>
      @page { size: 80mm auto; margin: 2mm; }
      body { font-family: monospace; font-size: 11px; width: 78mm; margin: 0 auto; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 4px 0; }
      table { width: 100%; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}

/** Network thermal print (ESC/POS over TCP) via server */
export async function printToNetworkPrinter(
  printerIp: string,
  port: number,
  html: string
): Promise<void> {
  await fetch("/api/print/thermal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ip: printerIp, port, html }),
  });
}
