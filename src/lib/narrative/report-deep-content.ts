import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";

export type PartnerDeepDive = {
  outerInnerContrast: string;
  comfortTriggers: string[];
  sensitiveTriggers: string[];
  preferredInteraction: string[];
  observableScenes: Array<{
    situation: string;
    likelyReaction: string;
    considerateResponse: string;
  }>;
  profileTags: string[];
};

export type PersonalLeverage = {
  topStrengths: Array<{
    title: string;
    whyItWorks: string;
    howToUse: string;
  }>;
  conversationScripts: Array<{
    situation: string;
    say: string;
    avoid: string;
  }>;
  backfireHabits: Array<{
    habit: string;
    correction: string;
  }>;
};

export type SituationStrategy = {
  priority: string;
  stepByStep: Array<{
    step: string;
    action: string;
    watchFor: string;
  }>;
  progressSignals: string[];
  stopSignals: string[];
};

export type ActionPlan30 = {
  weeks: Array<{
    week: number;
    goal: string;
    action: string;
    check: string;
  }>;
  monthlyDont: string[];
};

export type DeepReportExtension = {
  partnerDeepDive?: PartnerDeepDive;
  personalLeverage?: PersonalLeverage;
  situationStrategy?: SituationStrategy;
  actionPlan30?: ActionPlan30;
};

/**
 * New v7 generations include the deep fields below. They stay optional at the
 * assembled-report boundary so reports already saved before this upgrade remain readable.
 */
export type EnhancedDetailedReportContent = DetailedReportContent & DeepReportExtension;
