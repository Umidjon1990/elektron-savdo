import type { Transaction } from "@/lib/transaction-context";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  card: "Karta",
  click: "Click",
  payme: "Payme",
  transfer: "Pul o'tkazma",
  uzcard: "Uzcard",
  humo: "Humo",
};

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReceiptSettingsLike {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  receiptFooter?: string;
  telegramUsername?: string;
}

export interface BuildReceiptHtmlParams {
  transaction: Transaction;
  settings: ReceiptSettingsLike;
  tenantSettings?: any;
}

export function getPaymentLabel(method: string, tenantSettings?: any): string {
  if (tenantSettings?.paymentMethods) {
    const found = tenantSettings.paymentMethods.find((m: any) => m.id === method);
    if (found) return found.name;
  }
  return PAYMENT_LABELS[method] || method;
}

export function buildReceiptHtml({ transaction, settings, tenantSettings }: BuildReceiptHtmlParams): string {
  if (!transaction) return '';

  const receiptLogo = tenantSettings?.receiptLogo || tenantSettings?.logo;

  const logoHtml = receiptLogo
    ? `<img src="${escapeHtml(receiptLogo)}" alt="Logo" style="width:45px;height:45px;display:block;margin:0 auto 4px;object-fit:contain;">`
    : `<div style="width:45px;height:45px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;"><span style="font-size:24px;font-weight:900;color:#4f46e5;">${escapeHtml((settings.storeName || 'S').charAt(0).toUpperCase())}</span></div>`;

  const customerHtml = (transaction.customerName || transaction.customerPhone) ? `
    <div style="border-top:1px dashed #666;margin:4px 0;"></div>
    <div style="font-size:10px;color:#000;margin-bottom:4px;">
      ${transaction.customerName ? `<p style="margin:0;font-weight:600;">Mijoz: ${escapeHtml(transaction.customerName)}</p>` : ''}
      ${transaction.customerPhone ? `<p style="margin:0;font-weight:600;">Tel: ${escapeHtml(transaction.customerPhone)}</p>` : ''}
      ${transaction.customerInfo && typeof transaction.customerInfo === 'object' ? Object.values(transaction.customerInfo).map(v => `<p style="margin:0;font-weight:600;">${escapeHtml(v)}</p>`).join('') : ''}
    </div>
  ` : '';

  const safeItems = (transaction.items || []).filter((item: any) => item && item.product);

  const itemsHtml = safeItems.map((item: any) => `
    <div style="margin-bottom:4px;color:#000;">
      <div style="font-size:11px;font-weight:700;">${escapeHtml(item.product.name)}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;">
        <span style="font-weight:600;">${escapeHtml(item.quantity)} x ${Number(item.product.price || 0).toLocaleString()}</span>
        <span style="font-weight:700;font-family:monospace;">${(item.quantity * Number(item.product.price || 0)).toLocaleString()}</span>
      </div>
    </div>
  `).join('');

  const qrHtml = settings.telegramUsername ? `
    <div style="text-align:center;margin:10px 0;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://t.me/${encodeURIComponent(settings.telegramUsername)}&color=000000" alt="QR" style="width:60px;height:60px;display:block;margin:0 auto;">
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Chek</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 80mm;
    background: #fff;
    color: #000;
    font-family: Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt {
    width: 80mm;
    padding: 2mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  p { margin: 0; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
  <div class="receipt">
    <div style="text-align:center;margin-bottom:8px;">
      ${logoHtml}
      <h2 style="font-size:14px;font-weight:900;margin:0;color:#000;">${escapeHtml((settings.storeName || '').toUpperCase())}</h2>
      <p style="font-size:10px;color:#000;margin:2px 0;font-weight:600;">${escapeHtml(settings.storeAddress || '')}</p>
      <p style="font-size:10px;color:#000;margin:0;font-weight:600;">${escapeHtml(settings.storePhone || '')}</p>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:10px;color:#000;margin-bottom:6px;font-weight:600;text-align:center;">
      <p style="margin:0;">Chek: ${escapeHtml((transaction.id || '').slice(0, 8))}</p>
      <p style="margin:2px 0 0;">Sana: ${escapeHtml(new Date(transaction.date).toLocaleDateString())}</p>
    </div>
    ${customerHtml}
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="margin-bottom:6px;">${itemsHtml}</div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <table style="width:100%;font-size:11px;color:#000;margin-bottom:6px;">
      <tr>
        <td style="font-weight:600;">Jami:</td>
        <td style="text-align:right;font-family:monospace;font-weight:600;">${Number(transaction.totalAmount || 0).toLocaleString()} so'm</td>
      </tr>
      <tr>
        <td style="font-size:13px;font-weight:900;">TO'LANDI:</td>
        <td style="text-align:right;font-family:monospace;font-size:13px;font-weight:900;">${Number(transaction.totalAmount || 0).toLocaleString()} so'm</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right;font-size:9px;font-weight:600;">To'lov: ${escapeHtml(getPaymentLabel(transaction.paymentMethod || 'cash', tenantSettings))}</td>
      </tr>
    </table>
    ${qrHtml}
    <div style="text-align:center;">
      <p style="font-size:10px;color:#000;margin:0;font-weight:700;">${escapeHtml(settings.receiptFooter || '')}</p>
      ${settings.telegramUsername ? `<p style="font-size:9px;color:#000;margin:2px 0 0;font-weight:600;">Telegram: @${escapeHtml(settings.telegramUsername)}</p>` : ''}
    </div>
  </div>
  <script>
    (function() {
      var printed = false;
      function doPrint() {
        if (printed) return;
        printed = true;
        try { window.focus(); window.print(); } catch (e) { console.error(e); }
        setTimeout(function() { try { window.close(); } catch (e) {} }, 500);
      }
      var imgs = document.images;
      if (!imgs || imgs.length === 0) {
        setTimeout(doPrint, 100);
        return;
      }
      var loaded = 0;
      var total = imgs.length;
      function check() {
        loaded++;
        if (loaded >= total) setTimeout(doPrint, 150);
      }
      for (var i = 0; i < total; i++) {
        var im = imgs[i];
        if (im.complete) { check(); }
        else { im.onload = check; im.onerror = check; }
      }
      setTimeout(doPrint, 3000);
    })();
  </script>
</body>
</html>`;
}
