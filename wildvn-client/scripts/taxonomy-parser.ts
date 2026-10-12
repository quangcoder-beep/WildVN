export type TaxonomyRank = 'KINGDOM' | 'PHYLUM' | 'CLASS' | 'ORDER' | 'FAMILY';

export interface ParsedTaxonomyNode {
  rank: TaxonomyRank;
  nameVn: string;
  scientificName: string;
}

const TAXONOMY_BLOCK = /\[Giới:\s*([^\]]+)\][\s\S]{0,1200}?\[Ngành:\s*([^\]]+)\][\s\S]{0,1200}?\[Lớp:\s*([^\]]+)\][\s\S]{0,1200}?\[Bộ:\s*([^\]]+)\][\s\S]{0,1200}?\[Họ:\s*([^\]]+)\]/u;

const RANKS: TaxonomyRank[] = ['KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY'];

export function parseTaxonomyFromMarkdown(markdown: string): ParsedTaxonomyNode[] | null {
  const match = TAXONOMY_BLOCK.exec(markdown);
  if (!match) return null;

  const parsed = match.slice(1).map(parseTaxonomyLabel);
  if (parsed.some((node): node is null => node === null)) return null;

  return parsed.map((node, index) => ({
    rank: RANKS[index],
    nameVn: node.nameVn,
    scientificName: node.scientificName,
  }));
}

export function deriveGenus(scientificName: string): string | null {
  const genus = scientificName.trim().split(/\s+/u)[0] ?? '';
  return /^[A-Z][A-Za-z-]+$/u.test(genus) ? genus : null;
}

function parseTaxonomyLabel(label: string): Omit<ParsedTaxonomyNode, 'rank'> | null {
  const normalized = label.replace(/\s+/gu, ' ').trim();
  const scientificName = normalized.match(/([A-Za-z][A-Za-z-]*)$/u)?.[1];
  if (!scientificName) return null;

  const nameVn = normalized.slice(0, -scientificName.length).trim();
  if (!nameVn) return null;

  return { nameVn, scientificName };
}
