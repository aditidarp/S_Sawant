/**
 * Honest order notification dispatcher for S. SAWANT.
 * Never claims a notification was sent if the provider is not configured or fails.
 */

export async function sendOrderNotification({ order, eventType }) {
  const trackingUrl = `${process.env.SITE_URL || "http://localhost:5173"}/track-order?orderId=${encodeURIComponent(order.id)}`;
  const results = [];

  // WhatsApp Cloud API integration (if configured)
  const waToken = process.env.WHATSAPP_API_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const customerPhone = String(order.customer?.phone || "").replace(/\D/g, "");

  if (waToken && waPhoneId && customerPhone) {
    try {
      const to = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
      const body = [
        `S. SAWANT MENS WEAR — ${eventType}`,
        `Order ID: ${order.id}`,
        `Payment Status: ${order.paymentStatus}`,
        `Order Status: ${order.status}`,
        `Track your order: ${trackingUrl}`,
      ].join("\n");

      const resp = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        results.push({ channel: "whatsapp", sent: false, error: errText });
      } else {
        results.push({ channel: "whatsapp", sent: true, timestamp: new Date().toISOString() });
      }
    } catch (err) {
      results.push({ channel: "whatsapp", sent: false, error: err.message });
    }
  } else {
    results.push({
      channel: "whatsapp",
      sent: false,
      reason: "WhatsApp API credentials not configured on server",
    });
  }

  return results;
}
