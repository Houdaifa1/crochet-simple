interface Categorized {
  data: {
    category: { id: string };
    additionalCategories?: readonly { id: string }[];
  };
}

export const categoryIds = (pattern: Categorized): string[] => [
  ...new Set([
    pattern.data.category.id,
    ...(pattern.data.additionalCategories ?? []).map((category) => category.id),
  ]),
];

export const sharesCategory = (a: Categorized, b: Categorized): boolean => {
  const ids = categoryIds(a);
  return categoryIds(b).some((id) => ids.includes(id));
};

// patterns from the same main category first, then ones sharing another category, then the rest;
// each pattern points at the ones after it in the list, so every pattern is linked from its neighbours
export function relatedTo<T extends Categorized & { id: string }>(
  pattern: T,
  all: readonly T[],
  count = 4,
): T[] {
  const at = all.findIndex((o) => o.id === pattern.id);
  const next = [...all.slice(at + 1), ...all.slice(0, Math.max(at, 0))].filter(
    (o) => o.id !== pattern.id,
  );
  const main = next.filter((o) => o.data.category.id === pattern.data.category.id);
  const shared = next.filter((o) => !main.includes(o) && sharesCategory(pattern, o));
  const rest = next.filter((o) => !main.includes(o) && !shared.includes(o));
  return [...main, ...shared, ...rest].slice(0, count);
}
