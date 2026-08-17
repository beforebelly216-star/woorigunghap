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

export function countNarrativeNameTokens(value: unknown) {
  if (typeof value === "string") {
    return Object.values(NARRATIVE_NAME_TOKENS)
      .reduce((sum, token) => sum + value.split(token).length - 1, 0);
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, child) => sum + countNarrativeNameTokens(child), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .reduce((sum, child) => sum + countNarrativeNameTokens(child), 0);
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

export function personalizeNarrativeNames<T>(
  value: T,
  names: { self: string; partner: string },
): T {
  const tokenReplacements = narrativeNameReplacements(names);
  const roleReplacements = rolePhraseReplacements(names);

  function personalizeText(source: string) {
    const tokenized = Object.entries(tokenReplacements).reduce(
      (text, [token, replacement]) => text.split(token).join(replacement),
      source,
    );
    return roleReplacements.reduce(
      (text, [rolePhrase, replacement]) => text.split(rolePhrase).join(replacement),
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
