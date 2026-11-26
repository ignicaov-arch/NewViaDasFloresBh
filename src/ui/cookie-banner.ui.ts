import {
  CONSENT_STORAGE_KEY,
  buildConsentDecision,
  createDefaultConsent,
  parseStoredConsent,
  type CookieConsentState
} from '../domain/consent.rules';

function saveConsent(state: CookieConsentState): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage indisponível em navegação privada estrita
  }
}

export function initCookieBanner(): void {
  const dialog = document.getElementById('lgpd-banner') as HTMLElement | null;
  if (!dialog) return;

  const prefBox = document.getElementById('lgpd-pref') as HTMLInputElement | null;
  const anaBox = document.getElementById('lgpd-ana') as HTMLInputElement | null;
  const mktBox = document.getElementById('lgpd-mkt') as HTMLInputElement | null;
  const detailsPanel = document.getElementById('lgpd-detalhes') as HTMLElement | null;

  const syncCheckboxes = (state: CookieConsentState): void => {
    if (prefBox) prefBox.checked = state.preferences;
    if (anaBox) anaBox.checked = state.analytics;
    if (mktBox) mktBox.checked = state.marketing;
  };

  const stored = parseStoredConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
  if (!stored) {
    syncCheckboxes(createDefaultConsent());
    dialog.hidden = false;
  } else {
    syncCheckboxes(stored);
  }

  const closeWith = (decision: { preferences: boolean; analytics: boolean; marketing: boolean }): void => {
    const next = buildConsentDecision(decision);
    saveConsent(next);
    syncCheckboxes(next);
    dialog.hidden = true;
  };

  document.getElementById('lgpd-aceitar')?.addEventListener('click', () => {
    closeWith({ preferences: true, analytics: true, marketing: true });
  });

  document.getElementById('lgpd-recusar')?.addEventListener('click', () => {
    closeWith({ preferences: false, analytics: false, marketing: false });
  });

  document.getElementById('lgpd-configurar')?.addEventListener('click', () => {
    if (!detailsPanel) return;
    detailsPanel.hidden = !detailsPanel.hidden;
  });

  document.getElementById('lgpd-salvar')?.addEventListener('click', () => {
    closeWith({
      preferences: Boolean(prefBox?.checked),
      analytics: Boolean(anaBox?.checked),
      marketing: Boolean(mktBox?.checked)
    });
  });

  document.querySelectorAll('[data-open-cookies]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const current = parseStoredConsent(localStorage.getItem(CONSENT_STORAGE_KEY)) || createDefaultConsent();
      syncCheckboxes(current);
      dialog.hidden = false;
      if (detailsPanel) detailsPanel.hidden = false;
    });
  });
}
