interface CataloguePattern {
  data: { published: Date; pdf?: unknown; etsyUrl?: string | undefined };
}

export function comparePatterns(a: CataloguePattern, b: CataloguePattern): number {
  const listed = (p: CataloguePattern) => Boolean(p.data.etsyUrl) && !p.data.pdf;
  return (
    Number(listed(b)) - Number(listed(a)) || b.data.published.getTime() - a.data.published.getTime()
  );
}
