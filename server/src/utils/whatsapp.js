import { env } from '../config/env.js';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export const whatsappConfigured = () =>
  Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_TEMPLATE_NAME);

/** Sends an approved template through the WhatsApp Business Cloud API. Throws with the API's reason on failure. */
export async function sendWhatsAppTemplate(to, parameters) {
  const response = await fetch(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: env.WHATSAPP_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_TEMPLATE_LANG },
        components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text: String(text) })) }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `WhatsApp API returned ${response.status}`);
  }
}
