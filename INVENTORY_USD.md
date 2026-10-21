# Ombor: USD tannarxi va reviziya eksporti

## Sabab va hisob siyosati

Kirim formasi `supplierCurrency`, `supplierOriginalPrice` va `supplierCurrencyRate`
maydonlarini saqlaydi. `costPrice` esa INTEGER UZS. Oldingi Ombor kartasi faqat
`sum(costPrice * stock)` hisoblagan va asl USD narxini jadvalda ko'rsatmagan.
Bu USD ko'rsatish talabi bajarilmaganini tasdiqlaydi; mijozning barcha hisob
tafovutlarini yoki tarixiy qoldiqlarning to'g'riligini o'zidan isbotlamaydi.

Qayta kirim mavjud mahsulot tannarxini almashtiradi. Mahsulot modelida alohida
partiya/FIFO tarixi yoki `warehouseId` yo'q. Shu siyosat saqlandi: joriy birlik
tannarxi joriy qoldiqqa qo'llanadi, do'kon chegarasi `tenantId` bilan aniqlanadi.

## Yangi oqim

- `GET /api/inventory/report`: autentifikatsiyadan olingan tenantning barcha
  mahsulotlarini bitta so'rovda oladi; aniq o'nlik hisob, manba/holat va versiya.
- `GET /api/inventory/export?version=...`: ayni hisob versiyasi uchun haqiqiy
  XLSX. Qoldiq/narx o'zgargan bo'lsa 409, UI yangilab qayta urinishni so'raydi.
- Ikkala endpoint mavjud authenticated mahsulot katalogi ruxsat siyosatiga amal
  qiladi. Tenant query/bodydan olinmaydi. Hech qanday qoldiq yozuvi bajarilmaydi.
- POSning `/api/products` to'liq sinxronlashuv oqimi o'zgartirilmadi. IndexedDB
  qo'shimcha valyuta maydonlarini saqlaydi; ular yangi indeks talab qilmaydi.
- Offline ko'rinish kesh deb belgilanadi; server reviziyasi eksporti bloklanadi.

`shared/inventory-valuation.ts` USD jamisini asl `supplierOriginalPrice`dan
hisoblaydi. Eski USD yozuvda asl narx 0, UZS tannarx va o'sha yozuvning kursi
musbat bo'lsa, `costPrice / supplierCurrencyRate` tiklangan qiymat deb alohida
belgilanadi. Uning kirim sanasi bazada yo'q. UZS kirimni bugungi kursga bo'lib
USD sifatida ko'rsatmaydi. Yetishmaydigan ma'lumotlar 0 bilan yashirilmaydi.

USD narxi va qoldiqning mavjud REAL ustunlari o'zgartirilmadi. Decimal arifmetika
bazada saqlanib qolgan qiymatlar bilan ishlaydi; tarixda REAL aniqligi tufayli
yo'qolgan raqamlarni tiklay olmaydi. Oldingi kirim partiyalarini ham tiklamaydi.
Hisob 40 muhim raqam aniqligida, ekrandagi pul ko'rinishi 2 kasr bilan beriladi.
Yangi USD kirim/tahrirda UZS ekvivalenti API tomonidan Decimal bilan qayta
hisoblanib INTEGER chegarasida yaxlitlanadi. Asl USD qiymati alohida saqlanadi.

Sotuv qiymati UZSda qoldiqlarning sotuv narxidagi qiymati bo'lib qoladi; u real
tushum yoki foyda deb atalmaydi. Qarz va nasiya hisob siyosatlari o'zgartirilmadi.
Dona, kg, litr va metr jamlari ajratiladi.

## Excel

`Ombor reviziya` — barcha rekvizitlar, narxlar, valyuta/manba, sonli kataklar,
jamlar va sanoq/farq formulalari. `Chop etish - sanoq` — qog'ozda reviziya uchun
ixcham A4 landscape varaq. Har bir varaqdagi sanoq mustaqil; import yo'q.
Identifikatorlar va shtrix-kodlar matn, boshlang'ich nollar saqlanadi. Tashqi
matnlar formula sifatida yozilmaydi. Sarlavhalar takrorlanadi; sana Toshkent
vaqtida. Excelning sonli kataklari o'zining floating-point chekloviga ega;
server Decimal jamlari dastlabki kesh natijalari sifatida ham yoziladi.

## Tekshiruv

`npm run test:inventory`: hisob, kurs, tarixiy tiklash, noma'lum qiymatlar,
qayta kirimdagi mavjud siyosat, kasr qoldiq, 151 qatorli XLSXni qayta ochish,
barcode nollari, formula xavfsizligi, bo'sh inventar, tenant chegarasi, versiya
mosligi va eksportning yozuv bajarmasligi uchun 10 test.

Build: `node --import tsx script/build.ts` (sandboxdagi tsx CLI Unix IPC
cheklovini chetlab, o'sha build skriptini bajaradi). Client/server build o'tdi.
`npm run check`: boshlang'ich holatda 23, keyin 21 oldindan mavjud xato. Ombor
Product turlaridagi 2 xato tuzatildi; qolgan settings/routes/storage xatolari
ushbu vazifa doirasida o'zgartirilmadi.

Mahalliy mock API bilan Chromium: USD qiymati, qidiruv, filtr, XLSX yuklash,
409 dan keyin yangilash, mobil kenglik va offline eksport tekshirildi.
Bu testlar production ma'lumotlarini o'zgartirmaydi.

LibreOffice Calc'da XLSX ochildi, PDFga A4 chop etildi. Bo'sh sanoq -> bo'sh farq,
0 sanoq -> -3, 3 sanoq (tizimda 2) -> +1 va 45.55 USD jami qayta hisoblandi.

Sun'iy namunani yaratish:
`node --import tsx script/inventory-sample.ts /absolute/output-directory`
