import type { FullbuySnapshot } from "./fullbuy-contract";
import type { FullbuyStatement } from "./fullbuy-store-core";
import { TOSS_NETWORK_CONSENT } from "./toss-network-core";

// Run inside the wallet completion transaction. Row locks keep close/leave/unlink
// from changing this authority between the final check and the content COMMIT.
export function tossChapterCompletionGuards(userId: string, snapshot: FullbuySnapshot): FullbuyStatement[] {
  const stmt = (text: string, ...values: unknown[]) => ({ text, values });
  return [
    stmt("SELECT id FROM woorigunghap_toss_networks WHERE id=$1 FOR SHARE", snapshot.networkId),
    stmt("SELECT id FROM woorigunghap_toss_network_members WHERE network_id=$1 FOR SHARE", snapshot.networkId),
    stmt(`SELECT 1 / CASE WHEN EXISTS(
      SELECT 1 FROM woorigunghap_toss_networks n
      WHERE n.id=$1 AND n.expires_at>NOW() AND n.engine_version||':'||n.scoring_version=$2
      AND EXISTS(SELECT 1 FROM woorigunghap_toss_network_members WHERE network_id=n.id AND user_id=$3 AND consent_version=$4)
      AND NOT EXISTS(SELECT 1 FROM woorigunghap_toss_network_members WHERE network_id=n.id AND consent_version<>$4)
      AND EXISTS(SELECT 1 FROM woorigunghap_toss_network_members WHERE network_id=n.id AND id=$5 AND input_version=$6)
      AND EXISTS(SELECT 1 FROM woorigunghap_toss_network_members WHERE network_id=n.id AND id=$7 AND input_version=$8)
    ) THEN 1 ELSE 0 END AS authorized`, snapshot.networkId, snapshot.calculationVersion, userId, TOSS_NETWORK_CONSENT,
    snapshot.members[0].id, snapshot.members[0].inputVersion, snapshot.members[1].id, snapshot.members[1].inputVersion),
  ];
}
