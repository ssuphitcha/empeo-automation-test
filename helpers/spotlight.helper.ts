import { Page } from '@playwright/test';

/**
 * Red frame + step caption drawn inside the page, so the recorded video shows
 * what the test is touching and which step it is on.
 *  - the frame follows click / focus / typing / selecting (injected once, runs on every page load)
 *  - the caption (bottom of the screen) shows the current test.step title
 * Nothing here changes the page behaviour: both layers ignore the pointer.
 */
const INIT_SCRIPT = `(() => {
  if (window.__pwSpot) return; window.__pwSpot = true;
  const RED = '#e5484d';
  let frame, tag, caption, timer;
  const root = () => document.documentElement;
  const ensure = () => {
    if (!frame || !frame.isConnected) {
      frame = document.createElement('div');
      frame.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;display:none;border:3px solid ' + RED +
        ';border-radius:6px;box-shadow:0 0 0 3px rgba(229,72,77,.25);transition:all .12s ease-out';
      tag = document.createElement('div');
      tag.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;display:none;background:' + RED +
        ';color:#fff;font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif;padding:3px 8px;border-radius:5px;max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      root().appendChild(frame); root().appendChild(tag);
    }
    if (!caption || !caption.isConnected) {
      caption = document.createElement('div');
      caption.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;left:50%;bottom:14px;transform:translateX(-50%);' +
        'background:rgba(20,20,24,.88);color:#fff;font:500 14px/1.4 ui-sans-serif,system-ui,sans-serif;padding:7px 14px;border-radius:8px;max-width:80vw;text-align:center;display:none';
      root().appendChild(caption);
    }
  };
  const text = (el) => {
    const g = (a) => el.getAttribute && el.getAttribute(a);
    const lab = g('aria-label') || g('placeholder') || g('data-testid') || (el.innerText || '').trim().split('\\n')[0] || el.tagName.toLowerCase();
    return lab.slice(0, 40);
  };
  const show = (el, label) => {
    if (!el || !el.getBoundingClientRect) return;
    ensure();
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    frame.style.cssText += ';display:block;left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;width:' + (r.width + 8) + 'px;height:' + (r.height + 8) + 'px';
    tag.textContent = label; tag.style.display = 'block';
    tag.style.left = Math.max(6, r.left - 4) + 'px';
    tag.style.top = (r.top > 30 ? r.top - 30 : r.bottom + 8) + 'px';
    clearTimeout(timer);
    timer = setTimeout(() => { frame.style.display = 'none'; tag.style.display = 'none'; }, 1200);
  };
  const target = (e) => {
    const t = e.target;
    if (!t || !t.closest) return null;
    const hit = t.closest('button,a,input,textarea,select,label,[role=button],[role=option],[role=combobox],[data-testid],li');
    const el = hit || t;
    const r = el.getBoundingClientRect();
    // a click on empty page space would ring a huge container, which says nothing
    if (r.width * r.height > innerWidth * innerHeight * 0.25) return null;
    return el;
  };
  const shown = (el) => (el.type === 'password' ? '••••••••' : String(el.value ?? '').slice(0, 40));
  document.addEventListener('click', (e) => { const el = target(e); if (el) show(el, 'Click: ' + text(el)); }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) show(el, 'Field: ' + text(el));
  }, true);
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) show(el, 'Type "' + shown(el) + '" in ' + text(el));
  }, true);
  window.__pwCaption = (t) => {
    try { sessionStorage.setItem('__pwCaption', t || ''); } catch (e) {}
    const paint = () => { ensure(); caption.textContent = t || ''; caption.style.display = t ? 'block' : 'none'; };
    if (document.documentElement) paint();
  };
  const restore = () => { try { const t = sessionStorage.getItem('__pwCaption'); if (t) window.__pwCaption(t); } catch (e) {} };
  document.addEventListener('DOMContentLoaded', restore);
  window.addEventListener('load', restore);
})();`;

export class SpotlightHelper {
  static async install(page: Page): Promise<void> {
    await page.addInitScript(INIT_SCRIPT);
  }

  /** Writes the current step title at the bottom of the page (kept across reloads). */
  static async caption(page: Page, text: string): Promise<void> {
    if (page.isClosed()) return;
    await page.evaluate((t) => (window as any).__pwCaption?.(t), text).catch(() => {});
  }
}
