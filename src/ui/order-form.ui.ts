import { buildWhatsappUrl, composeOrderMessage, validateOrderInput } from '../domain/whatsapp.rules';

function setFieldError(input: HTMLInputElement | null, msg: string): void {
  if (!input) return;
  const errEl = input.parentElement?.querySelector<HTMLElement>('.campo-erro');
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (errEl) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }
}

export function initFloralOrderForm(): void {
  const form = document.getElementById('consulta') as HTMLFormElement | null;
  if (!form) return;

  const ocasiaoInput = form.elements.namedItem('ocasiao') as HTMLInputElement | null;
  const bairroInput = form.elements.namedItem('bairro') as HTMLInputElement | null;
  const nomeInput = form.elements.namedItem('nome') as HTMLInputElement | null;
  const obsInput = form.elements.namedItem('observacao') as HTMLInputElement | null;

  const validateAndRender = (): boolean => {
    const res = validateOrderInput({
      ocasiao: ocasiaoInput?.value || '',
      bairro: bairroInput?.value || '',
      nome: nomeInput?.value || ''
    });
    setFieldError(ocasiaoInput, res.errors.ocasiao || '');
    setFieldError(bairroInput, res.errors.bairro || '');
    return res.ok;
  };

  ocasiaoInput?.addEventListener('blur', () => {
    if (ocasiaoInput.value.trim()) validateAndRender();
  });
  bairroInput?.addEventListener('blur', () => {
    if (bairroInput.value.trim()) validateAndRender();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateAndRender()) {
      const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const msg = composeOrderMessage({
      ocasiao: ocasiaoInput?.value || '',
      bairro: bairroInput?.value || '',
      nome: nomeInput?.value || '',
      observacao: obsInput?.value || ''
    });

    window.open(buildWhatsappUrl(msg), '_blank', 'noopener,noreferrer');
  });
}
