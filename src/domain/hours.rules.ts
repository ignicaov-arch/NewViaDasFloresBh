import { SCHEDULE_BY_DAY } from '../data/business.data';

export interface StoreStatusSnapshot {
  readonly isOpen: boolean;
  readonly badgeLabel: string;
  readonly detailText: string;
}

interface BhtClock {
  readonly weekdayIndex: number;
  readonly minutesOfDay: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

export function extractBhtClock(date: Date): BhtClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const weekdayStr = (parts.find((p) => p.type === 'weekday')?.value || 'mon').toLowerCase().slice(0, 3);
  const rawHour = Number(parts.find((p) => p.type === 'hour')?.value || '9');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');

  return {
    weekdayIndex: WEEKDAY_MAP[weekdayStr] ?? 1,
    minutesOfDay: hour * 60 + minute
  };
}

function formatClock(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return mm === '00' ? `${hh}h` : `${hh}h${mm}`;
}

export function getStoreOpenStatus(now: Date = new Date()): StoreStatusSnapshot {
  const clock = extractBhtClock(now);
  const rule = SCHEDULE_BY_DAY[clock.weekdayIndex] ?? SCHEDULE_BY_DAY[1];
  const isOpen = clock.minutesOfDay >= rule.startMinutes && clock.minutesOfDay < rule.endMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      badgeLabel: 'Loja aberta agora na Savassi',
      detailText: `${rule.label}, atendimento hoje até ${formatClock(rule.endMinutes)}`
    };
  }

  if (clock.minutesOfDay < rule.startMinutes) {
    return {
      isOpen: false,
      badgeLabel: `Abre hoje às ${formatClock(rule.startMinutes)}`,
      detailText: 'Agende seu pedido pelo WhatsApp a qualquer momento'
    };
  }

  const nextIndex = (clock.weekdayIndex + 1) % 7;
  const nextRule = SCHEDULE_BY_DAY[nextIndex] ?? SCHEDULE_BY_DAY[1];
  return {
    isOpen: false,
    badgeLabel: `Reabre ${nextRule.label.toLowerCase()} às ${formatClock(nextRule.startMinutes)}`,
    detailText: 'Pedidos agendados pelo WhatsApp seguem disponíveis'
  };
}
