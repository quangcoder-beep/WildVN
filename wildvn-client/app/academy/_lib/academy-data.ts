export interface AcademySpeciesRecord {
  slug?: string | null;
  identificationDesc?: string | null;
  biologyDesc?: string | null;
  shortDescription?: string | null;
  description?: string | null;
}

export interface FacetOption {
  value: string;
  count: number;
}

/** Return the most useful description that is actually present in the database. */
export function getSpeciesDescription(species: AcademySpeciesRecord): string | null {
  const candidates = [species.identificationDesc, species.biologyDesc, species.shortDescription, species.description];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
}

/** Keep the filter UI aligned with facets that have real records. */
export function getAvailableFacetOptions(options: FacetOption[] | null | undefined): FacetOption[] {
  return (options ?? []).filter(({ value, count }) => value.trim().length > 0 && count > 0);
}

/**
 * Build a review deck from API records. When progress has no unlocked records,
 * the caller may pass the current API page as an exploratory deck. No local
 * showcase or fallback species are ever substituted.
 */
export function getFlashcardDeck<T extends AcademySpeciesRecord>(species: T[], unlockedSlugs: string[]): T[] {
  if (unlockedSlugs.length === 0) return species;

  const unlocked = new Set(unlockedSlugs);
  return species.filter((record) => typeof record.slug === "string" && unlocked.has(record.slug));
}

export function getTotalPages(total: number, pageSize: number): number {
  if (pageSize <= 0 || total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
