const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface OrderItem {
  productId?: string;
  productName?: string;
  quantity: number;
  price?: number;
  product?: {
    name: string;
    price: number;
  };
}

interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerTelegram?: string | null;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  deliveryType: string;
  createdAt: Date | string;
}

function formatOrderMessage(order: OrderData): string {
  const deliveryText = order.deliveryType === 'delivery' ? '🚚 Kuryer orqali' : '🏢 Olib ketish';
  const paymentText = getPaymentMethodText(order.paymentMethod);
  
  const itemsList = order.items.map((item) => {
    const name = item.productName || item.product?.name || 'Noma\'lum';
    const price = item.price || item.product?.price || 0;
    const subtotal = price * item.quantity;
    return `  • ${name} x${item.quantity} = ${subtotal.toLocaleString()} so'm`;
  }).join('\n');

  const telegramLink = order.customerTelegram 
    ? `\n📲 Telegram: ${order.customerTelegram.replace(/@/g, '')}` 
    : '';

  return `📦 *YANGI BUYURTMA!*

👤 *Mijoz:* ${order.customerName}
📞 *Telefon:* ${order.customerPhone}${telegramLink}

📚 *Mahsulotlar:*
${itemsList}

💰 *Jami:* ${order.totalAmount.toLocaleString()} so'm
${deliveryText}
💳 *To'lov:* ${paymentText}

🕐 ${new Date(order.createdAt).toLocaleString('uz-UZ')}
📋 Buyurtma ID: \`${order.id}\``;
}

function getPaymentMethodText(method: string): string {
  switch (method) {
    case 'cash':
      return 'Naqd';
    case 'card':
      return 'Karta';
    case 'click':
      return 'Click';
    case 'payme':
      return 'Payme';
    case 'online':
      return 'Online';
    default:
      return method;
  }
}

export async function sendTelegramNotification(order: OrderData): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not configured, skipping notification');
    return false;
  }

  const message = formatOrderMessage(order);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
      return false;
    }

    console.log('Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}
