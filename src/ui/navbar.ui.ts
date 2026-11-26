import { buildWhatsappUrl } from '../domain/whatsapp.rules';

export function bindWhatsappLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-whatsapp]').forEach((anchor) => {
    anchor.href = buildWhatsappUrl(anchor.dataset.whatsapp);
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  });
}

export function initSiteNavbar(): () => void {
  const header = document.getElementById('topo');
  const toggleBtn = document.getElementById('abrir');
  const hero = document.getElementById('inicio');
  const nav = document.getElementById('menu');

  const syncHeaderScroll = (): void => {
    if (!header) return;
    const threshold = hero ? Math.max(80, hero.offsetHeight - 100) : 24;
    header.classList.toggle('is-rolou', window.scrollY > threshold);
  };

  const closeMenu = (): void => {
    if (!header || !toggleBtn) return;
    header.classList.remove('is-aberto');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const handleToggle = (): void => {
    if (!header || !toggleBtn) return;
    const isOpen = header.classList.toggle('is-aberto');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && header?.classList.contains('is-aberto')) {
      closeMenu();
      toggleBtn?.focus();
    }
  };

  const handleOutsideClick = (e: MouseEvent): void => {
    if (!header?.classList.contains('is-aberto')) return;
    if (!header.contains(e.target as Node)) closeMenu();
  };

  syncHeaderScroll();
  window.addEventListener('scroll', syncHeaderScroll, { passive: true });
  window.addEventListener('resize', syncHeaderScroll);
  toggleBtn?.addEventListener('click', handleToggle);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleOutsideClick);
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  return () => {
    window.removeEventListener('scroll', syncHeaderScroll);
    window.removeEventListener('resize', syncHeaderScroll);
    toggleBtn?.removeEventListener('click', handleToggle);
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleOutsideClick);
  };
}
