export function createNode<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Conecta clique, teclado e toque longo (450ms) dos cards ao Lightbox de leitura completa. */
export function bindReviewModal(root: Document | HTMLElement): void {
  const modal = document.getElementById('reviewLightbox');
  const modalRich = document.getElementById('reviewLightboxRich');
  const closeModal = (): void => {
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  const openModal = (card: HTMLElement): void => {
    if (!modal || !modalRich) return;
    const author = createNode('strong', '', card.dataset.author || 'Cliente Google');
    const time = createNode('small', 'gmaps-time', card.dataset.time || 'Avaliação no Google Maps');
    const txt = createNode('p', '', card.dataset.fullText || '');
    modalRich.replaceChildren(author, time, txt);
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = 'true';
    document.getElementById('reviewLightboxClose')?.addEventListener('click', closeModal);
    document.getElementById('reviewLightboxBackdrop')?.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
  }
  root.querySelectorAll<HTMLElement>('.review-card').forEach((card) => {
    if (card.dataset.bound) return;
    card.dataset.bound = 'true';
    let timer = 0, sx = 0, sy = 0, held = false;
    card.addEventListener('click', () => {
      if (held) { held = false; return; }
      openModal(card);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
    });
    card.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX; sy = t.clientY; held = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { held = true; openModal(card); }, 450);
    }, { passive: true });
    card.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t && (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10)) window.clearTimeout(timer);
    }, { passive: true });
    card.addEventListener('touchend', () => window.clearTimeout(timer), { passive: true });
    card.addEventListener('touchcancel', () => window.clearTimeout(timer), { passive: true });
  });
}

/** Fallback 60fps via requestAnimationFrame caso o Windows desative CSS keyframes (MinAnimate=0). */
export function attachTrackRafFallback(track: HTMLElement): void {
  if (track.dataset.rafBound) return;
  track.dataset.rafBound = 'true';
  let last = performance.now(), offset = 0, paused = false;
  track.addEventListener('mouseenter', () => { paused = true; });
  track.addEventListener('mouseleave', () => { paused = false; });
  window.setTimeout(() => {
    const st = window.getComputedStyle(track);
    if (st.animationDuration !== '0.01ms' && st.animationName !== 'none') return;
    const isLtr = Boolean(track.closest('.marquee-ltr'));
    const half = track.scrollWidth / 2;
    if (isLtr) offset = -half;
    const step = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!paused && half > 0) {
        offset = isLtr
          ? (offset + 56 * dt >= 0 ? -half : offset + 56 * dt)
          : (Math.abs(offset - 56 * dt) >= half ? 0 : offset - 56 * dt);
        track.style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
      }
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, 400);
}
