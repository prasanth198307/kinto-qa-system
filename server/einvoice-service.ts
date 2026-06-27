/**
 * SwachERP e-Invoice Service
 * Integrates with NIC IRP (Invoice Registration Portal) for IRN generation
 * and NIC e-Way Bill portal for e-Way Bill generation
 * 
 * Supports both:
 * - Sandbox: https://einv-apisandbox.nic.in
 * - Production: https://einvoice1.gst.gov.in
 */

import { db, pool } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────
const NIC_SANDBOX_URL = "https://einv-apisandbox.nic.in";
const NIC_PROD_URL    = "https://einvoice1.gst.gov.in";

async function getEInvoiceConfig(): Promise<{
  clientId: string; clientSecret: string; username: string; password: string;
  gstin: string; mode: 'sandbox' | 'production';
} | null> {
  try {
    const rows = await pool.query(`
      SELECT key, value FROM platform_settings 
      WHERE key IN ('einvoice_client_id','einvoice_client_secret','einvoice_username',
                    'einvoice_password','einvoice_gstin','einvoice_mode')
    `);
    const cfg: Record<string, string> = {};
    for (const r of rows.rows) cfg[r.key] = r.value;
    if (!cfg.einvoice_client_id || !cfg.einvoice_gstin) return null;
    return {
      clientId:     cfg.einvoice_client_id,
      clientSecret: cfg.einvoice_client_secret,
      username:     cfg.einvoice_username,
      password:     cfg.einvoice_password,
      gstin:        cfg.einvoice_gstin,
      mode:         (cfg.einvoice_mode || 'sandbox') as 'sandbox' | 'production',
    };
  } catch { return null; }
}

// ── Auth Token ────────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

