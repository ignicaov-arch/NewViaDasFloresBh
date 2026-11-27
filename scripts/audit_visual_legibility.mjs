#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };

export function parseCssColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  if (NAMED[s]) { const [r, g, b, a] = NAMED[s]; return { r, g, b, a }; }
  const hex = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3 || h.length === 4) {
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: h[3] ? parseInt(h[3] + h[3], 16) / 255 : 1 };
    }
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  if (!rgb) return null;
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] !== undefined ? Number(rgb[4]) : 1 };
}

export function compositeRgba(fg, bg = { r: 255, g: 255, b: 255, a: 1 }) {
  const a = fg.a ?? 1;
  return { r: Math.round(fg.r * a + bg.r * (1 - a)), g: Math.round(fg.g * a + bg.g * (1 - a)), b: Math.round(fg.b * a + bg.b * (1 - a)), a: 1 };
}

export function srgbRelativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const s = Math.max(0, Math.min(255, c)) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function wcagContrastRatio(fgInput, bgInput) {
  const fgRaw = typeof fgInput === 'string' ? parseCssColor(fgInput) : fgInput;
  const bgRaw = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput;
  if (!fgRaw || !bgRaw) return 0;
  const bg = (bgRaw.a ?? 1) < 1 ? compositeRgba(bgRaw) : bgRaw;
  const fg = (fgRaw.a ?? 1) < 1 ? compositeRgba(fgRaw, bg) : fgRaw;
  const l1 = srgbRelativeLuminance(fg), l2 = srgbRelativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function pickMirroredInk(bgInput) {
  const bg = typeof bgInput === 'string' ? parseCssColor(bgInput) : bgInput;
  if (!bg) throw new Error(`Cor inválida em pickMirroredInk: ${bgInput}`);
  const solidBg = (bg.a ?? 1) < 1 ? compositeRgba(bg) : bg;
  const bgLuminance = srgbRelativeLuminance(solidBg);
  const darkSide = bgLuminance <= 0.36;
  const inkHex = darkSide ? '#FFFFFF' : '#111827';
  return { polarity: darkSide ? 'light-ink' : 'dark-ink', inkHex, bgLuminance: Number(bgLuminance.toFixed(4)), contrastRatio: Number(wcagContrastRatio(inkHex, solidBg).toFixed(2)) };
}

export function auditExtractedDomNodes(samples = []) {
  const issues = [];
  for (const s of samples) {
    const fg = parseCssColor(s.color);
    const effOpacity = (fg?.a ?? 1) * Number(s.opacity ?? 1);
    if (!fg || effOpacity < 0.45) { issues.push({ text: s.text, reason: 'Texto quase transparente (opacity < 0.45)' }); continue; }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const rawBg of s.ancestorBgs || []) {
      const parsed = parseCssColor(rawBg);
      if (parsed && parsed.a > 0) bg = compositeRgba(parsed, bg);
    }
    const fgEff = compositeRgba({ ...fg, a: effOpacity }, bg);
    if (s.unshieldedOverMedia && srgbRelativeLuminance(fgEff) < 0.28) {
      issues.push({ text: s.text, reason: 'Escrita escura sobre foto/vídeo sem placa opaca própria (Polaridade Espelhada exige escrita clara + scrim)' });
      continue;
    }
    const px = Number(s.fontSize || 16), wt = Number(s.fontWeight || 400);
    const minRatio = (px >= 24 || (px >= 18.66 && wt >= 700)) ? 3.0 : 4.5;
    const ratio = wcagContrastRatio(fgEff, bg);
    if (!s.unshieldedOverMedia && ratio < minRatio) issues.push({ text: s.text, reason: `Contraste ${ratio.toFixed(2)}:1 abaixo de ${minRatio}:1` });
  }
  return issues;
}

function isDarkThemeMeta(meta) {
  if (typeof meta.isDarkTheme === 'boolean') return meta.isDarkTheme;
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (const raw of [meta.htmlBg, meta.bodyBg]) {
    const parsed = parseCssColor(raw);
    if (parsed && parsed.a > 0) bg = compositeRgba(parsed, bg);
  }
  return srgbRelativeLuminance(bg) < 0.2;
}

export function auditSystemUiPolish(meta = {}) {
  const issues = [];
  if (meta.rootScrollbarHidden) {
    issues.push({ text: 'html/body', reason: 'Scrollbar principal oculta (scrollbar-width: none) prejudica acessibilidade' });
  }
  if (isDarkThemeMeta(meta) && (meta.hasScrollableContainer || meta.selectCount > 0) && !meta.hasDarkColorScheme) {
    issues.push({ text: 'color-scheme', reason: 'Tema escuro com scroll/select sem color-scheme: dark gera UI/barra branca no sistema' });
  }
  for (const sel of meta.rawSelects || []) {
    issues.push({ text: `<select ${sel.label}>`, reason: 'Dropdown <select> cru sem appearance: none/base-select ou padding de chevron' });
  }
  return issues;
}

