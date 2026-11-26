import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildConsentDecision,
  createDefaultConsent,
  parseStoredConsent
} from '../src/domain/consent.rules';

describe('consent.rules', () => {
  it('inicia categorias opcionais desmarcadas por padrão (LGPD)', () => {
    const def = createDefaultConsent();
    expect(def.necessary).toBe(true);
    expect(def.preferences).toBe(false);
    expect(def.analytics).toBe(false);
    expect(def.marketing).toBe(false);
  });

  it('valida payload salvo e rejeita JSON malformado, primitivo ou versão inválida', () => {
    expect(parseStoredConsent(null)).toBeNull();
    expect(parseStoredConsent('')).toBeNull();
    expect(parseStoredConsent('{broken')).toBeNull();
    expect(parseStoredConsent('null')).toBeNull();
    expect(parseStoredConsent('"texto"')).toBeNull();
    expect(parseStoredConsent(JSON.stringify({ version: 2, necessary: true }))).toBeNull();
    expect(parseStoredConsent(JSON.stringify({ version: 1, necessary: false }))).toBeNull();

    const saved = buildConsentDecision(
      { preferences: true, analytics: true, marketing: false },
      new Date('2026-11-26T14:00:00Z')
    );
    const parsed = parseStoredConsent(JSON.stringify(saved));
    expect(parsed).toEqual(saved);

    const noTimestamp = parseStoredConsent(
      JSON.stringify({ version: 1, necessary: true, preferences: false, analytics: false, marketing: true })
    );
    expect(noTimestamp?.updatedAt).toBe('');
    expect(noTimestamp?.marketing).toBe(true);
  });

  it('garante que nenhum HTML possui checkbox de consentimento pré-marcado', () => {
    const htmlPaths = ['index.html', 'linkbio/index.html', 'privacidade/index.html', 'termos/index.html'];
    for (const rel of htmlPaths) {
      const html = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      expect(html).not.toMatch(/<input[^>]+type=["']checkbox["'][^>]*\bchecked\b/i);
    }
  });
});
