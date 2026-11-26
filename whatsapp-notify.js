/**
 * English Perfume – WhatsApp new-order notification
 * --------------------------------------------------
 * Call notifyNewOrder(order) from your server right after an order is saved.
 * Needs Node 18+ (built-in fetch). No other packages required.
 *
 * Two ways to send (choose in .env with WA_PROVIDER):
 *   callmebot  – free, easiest. Messages YOUR own WhatsApp number.
 *   cloud      – official WhatsApp Business Cloud API (Meta). Needs an approved template.
 */

const RM = n => 'RM ' + Number(n).toLocaleString('en-MY', { maximumFractionDigits: 2 });

/** Builds the text you receive on WhatsApp. */
function buildMessage(order) {
  const items = (order.items || [])
    .map(i => `• ${i.name} x${i.qty} — ${RM(i.lineTotal ?? i.unitPrice * i.qty)}`)
    .join('\n');
  const t = order.totals || {};
  const ship = t.shipping ?? t.ship ?? 0;
  return [
    `🛍️ NEW ORDER ${order.orderNo}`,
    '',
    `Name: ${order.customer?.name}`,
    `Phone: ${order.customer?.phone}`,
    order.customer?.email ? `Email: ${order.customer.email}` : null,
    `Address: ${order.shipping?.address}, ${order.shipping?.city}, ${order.shipping?.state}`,
    '',
    'Items:',
    items,
    '',
    `Delivery: ${ship ? RM(ship) : 'Free'}`,
    `Total (cash on delivery): ${RM(t.total)}`,
    '',
    order.notes ? `Customer notes: ${order.notes}` : null,
    `Customer chat: https://wa.me/${String(order.customer?.phone || '').replace(/\D/g, '').replace(/^0/, '60')}`,
  ].filter(l => l !== null).join('\n');
}

async function viaCallMeBot(text, env) {
  const url = (env.CALLMEBOT_URL || 'https://api.callmebot.com/whatsapp.php')
    + `?phone=${encodeURIComponent(env.WA_OWNER_NUMBER)}`
    + `&text=${encodeURIComponent(text)}`
    + `&apikey=${encodeURIComponent(env.CALLMEBOT_APIKEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('CallMeBot failed: ' + res.status + ' ' + (await res.text()));
}

async function viaCloudApi(text, order, env) {
  // Business-initiated messages must use an APPROVED TEMPLATE.
  // Create a template named by WA_TEMPLATE_NAME with ONE body variable {{1}} (the order text).
  const res = await fetch(`https://graph.facebook.com/v20.0/${env.WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.WA_CLOUD_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: env.WA_OWNER_NUMBER,
      type: 'template',
      template: {
        name: env.WA_TEMPLATE_NAME || 'new_order_alert',
        language: { code: env.WA_TEMPLATE_LANG || 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: text.replace(/\n/g, ' | ').slice(0, 1000) }] }],
      },
    }),
  });
  if (!res.ok) throw new Error('WhatsApp Cloud API failed: ' + res.status + ' ' + (await res.text()));
}

/** Send the owner a WhatsApp message for a new order. Never throws into your order flow if you .catch() it. */
async function notifyNewOrder(order, env = process.env) {
  if (!env.WA_OWNER_NUMBER) throw new Error('WA_OWNER_NUMBER is not set (digits only, e.g. 60177468939)');
  const text = buildMessage(order);
  const provider = (env.WA_PROVIDER || 'callmebot').toLowerCase();
  if (provider === 'cloud') return viaCloudApi(text, order, env);
  if (!env.CALLMEBOT_APIKEY) throw new Error('CALLMEBOT_APIKEY is not set');
  return viaCallMeBot(text, env);
}

module.exports = { notifyNewOrder, buildMessage };
