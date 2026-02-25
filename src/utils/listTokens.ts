export const normalizeToken = (value: unknown): string => String(value ?? '').trim().toLowerCase();

// Nota: in DB alcune liste possono arrivare con separatori diversi (es. ';', ',', '\n').
// Standardizziamo la lettura gestendo tutti i casi.
export const parseListTokens = (value?: unknown): string[] => {
  if (value == null) return [];
  return String(value)
    .split(/[;\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

export const listHasToken = (value: unknown, token: string): boolean => {
  const needle = normalizeToken(token);
  if (!needle) return false;
  return parseListTokens(value).some((t) => normalizeToken(t) === needle);
};