async function getAuthToken(cfg: NonNullable<Awaited<ReturnType<typeof getEInvoiceConfig>>>): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  
  const baseUrl = cfg.mode === 'production' ? NIC_PROD_URL : NIC_SANDBOX_URL;
  const res = await fetch(`${baseUrl}/eivital/v1.04/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client_id': cfg.clientId,
      'client_secret': cfg.clientSecret,
      'gstin': cfg.gstin,
    },
    body: JSON.stringify({
      UserName: cfg.username,
      Password: cfg.password,
      AppKey: crypto.randomBytes(32).toString('base64'),
      ForceRefreshAccessToken: true,
    }),
  });

  const data = await res.json();
  if (!data.Status || data.Status !== '1') {
    throw new Error(`e-Invoice auth failed: ${JSON.stringify(data.ErrorDetails || data)}`);
  }

  _token = data.AuthToken;
  _tokenExpiry = Date.now() + (6 * 60 * 60 * 1000); // 6 hours
  return _token!;
}

// ── Build IRN Payload from invoice data ──────────────────────────────────────
export function buildIRNPayload(invoice: any, items: any[]): any {
  const docType = invoice.invoiceType === 'Credit Note' ? 'CRN' 
                : invoice.invoiceType === 'Debit Note'  ? 'DBN' 
                : 'INV';

  const payload: any = {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: invoice.igstAmount > 0 ? "INTER" : "INTRA",
      RegRev: invoice.reverseCharge === 1 ? "Y" : "N",
      EcmGstin: null,
    },
    DocDtls: {
      Typ: docType,
      No: invoice.invoiceNumber,
      Dt: new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }).split('/').join('/'),
    },
    SellerDtls: {
      Gstin: invoice.sellerGstin,
      LglNm: invoice.sellerName,
      Addr1: (invoice.sellerAddress || '').substring(0, 100),
      Loc: invoice.sellerState || 'Andhra Pradesh',
      Pin: 535183,
      Stcd: invoice.sellerStateCode || '37',
      Ph: invoice.sellerPhone,
      Em: invoice.sellerEmail,
    },
    BuyerDtls: {
      Gstin: invoice.buyerGstin || 'URP',
      LglNm: invoice.buyerName,
      Pos: invoice.placeOfSupply || invoice.buyerStateCode || '37',
      Addr1: (invoice.buyerAddress || '').substring(0, 100),
      Loc: invoice.buyerState || '',
      Pin: 999999,
      Stcd: invoice.buyerStateCode || '37',
    },
    ItemList: items.map((item, idx) => ({
      SlNo: String(idx + 1),
      PrdDesc: item.description?.substring(0, 300) || 'Product',
      IsServc: 'N',
      HsnCd: item.hsnCode || '22029990',
      Barcde: null,
      Qty: item.quantity,
      FreeQty: 0,
      Unit: 'NOS',
      UnitPrice: (item.unitPrice / 100).toFixed(2),
      TotAmt: (item.taxableAmount / 100).toFixed(2),
      Discount: ((item.discount || 0) / 100).toFixed(2),
      PreTaxVal: (item.taxableAmount / 100).toFixed(2),
      AssAmt: (item.taxableAmount / 100).toFixed(2),
      GstRt: ((item.cgstRate + item.sgstRate + item.igstRate) / 100).toFixed(2),
      IgstAmt: (item.igstAmount / 100).toFixed(2),
      CgstAmt: (item.cgstAmount / 100).toFixed(2),
      SgstAmt: (item.sgstAmount / 100).toFixed(2),
      CesRt: (item.cessRate / 100).toFixed(2),
      CesAmt: (item.cessAmount / 100).toFixed(2),
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: (item.totalAmount / 100).toFixed(2),
    })),
    ValDtls: {
      AssVal: (invoice.subtotal / 100).toFixed(2),
      CgstVal: (invoice.cgstAmount / 100).toFixed(2),
      SgstVal: (invoice.sgstAmount / 100).toFixed(2),
      IgstVal: (invoice.igstAmount / 100).toFixed(2),
      CesVal: (invoice.cessAmount / 100).toFixed(2),
      StCesVal: 0,
      Discount: 0,
      OthChrg: (invoice.transportCharges / 100).toFixed(2),
      RndOffAmt: (invoice.roundOff / 100).toFixed(2),
      TotInvVal: (invoice.totalAmount / 100).toFixed(2),
      TotInvValFc: 0,
    },
    PayDtls: {
      Nm: invoice.accountHolderName || invoice.sellerName,
      Mode: invoice.paymentTerms || 'Cash',
    },
    RefDtls: null,
    AddlDocDtls: invoice.remarks ? [{ Url: null, Docs: invoice.remarks.substring(0, 1000), Info: null }] : null,
  };

  // Ship to if different
  if (invoice.shipToName) {
    payload.DispDtls = {
      Nm: invoice.shipToName,
      Addr1: invoice.shipToAddress || '',
      Loc: invoice.shipToCity || '',
      Pin: 999999,
      Stcd: '37',
    };
  }

  return payload;
}

// ── Generate IRN ──────────────────────────────────────────────────────────────
export async function generateIRN(invoiceId: string): Promise<{
  success: boolean;
  irn?: string;
  ackNumber?: string;
  ackDate?: string;
  signedQrCode?: string;
  error?: string;
}> {
  const cfg = await getEInvoiceConfig();
  if (!cfg) return { success: false, error: 'e-Invoice not configured. Add credentials in Super Admin > Settings.' };

  // Fetch invoice
  const invResult = await pool.query(`SELECT * FROM invoices WHERE id = $1 LIMIT 1`, [invoiceId]);
  const invoice = invResult.rows[0];
  if (!invoice) return { success: false, error: 'Invoice not found' };

  if (invoice.irn) return { success: false, error: `IRN already generated: ${invoice.irn}` };
  if (!invoice.seller_gstin) return { success: false, error: 'Seller GSTIN is required for e-Invoice' };

  // Fetch invoice items
  const itemsResult = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1 AND record_status = 1`, [invoiceId]);
  const items = itemsResult.rows;
  if (!items.length) return { success: false, error: 'No invoice items found' };

  try {
    const token = await getAuthToken(cfg);
    const baseUrl = cfg.mode === 'production' ? NIC_PROD_URL : NIC_SANDBOX_URL;

    // Map snake_case DB fields to camelCase
    const invoiceMapped = {
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      invoiceType: 'Tax Invoice',
      sellerGstin: invoice.seller_gstin,
      sellerName: invoice.seller_name,
      sellerAddress: invoice.seller_address,
      sellerState: invoice.seller_state,
      sellerStateCode: invoice.seller_state_code,
      sellerPhone: invoice.seller_phone,
      sellerEmail: invoice.seller_email,
      buyerGstin: invoice.buyer_gstin,
      buyerName: invoice.buyer_name,
      buyerAddress: invoice.buyer_address,
      buyerState: invoice.buyer_state,
      buyerStateCode: invoice.buyer_state_code,
      shipToName: invoice.ship_to_name,
      shipToAddress: invoice.ship_to_address,
      shipToCity: invoice.ship_to_city,
      subtotal: invoice.subtotal,
      cgstAmount: invoice.cgst_amount,
      sgstAmount: invoice.sgst_amount,
      igstAmount: invoice.igst_amount,
      cessAmount: invoice.cess_amount,
      transportCharges: invoice.transport_charges,
      roundOff: invoice.round_off,
      totalAmount: invoice.total_amount,
      reverseCharge: invoice.reverse_charge,
      placeOfSupply: invoice.place_of_supply,
      paymentTerms: invoice.payment_terms,
      accountHolderName: invoice.account_holder_name,
      remarks: invoice.remarks,
    };

    const itemsMapped = items.map(item => ({
      description: item.description,
      hsnCode: item.hsn_code,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      taxableAmount: item.taxable_amount,
      discount: item.discount,
      cgstRate: item.cgst_rate,
      cgstAmount: item.cgst_amount,
      sgstRate: item.sgst_rate,
      sgstAmount: item.sgst_amount,
      igstRate: item.igst_rate,
      igstAmount: item.igst_amount,
      cessRate: item.cess_rate,
      cessAmount: item.cess_amount,
      totalAmount: item.total_amount,
    }));

    const payload = buildIRNPayload(invoiceMapped, itemsMapped);

    const res = await fetch(`${baseUrl}/eicore/v1.03/Invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': cfg.clientId,
        'client_secret': cfg.clientSecret,
        'user_name': cfg.username,
        'authtoken': token,
        'gstin': cfg.gstin,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.Status === '1' && data.InfoDtls?.[0]) {
      const info = data.InfoDtls[0];
      const irn = info.Irn;
      const ackNo = info.AckNo;
      const ackDate = info.AckDt;
      const signedQr = info.SignedQRCode;
      const signedInvoice = info.SignedInvoice;

      // Save to DB
      await pool.query(`
        UPDATE invoices SET
          irn = $1, irn_status = 'generated', irn_generated_at = NOW(),
          ack_number = $2, ack_date = $3,
          signed_invoice = $4, signed_qr_code = $5
        WHERE id = $6
      `, [irn, ackNo, ackDate, signedInvoice, signedQr, invoiceId]);

      return { success: true, irn, ackNumber: ackNo, ackDate, signedQrCode: signedQr };
    } else {
      const errMsg = data.ErrorDetails?.map((e: any) => e.ErrorMessage).join(', ') || JSON.stringify(data);
      return { success: false, error: errMsg };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Cancel IRN ────────────────────────────────────────────────────────────────
export async function cancelIRN(invoiceId: string, reason: string, remarks: string): Promise<{
  success: boolean; error?: string;
}> {
  const cfg = await getEInvoiceConfig();
  if (!cfg) return { success: false, error: 'e-Invoice not configured' };

  const invResult = await pool.query(`SELECT * FROM invoices WHERE id = $1 LIMIT 1`, [invoiceId]);
  const invoice = invResult.rows[0];
  if (!invoice?.irn) return { success: false, error: 'No IRN found for this invoice' };

  try {
    const token = await getAuthToken(cfg);
    const baseUrl = cfg.mode === 'production' ? NIC_PROD_URL : NIC_SANDBOX_URL;

    const res = await fetch(`${baseUrl}/eicore/v1.03/Invoice/Cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': cfg.clientId,
        'client_secret': cfg.clientSecret,
        'user_name': cfg.username,
        'authtoken': token,
        'gstin': cfg.gstin,
      },
      body: JSON.stringify({
        Irn: invoice.irn,
        CnlRsn: reason,
        CnlRem: remarks,
      }),
    });

    const data = await res.json();
    if (data.Status === '1') {
      await pool.query(`
        UPDATE invoices SET irn_status = 'cancelled', einvoice_cancelled_at = NOW(),
        einvoice_cancel_reason = $1 WHERE id = $2
      `, [reason, invoiceId]);
      return { success: true };
    }
    return { success: false, error: JSON.stringify(data.ErrorDetails || data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Generate e-Way Bill ───────────────────────────────────────────────────────
export async function generateEWayBill(invoiceId: string, transMode: string, transId: string, transName: string, vehNo: string, vehType: string): Promise<{
  success: boolean; ewayBillNo?: string; ewayBillDate?: string; validUpto?: string; error?: string;
}> {
  const cfg = await getEInvoiceConfig();
  if (!cfg) return { success: false, error: 'e-Invoice not configured' };

  const invResult = await pool.query(`SELECT * FROM invoices WHERE id = $1 LIMIT 1`, [invoiceId]);
  const invoice = invResult.rows[0];
  if (!invoice?.irn) return { success: false, error: 'Generate IRN first before e-Way Bill' };

  try {
    const token = await getAuthToken(cfg);
    const baseUrl = cfg.mode === 'production' ? NIC_PROD_URL : NIC_SANDBOX_URL;

    const res = await fetch(`${baseUrl}/eiewb/v1.03/ewaybill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client_id': cfg.clientId,
        'client_secret': cfg.clientSecret,
        'user_name': cfg.username,
        'authtoken': token,
        'gstin': cfg.gstin,
      },
      body: JSON.stringify({
        Irn: invoice.irn,
        Distance: 100,
        TransMode: transMode || '1', // 1=Road, 2=Rail, 3=Air, 4=Ship
        TransId: transId || '',
        TransName: transName || '',
        TrnDocDt: new Date().toLocaleDateString('en-IN'),
        TrnDocNo: invoice.invoice_number,
        VehNo: vehNo || '',
        VehType: vehType || 'R', // R=Regular, O=Over Dimensional Cargo
      }),
    });

    const data = await res.json();
    if (data.Status === '1' && data.InfoDtls?.[0]) {
      const info = data.InfoDtls[0];
      await pool.query(`
        UPDATE invoices SET
          eway_bill_number = $1, eway_bill_date = NOW(), eway_bill_valid_upto = $2,
          eway_bill_status = 'generated'
        WHERE id = $3
      `, [info.EwbNo, info.EwbValidTill, invoiceId]);
      return { success: true, ewayBillNo: info.EwbNo, ewayBillDate: info.EwbDt, validUpto: info.EwbValidTill };
    }
    return { success: false, error: JSON.stringify(data.ErrorDetails || data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── Get IRN Details ───────────────────────────────────────────────────────────
export async function getIRNDetails(irn: string): Promise<any> {
  const cfg = await getEInvoiceConfig();
  if (!cfg) return null;
  try {
    const token = await getAuthToken(cfg);
    const baseUrl = cfg.mode === 'production' ? NIC_PROD_URL : NIC_SANDBOX_URL;
    const res = await fetch(`${baseUrl}/eicore/v1.03/Invoice/irn/${irn}`, {
      headers: {
        'client_id': cfg.clientId,
        'client_secret': cfg.clientSecret,
        'user_name': cfg.username,
        'authtoken': token,
        'gstin': cfg.gstin,
      },
    });
    return await res.json();
  } catch { return null; }
}
