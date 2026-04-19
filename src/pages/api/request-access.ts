import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = (await request.json()) as Record<string, string>;
    const { name, email, company, role, product } = data;

    if (!name || !email || !company) {
      return new Response(JSON.stringify({ error: 'missing_fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const slackUrl = import.meta.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      const text =
        `*New UnderlandEX access request*\n` +
        `• *Name:* ${name}\n` +
        `• *Email:* ${email}\n` +
        `• *Company:* ${company}\n` +
        `• *Role:* ${role || '—'}\n` +
        `• *Product:* ${product || '—'}`;
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      }).catch(() => undefined);
    }

    const airtablePat = import.meta.env.AIRTABLE_PAT;
    const airtableBase = import.meta.env.AIRTABLE_BASE_ID;
    const airtableTable = import.meta.env.AIRTABLE_LEADS_TABLE || 'Leads';
    if (airtablePat && airtableBase) {
      await fetch(`https://api.airtable.com/v0/${airtableBase}/${encodeURIComponent(airtableTable)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${airtablePat}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Name: name,
                Email: email,
                Company: company,
                Role: role || '',
                Product: product || '',
                Source: 'underlandex.com landing',
                'Requested At': new Date().toISOString(),
              },
            },
          ],
        }),
      }).catch(() => undefined);
    }

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