async function extractSystemUiMeta(page) {
  return page.evaluate(() => {
    const htmlSt = getComputedStyle(document.documentElement), bodySt = getComputedStyle(document.body);
    const scheme = `${htmlSt.colorScheme || ''} ${bodySt.colorScheme || ''}`;
    const hasScrollable = [...document.querySelectorAll('*')].some(el => /(?:auto|scroll)/.test(getComputedStyle(el).overflowY) && el !== document.documentElement && el !== document.body);
    const selects = [...document.querySelectorAll('select')].filter(s => getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility !== 'hidden');
    const rawSelects = selects.filter(s => {
      const st = getComputedStyle(s);
      return (st.appearance || st.webkitAppearance) === 'auto' || parseFloat(st.paddingRight || '0') < 28;
    }).map(s => ({ label: s.id || s.name || 'select' }));
    return { rootScrollbarHidden: htmlSt.scrollbarWidth === 'none' || bodySt.scrollbarWidth === 'none', htmlBg: htmlSt.backgroundColor, bodyBg: bodySt.backgroundColor, hasDarkColorScheme: /\bdark\b/.test(scheme), hasScrollableContainer: hasScrollable, selectCount: selects.length, rawSelects };
  });
}

async function extractDomTextSamples(page) {
  return page.evaluate(() => {
    const parseAlpha = (c) => { const m = String(c || '').match(/rgba?\([^)]*[,/]\s*([\d.]+)\s*\)/i); return m ? Number(m[1]) : (/transparent/i.test(c) ? 0 : 1); };
    const media = [...document.querySelectorAll('img, video')].map(el => ({ el, rect: el.getBoundingClientRect() })).filter(m => m.rect.width > 80 && m.rect.height > 80);
    const samples = [];
    for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,span,em,strong,label,summary')) {
      const text = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!text) continue;
      const st = getComputedStyle(el), rect = el.getBoundingClientRect();
      if (st.display === 'none' || st.visibility === 'hidden' || rect.width < 2 || rect.height < 2) continue;
      const chainEls = [];
      for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) chainEls.unshift(cur);
      const intersecting = media.filter(m => m.el !== el && !el.contains(m.el) && rect.left < m.rect.right && rect.right > m.rect.left && rect.top < m.rect.bottom && rect.bottom > m.rect.top);
      const unshieldedOverMedia = intersecting.some(m => !chainEls.some(c => c !== document.body && c !== document.documentElement && !c.contains(m.el) && parseAlpha(getComputedStyle(c).backgroundColor) >= 0.88));
      samples.push({
        text, color: st.color, opacity: parseFloat(st.opacity || '1'),
        fontSize: parseFloat(st.fontSize || '16'), fontWeight: parseInt(st.fontWeight || '400', 10),
        ancestorBgs: chainEls.map(c => getComputedStyle(c).backgroundColor),
        unshieldedOverMedia
      });
    }
    return samples;
  });
}

function parseVisualAuditArgs(argv) {
  const out = { url: 'http://127.0.0.1:4173', routes: ['/'], outDir: '.visual-audit' };
  for (const arg of argv) {
    if (arg.startsWith('--url=')) out.url = arg.slice(6).replace(/\/+$/, '');
    if (arg.startsWith('--routes=')) out.routes = arg.slice(9).split(',').map(s => s.trim()).filter(Boolean);
    if (arg.startsWith('--out=')) out.outDir = arg.slice(6).trim();
  }
  return out;
}

async function runVisualLegibilityCli() {
  const { url, routes, outDir } = parseVisualAuditArgs(process.argv.slice(2));
  const absOut = path.resolve(outDir);
  fs.mkdirSync(absOut, { recursive: true });
  const { chromium } = await import('playwright');
  let browser;
  for (const opt of [{ headless: true }, { headless: true, channel: 'msedge' }, { headless: true, channel: 'chrome' }]) {
    try { browser = await chromium.launch(opt); break; } catch { /* next */ }
  }
  if (!browser) throw new Error('Chromium/Edge/Chrome não encontrado para Playwright.');
  let totalIssues = 0;
  try {
    for (const route of routes) {
      const slug = route === '/' ? 'home' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9_-]/gi, '_');
      for (const vp of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await ctx.newPage();
        await page.goto(`${url}${route}`, { waitUntil: 'networkidle' });
        const heroShot = path.join(absOut, `${slug}-${vp.name}-hero.png`);
        const fullShot = path.join(absOut, `${slug}-${vp.name}-full.png`);
        await page.screenshot({ path: heroShot, fullPage: false });
        await page.screenshot({ path: fullShot, fullPage: true });
        console.log(`[VISÃO OBRIGATÓRIA LLM] Inspecione com read_file: ${heroShot} | ${fullShot}`);
        const issues = [
          ...auditExtractedDomNodes(await extractDomTextSamples(page)),
          ...auditSystemUiPolish(await extractSystemUiMeta(page))
        ];
        for (const it of issues.slice(0, 10)) console.error(`❌ [${route} ${vp.name}] "${it.text}": ${it.reason}`);
        totalIssues += issues.length;
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  if (totalIssues > 0) process.exit(1);
  console.log('✅ Auditoria óptica + contraste espelhado OK. Confira os .png via read_file antes de encerrar!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runVisualLegibilityCli().catch((err) => { console.error(err); process.exit(1); });
}
