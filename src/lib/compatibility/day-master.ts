import type {
  CompatibilityProfile,
  DayMasterCompatibilityScore,
  DayMasterDirection,
  DayMasterRelation,
  FiveElement,
  YinYang,
} from "./types";
import { getCompatibilityDimensionWeight } from "./weights";

type StemMetadata = {
  canonical: string;
  element: FiveElement;
  yinYang: YinYang;
};

const STEMS: Record<string, StemMetadata> = {
  甲: { canonical: "甲", element: "wood", yinYang: "yang" },
  갑: { canonical: "甲", element: "wood", yinYang: "yang" },
  乙: { canonical: "乙", element: "wood", yinYang: "yin" },
  을: { canonical: "乙", element: "wood", yinYang: "yin" },
  丙: { canonical: "丙", element: "fire", yinYang: "yang" },
  병: { canonical: "丙", element: "fire", yinYang: "yang" },
  丁: { canonical: "丁", element: "fire", yinYang: "yin" },
  정: { canonical: "丁", element: "fire", yinYang: "yin" },
  戊: { canonical: "戊", element: "earth", yinYang: "yang" },
  무: { canonical: "戊", element: "earth", yinYang: "yang" },
  己: { canonical: "己", element: "earth", yinYang: "yin" },
  기: { canonical: "己", element: "earth", yinYang: "yin" },
  庚: { canonical: "庚", element: "metal", yinYang: "yang" },
  경: { canonical: "庚", element: "metal", yinYang: "yang" },
  辛: { canonical: "辛", element: "metal", yinYang: "yin" },
  신: { canonical: "辛", element: "metal", yinYang: "yin" },
  壬: { canonical: "壬", element: "water", yinYang: "yang" },
  임: { canonical: "壬", element: "water", yinYang: "yang" },
  癸: { canonical: "癸", element: "water", yinYang: "yin" },
  계: { canonical: "癸", element: "water", yinYang: "yin" },
};

const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

function stemMetadata(value: string) {
  const key = value.trim();
  const metadata = STEMS[key];
  if (!metadata) {
    throw new RangeError(`지원하지 않는 일간입니다: ${value}`);
  }
  return metadata;
}

function relationBetween(
  elementA: FiveElement,
  elementB: FiveElement,
): {
  relation: DayMasterRelation;
  direction: DayMasterDirection;
  normalizedScore: 55 | 70 | 85;
} {
  if (elementA === elementB) {
    return {
      relation: "SAME_ELEMENT",
      direction: "MUTUAL",
      normalizedScore: 70,
    };
  }

  if (GENERATES[elementA] === elementB) {
    return {
      relation: "GENERATES",
      direction: "A_TO_B",
      normalizedScore: 85,
    };
  }

  if (GENERATES[elementB] === elementA) {
    return {
      relation: "GENERATES",
      direction: "B_TO_A",
      normalizedScore: 85,
    };
  }

  if (CONTROLS[elementA] === elementB) {
    return {
      relation: "CONTROLS",
      direction: "A_TO_B",
      normalizedScore: 55,
    };
  }

  if (CONTROLS[elementB] === elementA) {
    return {
      relation: "CONTROLS",
      direction: "B_TO_A",
      normalizedScore: 55,
    };
  }

  throw new Error(`오행 관계를 판정할 수 없습니다: ${elementA}/${elementB}`);
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export function scoreDayMasterCompatibility(
  stemA: string,
  stemB: string,
  profile: CompatibilityProfile,
): DayMasterCompatibilityScore {
  const a = stemMetadata(stemA);
  const b = stemMetadata(stemB);
  const relation = relationBetween(a.element, b.element);
  const maxPoints = getCompatibilityDimensionWeight(profile, "dayMaster");

  return {
    dimension: "dayMaster",
    stemA,
    stemB,
    canonicalStemA: a.canonical,
    canonicalStemB: b.canonical,
    elementA: a.element,
    elementB: b.element,
    yinYangA: a.yinYang,
    yinYangB: b.yinYang,
    relation: relation.relation,
    direction: relation.direction,
    polarityRelation: a.yinYang === b.yinYang ? "SAME" : "OPPOSITE",
    normalizedScore: relation.normalizedScore,
    profile,
    maxPoints,
    weightedPoints: round4((relation.normalizedScore / 100) * maxPoints),
  };
}
