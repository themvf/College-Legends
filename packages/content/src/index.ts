import type { BalanceConfiguration, CareerPath } from "@college-legends/model";

export const DEFAULT_BALANCE: BalanceConfiguration = {
  version: "0.1.0",
  weeklyDevelopment: { base: 0.012, coachWeight: 0.018, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 },
  game: { possessions: 24, homeFieldAdvantage: 1.8, upsetNoise: 11 }
};

export const CAREER_PATHS: Record<CareerPath, { label: string; tier: "LOW" | "MID" | "POWER"; budget: number; initialSecurity: number; championshipDeadline: number | null }> = {
  DYNASTY_BUILDER: { label: "Dynasty Builder", tier: "LOW", budget: 1_500_000, initialSecurity: 92, championshipDeadline: null },
  PROGRAM_RISER: { label: "Program Riser", tier: "MID", budget: 6_000_000, initialSecurity: 65, championshipDeadline: null },
  CHAMPIONSHIP_MANDATE: { label: "Championship Mandate", tier: "POWER", budget: 20_000_000, initialSecurity: 40, championshipDeadline: 2 }
};
