import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/home.css';
import { bindWhatsappLinks, initSiteNavbar } from '../ui/navbar.ui';
import { setupLenisSmoothScroll } from '../ui/lenis.motion';
import { initCinematicScrollMotion } from '../ui/scroll.motion';
import { initFloralOrderForm } from '../ui/order-form.ui';
import { initCookieBanner } from '../ui/cookie-banner.ui';
import { renderLiveStoreStatus } from '../ui/copy-action.ui';

bindWhatsappLinks();
initSiteNavbar();
setupLenisSmoothScroll();
initCinematicScrollMotion();
initFloralOrderForm();
initCookieBanner();
renderLiveStoreStatus();

const yearEl = document.getElementById('ano');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
