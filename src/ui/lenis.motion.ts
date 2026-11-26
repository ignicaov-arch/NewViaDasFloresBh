import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function setupLenisSmoothScroll(): () => void {
  const lenis = new Lenis({
    respectReducedMotion: false,
    lerp: 0.06,
    wheelMultiplier: 1.1,
    overscroll: true,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.075,
    touchMultiplier: 1.5,
    autoRaf: false,
    prevent: (node) =>
      Boolean(node.closest('#map, [data-lenis-prevent], .scrollable-modal, dialog[open]'))
  });

  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);

  const onLenisTick = (time: number): void => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(onLenisTick);
  gsap.ticker.lagSmoothing(0);

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  });
  ro.observe(document.body);

  const handleAnchorClick = (event: Event): void => {
    const link = (event.target as Element | null)?.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const targetEl = document.querySelector(href);
    if (!targetEl) return;
    event.preventDefault();
    lenis.scrollTo(targetEl as HTMLElement, { offset: -72, duration: 1.25 });
  };
  document.addEventListener('click', handleAnchorClick);

  return () => {
    document.removeEventListener('click', handleAnchorClick);
    if (resizeTimer !== undefined) clearTimeout(resizeTimer);
    ro.disconnect();
    gsap.ticker.remove(onLenisTick);
    lenis.off('scroll', ScrollTrigger.update);
    lenis.destroy();
    if (window.__lenis === lenis) {
      delete window.__lenis;
    }
  };
}
