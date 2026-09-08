import { type Athlete } from './model.js';

export const commercialServices = [
  { kind: 'Styling', name: 'Stylist & photo shoot', cost: 750, weeks: 1, hours: 3, profile: 0, premium: [0.15, 0, 0.2], deliverable: 'A styled photo portfolio for sponsor proposals.', result: 'Photo portfolio delivered', fit: 'Raises local endorsement offers 15% and merchandise offers 20%.' },
  { kind: 'Social', name: 'Social media producer', cost: 2000, weeks: 2, hours: 6, profile: 6, premium: [0, 0.15, 0.1], deliverable: 'A filmed content series and scheduled social posts.', result: 'Content series published', fit: '+6 public profile; raises media offers 15% and merchandise offers 10%.' },
  { kind: 'Press', name: 'Press & interview publicist', cost: 3500, weeks: 3, hours: 2, profile: 10, premium: [0, 0.25, 0], deliverable: 'A press kit, interview rehearsal and regional interview.', result: 'Press campaign delivered', fit: '+10 public profile; raises media offers 25%.' },
] as const;
export type CommercialKind = typeof commercialServices[number]['kind'];
export const commercialService = (kind: string) => commercialServices.find(v => v.kind === kind);
export const commercialPremium = (p: Athlete, brand: number) => commercialServices.reduce((sum, v) => sum + (p.brandKit?.includes(v.kind) ? v.premium[brand] ?? 0 : 0), 0);
export function preparedPlayer(p: Athlete, kind: CommercialKind): Athlete {
  const service = commercialService(kind)!;
  if (p.brandKit?.includes(kind)) return p;
  return { ...p, recognition: Math.min(100, p.recognition + service.profile), brandKit: [...(p.brandKit ?? []), kind] };
}
