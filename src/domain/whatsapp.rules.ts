import { BUSINESS } from '../data/business.data';

export interface FloralOrderInput {
  readonly ocasiao: string;
  readonly bairro: string;
  readonly nome: string;
  readonly observacao?: string;
}

export interface OrderValidationResult {
  readonly ok: boolean;
  readonly errors: {
    readonly ocasiao?: string;
    readonly bairro?: string;
  };
}

export function sanitizeFieldText(value: string, maxLen = 120): string {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function buildWhatsappUrl(message?: string): string {
  const clean = sanitizeFieldText(message || BUSINESS.defaultWhatsappMessage, 480);
  const finalMsg = clean || BUSINESS.defaultWhatsappMessage;
  return `https://wa.me/${BUSINESS.whatsappDigits}?text=${encodeURIComponent(finalMsg)}`;
}

export function validateOrderInput(input: FloralOrderInput): OrderValidationResult {
  const ocasiao = sanitizeFieldText(input.ocasiao, 80);
  const bairro = sanitizeFieldText(input.bairro, 80);
  const errors: { ocasiao?: string; bairro?: string } = {};

  if (ocasiao.length < 3) {
    errors.ocasiao = 'Informe a ocasião ou o estilo de arranjo desejado.';
  }
  if (bairro.length < 2) {
    errors.bairro = 'Informe o bairro ou região de entrega em BH.';
  }

  return {
    ok: !errors.ocasiao && !errors.bairro,
    errors
  };
}

export function composeOrderMessage(input: FloralOrderInput): string {
  const ocasiao = sanitizeFieldText(input.ocasiao, 80);
  const bairro = sanitizeFieldText(input.bairro, 80);
  const nome = sanitizeFieldText(input.nome, 80);
  const obs = sanitizeFieldText(input.observacao || '', 160);

  const saudacao = nome ? `Olá, Via das Flores! Aqui é ${nome}.` : 'Olá, Via das Flores!';
  const corpo = `Gostaria de consultar opções para ${ocasiao} com entrega em ${bairro}.`;
  return obs ? `${saudacao} ${corpo} Preferência: ${obs}.` : `${saudacao} ${corpo}`;
}
