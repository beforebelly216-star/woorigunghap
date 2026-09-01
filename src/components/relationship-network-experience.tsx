"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearPersonBirthFieldError,
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import { FREE_SELF_PERSON_STORAGE_KEY } from "@/lib/free-self-analysis-contract";
import {
  parseRelationshipNetworkPublic,
  RELATIONSHIP_NETWORK_GRADE_COPY,
  RELATIONSHIP_NETWORK_GRADES,
  RELATIONSHIP_NETWORK_POLL_INTERVAL_MS,
  relationshipNetworkPairKey,
  type RelationshipNetworkEdge,
  type RelationshipNetworkGrade,
  type RelationshipNetworkMember,
  type RelationshipNetworkPublic,
} from "@/lib/relationship-network-contract";
import {
  forgetRelationshipNetwork,
  rememberRelationshipNetwork,
} from "@/lib/relationship-network-browser-storage";
import styles from "@/app/one-to-many/relationship-network.module.css";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

const GRADE_COLORS: Record<RelationshipNetworkGrade, string> = {
  S: "#2e9b68",
  A: "#57ad72",
  B: "#9baa48",
  C: "#d09a37",
  D: "#dc7659",
  E: "#ce4f60",
};

type MembershipCredential = { memberId: string; memberToken: string };
type GraphMode = "focus" | "strong" | "all";

function randomHexToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function parseMembershipCredentials(value: string | null): MembershipCredential[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    const credentials = new Map<string, MembershipCredential>();
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const record = candidate as Record<string, unknown>;
      if (typeof record.memberId !== "string" || typeof record.memberToken !== "string" || !TOKEN_PATTERN.test(record.memberToken)) continue;
      credentials.set(record.memberId, { memberId: record.memberId, memberToken: record.memberToken });
    }
    return Array.from(credentials.values());
  } catch {
    return [];
  }
}

function upsertMembershipCredential(
  memberships: MembershipCredential[],
  credential: MembershipCredential,
) {
  return [...memberships.filter((membership) => membership.memberId !== credential.memberId), credential];
}

function memberName(members: RelationshipNetworkMember[], memberId: string) {
  return members.find((member) => member.id === memberId)?.displayName ?? "참여자";
}

function otherMemberId(edge: RelationshipNetworkEdge, memberId: string) {
  return edge.memberAId === memberId ? edge.memberBId : edge.memberAId;
}

