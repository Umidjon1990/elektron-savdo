# Product photos and campaign prices

Click a product photo to open the full image in the customer catalog/cart or
admin POS/inventory/detail view. The lightbox supports Escape, close button,
background click, zoom controls and two-finger zoom. Only the dedicated Add/+
button adds a product; sold-out product photos remain available.

In Inventory → Add/Edit → price section, enable **Chegirma qo'llash** and enter
an integer UZS price below the ordinary selling price. Disabling saves NULL.
`products.price` remains the ordinary price; nullable `discount_price` is the
active campaign unit price. Startup migration adds the column and a CHECK.
Changing the ordinary price must leave an active campaign valid, or disable it.
Cost, original USD cost, debts, wholesale and barcode-label prices are untouched.
Existing fallback to barcode/wholesale for missing retail prices remains; a
campaign requires a positive ordinary retail price. No schedule or bulk campaign
management is introduced.

`shared/pricing.ts` supplies the same unit selling price to catalog, cart and
POS. Manual POS discount/markup is a separate signed **line** amount applied once
after the campaign. Inventory potential sale value and XLSX use the active retail
price; inventory cost uses the existing replacement-cost policy independently.
These potential inventory values are not realized profits.

Public order creation loads products in the store's tenant, ignores submitted
names/unit prices and calculates the amount on the server. A changed total
returns 409 and current lines. The cart updates prices and asks the customer to
confirm again. Online POS v1 checkout similarly confirms current tenant prices
and computes profit before issuing a receipt; a stale till cart is refreshed.
Double payment clicks are guarded while a checkout is in progress. An online
failure is shown instead of silently accepting an unconfirmed sale.

Transaction product snapshots store the actual unit sale price (and the regular
price for reference), with campaign disabled in that frozen snapshot. Receipts
therefore never reprice when the live catalog changes. Offline sales retain that
snapshot in IndexedDB, send pricingVersion=1/pricingMode=snapshot on replay, and
are arithmetically validated server-side with tenant-scoped product lookup.
The existing trusted-cashier offline model is preserved: disconnected sales
cannot be validated against the catalog state at their historical sale time.
Legacy pending transactions remain compatible. Authenticated paid delivery
orders retain the sale's agreed/manual adjusted amount.

Validation:

- `npm run test:pricing`: campaign validation, current prices, tenant boundaries,
  manual discount/markup, historical/offline snapshots, decimal quantities,
  printable receipt totals and matching inventory/XLSX sale values.
- `npm run test:inventory`: existing USD/UZS, workbook, pagination and tenant API checks.
- Browser QA with mocked API: customer cart, image click vs add, out-of-stock
  preview, campaign edit/disable, invalid price rejection, desktop/mobile lightbox,
  POS campaign + manual discount checkout. No real stock is changed by QA.
- Build: `node --import tsx script/build.ts` (equivalent to the project's build
  script, without the local sandbox's tsx CLI IPC limitation).
