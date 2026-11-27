import { attachTrackRafFallback, bindReviewModal, createNode } from './reviews-modal.ui';

export interface GoogleReviewItem {
  reviewId: string;
  authorName: string;
  authorUri?: string;
  authorPhoto?: string;
  guideBadge?: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime?: string;
}

export interface GoogleReviewsPayload {
  verified?: boolean;
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReviewItem[];
}

const AVATAR_COLORS = ['#742751', '#0f5c56', '#1e40af', '#92400e', '#3730a3', '#9f1239'];
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function createSvgNode<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function createStarSvg(): SVGSVGElement {
  const svg = createSvgNode('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: '#FBBC04', 'aria-hidden': 'true' });
  svg.appendChild(createSvgNode('path', { d: STAR_PATH, 'vector-effect': 'non-scaling-stroke' }));
  return svg;
}

function createDotsSvg(): SVGSVGElement {
  const svg = createSvgNode('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: '#5e5256', 'aria-hidden': 'true' });
  [5, 12, 19].forEach((cy) => svg.appendChild(createSvgNode('circle', { cx: 12, cy, r: 1.8 })));
  return svg;
}

function buildReviewCard(rev: GoogleReviewItem, index: number, isCompact: boolean): HTMLElement {
  const card = createNode('article', isCompact ? 'review-card review-card--compact' : 'review-card');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Ler avaliação de ${rev.authorName}`);
  Object.assign(card.dataset, { author: rev.authorName, time: rev.relativeTime, fullText: rev.text });

  const top = createNode('div', 'gmaps-card-top');
  const wrap = createNode('div', 'gmaps-author-wrap');
  const makeFallback = (): HTMLElement => {
    const initial = (rev.authorName || 'A').trim().charAt(0).toUpperCase() || 'A';
    const fb = createNode('span', 'gmaps-avatar-fallback', initial);
    fb.style.backgroundColor = AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#742751';
    return fb;
  };

  if (rev.authorPhoto && rev.authorPhoto.includes('lh3.googleusercontent.com')) {
    const img = createNode('img', 'gmaps-avatar');
    img.src = rev.authorPhoto;
    img.alt = `Foto de ${rev.authorName}`;
    img.width = 36;
    img.height = 36;
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.replaceWith(makeFallback()), { once: true });
    wrap.appendChild(img);
  } else {
    wrap.appendChild(makeFallback());
  }

  const meta = createNode('div', 'gmaps-author-meta');
  meta.append(
    createNode('span', 'gmaps-author-name', rev.authorName),
    createNode('span', 'gmaps-author-sub', rev.guideBadge || 'Avaliação no Google Maps')
  );
  wrap.appendChild(meta);
  top.append(wrap, createDotsSvg());

  const row = createNode('div', 'gmaps-rating-row');
  const stars = createNode('span', 'gmaps-stars');
  stars.setAttribute('aria-label', '5 estrelas');
  for (let i = 0; i < 5; i++) stars.appendChild(createStarSvg());
  row.append(stars, createNode('span', 'gmaps-time', rev.relativeTime));

  card.append(top, row, createNode('p', 'gmaps-text', rev.text));
  return card;
}

function populateTrack(track: HTMLElement, items: GoogleReviewItem[], isCompact: boolean): void {
  track.replaceChildren();
  const minHalfCount = 6;
  const tiled: GoogleReviewItem[] = [];
  while (tiled.length < minHalfCount) tiled.push(...items);
  tiled.forEach((rev, i) => {
    const card = buildReviewCard(rev, i, isCompact);
    if (i >= items.length) {
      card.setAttribute('aria-hidden', 'true');
      card.tabIndex = -1;
      card.dataset.clone = 'true';
    }
    track.appendChild(card);
  });
  tiled.forEach((rev, i) => {
    const clone = buildReviewCard(rev, i, isCompact);
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;
    clone.dataset.clone = 'true';
    track.appendChild(clone);
  });
}

/** Hidrata avaliações reais 5★ do Google em 2 faixas no site e 1 faixa no LinkBio. */
export async function hydrateGoogleReviews(): Promise<void> {
  const sections = document.querySelectorAll<HTMLElement>('[data-google-reviews]');
  if (!sections.length) return;
  let payload: GoogleReviewsPayload | null = null;
  for (const url of ['/api/google-reviews', '/data/google-reviews.json']) {
    try {
      const res = await fetch(url);
      if (res.ok) { payload = (await res.json()) as GoogleReviewsPayload; break; }
    } catch { /* fallback json estatico */ }
  }
  sections.forEach((section) => {
    const limit = Number(section.getAttribute('data-max-reviews') || 20);
    const isSingle = section.getAttribute('data-reviews-layout') === 'single';
    const fiveStars = (payload?.reviews || []).filter((r) => r.rating === 5 && Boolean(r.text?.trim())).slice(0, limit);
    if (!payload?.verified || !fiveStars.length) { section.hidden = true; return; }
    const badge = section.querySelector<HTMLElement>('[data-reviews-badge]');
    if (badge && payload.rating && payload.userRatingCount) {
      badge.textContent = `Avaliações Google · ${Number(payload.rating).toFixed(1)}★ (${payload.userRatingCount.toLocaleString('pt-BR')} no Google)`;
    }
    const marqueeBox = section.querySelector<HTMLElement>('.testimonials-marquee-container');
    const staticGrid = section.querySelector<HTMLElement>('[data-reviews-static]');
    const row1 = section.querySelector<HTMLElement>('[data-reviews-row="1"]');
    const row2 = section.querySelector<HTMLElement>('[data-reviews-row="2"]');
    const row2Box = row2?.closest<HTMLElement>('.marquee-row') || null;
    if (fiveStars.length < 2) {
      if (marqueeBox) marqueeBox.hidden = true;
      if (staticGrid) { staticGrid.hidden = false; staticGrid.replaceChildren(...fiveStars.map((r, i) => buildReviewCard(r, i, isSingle))); }
    } else if (isSingle && row1) {
      if (staticGrid) staticGrid.hidden = true;
      if (marqueeBox) { marqueeBox.hidden = false; marqueeBox.classList.add('marquee-single'); }
      row1.closest('.marquee-row')?.classList.replace('marquee-ltr', 'marquee-rtl');
      if (row2Box) row2Box.hidden = true;
      populateTrack(row1, fiveStars, true);
    } else if (row1 && row2) {
      if (staticGrid) staticGrid.hidden = true;
      if (marqueeBox) marqueeBox.hidden = false;
      if (row2Box) row2Box.hidden = false;
      const splitAt = Math.ceil(fiveStars.length / 2);
      populateTrack(row1, fiveStars.slice(0, splitAt), false);
      populateTrack(row2, fiveStars.slice(splitAt), false);
    }
    section.hidden = false;
    bindReviewModal(section);
    section.querySelectorAll<HTMLElement>('.marquee-track').forEach(attachTrackRafFallback);
  });
}
