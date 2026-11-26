import { getStoreOpenStatus } from '../domain/hours.rules';

export function initCopyActions(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copyTarget || '';
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        btn.setAttribute('data-copy-status', 'copied');
        btn.setAttribute('aria-label', 'Endereço copiado com sucesso');
        setTimeout(() => {
          btn.removeAttribute('data-copy-status');
          btn.setAttribute('aria-label', 'Copiar endereço da loja');
        }, 2200);
      } catch {
        // Clipboard bloqueado em contexto inseguro
      }
    });
  });
}

export function renderLiveStoreStatus(): void {
  const statusEl = document.getElementById('loja-status');
  const detailEl = document.getElementById('loja-detalhe');
  const dotEl = document.getElementById('loja-indicador');
  if (!statusEl) return;

  const snap = getStoreOpenStatus(new Date());
  statusEl.textContent = snap.badgeLabel;
  if (detailEl) detailEl.textContent = snap.detailText;
  if (dotEl) {
    dotEl.classList.toggle('is-open', snap.isOpen);
    dotEl.classList.toggle('is-closed', !snap.isOpen);
  }
}
