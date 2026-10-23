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
