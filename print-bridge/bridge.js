// E-Savdo Print Bridge
// Tiny local HTTP server that receives receipt data from the web app
// and prints it directly to a thermal printer via ESC/POS protocol.
// No Windows printer driver required (bypasses the driver entirely).

const express = require("express");
const cors = require("cors");
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require("node-thermal-printer");

const PORT = 9100;
const VERSION = "1.0.0";

const app = express();
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "1mb" }));

let CONFIG = {
  printerName: process.env.ESAVDO_PRINTER_NAME || "XP-365B",
  printerType: PrinterTypes.EPSON,
  characterSet: CharacterSet.PC866_CYRILLIC2,
  width: 48,
};

function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

function buildPrinter() {
  return new ThermalPrinter({
    type: CONFIG.printerType,
    interface: `printer:${CONFIG.printerName}`,
    characterSet: CONFIG.characterSet,
    removeSpecialCharacters: false,
    lineCharacter: "-",
    breakLine: BreakLine.WORD,
    width: CONFIG.width,
    options: {
      timeout: 5000,
    },
  });
}

app.get("/", (_req, res) => {
  res.json({
    name: "E-Savdo Print Bridge",
    version: VERSION,
    status: "ok",
    printer: CONFIG.printerName,
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, version: VERSION });
});

app.get("/config", (_req, res) => {
  res.json(CONFIG);
});

app.post("/config", (req, res) => {
  const { printerName, characterSet, width } = req.body || {};
  if (printerName) CONFIG.printerName = String(printerName);
  if (characterSet && CharacterSet[characterSet]) CONFIG.characterSet = CharacterSet[characterSet];
  if (width && Number.isFinite(width)) CONFIG.width = Number(width);
  log("Config updated", CONFIG);
  res.json(CONFIG);
});

app.post("/print", async (req, res) => {
  const data = req.body || {};
  log("Print request for receipt", data.id || "(no id)");
  try {
    const printer = buildPrinter();
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      log("Printer not connected:", CONFIG.printerName);
      return res.status(503).json({
        ok: false,
        error: `Printer "${CONFIG.printerName}" topilmadi. Windows Printers ro'yxatida shu nom bilan o'rnatilganini tekshiring.`,
      });
    }

    printer.alignCenter();

    if (data.storeName) {
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.bold(true);
      printer.println(String(data.storeName).toUpperCase());
      printer.bold(false);
      printer.setTextNormal();
    }

    if (data.storeAddress) printer.println(String(data.storeAddress));
    if (data.storePhone) printer.println(String(data.storePhone));

    printer.drawLine();

    if (data.id) {
      printer.alignLeft();
      printer.println(`Chek: ${String(data.id).slice(0, 12)}`);
    }
    if (data.date) {
      printer.println(`Sana: ${String(data.date)}`);
    }

    if (data.customerName || data.customerPhone) {
      printer.drawLine();
      if (data.customerName) printer.println(`Mijoz: ${data.customerName}`);
      if (data.customerPhone) printer.println(`Tel:   ${data.customerPhone}`);
    }

    printer.drawLine();

    const items = Array.isArray(data.items) ? data.items : [];
    for (const item of items) {
      if (!item) continue;
      const name = String(item.name || "");
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const total = Number(item.total || qty * price);

      printer.alignLeft();
      printer.println(name);
      printer.leftRight(
        `  ${qty} x ${price.toLocaleString("ru-RU")}`,
        `${total.toLocaleString("ru-RU")}`
      );
    }

    printer.drawLine();

    if (data.totalAmount != null) {
      const total = Number(data.totalAmount);
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.leftRight("JAMI:", `${total.toLocaleString("ru-RU")} so'm`);
      printer.bold(false);
      printer.setTextNormal();
    }

    if (data.paymentMethod) {
      printer.alignRight();
      printer.println(`To'lov: ${data.paymentMethod}`);
    }

    if (data.footer) {
      printer.drawLine();
      printer.alignCenter();
      printer.println(String(data.footer));
    }

    if (data.telegramUsername) {
      printer.alignCenter();
      printer.println(`Telegram: @${data.telegramUsername}`);
    }

    printer.newLine();
    printer.newLine();
    printer.cut();

    const ok = await printer.execute();
    log("Print", ok ? "OK" : "FAIL");
    res.json({ ok: !!ok });
  } catch (err) {
    log("Print error:", err && err.message ? err.message : err);
    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : "Print failed",
    });
  }
});

app.post("/print-test", async (_req, res) => {
  log("Test print request");
  try {
    const printer = buildPrinter();
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(503).json({ ok: false, error: "Printer ulanmagan" });
    }
    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.bold(true);
    printer.println("TEST CHEK");
    printer.bold(false);
    printer.setTextNormal();
    printer.drawLine();
    printer.alignLeft();
    printer.println("E-Savdo Print Bridge");
    printer.println(`Versiya: ${VERSION}`);
    printer.println(`Printer: ${CONFIG.printerName}`);
    printer.println(`Sana: ${new Date().toLocaleString("uz-UZ")}`);
    printer.drawLine();
    printer.alignCenter();
    printer.println("Agar bu chek to'g'ri chiqsa,");
    printer.println("printer to'g'ri ishlamoqda!");
    printer.newLine();
    printer.newLine();
    printer.cut();
    const ok = await printer.execute();
    res.json({ ok: !!ok });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  log(`E-Savdo Print Bridge v${VERSION} running on http://127.0.0.1:${PORT}`);
  log(`Printer: ${CONFIG.printerName}`);
  log(`Bridge ready. Web ilovangiz endi chekni avto chop etadi.`);
});

process.on("SIGINT", () => {
  log("Shutting down...");
  process.exit(0);
});
