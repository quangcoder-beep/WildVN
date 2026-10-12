import {
  ACTIVITY_LABELS,
  CONSERVATION_LABELS,
  DIET_LABELS,
  HABITAT_LABELS,
} from "@/app/_shared/constants/species";

export interface TaxonomyTrailNode {
  id?: string;
  rank?: string | null;
  scientificName: string;
  parent?: TaxonomyTrailNode | null;
}

export interface StatusPresentation {
  code: string;
  label: string;
  description: string;
  isAssessed: boolean;
}

export function getStatusPresentation(status?: string | null): StatusPresentation {
  const code = status?.trim() || "NE";
  const known = CONSERVATION_LABELS[code];

  return {
    code,
    label: known?.label || code,
    description: known?.description || "Thông tin tình trạng đang được cập nhật.",
    isAssessed: code !== "NE",
  };
}

export function translateDietType(value?: string | null): string {
  return value ? DIET_LABELS[value] || value : "Chưa cập nhật";
}

export function translateHabitatTypes(values?: string[] | null): string {
  if (!values?.length) return "Chưa cập nhật";
  return values.map((value) => HABITAT_LABELS[value] || value).join(", ");
}

export function translateActivityPattern(value?: string | null): string {
  return value ? ACTIVITY_LABELS[value] || value : "Chưa cập nhật";
}

export function taxonomyTrail(
  taxonomy?: TaxonomyTrailNode | null,
  scientificName?: string | null,
): TaxonomyTrailNode[] {
  const trail: TaxonomyTrailNode[] = [];
  let current = taxonomy;

  while (current) {
    trail.unshift(current);
    current = current.parent || null;
  }

  if (scientificName) {
    trail.push({ rank: "SPECIES", scientificName });
  }

  return trail;
}

export function getFirstCitationYear(citation?: string | null): number | null {
  const match = citation?.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}
