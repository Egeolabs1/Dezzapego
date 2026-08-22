import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || 'Dezzapego <noreply@dezzapego.com>';

export function isEmailConfigured() {
  return Boolean(resendApiKey && from);
}

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  if (!resendApiKey) throw new Error('RESEND_API_KEY não configurada.');
  const resend = new Resend(resendApiKey);
  const result = await resend.emails.send({ from, to: input.to, subject: input.subject, html: input.html });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function emailLayout(title: string, body: string, action?: { label: string; href: string }) {
  const button = action
    ? `<p><a href="${action.href}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${action.label}</a></p>`
    : '';
  return `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><div style="max-width:560px;margin:32px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px"><h1 style="font-size:22px">${title}</h1>${body}${button}<p style="font-size:12px;color:#6b7280">Você recebeu este e-mail porque possui uma conta no Dezzapego.</p></div></body></html>`;
}
