# E-Savdo Print Bridge — Windows uchun o'rnatish

Bu kichik dastur POS komputeringizda fonda ishlaydi va veb ilovadan kelgan chek ma'lumotlarini to'g'ridan-to'g'ri termo printerga yuboradi. **Drayver kerak emas** — ESC/POS protokoli orqali ishlaydi.

## Foydalanuvchi uchun (POS terminal)

### 1-qadam: Faylni yuklab oling
- `EsavdoPrintBridge.exe` faylini POS komputerga ko'chiring
- Tavsiya etilgan joy: `C:\EsavdoPrintBridge\`
- `start.bat` faylini ham shu joyga ko'chiring

### 2-qadam: Printer nomini tekshiring
1. **Boshqarish paneli** (Control Panel) ni oching
2. **Devices and Printers** ga o'ting  
3. Printeringizni topib, nomini eslab qoling (masalan: `XP-365B`, `POS-58`, `Xprinter`, va h.k.)

### 3-qadam: Bridge'ni boshlang
- `start.bat` ga ikki marta bosing
- Qora oyna ochiladi va **"Bridge ready"** yozuvi chiqadi
- **Bu oynani yopmang!** Yopilsa, chek chiqmaydi.

### 4-qadam: Veb ilovaga sozlang
1. Brauzerda E-Savdo'ni oching
2. **Sozlamalar → Printer** bo'limiga o'ting
3. **"Printer Bridge"** ulangan deb ko'rsatishi kerak (yashil ✓)
4. **"Printer nomi"** maydoniga 2-qadamdagi printer nomini kiriting (masalan: `XP-365B`)
5. **"Test chek"** tugmasini bosing — printer test chekini chiqarishi kerak

### 5-qadam: Avtomatik ishga tushirish (ixtiyoriy)
Komputer ishga tushganda Bridge avto-ochilishi uchun:
1. `Win + R` bosing
2. `shell:startup` yozing va Enter bosing
3. Ochilgan papkaga `start.bat` faylining yorlig'ini ko'chiring

## Muammolar

**"Bridge oynasi ochilmayapti"** — Antivirus to'sib qo'ygan bo'lishi mumkin. EsavdoPrintBridge.exe ni ishonchli fayllar ro'yxatiga qo'shing.

**"Printer ulanmagan"** xatosi — Bridge oynasiga qarang. Qaysi printer nomi ko'rsatilgan? U Windows'dagi printer nomi bilan to'liq mos kelishi kerak (katta-kichik harf farqi muhim emas).

**"Bridge ko'rinmayapti veb ilovada"** — Brauzerni qayta yuklang (F5). Yoki boshqa brauzer (Chrome) ishlatib ko'ring.

---

## Ishlab chiquvchi uchun (build qilish)

### Talablar
- Node.js 18+
- npm

### O'rnatish
```bash
cd print-bridge
npm install
```

### Test (hozirgi platformada)
```bash
npm start
# http://localhost:9100/health ga so'rov yuboring
```

### Windows uchun .exe yaratish
```bash
npm run build:win
# Natija: dist/EsavdoPrintBridge.exe (~40MB)
```

`dist/EsavdoPrintBridge.exe` va `start.bat` ni POS terminallariga tarqating.

## API

Bridge `http://127.0.0.1:9100` da ishlaydi:

| Method | Endpoint | Vazifa |
|--------|----------|--------|
| GET    | `/health` | Bridge tirik-yo'qligini tekshirish |
| GET    | `/config` | Joriy sozlamalar |
| POST   | `/config` | Sozlamalarni o'zgartirish (`{printerName, characterSet, width}`) |
| POST   | `/print` | Chek chop etish (JSON body) |
| POST   | `/print-test` | Test chek chop etish |

### Print so'rov formati

```json
{
  "id": "abc123",
  "date": "30.04.2026 14:32",
  "storeName": "Mening do'konim",
  "storeAddress": "Toshkent, Chilonzor 5",
  "storePhone": "+998 90 123 45 67",
  "customerName": "Ali Valiyev",
  "customerPhone": "+998 90 555 11 22",
  "items": [
    { "name": "Coca-Cola 1L", "quantity": 2, "price": 12000, "total": 24000 }
  ],
  "totalAmount": 24000,
  "paymentMethod": "Naqd",
  "footer": "Xaridingiz uchun rahmat!",
  "telegramUsername": "esavdo_bot"
}
```
