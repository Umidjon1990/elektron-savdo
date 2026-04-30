// E-Savdo Print Bridge client
// Communicates with the local Print Bridge running on POS terminal at http://127.0.0.1:9100
// Bridge sends raw ESC/POS commands to thermal printer (no Windows driver needed).

export const BRIDGE_URL = "http://127.0.0.1:9100";
export const BRIDGE_PRINTER_NAME_KEY = "esavdo.bridge.printerName";

export interface BridgeStatus {
  available: boolean;
  version?: string;
  printer?: string;
  error?: string;
}

export interface PrintReceiptPayload {
  id?: string;
  date?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ name: string; quantity: number; price: number; total: number }>;
  totalAmount: number;
  paymentMethod?: string;
  footer?: string;
  telegramUsername?: string;
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 1500): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBridge(timeoutMs = 1200): Promise<BridgeStatus> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/health`, { method: "GET" }, timeoutMs);
    if (!res.ok) return { available: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { available: true, version: data?.version };
  } catch (err: any) {
    return { available: false, error: err?.message || "Bridge ishlamayapti" };
  }
}

export async function getBridgeConfig(): Promise<{ printerName?: string } | null> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/config`, { method: "GET" }, 1500);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function setBridgePrinter(printerName: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/config`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printerName }),
      },
      2000,
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function printViaBridge(payload: PrintReceiptPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `${BRIDGE_URL}/print`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      8000,
    );
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) errMsg = data.error;
      } catch {}
      return { ok: false, error: errMsg };
    }
    const data = await res.json();
    return { ok: !!data?.ok, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Bridge bilan aloqa yo'q" };
  }
}

export async function testPrintViaBridge(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetchWithTimeout(`${BRIDGE_URL}/print-test`, { method: "POST" }, 8000);
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) errMsg = data.error;
      } catch {}
      return { ok: false, error: errMsg };
    }
    const data = await res.json();
    return { ok: !!data?.ok, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Bridge bilan aloqa yo'q" };
  }
}

export function getSavedPrinterName(): string {
  try {
    return localStorage.getItem(BRIDGE_PRINTER_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveBridgePrinterName(name: string): void {
  try {
    localStorage.setItem(BRIDGE_PRINTER_NAME_KEY, name);
  } catch {}
}
