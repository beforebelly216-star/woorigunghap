import type { FiveElement, YinYang } from "@/lib/compatibility/types";

export const SOULMATE_RESULT_STORAGE_KEY = "woorigunghap_free_soulmate_result_v1";

export type SoulmatePillarView = {
  key: "year" | "month" | "day" | "hour";
  label: "년주" | "월주" | "일주" | "시주";
  stem: string | null;
  stemHanja: string | null;
  branch: string | null;
  branchHanja: string | null;
};

export type SoulmateElementBalance = {
  element: FiveElement;
  label: string;
  weight: number;
  level: "낮음" | "보통" | "높음";
};

export type SoulmateRecommendation = {
  rank: number;
  stem: string;
  stemHanja: string;
  element: FiveElement;
  elementLabel: string;
  yinYang: YinYang;
  yinYangLabel: string;
  relationLabel: string;
  headline: string;
  reasons: string[];
  relationshipPattern: string;
  betterWhen: string[];
};

export type SoulmateResult = {
  version: "soulmate-result-v1";
  displayName: string;
  generatedAt: string;
  pillars: SoulmatePillarView[];
  self: {
    dayMaster: string;
    dayMasterHanja: string;
    element: FiveElement;
    elementLabel: string;
    yinYang: YinYang;
    yinYangLabel: string;
    keywords: string[];
    strength: string;
    complement: string;
  };
  elementBalance: SoulmateElementBalance[];
  yinYangBalance: {
    yang: number;
    yin: number;
    label: string;
  };
  recommendations: SoulmateRecommendation[];
  detailed: {
    preferredElements: string[];
    preferredStems: string[];
    preferredBranches: string[];
    idealConditions: string[];
    cautions: string[];
    methodNote: string;
  };
  zootopi: {
    opening: string;
    middle: string;
    closing: string;
  };
};

export function parseSoulmateResult(value: unknown): SoulmateResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<SoulmateResult>;
  if (
    candidate.version !== "soulmate-result-v1"
    || typeof candidate.displayName !== "string"
    || !Array.isArray(candidate.pillars)
    || !candidate.self
    || !Array.isArray(candidate.elementBalance)
    || !Array.isArray(candidate.recommendations)
    || !candidate.detailed
    || !candidate.zootopi
  ) return null;
  return candidate as SoulmateResult;
}
