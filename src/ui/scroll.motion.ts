import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function animateCounterValue(el: HTMLElement): void {
  if (el.dataset.counted === '1') return;
  el.dataset.counted = '1';
  const target = Number(el.dataset.ate || '0');
  const decimals = Number(el.dataset.decimais || '0');
  const suffix = el.dataset.sufixo || '';
  const state = { val: 0 };

  gsap.to(state, {
    val: target,
    duration: 1.6,
    ease: 'power3.out',
    onUpdate: () => {
      const formatted =
        decimals > 0
          ? state.val.toFixed(decimals).replace('.', ',')
          : String(Math.round(state.val));
      el.textContent = `${formatted}${suffix}`;
    }
  });
}

export function initCinematicScrollMotion(root: HTMLElement = document.body): () => void {
  const ctx = gsap.context(() => {
    const heroPhoto = root.querySelector('.hero__foto img');
    if (heroPhoto) {
      gsap.fromTo(
        heroPhoto,
        { scale: 1.07 },
        { scale: 1, duration: 2.2, ease: 'power3.out', force3D: true }
      );
    }

    const surges = root.querySelectorAll('.surge');
    if (surges.length > 0) {
      gsap.fromTo(
        surges,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 1.05,
          stagger: 0.14,
          delay: 0.18,
          ease: 'power3.out',
          force3D: true
        }
      );
    }

    root.querySelectorAll<HTMLElement>('.revela').forEach((el, idx) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          delay: (idx % 3) * 0.06,
          ease: 'power3.out',
          force3D: true,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true
          }
        }
      );
    });

    root.querySelectorAll<HTMLElement>('.obra img').forEach((img, idx) => {
      const shift = idx % 2 === 0 ? -18 : -10;
      gsap.to(img, {
        y: shift,
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger: img.closest('.obra') || img,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.7
        }
      });
    });

    const countersWrap = root.querySelector('.sobre__numeros');
    if (countersWrap) {
      ScrollTrigger.create({
        trigger: countersWrap,
        start: 'top 86%',
        once: true,
        onEnter: () => {
          countersWrap.querySelectorAll<HTMLElement>('.conta').forEach(animateCounterValue);
        }
      });
    }
  }, root);

  return () => {
    ctx.revert();
  };
}
