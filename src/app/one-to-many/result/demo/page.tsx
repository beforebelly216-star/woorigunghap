import { OneToManyResult } from "@/components/one-to-many-result";
import { calculateOneToManyCompatibility } from "@/lib/compatibility/one-to-many";
import {
  ONE_TO_MANY_DEMO_INPUT,
  ONE_TO_MANY_DEMO_NAMES,
} from "@/lib/compatibility/one-to-many-demo";
import { buildOneToManyResultView } from "@/lib/compatibility/one-to-many-view";

export default function OneToManyDemoResultPage() {
  const snapshot = calculateOneToManyCompatibility(ONE_TO_MANY_DEMO_INPUT);
  const view = buildOneToManyResultView(snapshot, ONE_TO_MANY_DEMO_NAMES);
  return <OneToManyResult view={view} />;
}
