// 03시 QA: 사이트맵 전 페이지를 390x844 터치·1366x768로 열어 콘솔 에러·4xx·가로 넘침·이름 없는 버튼·24px 미만 타깃·h1 개수·중복 id·깨진 내부 링크를 본다.
// 사용: npx wrangler dev --port 8799 --local 띄운 뒤 node scripts/qa/crawl.cjs (BASE=로 다른 주소). ERR_TUNNEL_CONNECTION_FAILED = 외부 광고 스크립트(오프라인 컨테이너), 무해.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8799';
(async () => {
  const sm = await (await fetch(BASE + '/sitemap.xml')).text();
  let urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  urls = [...new Set(['/', '/daily', '/play', '/play/1-1', '/gallery', ...urls])];
  const browser = await chromium.launch();
  const profiles = {
    mobile: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
    desktop: { viewport: { width: 1366, height: 768 } },
  };
  const links = new Set(); const out = [];
  for (const [name, opt] of Object.entries(profiles)) {
    const ctx = await browser.newContext(opt);
    for (const u of urls) {
      const page = await ctx.newPage();
      const errs = [], bad = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
      page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160)));
      page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/api/track')) bad.push(r.status() + ' ' + r.url().replace(BASE, '')); });
      const t0 = Date.now();
      try { await page.goto(BASE + u, { waitUntil: 'load', timeout: 20000 }); } catch (e) { errs.push('GOTO ' + e.message.slice(0, 80)); }
      await page.waitForTimeout(800);
      const ms = Date.now() - t0;
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const noName = [...document.querySelectorAll('button,a[href],[role=button]')].filter(el => {
          const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false;
          const n = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
          return !n && !el.querySelector('img[alt]:not([alt=""])');
        }).map(el => el.outerHTML.slice(0, 90));
        const small = [...document.querySelectorAll('button,a[href],input,[role=button]')].filter(el => {
          const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
          if (!b.width || s.visibility === 'hidden') return false;
          if (el.tagName === 'A' && s.display === 'inline') return false; // inline text links exempt
          return b.width < 24 || b.height < 24;
        }).map(el => `${el.tagName}:${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,20)}(${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`);
        const imgNoAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
        const h1 = document.querySelectorAll('h1').length;
        const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
        const dupIds = (() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id]||0)+1); return Object.keys(c).filter(k => c[k] > 1); })();
        return { overflow: sw > vw ? sw - vw : 0, noName, small, imgNoAlt, h1, hrefs, dupIds, lang: document.documentElement.lang, title: document.title };
      });
      r.hrefs.forEach(h => { if (h && h.startsWith('/') && !h.startsWith('//')) links.add(h.split('#')[0].split('?')[0]); });
      delete r.hrefs;
      out.push({ name, u, ms, errs: [...new Set(errs)], bad: [...new Set(bad)], ...r });
      await page.close();
    }
    await ctx.close();
  }
  const broken = [];
  for (const l of links) { if (!l) continue; const res = await fetch(BASE + l, { redirect: 'manual' }); if (res.status >= 400) broken.push(res.status + ' ' + l); }
  await browser.close();
  for (const o of out) {
    const issues = [];
    if (o.errs.length) issues.push('console:' + JSON.stringify(o.errs));
    if (o.bad.length) issues.push('http:' + JSON.stringify(o.bad));
    if (o.overflow) issues.push('hoverflow+' + o.overflow);
    if (o.noName.length) issues.push('noname:' + JSON.stringify(o.noName));
    if (o.small.length) issues.push('small:' + o.small.join(','));
    if (o.imgNoAlt) issues.push('imgNoAlt:' + o.imgNoAlt);
    if (o.h1 !== 1) issues.push('h1=' + o.h1);
    if (o.dupIds.length) issues.push('dupIds:' + o.dupIds);
    if (!o.lang) issues.push('nolang');
    console.log(`[${o.name}] ${o.u} ${o.ms}ms ${issues.length ? '\n   ' + issues.join('\n   ') : 'OK'}`);
  }
  console.log('internal links checked', links.size, 'broken', JSON.stringify(broken));
})();
