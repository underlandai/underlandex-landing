import type { APIRoute } from 'astro';

export const prerender = false;

// Vercel cron hits this to trigger a fresh deploy hook.
// Refreshes the build-time stats fetch + M&A teaser deal feed + sitemap.
// Set REBUILD_HOOK_URL in Vercel env vars → Vercel project settings → Git → Deploy Hooks.
export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const expected = import.meta.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const hookUrl = import.meta.env.REBUILD_HOOK_URL;
  if (!hookUrl) {
    return new Response(JSON.stringify({ ok: false, reason: 'no_hook_configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, triggered_at: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
