import { salePrice } from "@shared/pricing";
import ExcelJS from "exceljs";
import type { Product } from "@shared/schema";
import { costSourceLabels, decimal, inventoryPolicy, summarizeInventory, valueInventoryProduct } from "@shared/inventory-valuation";

export function createInventoryWorkbook(products: Product[], tenantName: string, generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "E-Savdo";
  workbook.created = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Ombor reviziya", {
    views: [{ state: "frozen", ySplit: 6, xSplit: 3 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      printTitlesRow: "1:6", margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } },
  });
  sheet.headerFooter.oddFooter = "&L E-Savdo — Ombor&C&P / &N";
  const totals = summarizeInventory(products);
  const time = new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", dateStyle: "short", timeStyle: "medium" }).format(generatedAt);
  const notes = [
    `${tenantName} — OMBOR / REVIZIYA`,
    `Sana: ${time} (Asia/Tashkent). Qamrov: barcha ${products.length} ta mahsulot; qidiruv va filtrlar qo'llanmagan.`,
    inventoryPolicy,
    `USD jami: ${totals.totalUsd}. USD aniqlanmagan: ${totals.unknownCount}; UZS kirim: ${totals.uzsCount}; kursdan tiklangan: ${totals.restoredCount}; xato qoldiq: ${totals.invalidCount}; xato sotuv qiymati: ${totals.invalidSaleCount}.`,
    "Sanoq bo'sh bo'lsa farq ham bo'sh; 0 — haqiqiy nol sanoq. Summalar to'liq aniqlikda jamlanadi, ekranda 2 kasr ko'rsatiladi. Kursdan tiklangan narxning kirim sanasi bazada yo'q.",
  ];
  notes.forEach((text, i) => {
    sheet.mergeCells(i + 1, 1, i + 1, 15);
    sheet.getCell(i + 1, 1).value = text; // plain string, never an Excel formula
    sheet.getCell(i + 1, 1).alignment = { wrapText: true, vertical: "middle" };
    sheet.getRow(i + 1).height = i === 0 ? 25 : 28;
  });
  sheet.getCell("A1").font = { name: "Calibri", bold: true, size: 16, color: { argb: "FF1D4ED8" } };
  const headers = ["Tartib", "Mahsulot ID/kodi", "Nomi", "Kategoriya", "Shtrix-kod", "Birlik", "Tizimdagi qoldiq", "Birlik tannarxi USD", "Jami tannarx USD", "Sotuv narxi", "Sotuv valyutasi", "Haqiqiy sanoq", "Farq", "Tannarx manbasi / holati", "Jami sotuv qiymati UZS"];
  sheet.getRow(6).values = headers;
  sheet.getRow(6).height = 38;
  sheet.getRow(6).eachCell(cell => {
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  const widths = [7, 18, 29, 17, 19, 9, 13, 14, 15, 15, 10, 13, 12, 31, 17];
  widths.forEach((width, i) => { sheet.getColumn(i + 1).width = width; });
  for (const [i, p] of Array.from(products.entries())) {
    const v = valueInventoryProduct(p);
    const r = i + 7;
    // Excel stores numbers in IEEE-754; decimal calculations have already been
    // performed exactly, with conversion only at this output boundary.
    const numeric = (value: string | number | null | undefined) => value === null || value === undefined ? null : (decimal(value)?.toNumber() ?? null);
    sheet.getRow(r).values = [i + 1, String(p.id), p.name, p.category, String(p.barcode), p.unit || "dona", numeric(v.quantity), numeric(v.unitUsd),
      v.totalUsd === null ? null : { formula: `G${r}*H${r}`, result: numeric(v.totalUsd)! }, numeric(salePrice(p)), "UZS", null,
      { formula: `IF(AND(ISNUMBER(L${r}),ISNUMBER(G${r})),L${r}-G${r},"")` },
      `${costSourceLabels[v.source]}${v.invalidQuantity ? "; Qoldiq noto'g'ri" : ""}${v.saleUzs === null ? "; Sotuv qiymati noto'g'ri" : ""}`,
      v.saleUzs === null ? null : { formula: `G${r}*J${r}`, result: numeric(v.saleUzs)! }];
    sheet.getRow(r).height = 34;
    sheet.getRow(r).eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    });
    for (const col of [2, 5]) sheet.getCell(r, col).numFmt = "@";
    for (const col of [7, 12, 13]) sheet.getCell(r, col).numFmt = "0.########";
    for (const col of [8, 9, 10, 15]) sheet.getCell(r, col).numFmt = "#,##0.00########";
    sheet.getCell(r, 12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    sheet.getCell(r, 12).dataValidation = { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true, showErrorMessage: true, error: "Sanoq 0 yoki undan katta son bo'lishi kerak" };
  }
  const end = products.length + 6;
  if (products.length) sheet.autoFilter = { from: "A6", to: `O${end}` };
  const totalRow = end + 2;
  sheet.getCell(totalRow, 3).value = totals.partial ? "JAMI (USD qisman)" : "JAMI";
  sheet.getCell(totalRow, 9).value = products.length ? { formula: `SUM(I7:I${end})`, result: Number(totals.totalUsd) } : 0;
  sheet.getCell(totalRow, 15).value = products.length ? { formula: `SUM(O7:O${end})`, result: Number(totals.totalSaleUzs) } : 0;
  for (const col of [9, 15]) sheet.getCell(totalRow, col).numFmt = "#,##0.00########";
  sheet.getRow(totalRow).font = { bold: true, size: 11 };
  let next = totalRow + 1;
  for (const [unit, quantity] of Object.entries(totals.quantities)) {
    sheet.getCell(next, 3).value = `Jami qoldiq (${unit})`;
    sheet.getCell(next, 7).value = Number(quantity);
    sheet.getCell(next++, 7).numFmt = "0.########";
  }
  sheet.pageSetup.printArea = `A1:O${next}`;
  // A compact A4 sheet keeps the physical count readable. The full financial
  // sheet remains available for calculation; neither sheet writes to the app.
  const countSheet = workbook.addWorksheet("Chop etish - sanoq", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:4",
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } },
  });
  countSheet.headerFooter.oddFooter = "&L E-Savdo — Sanoq&C&P / &N";
  [notes[0], notes[1], "Qog'ozdagi reviziya uchun. Sanoq va farq har bir varaqda alohida; tizim qoldig'i o'zgarmaydi."].forEach((text, i) => {
    countSheet.mergeCells(i + 1, 1, i + 1, 8);
    countSheet.getCell(i + 1, 1).value = text;
    countSheet.getCell(i + 1, 1).alignment = { wrapText: true, vertical: "middle" };
    countSheet.getRow(i + 1).height = 26;
  });
  countSheet.getRow(1).font = { name: "Calibri", bold: true, size: 15 };
  countSheet.getRow(4).values = ["Tartib", "Mahsulot\nID/kodi", "Nomi", "Shtrix-kod", "Birlik", "Tizimdagi\nqoldiq", "Haqiqiy\nsanoq", "Farq"];
  countSheet.getRow(4).height = 32;
  countSheet.getRow(4).eachCell(c => {
    c.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
  });
  [7, 17, 36, 20, 10, 16, 16, 14].forEach((width, i) => { countSheet.getColumn(i + 1).width = width; });
  products.forEach((p, i) => {
    const r = i + 5;
    const q = decimal(p.stock)?.toNumber() ?? null;
    countSheet.getRow(r).values = [i + 1, String(p.id), p.name, String(p.barcode), p.unit || "dona", q, null,
      { formula: `IF(AND(ISNUMBER(G${r}),ISNUMBER(F${r})),G${r}-F${r},"")` }];
    countSheet.getRow(r).height = 32;
    countSheet.getRow(r).eachCell({ includeEmpty: true }, c => {
      c.font = { name: "Calibri", size: 11 };
      c.alignment = { wrapText: true, vertical: "middle" };
      c.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } };
    });
    for (const col of [2, 4]) countSheet.getCell(r, col).numFmt = "@";
    for (const col of [1, 5, 6, 7, 8]) countSheet.getCell(r, col).alignment = { horizontal: "center", vertical: "middle" };
    for (const col of [2, 3, 4]) countSheet.getCell(r, col).alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
    for (const col of [6, 7, 8]) countSheet.getCell(r, col).numFmt = "0.########";
    countSheet.getCell(r, 7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    countSheet.getCell(r, 7).dataValidation = { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true, showErrorMessage: true };
  });
  countSheet.pageSetup.printArea = `A1:H${Math.max(4, products.length + 4)}`;
  return workbook;
}
