export interface BusinessHoursRule {
  readonly label: string;
  readonly startMinutes: number;
  readonly endMinutes: number;
}

export const BUSINESS = {
  brandName: 'Floricultura Via das Flores',
  shortName: 'Via das Flores',
  legalName: 'Via das Flores Ltda',
  cnpj: '39.310.881/0001-82',
  siteUrl: 'https://newviadasfloresbh.pages.dev',
  storeUrl: 'https://www.viadasflores.com.br/',
  whatsappDigits: '5531995475658',
  whatsappDisplay: '(31) 99547-5658',
  phoneHref: 'tel:+553132201818',
  phoneDisplay: '(31) 3220-1818',
  email: 'contato@viadasflores.com.br',
  dpoEmail: 'privacidade@viadasflores.com.br',
  instagramHandle: '@viadasfloresbh',
  instagramUrl: 'https://www.instagram.com/viadasfloresbh/',
  mapsUrl:
    'https://www.google.com/maps/place/Floricultura+Via+das+Flores/@-19.9390148,-43.9437464,17z/data=!3m1!4b1!4m6!3m5!1s0xa699d79fed3d6f:0x14049ca474e4ff81!8m2!3d-19.9390148!4d-43.9411661!16s%2Fg%2F1wfcqcg9',
  kgUrl: 'https://www.google.com/search?kgmid=/g/1wfcqcg9',
  addressLine: 'Rua da Bahia, 2741, Savassi, Belo Horizonte - MG',
  cep: '30160-012',
  geo: { lat: -19.9390148, lng: -43.9411661 },
  defaultWhatsappMessage:
    'Olá, equipe Via das Flores! Vim pelo site e gostaria de encomendar flores em BH.',
  hoursSummary: {
    weekdays: 'Segunda a sexta: 09h às 21h',
    weekend: 'Sábado e domingo: 09h às 14h',
    holidays: 'Feriados: 09h às 12h'
  }
} as const;

export const SCHEDULE_BY_DAY: Record<number, BusinessHoursRule> = {
  0: { label: 'Domingo', startMinutes: 9 * 60, endMinutes: 14 * 60 },
  1: { label: 'Segunda-feira', startMinutes: 9 * 60, endMinutes: 21 * 60 },
  2: { label: 'Terça-feira', startMinutes: 9 * 60, endMinutes: 21 * 60 },
  3: { label: 'Quarta-feira', startMinutes: 9 * 60, endMinutes: 21 * 60 },
  4: { label: 'Quinta-feira', startMinutes: 9 * 60, endMinutes: 21 * 60 },
  5: { label: 'Sexta-feira', startMinutes: 9 * 60, endMinutes: 21 * 60 },
  6: { label: 'Sábado', startMinutes: 9 * 60, endMinutes: 14 * 60 }
};
