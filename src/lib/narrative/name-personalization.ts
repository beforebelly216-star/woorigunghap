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

export function personalizeNarrativeNames<T>(
  value: T,
  names: { self: string; partner: string },
): T {
  const replacements = narrativeNameReplacements(names);

  function visit(node: unknown): unknown {
    if (typeof node === "string") {
      return Object.entries(replacements).reduce(
        (text, [token, replacement]) => text.split(token).join(replacement),
        node,
      );
    }
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
