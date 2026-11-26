import { describe, expect, it } from 'vitest';
import {
  buildWhatsappUrl,
  composeOrderMessage,
  sanitizeFieldText,
  validateOrderInput
} from '../src/domain/whatsapp.rules';

describe('whatsapp.rules', () => {
  it('sanitiza caracteres perigosos de XSS, nulos e espaços extras', () => {
    expect(sanitizeFieldText('  <script>alert(1)</script>   Savassi  ')).toBe(
      'scriptalert(1)/script Savassi'
    );
    expect(sanitizeFieldText('')).toBe('');
    expect(sanitizeFieldText('   ')).toBe('');
  });

  it('valida campos obrigatórios de ocasião e bairro individualmente', () => {
    const empty = validateOrderInput({ ocasiao: '', bairro: 'a', nome: '' });
    expect(empty.ok).toBe(false);
    expect(empty.errors.ocasiao).toBeTruthy();
    expect(empty.errors.bairro).toBeTruthy();

    const onlyBairroMissing = validateOrderInput({ ocasiao: 'Buquê de Rosas', bairro: 'x', nome: '' });
    expect(onlyBairroMissing.ok).toBe(false);
    expect(onlyBairroMissing.errors.ocasiao).toBeUndefined();
    expect(onlyBairroMissing.errors.bairro).toBeTruthy();

    const onlyOcasiaoMissing = validateOrderInput({ ocasiao: 'Oi', bairro: 'Savassi', nome: '' });
    expect(onlyOcasiaoMissing.ok).toBe(false);
    expect(onlyOcasiaoMissing.errors.ocasiao).toBeTruthy();
    expect(onlyOcasiaoMissing.errors.bairro).toBeUndefined();

    const valid = validateOrderInput({ ocasiao: 'Aniversário', bairro: 'Lourdes', nome: 'Ana' });
    expect(valid.ok).toBe(true);
    expect(valid.errors).toEqual({});
  });

  it('compõe mensagem de pedido com e sem nome/observação e gera URL oficial', () => {
    const withDetails = composeOrderMessage({
      ocasiao: 'Buquê de 18 rosas',
      bairro: 'Savassi',
      nome: 'Marina',
      observacao: 'Entregar até 17h'
    });
    expect(withDetails).toContain('Marina');
    expect(withDetails).toContain('Preferência: Entregar até 17h.');

    const minimal = composeOrderMessage({
      ocasiao: 'Orquídea Phalaenopsis',
      bairro: 'Funcionários',
      nome: ''
    });
    expect(minimal).toBe(
      'Olá, Via das Flores! Gostaria de consultar opções para Orquídea Phalaenopsis com entrega em Funcionários.'
    );

    const url = buildWhatsappUrl(withDetails);
    expect(url.startsWith('https://wa.me/5531995475658?text=')).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(withDetails);
  });

  it('usa mensagem padrão quando entrada estiver vazia ou apenas com tags', () => {
    const url = buildWhatsappUrl('');
    expect(url).toContain('https://wa.me/5531995475658?text=');
    expect(decodeURIComponent(url.split('?text=')[1])).toContain('Via das Flores');

    const stripped = buildWhatsappUrl('<>');
    expect(decodeURIComponent(stripped.split('?text=')[1])).toContain('Via das Flores');
  });
});
