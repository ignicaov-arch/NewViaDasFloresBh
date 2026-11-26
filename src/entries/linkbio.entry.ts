import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/linkbio.css';
import { bindWhatsappLinks } from '../ui/navbar.ui';
import { setupLenisSmoothScroll } from '../ui/lenis.motion';
import { initCinematicScrollMotion } from '../ui/scroll.motion';
import { initCopyActions, renderLiveStoreStatus } from '../ui/copy-action.ui';
import { initCookieBanner } from '../ui/cookie-banner.ui';

bindWhatsappLinks();
setupLenisSmoothScroll();
initCinematicScrollMotion();
initCopyActions();
renderLiveStoreStatus();
initCookieBanner();

const yearEl = document.getElementById('ano');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
