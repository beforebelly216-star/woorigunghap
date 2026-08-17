export const NARRATIVE_NAME_TOKENS = {
  self: "{{SELF}}",
  partner: "{{PARTNER}}",
  both: "{{BOTH}}",
} as const;

function honorificName(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.endsWith("님") ? trimmed : `${trimmed}님`;
}

export function narrativeNameReplacements(names: {
  self: string;
  partner: string;
}) {
  const self = honorificName(names.self, "나");
  const partner = honorificName(names.partner, "상대");
  return {
    [NARRATIVE_NAME_TOKENS.self]: self,
    [NARRATIVE_NAME_TOKENS.partner]: partner,
    [NARRATIVE_NAME_TOKENS.both]: `${self}과 ${partner}`,
  } as const;
}

export function countNarrativeNameTokens(value: unknown): number {
  if (typeof value === "string") {
    return Object.values(NARRATIVE_NAME_TOKENS)
      .reduce<number>((sum, token) => sum + value.split(token).length - 1, 0);
  }
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, child) => sum + countNarrativeNameTokens(child), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .reduce<number>((sum, child) => sum + countNarrativeNameTokens(child), 0);
  }
  return 0;
}

function rolePhraseReplacements(names: { self: string; partner: string }) {
  const self = honorificName(names.self, "나");
  const partner = honorificName(names.partner, "상대");

  return [
    ["상대에게는", `${partner}에게는`],
    ["상대에게", `${partner}에게`],
    ["상대 쪽에는", `${partner} 쪽에는`],
    ["상대 쪽에", `${partner} 쪽에`],
    ["상대 쪽", `${partner} 쪽`],
    ["상대는", `${partner}은`],
    ["상대가", `${partner}이`],
    ["상대를", `${partner}을`],
    ["상대의", `${partner}의`],
    ["상대와", `${partner}과`],
    ["상대도", `${partner}도`],
    ["상대만", `${partner}만`],
    ["나에게는", `${self}에게는`],
    ["나에게", `${self}에게`],
    ["내게는", `${self}에게는`],
    ["내게", `${self}에게`],
    ["내 쪽에는", `${self} 쪽에는`],
    ["내 쪽에", `${self} 쪽에`],
    ["내 쪽", `${self} 쪽`],
    ["나는", `${self}은`],
    ["내가", `${self}이`],
    ["나를", `${self}을`],
    ["나의", `${self}의`],
    ["나와", `${self}과`],
    ["나도", `${self}도`],
    ["나만", `${self}만`],
    ["내 방식", `${self}의 방식`],
    ["내 강점", `${self}의 강점`],
  ] as const;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceIndependentRolePhraseOnce(source: string, phrase: string, replacement: string) {
  const pattern = new RegExp(`(^|[^가-힣A-Za-z0-9])${escapeRegExp(phrase)}`);
  return source.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`);
}

const HONORIFIC_PARTICLE_MAP: Record<string, string> = {
  "는": "은",
  "은": "은",
  "가": "이",
  "이": "이",
  "를": "을",
  "을": "을",
  "와": "과",
  "과": "과",
  "로": "으로",
  "으로": "으로",
  "라고": "이라고",
  "이라고": "이라고",
  "라면": "이라면",
  "이라면": "이라면",
  "라는": "이라는",
  "이라는": "이라는",
  "랑": "이랑",
  "이랑": "이랑",
  "야": "이야",
  "이야": "이야",
};

const TOKEN_PARTICLES = [
  "에게서는", "에게서", "에게는", "에게", "이라면", "이라는", "이라고", "으로는", "으로",
  "라면", "라는", "라고", "이랑", "처럼", "보다", "부터", "까지", "에서", "으로", "랑",
  "은", "는", "이", "가", "을", "를", "과", "와", "의", "도", "만", "로", "야",
] as const;

function normalizeParticle(particle: string) {
  if (particle === "으로는") return "으로는";
  return HONORIFIC_PARTICLE_MAP[particle] ?? particle;
}

function replaceNameTokenWithParticle(source: string, token: string, replacement: string) {
  const particles = TOKEN_PARTICLES.map(escapeRegExp).join("|");
  const pattern = new RegExp(`${escapeRegExp(token)}(${particles})?`, "g");
  return source.replace(pattern, (_match, particle: string | undefined) => (
    `${replacement}${particle ? normalizeParticle(particle) : ""}`
  ));
}

export function personalizeNarrativeNames<T>(
  value: T,
  names: { self: string; partner: string },
): T {
  const tokenReplacements = narrativeNameReplacements(names);
  const roleReplacements = rolePhraseReplacements(names);

  function personalizeText(source: string) {
    const hadNameToken = Object.values(NARRATIVE_NAME_TOKENS).some((token) => source.includes(token));
    const tokenized = Object.entries(tokenReplacements).reduce(
      (text, [token, replacement]) => replaceNameTokenWithParticle(text, token, replacement),
      source,
    );

    // New reports are instructed to place privacy-safe name tokens deliberately.
    // When a field already contains a token, preserve the remaining 나/상대 pronouns
    // instead of turning every role reference into a repeated name. For legacy reports
    // without tokens, keep a restrained fallback: at most one replacement per phrase.
    if (hadNameToken) return tokenized;
    return roleReplacements.reduce(
      (text, [rolePhrase, replacement]) => replaceIndependentRolePhraseOnce(text, rolePhrase, replacement),
      tokenized,
    );
  }

  function visit(node: unknown): unknown {
    if (typeof node === "string") return personalizeText(node);
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .map(([key, child]) => [key, visit(child)]),
      );
    }
    return node;
  }

  return visit(value) as T;
}
