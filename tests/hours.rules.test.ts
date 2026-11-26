import { describe, expect, it } from 'vitest';
import { extractBhtClock, getStoreOpenStatus } from '../src/domain/hours.rules';

describe('hours.rules', () => {
  it('identifica loja aberta durante dia útil às 14h30 BRT (17h30 UTC)', () => {
    const thursday = new Date('2026-11-26T17:30:00Z');
    const clock = extractBhtClock(thursday);
    expect(clock.weekdayIndex).toBe(4);
    expect(clock.minutesOfDay).toBe(14 * 60 + 30);

    const status = getStoreOpenStatus(thursday);
    expect(status.isOpen).toBe(true);
    expect(status.badgeLabel).toContain('aberta');
    expect(status.detailText).toContain('21h');
  });

  it('identifica loja fechada após 14h no domingo BRT (17h30 UTC)', () => {
    const sundayAfternoon = new Date('2026-11-29T17:30:00Z');
    const status = getStoreOpenStatus(sundayAfternoon);
    expect(status.isOpen).toBe(false);
    expect(status.badgeLabel).toContain('Reabre');
    expect(status.badgeLabel).toContain('09h');
  });

  it('identifica loja antes da abertura às 07h00 BRT (10h00 UTC)', () => {
    const morning = new Date('2026-11-26T10:00:00Z');
    const status = getStoreOpenStatus(morning);
    expect(status.isOpen).toBe(false);
    expect(status.badgeLabel).toContain('Abre hoje às 09h');
  });

  it('trata corretamente a virada de meia-noite em BRT (03h00 UTC = 00h00 BRT)', () => {
    const midnightBrt = new Date('2026-11-27T03:00:00Z');
    const clock = extractBhtClock(midnightBrt);
    expect(clock.minutesOfDay).toBe(0);
    const status = getStoreOpenStatus(midnightBrt);
    expect(status.isOpen).toBe(false);
  });

  it('funciona com data padrão e no sábado às 10h BRT (13h00 UTC)', () => {
    const saturday = new Date('2026-11-28T13:00:00Z');
    const satStatus = getStoreOpenStatus(saturday);
    expect(satStatus.isOpen).toBe(true);
    expect(satStatus.detailText).toContain('14h');

    const nowStatus = getStoreOpenStatus();
    expect(typeof nowStatus.isOpen).toBe('boolean');
  });
});
