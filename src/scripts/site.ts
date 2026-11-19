// UnderlandEX landing: page behaviour. Works with Astro view transitions:
// document-level listeners are bound once, per-page set-up runs on astro:page-load.
import type { StrataHandle } from './strata-scene';

declare global {
  interface Window {
    __uexBound?: boolean;
    __strata?: StrataHandle | null;
  }
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- mobile navigation
const setNav = (open: boolean) => {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector<HTMLElement>('[data-nav-toggle]');
  if (!nav || !toggle) return;
  nav.dataset.open = String(open);
  toggle.setAttribute('aria-expanded', String(open));
};

// ---- request-access dialog: any [data-open-request-access] or a[href="#request-access"], plus the hash
const modal = () => document.getElementById('request-access-modal') as HTMLDialogElement | null;
let opener: HTMLElement | null = null;

const openModal = (from?: HTMLElement | null) => {
  const m = modal();
  if (!m || m.open) return;
  opener = from || (document.activeElement as HTMLElement | null);
  if (typeof m.showModal === 'function') m.showModal();
  else m.setAttribute('open', '');
  m.querySelector<HTMLInputElement>('input')?.focus();
};
const closeModal = () => {
  const m = modal();
  if (!m || !m.open) return;
  if (typeof m.close === 'function') m.close();
  else m.removeAttribute('open');
};

const setStatus = (text: string, kind?: 'error' | 'ok') => {
  const status = document.getElementById('ra-status');
  if (!status) return;
  status.textContent = text;
  if (kind) status.dataset.kind = kind;
  else delete status.dataset.kind;
};

const submitRequest = async (form: HTMLFormElement) => {
  if (!form.checkValidity()) {
    setStatus('Please complete your name, work email, company and role.', 'error');
    form.querySelector<HTMLElement>(':invalid')?.focus();
    return;
  }
  setStatus('Submitting…');
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch('/api/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('request failed');
    setStatus('Thanks — check your inbox.', 'ok');
    form.reset();
    setTimeout(closeModal, 1800);
  } catch {
    setStatus('Something went wrong. Email oliver@underlandex.com.', 'error');
  }
};

// ---- statistics count up once, when they scroll into view
const countUp = () => {
  const nums = document.querySelectorAll<HTMLElement>('[data-count]');
  if (!nums.length || reduceMotion() || !('IntersectionObserver' in window)) return;
  const fmt = new Intl.NumberFormat('en-AU');
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        const end = Number(el.dataset.count);
        if (!Number.isFinite(end) || end <= 0) continue;
        // start within the same number of digits, so the figure never changes width
        const start = Math.max(end * 0.6, 10 ** (String(Math.round(end)).length - 1));
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / 1400);
          const eased = 1 - (1 - p) ** 4;
          el.textContent = fmt.format(Math.round(start + (end - start) * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 0.6 }
  );
  nums.forEach((n) => io.observe(n));
};

// ---- 3D scene: its own chunk, loaded after first paint when the hero block is near the viewport.
// The poster stays for reduced motion, data saver, no WebGL, or a failed load.
const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
};

const idle = (fn: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
};

const destroyScene = () => {
  window.__strata?.destroy();
  window.__strata = null;
};

const loadScene = () => {
  const host = document.querySelector<HTMLElement>('[data-strata]');
  if (!host) return;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reduceMotion() || saveData || !('IntersectionObserver' in window) || !hasWebGL()) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import('./strata-scene')
        .then((m) => {
          if (!host.isConnected) return;
          destroyScene();
          window.__strata = m.mount(host, {
            onReady: () => (host.dataset.state = 'live'),
            onLost: () => (host.dataset.state = 'poster'),
          });
        })
        .catch(() => {
          host.dataset.state = 'poster';
        });
    },
    { rootMargin: '200px' }
  );
  io.observe(host);
};

// ---- bind once
if (!window.__uexBound) {
  window.__uexBound = true;

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest('[data-nav-toggle]')) {
      setNav(document.getElementById('site-nav')?.dataset.open !== 'true');
      return;
    }
    const trigger = t.closest<HTMLElement>('[data-open-request-access], a[href="#request-access"]');
    if (trigger) {
      e.preventDefault();
      setNav(false);
      openModal(trigger);
      return;
    }
    if (t.closest('#site-nav a')) setNav(false);
    // close button, or a click on the backdrop (the dialog element itself)
    if (t.closest('[data-close-request-access]') || t === modal()) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('site-nav')?.dataset.open === 'true') {
      setNav(false);
      document.querySelector<HTMLElement>('[data-nav-toggle]')?.focus();
    }
  });

  // capture phase: the default is prevented before the view-transitions router sees the submit
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target as HTMLFormElement | null;
      if (form?.id !== 'request-access-form') return;
      e.preventDefault();
      void submitRequest(form);
    },
    true
  );

  // the dialog's close event does not bubble: listen in the capture phase
  document.addEventListener(
    'close',
    (e) => {
      if (e.target !== modal()) return;
      if (location.hash === '#request-access') history.replaceState(null, '', location.pathname + location.search);
      setStatus('');
      opener?.focus?.();
      opener = null;
    },
    true
  );

  window.addEventListener('hashchange', () => {
    if (location.hash === '#request-access') openModal();
  });

  document.addEventListener('astro:before-swap', destroyScene);

  const onPage = () => {
    if (location.hash === '#request-access') openModal();
    countUp();
    if (document.readyState === 'complete') idle(loadScene);
    else window.addEventListener('load', () => idle(loadScene), { once: true });
  };
  if (document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
    document.addEventListener('astro:page-load', onPage);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPage, { once: true });
  } else {
    onPage();
  }
}
