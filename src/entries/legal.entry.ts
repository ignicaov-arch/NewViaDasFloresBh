import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/legal.css';
import { bindWhatsappLinks, initSiteNavbar } from '../ui/navbar.ui';
import { setupLenisSmoothScroll } from '../ui/lenis.motion';
import { initCookieBanner } from '../ui/cookie-banner.ui';

bindWhatsappLinks();
initSiteNavbar();
setupLenisSmoothScroll();
initCookieBanner();

const yearEl = document.getElementById('ano');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