function scoreAverage(network: RelationshipNetworkPublic, memberId: string) {
  const scores = network.edges
    .filter((edge) => edge.memberAId === memberId || edge.memberBId === memberId)
    .map((edge) => edge.score);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function initialLabel(value: string) {
  return Array.from(value.trim()).slice(0, 4).join("") || "인연";
}

function graphPositions(members: RelationshipNetworkMember[], hostMemberId: string) {
  const result = new Map<string, { x: number; y: number }>();
  result.set(hostMemberId, { x: 180, y: 180 });
  const guests = members.filter((member) => member.id !== hostMemberId);
  if (guests.length <= 7) {
    guests.forEach((member, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(guests.length, 1);
      result.set(member.id, { x: 180 + Math.cos(angle) * 132, y: 180 + Math.sin(angle) * 132 });
    });
    return result;
  }
  const innerCount = Math.ceil(guests.length / 2);
  const rings = [guests.slice(0, innerCount), guests.slice(innerCount)];
  rings.forEach((ring, ringIndex) => {
    const radius = ringIndex === 0 ? 92 : 142;
    ring.forEach((member, index) => {
      const offset = ringIndex === 0 ? 0 : Math.PI / Math.max(ring.length, 1);
      const angle = -Math.PI / 2 + offset + (Math.PI * 2 * index) / Math.max(ring.length, 1);
      result.set(member.id, { x: 180 + Math.cos(angle) * radius, y: 180 + Math.sin(angle) * radius });
    });
  });
  return result;
}

function RelationshipNetworkGraph({
  network,
  selectedMemberId,
  selectedPairKey,
  mode,
  onSelectMember,
  onSelectEdge,
}: {
  network: RelationshipNetworkPublic;
  selectedMemberId: string;
  selectedPairKey: string | null;
  mode: GraphMode;
  onSelectMember: (memberId: string) => void;
  onSelectEdge: (edge: RelationshipNetworkEdge) => void;
}) {
  const positions = graphPositions(network.members, network.hostMemberId);
  const edges = network.edges.filter((edge) => {
    if (mode === "all") return true;
    if (mode === "strong") return edge.grade === "S" || edge.grade === "A";
    return edge.memberAId === selectedMemberId || edge.memberBId === selectedMemberId;
  });
  const selectedEdge = selectedPairKey
    ? network.edges.find((edge) => relationshipNetworkPairKey(edge.memberAId, edge.memberBId) === selectedPairKey)
    : null;

  function keyboardSelect(event: KeyboardEvent<SVGElement>, action: () => void) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  }

  return (
    <div className={styles.graphStage}>
      <svg className={styles.networkSvg} viewBox="0 0 360 360" role="img" aria-label={`${network.memberCount}명의 전체 궁합 관계망`}>
        {edges.map((edge) => {
          const start = positions.get(edge.memberAId);
          const end = positions.get(edge.memberBId);
          if (!start || !end) return null;
          const pairKey = relationshipNetworkPairKey(edge.memberAId, edge.memberBId);
          const isSelected = selectedPairKey === pairKey;
          const isFocused = edge.memberAId === selectedMemberId || edge.memberBId === selectedMemberId;
          const select = () => onSelectEdge(edge);
          return (
            <g key={pairKey}>
              <line
                className={`${styles.graphEdge} ${isSelected ? styles.graphEdgeSelected : ""}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={GRADE_COLORS[edge.grade]}
                strokeWidth={isSelected ? 4 : isFocused ? 2.4 : 1.2}
                opacity={isSelected ? 1 : isFocused ? .72 : .22}
              />
              <line
                className={styles.graphEdgeHit}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                role="button"
                tabIndex={0}
                aria-label={`${memberName(network.members, edge.memberAId)}와 ${memberName(network.members, edge.memberBId)} ${edge.score}점 ${edge.grade}등급`}
                onClick={select}
                onKeyDown={(event) => keyboardSelect(event, select)}
              />
            </g>
          );
        })}

        {selectedEdge ? (() => {
          const start = positions.get(selectedEdge.memberAId);
          const end = positions.get(selectedEdge.memberBId);
          if (!start || !end) return null;
          const x = (start.x + end.x) / 2;
          const y = (start.y + end.y) / 2;
          return <g><circle className={styles.graphScoreBubble} cx={x} cy={y} r="13"/><text className={styles.graphScoreText} x={x} y={y}>{selectedEdge.score}</text></g>;
        })() : null}

        {network.members.map((member) => {
          const point = positions.get(member.id);
          if (!point) return null;
          const selected = member.id === selectedMemberId;
          const select = () => onSelectMember(member.id);
          const average = scoreAverage(network, member.id);
          return (
            <g
              key={member.id}
              className={styles.graphNode}
              role="button"
              tabIndex={0}
              aria-label={`${member.displayName}${member.isHost ? ", 방장" : ""}${average == null ? "" : `, 네트워크 평균 ${average}점`}`}
              onClick={select}
              onKeyDown={(event) => keyboardSelect(event, select)}
            >
              <circle
                className={`${styles.graphNodeCircle} ${member.isHost ? styles.graphNodeHost : ""} ${selected ? styles.graphNodeSelected : ""}`}
                cx={point.x}
                cy={point.y}
                r={member.isHost ? 29 : 24}
              />
              <text className={`${styles.graphNodeText} ${member.isHost ? styles.graphNodeTextHost : ""}`} x={point.x} y={point.y + 3}>{initialLabel(member.displayName)}</text>
              <text className={styles.graphNodeRole} x={point.x} y={point.y + (member.isHost ? 42 : 36)}>{member.isHost ? "방장" : average == null ? "새 인연" : `평균 ${average}`}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RelationshipNetworkExperience({
  token,
  initialNetwork,
}: {
  token: string;
  initialNetwork: RelationshipNetworkPublic;
}) {
  const router = useRouter();
  const [network, setNetwork] = useState(initialNetwork);
  const [selectedMemberId, setSelectedMemberId] = useState(initialNetwork.hostMemberId);
  const [selectedPairKey, setSelectedPairKey] = useState<string | null>(null);
  const [mode, setMode] = useState<GraphMode>(initialNetwork.memberCount > 8 ? "focus" : "all");
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<MembershipCredential[]>([]);
  const [credentialsReady, setCredentialsReady] = useState(false);
  const [joinFormOpen, setJoinFormOpen] = useState(false);
  const [person, setPerson] = useState<PersonBirthFormState>(createEmptyPersonBirthForm());
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [joining, setJoining] = useState(false);
  const [managing, setManaging] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const etagRef = useRef(`"relationship-network-${initialNetwork.graphVersion}"`);
  const memberCountRef = useRef(initialNetwork.memberCount);
  const joinAttemptRef = useRef<{ idempotencyKey: string; memberToken: string } | null>(null);

  const host = network.members.find((member) => member.id === network.hostMemberId) ?? network.members[0];
  const selectedMember = network.members.find((member) => member.id === selectedMemberId) ?? host;
  const connections = selectedMember
    ? network.edges
        .filter((edge) => edge.memberAId === selectedMember.id || edge.memberBId === selectedMember.id)
        .sort((left, right) => right.score - left.score)
    : [];
  const defaultPairKey = selectedMember && selectedMember.id !== network.hostMemberId
    ? relationshipNetworkPairKey(selectedMember.id, network.hostMemberId)
    : null;
  const activePairKey = selectedPairKey ?? defaultPairKey;
  const selectedEdge = activePairKey
    ? network.edges.find((edge) => relationshipNetworkPairKey(edge.memberAId, edge.memberBId) === activePairKey) ?? null
    : null;
  const hostRanking = network.edges
    .filter((edge) => edge.memberAId === network.hostMemberId || edge.memberBId === network.hostMemberId)
    .sort((left, right) => right.score - left.score);

  useEffect(() => {
    let active = true;
    let nextOwner: string | null = null;
    let nextMemberships: MembershipCredential[] = [];
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentOwner = fragment.get("ownerToken");
    const fragmentMemberId = fragment.get("memberId");
    const fragmentMemberToken = fragment.get("memberToken");
    try {
      const storedOwner = window.localStorage.getItem(`woori-network-owner:${token}`);
      nextOwner = storedOwner && TOKEN_PATTERN.test(storedOwner) ? storedOwner : null;
      nextMemberships = parseMembershipCredentials(window.localStorage.getItem(`woori-network-member:${token}`));
    } catch {
      nextOwner = null;
      nextMemberships = [];
    }
    if (fragmentOwner && TOKEN_PATTERN.test(fragmentOwner)) nextOwner = fragmentOwner;
    if (fragmentMemberId && fragmentMemberToken && TOKEN_PATTERN.test(fragmentMemberToken)) {
      nextMemberships = upsertMembershipCredential(nextMemberships, {
        memberId: fragmentMemberId,
        memberToken: fragmentMemberToken,
      });
    }
    if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    try {
      if (nextOwner) window.localStorage.setItem(`woori-network-owner:${token}`, nextOwner);
      if (nextMemberships.length > 0) window.localStorage.setItem(`woori-network-member:${token}`, JSON.stringify(nextMemberships));
      if (nextOwner) {
        rememberRelationshipNetwork({
          token,
          hostName: host?.displayName ?? "내",
          expiresAt: initialNetwork.expiresAt,
        });
      }
    } catch {
      // 현재 탭 상태에는 권한을 유지하고, 차단된 영구 저장소만 건너뜁니다.
    }
    queueMicrotask(() => {
      if (!active) return;
      setOwnerToken(nextOwner);
      setMemberships(nextMemberships);
      setCredentialsReady(true);
      setJoinFormOpen(!nextOwner && nextMemberships.length === 0);
      const latestMembership = nextMemberships.at(-1);
      if (latestMembership && initialNetwork.members.some((member) => member.id === latestMembership.memberId)) {
        setSelectedMemberId(latestMembership.memberId);
      }
    });
    return () => { active = false; };
  }, [host?.displayName, initialNetwork.expiresAt, initialNetwork.members, token]);

  useEffect(() => {
    let active = true;
    let missing = false;
    let inFlight = false;
    let controller: AbortController | null = null;
    async function refresh() {
      if (!active || missing || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      controller = new AbortController();
      try {
        const response = await fetch(`/api/relationship-networks/${token}`, {
          headers: { "if-none-match": etagRef.current },
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 304) return;
        if (response.status === 404) {
          missing = true;
          setDeleted(true);
          return;
        }
        const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
        const next = parseRelationshipNetworkPublic(payload?.network);
        if (!response.ok || !next) return;
        const nextEtag = response.headers.get("etag");
        if (nextEtag) etagRef.current = nextEtag;
        if (next.memberCount > memberCountRef.current) setStatus("새 인연이 네트워크에 연결됐어요.");
        memberCountRef.current = next.memberCount;
        setNetwork(next);
        setSelectedMemberId((current) => next.members.some((member) => member.id === current) ? current : next.hostMemberId);
        setSelectedPairKey((current) => current && next.edges.some((edge) => relationshipNetworkPairKey(edge.memberAId, edge.memberBId) === current) ? current : null);
      } catch {
        // 다음 주기에서 조용히 다시 연결합니다.
      } finally {
        inFlight = false;
        controller = null;
      }
    }
    const interval = window.setInterval(refresh, RELATIONSHIP_NETWORK_POLL_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  function selectMember(memberId: string) {
    setSelectedMemberId(memberId);
    setSelectedPairKey(memberId === network.hostMemberId
      ? null
      : relationshipNetworkPairKey(memberId, network.hostMemberId));
    setMode("focus");
  }

  function replaceNetwork(next: RelationshipNetworkPublic) {
    memberCountRef.current = next.memberCount;
    etagRef.current = `"relationship-network-${next.graphVersion}"`;
    setNetwork(next);
  }

  async function submitJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joining) return;
    const nextErrors: Record<string, string> = {};
    if (!person.displayName.trim()) nextErrors["person.displayName"] = "이름 또는 별칭을 입력해 주세요.";
    if (!person.gender) nextErrors["person.gender"] = "성별을 선택해 주세요.";
    if (!consent) nextErrors.consent = "공개 범위와 개인정보 보관 안내에 동의해 주세요.";
    const normalized = normalizePersonBirthForm(person, "person");
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.person || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!joinAttemptRef.current) {
      joinAttemptRef.current = { idempotencyKey: crypto.randomUUID(), memberToken: randomHexToken() };
    }
    setErrors({});
    setJoining(true);
    try {
      const response = await fetch(`/api/relationship-networks/${token}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          person: normalized.person,
          consent: true,
          ...joinAttemptRef.current,
        }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const next = parseRelationshipNetworkPublic(payload?.network);
      const memberId = typeof payload?.memberId === "string" ? payload.memberId : null;
      const memberToken = typeof payload?.memberToken === "string" && TOKEN_PATTERN.test(payload.memberToken)
        ? payload.memberToken
        : null;
      if (!response.ok || !next || !memberId || !memberToken) {
        const message = typeof payload?.error === "string"
          ? payload.error
          : "네트워크에 참여하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setErrors({ form: message });
        if (payload?.code === "idempotency_conflict") joinAttemptRef.current = null;
        return;
      }
      const nextMembership = { memberId, memberToken };
      const nextMemberships = upsertMembershipCredential(memberships, nextMembership);
      try {
        window.localStorage.setItem(`woori-network-member:${token}`, JSON.stringify(nextMemberships));
        window.sessionStorage.setItem(FREE_SELF_PERSON_STORAGE_KEY, JSON.stringify(normalized.person));
      } catch {
        // 현재 화면의 참여 권한과 결과는 유지합니다.
      }
      setMemberships(nextMemberships);
      setJoinFormOpen(false);
      setPerson(createEmptyPersonBirthForm());
      setConsent(false);
      replaceNetwork(next);
      setSelectedMemberId(memberId);
      setSelectedPairKey(relationshipNetworkPairKey(memberId, next.hostMemberId));
      setStatus("내 인연이 연결됐어요. 다른 사람과의 관계선도 눌러보세요.");
      joinAttemptRef.current = null;
    } catch {
      setErrors({ form: "네트워크에 참여하지 못했습니다. 같은 정보로 다시 시도해 주세요." });
    } finally {
      setJoining(false);
    }
  }

  function openAdditionalJoin() {
    joinAttemptRef.current = null;
    setPerson(createEmptyPersonBirthForm());
    setConsent(false);
    setErrors({});
    setJoinFormOpen(true);
    setStatus("다음 사람이 자기 정보를 직접 입력해 주세요.");
  }

  async function shareNetwork() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const title = `${host?.displayName ?? "친구"}님의 인연 네트워크`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: "내 정보만 입력하면 우리 사이 궁합이 인물 네트워크에 연결돼요.", url });
        setStatus("공유 창을 열었습니다.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("공유 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("주소창의 링크를 복사해 공유해 주세요.");
    }
  }

  async function copyManagementLink() {
    if (!ownerToken) return;
    const publicUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const hostMembership = memberships.find((membership) => membership.memberId === network.hostMemberId);
    const fragment = new URLSearchParams({
      ownerToken,
      ...(hostMembership ? {
        memberId: hostMembership.memberId,
        memberToken: hostMembership.memberToken,
      } : {}),
    }).toString();
    try {
      await navigator.clipboard.writeText(`${publicUrl}#${fragment}`);
      setStatus("방장 관리 링크를 복사했습니다. 공개 참여 링크와 구분해 보관해 주세요.");
    } catch {
      setStatus("관리 링크를 복사하지 못했습니다. 이 브라우저의 내가 만든 네트워크 목록은 유지됩니다.");
    }
  }

  async function toggleNetwork() {
    if (!ownerToken || managing) return;
    setManaging(true);
    try {
      const response = await fetch(`/api/relationship-networks/${token}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerToken, isOpen: !network.isOpen }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const next = parseRelationshipNetworkPublic(payload?.network);
      if (!response.ok || !next) throw new Error("UPDATE_FAILED");
      replaceNetwork(next);
      setStatus(next.isOpen ? "새 참여를 다시 열었습니다." : "새 참여를 닫았습니다. 기존 결과는 계속 볼 수 있어요.");
    } catch {
      setStatus("참여 상태를 바꾸지 못했습니다.");
    } finally {
      setManaging(false);
    }
  }

  async function removeMember(target: RelationshipNetworkMember) {
    if (target.isHost || managing) return;
    const localMembership = memberships.find((membership) => membership.memberId === target.id) ?? null;
    const isSelf = Boolean(localMembership);
    const credential = ownerToken || localMembership?.memberToken || null;
    if (!credential) return;
    const confirmed = window.confirm(isSelf
      ? "내 생년정보와 모든 관계선을 이 네트워크에서 삭제할까요?"
      : `${target.displayName}님의 정보와 모든 관계선을 삭제할까요?`);
    if (!confirmed) return;
    setManaging(true);
    try {
      const response = await fetch(`/api/relationship-networks/${token}/members/${target.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const next = parseRelationshipNetworkPublic(payload?.network);
      if (!response.ok || !next) throw new Error("DELETE_FAILED");
      replaceNetwork(next);
      setSelectedMemberId(next.hostMemberId);
      setSelectedPairKey(null);
      if (isSelf) {
        const nextMemberships = memberships.filter((membership) => membership.memberId !== target.id);
        try {
          if (nextMemberships.length > 0) {
            window.localStorage.setItem(`woori-network-member:${token}`, JSON.stringify(nextMemberships));
          } else {
            window.localStorage.removeItem(`woori-network-member:${token}`);
          }
          window.sessionStorage.removeItem(FREE_SELF_PERSON_STORAGE_KEY);
        } catch {
          // 서버 삭제는 완료됐으므로 브라우저 저장소 오류는 무시합니다.
        }
        setMemberships(nextMemberships);
        setPerson(createEmptyPersonBirthForm());
        setConsent(false);
      }
      setStatus("참여 정보와 연결된 관계선을 삭제했습니다.");
    } catch {
      setStatus("참여 정보를 삭제하지 못했습니다.");
    } finally {
      setManaging(false);
    }
  }

  async function deleteNetwork() {
    if (!ownerToken || managing || !window.confirm("네트워크 전체와 모든 참여 정보를 영구 삭제할까요?")) return;
    setManaging(true);
    try {
      const response = await fetch(`/api/relationship-networks/${token}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownerToken }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("DELETE_FAILED");
      try {
        window.localStorage.removeItem(`woori-network-owner:${token}`);
        window.localStorage.removeItem(`woori-network-member:${token}`);
        window.sessionStorage.removeItem(FREE_SELF_PERSON_STORAGE_KEY);
        forgetRelationshipNetwork(token);
      } catch {
        // 서버 삭제는 완료됐으므로 브라우저 저장소 오류는 무시합니다.
      }
      router.push("/one-to-many");
    } catch {
      setStatus("네트워크를 삭제하지 못했습니다.");
      setManaging(false);
    }
  }

  if (deleted) {
    return <main className={`${styles.page} relationship-network-page one-to-many-reference-page`}><div className={styles.shell}><section className={styles.deletedState}><h1>종료된 인연 네트워크입니다</h1><p>만료되었거나 방장이 삭제한 링크입니다.</p><Link href="/one-to-many">내 네트워크 만들기</Link></section></div></main>;
  }

  const pairMembers = selectedEdge
    ? [memberName(network.members, selectedEdge.memberAId), memberName(network.members, selectedEdge.memberBId)]
    : [];
  const pairIncludesViewer = Boolean(selectedEdge && memberships.some((membership) => (
    selectedEdge.memberAId === membership.memberId || selectedEdge.memberBId === membership.memberId
  )));
  const canJoin = credentialsReady && network.isOpen && network.memberCount < network.memberLimit;
  const selectedCanRemove = Boolean(selectedMember && !selectedMember.isHost && (
    ownerToken || memberships.some((membership) => membership.memberId === selectedMember.id)
  ));

  return (
    <main className={`${styles.page} reference-input-screen relationship-network-page one-to-many-reference-page`}>
      <div className={styles.shell}>
        <header className={`${styles.appHeader} one-to-many-app-header`}>
          <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
          <strong>인연 네트워크</strong>
          <span>{network.memberCount}/{network.memberLimit}</span>
        </header>

        <div className={styles.networkMain}>
          <section className={styles.networkHero}>
            <div className={styles.heroTopline}>
              <span className={network.isOpen ? styles.liveBadge : styles.closedBadge}>{network.isOpen ? "실시간 연결 중" : "새 참여 닫힘"}</span>
              <button type="button" className={styles.shareButton} onClick={shareNetwork}>링크 공유</button>
            </div>
            <h1><strong>{host?.displayName ?? "친구"}</strong>님의<br/>인연 네트워크</h1>
            <p>노드나 관계선을 누르면 두 사람의 총점과 등급을 볼 수 있어요. 새 참여는 약 4초 안에 함께 갱신됩니다.</p>
          </section>

          <p className={styles.networkStatus} aria-live="polite">{status}</p>

          {canJoin && joinFormOpen ? (
            <form className={styles.joinCard} onSubmit={submitJoin} noValidate>
              <div className={styles.joinIntro}>
                <h2>{memberships.length > 0 || ownerToken ? "다음 사람 연결하기" : "내 정보 추가하고 관계 확인하기"}</h2>
                <p>입력하는 사람이 자기 정보와 공개 범위를 직접 확인해 주세요. 참여하면 현재와 이후의 모든 사람과 궁합이 연결돼요.</p>
              </div>
              {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}
              <PersonBirthFields
                title=""
                prefix="person"
                placeholder="이 네트워크에서 사용할 별칭"
                value={person}
                errors={errors}
                onChange={(next, changedField) => {
                  setPerson(next);
                  setErrors((current) => clearPersonBirthFieldError(current, "person", changedField));
                }}
              />
              <label className={styles.consentCard}>
                <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setErrors((current) => ({ ...current, consent: "" })); }}/>
                <span><strong>공개 범위에 동의합니다</strong><small>만 14세 이상이며, 별칭과 모든 참여자 간 점수·등급이 링크 방문자에게 공개되는 것에 동의합니다. 생년정보는 화면에 공개되지 않으며 30일 뒤 조회가 차단되고 다음 자동 정리 때 삭제됩니다.</small></span>
              </label>
              <p className={styles.policyLinks}>
                제출 전에 <Link href="/terms" target="_blank" rel="noreferrer">이용약관</Link>과 <Link href="/privacy" target="_blank" rel="noreferrer">개인정보처리방침</Link>을 확인해 주세요.
              </p>
              {errors.consent ? <small className="field-error" role="alert">{errors.consent}</small> : null}
              <button type="submit" className={styles.primaryButton} disabled={joining}>{joining ? "모든 관계를 계산하고 있어요…" : "내 인연 연결하기"}</button>
              {(memberships.length > 0 || ownerToken) ? <button type="button" className={styles.joinCancelButton} onClick={() => setJoinFormOpen(false)}>입력 취소</button> : null}
            </form>
          ) : canJoin ? (
            <section className={styles.additionalJoinCard}>
              <div><strong>다른 사람도 계속 연결할 수 있어요</strong><p>같은 휴대폰이나 브라우저에서도 다음 사람이 직접 입력할 수 있습니다.</p></div>
              <button type="button" className={styles.primaryButton} onClick={openAdditionalJoin}>다른 사람 연결하기</button>
            </section>
          ) : credentialsReady && (!network.isOpen || network.memberCount >= network.memberLimit) ? (
            <section className={styles.emptyCard}>{network.isOpen ? "참여 인원이 가득 찼습니다. 기존 관계망은 계속 둘러볼 수 있어요." : "방장이 새 참여를 잠시 닫아두었습니다. 기존 관계망은 계속 볼 수 있어요."}</section>
          ) : null}

          <section className={styles.graphCard}>
            <div className={styles.graphHeader}>
              <div><h2>모든 사람의 관계망</h2><p>전체 {network.edges.length}개 관계 · 선택한 인물 중심으로 탐색</p></div>
              <span className={styles.countBadge}>{network.memberCount}명</span>
            </div>
            <div className={styles.modeTabs} aria-label="관계선 보기 방식">
              {(["focus", "strong", "all"] as GraphMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.modeButton} ${mode === value ? styles.modeButtonActive : ""}`}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                >
                  {value === "focus" ? "선택 인물" : value === "strong" ? "S·A만" : "전체 관계"}
                </button>
              ))}
            </div>
            <RelationshipNetworkGraph
              network={network}
              selectedMemberId={selectedMember?.id ?? network.hostMemberId}
              selectedPairKey={activePairKey}
              mode={mode}
              onSelectMember={selectMember}
              onSelectEdge={(edge) => setSelectedPairKey(relationshipNetworkPairKey(edge.memberAId, edge.memberBId))}
            />
            <div className={styles.memberChips} aria-label="참여자 선택">
              {network.members.map((member) => (
                <button key={member.id} type="button" className={`${styles.memberChip} ${selectedMember?.id === member.id ? styles.memberChipActive : ""}`} onClick={() => selectMember(member.id)}>
                  {member.isHost ? "★ " : ""}{member.displayName}
                </button>
              ))}
            </div>
            <div className={styles.gradeLegend} aria-label="궁합 등급 범례">
              {RELATIONSHIP_NETWORK_GRADES.map((grade) => <span key={grade} style={{ background: GRADE_COLORS[grade] }}>{grade}</span>)}
            </div>
            <p className={styles.basisNote}>무료 네트워크 점수는 모든 참여자에게 같은 친구·지인 관계 기준을 적용합니다.</p>
          </section>

          {selectedEdge ? (
            <section className={styles.relationshipCard} aria-label={`${pairMembers.join("와 ")}의 궁합 결과`}>
              <div className={styles.relationshipHeader}>
                <div className={styles.relationshipNames}><small>선택한 두 사람의 토탈 점수</small><h2>{pairMembers.join(" × ")}</h2></div>
                <span className={styles.gradeBadge} style={{ background: GRADE_COLORS[selectedEdge.grade] }}>{selectedEdge.grade}</span>
              </div>
              <div className={styles.scoreLine}><strong>{selectedEdge.score}</strong><span>/ 100점</span></div>
              <p className={styles.relationshipLabel}>{RELATIONSHIP_NETWORK_GRADE_COPY[selectedEdge.grade].label}</p>
              <p className={styles.relationshipDescription}>{RELATIONSHIP_NETWORK_GRADE_COPY[selectedEdge.grade].description}</p>
              {selectedEdge.scoreRange.min !== selectedEdge.scoreRange.max ? <p className={styles.rangeNote}>출생시간 정보에 따른 예상 범위 {selectedEdge.scoreRange.min}~{selectedEdge.scoreRange.max}점</p> : null}
              <div className={styles.insightGrid}>
                <div><small>잘 맞는 축</small><p>{selectedEdge.strengths.join(" · ") || "균형을 확인 중이에요"}</p></div>
                <div><small>맞춰볼 축</small><p>{selectedEdge.adjustments.join(" · ") || "큰 조율점이 적어요"}</p></div>
              </div>
              <Link className={`${styles.primaryButton} ${styles.ctaButton}`} href={pairIncludesViewer ? "/one-to-one?from=free" : "/one-to-one"}>
                {pairIncludesViewer ? "우리 둘의 1:1 정밀궁합 보기" : "1:1 정밀궁합 직접 확인하기"}
              </Link>
            </section>
          ) : (
            <section className={styles.emptyCard}>{network.memberCount === 1 ? "공유 링크로 첫 친구가 참여하면 두 사람의 토탈 점수와 관계선이 나타납니다." : "인물이나 관계선을 선택해 두 사람의 궁합을 확인해 보세요."}</section>
          )}

          {selectedMember && connections.length > 0 ? (
            <section className={styles.rankingCard}>
              <div className={styles.sectionHeader}><div><h2>{selectedMember.displayName}님의 모든 연결</h2><p>방장뿐 아니라 참여자 사이의 점수도 모두 계산했습니다.</p></div>{selectedMember.isHost ? <span className={styles.hostBadge}>방장</span> : null}</div>
              <div className={styles.connectionList}>
                {connections.map((edge) => {
                  const otherId = otherMemberId(edge, selectedMember.id);
                  const pairKey = relationshipNetworkPairKey(edge.memberAId, edge.memberBId);
                  return <button key={pairKey} type="button" className={`${styles.connectionButton} ${activePairKey === pairKey ? styles.connectionButtonActive : ""}`} onClick={() => setSelectedPairKey(pairKey)}><strong>{memberName(network.members, otherId)}</strong><span>{edge.score}점</span><b style={{ background: GRADE_COLORS[edge.grade] }}>{edge.grade}</b></button>;
                })}
              </div>
            </section>
          ) : null}

          {hostRanking.length > 0 && selectedMember?.id !== network.hostMemberId ? (
            <section className={styles.rankingCard}>
              <div className={styles.sectionHeader}><div><h2>{host?.displayName ?? "방장"}님과의 궁합 순위</h2><p>기존의 한눈에 보는 순위도 무료 네트워크 안에 유지했습니다.</p></div></div>
              <div className={styles.rankingList}>
                {hostRanking.map((edge, index) => {
                  const otherId = otherMemberId(edge, network.hostMemberId);
                  return <div className={styles.rankingRow} key={relationshipNetworkPairKey(edge.memberAId, edge.memberBId)}><em>{index + 1}</em><strong>{memberName(network.members, otherId)}</strong><span>{edge.score}점</span><b style={{ background: GRADE_COLORS[edge.grade] }}>{edge.grade}</b></div>;
                })}
              </div>
            </section>
          ) : null}

          {(ownerToken || memberships.length > 0) ? (
            <details className={styles.manageCard}>
              <summary>{ownerToken ? "방 관리" : "내 참여 정보 관리"}</summary>
              <div className={styles.manageBody}>
                {ownerToken ? <div className={styles.manageRow}><div><strong>내 네트워크 저장·재열람</strong><small>이 브라우저의 목록에 자동 저장됐습니다. 다른 기기용 관리 링크는 타인에게 공유하지 마세요.</small></div><button type="button" className={styles.secondaryButton} onClick={copyManagementLink}>관리 링크 복사</button></div> : null}
                {ownerToken ? <div className={styles.manageRow}><div><strong>새 참여 {network.isOpen ? "열림" : "닫힘"}</strong><small>관계망은 유지하고 새 입력만 제어합니다.</small></div><button type="button" className={styles.secondaryButton} disabled={managing} onClick={toggleNetwork}>{network.isOpen ? "참여 닫기" : "다시 열기"}</button></div> : null}
                {selectedCanRemove && selectedMember ? <div className={styles.manageRow}><div><strong>{memberships.some((membership) => membership.memberId === selectedMember.id) ? "이 브라우저에서 입력한 정보 삭제" : `${selectedMember.displayName} 삭제`}</strong><small>생년정보와 연결된 모든 관계선이 함께 삭제됩니다.</small></div><button type="button" className={styles.dangerButton} disabled={managing} onClick={() => removeMember(selectedMember)}>삭제</button></div> : null}
                {ownerToken ? <div className={styles.manageRow}><div><strong>네트워크 전체 삭제</strong><small>모든 참여 정보와 관계선을 되돌릴 수 없게 삭제합니다.</small></div><button type="button" className={styles.dangerButton} disabled={managing} onClick={deleteNetwork}>전체 삭제</button></div> : null}
              </div>
            </details>
          ) : null}

          <p className={styles.formFootnote}>궁합 점수는 기존 사주 계산의 9가지 관계 축을 사용하며 AI가 점수나 등급을 바꾸지 않습니다.</p>
        </div>
      </div>
    </main>
  );
}
