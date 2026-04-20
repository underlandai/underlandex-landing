import type { APIRoute } from 'astro';

export const prerender = false;

const RECIPIENT = 'oliver@underlandex.com';

async function sendEmail(data: Record<string, string>) {
  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey) return { skipped: 'no_resend_key' };

  const { name, email, company, role, product } = data;
  const subject = `New UnderlandEX access request — ${company || name}`;
  const html = `
    <h2 style="font-family: sans-serif;">New UnderlandEX access request</h2>
    <table style="font-family: sans-serif; border-collapse: collapse;">
      <tr><td style="padding:6px 12px 6px 0;"><strong>Name</strong></td><td>${escape(name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Email</strong></td><td><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Company</strong></td><td>${escape(company)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Role</strong></td><td>${escape(role || '—')}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Product</strong></td><td>${escape(product || '—')}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Source</strong></td><td>underlandex.com landing</td></tr>
      <tr><td style="padding:6px 12px 6px 0;"><strong>Received</strong></td><td>${new Date().toISOString()}</td></tr>
    </table>
  `;

  const from = import.meta.env.RESEND_FROM || 'UnderlandEX <no-reply@underlandex.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [RECIPIENT],
      reply_to: email,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    return { error: `resend_${res.status}` };
  }
  return { ok: true };
}

function escape(s: string = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = (await request.json()) as Record<string, string>;
    const { name, email, company } = data;

    if (!name || !email || !company) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // run all downstream integrations in parallel, tolerant of individual failures
    const tasks: Promise<unknown>[] = [];

    // 1. Email via Resend → oliver@underlandex.com
    tasks.push(sendEmail(data).catch(() => undefined));

    // 2. Slack webhook
    const slackUrl = import.meta.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      const text =
        `*New UnderlandEX access request*\n` +
        `• *Name:* ${name}\n` +
        `• *Email:* ${email}\n` +
        `• *Company:* ${company}\n` +
        `• *Role:* ${data.role || '—'}\n` +
        `• *Product:* ${data.product || '—'}`;
      tasks.push(
        fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }).catch(() => undefined)
      );
    }

    // 3. Airtable Leads
    const airtablePat = import.meta.env.AIRTABLE_PAT;
    const airtableBase = import.meta.env.AIRTABLE_BASE_ID;
    const airtableTable = import.meta.env.AIRTABLE_LEADS_TABLE || 'Leads';
    if (airtablePat && airtableBase) {
      tasks.push(
        fetch(`https://api.airtable.com/v0/${airtableBase}/${encodeURIComponent(airtableTable)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${airtablePat}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            records: [
              {
                fields: {
                  Name: name,
                  Email: email,
                  Company: company,
                  Role: data.role || '',
                  Product: data.product || '',
                  Source: 'underlandex.com landing',
                  'Requested At': new Date().toISOString(),
                },
              },
            ],
          }),
        }).catch(() => undefined)
      );
    }

    await Promise.all(tasks);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
