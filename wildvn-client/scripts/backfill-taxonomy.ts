import 'dotenv/config';

import { PrismaClient, TaxonomyRank } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deriveGenus, parseTaxonomyFromMarkdown, type ParsedTaxonomyNode } from './taxonomy-parser';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const projectRoot = path.resolve(currentDirectory, '..');
const normalizedDataDirectory = path.resolve(projectRoot, '../crawl4ai-project/json_output_ai');
const markdownDirectory = path.resolve(projectRoot, '../crawl4ai-project/output');
const applyChanges = process.argv.includes('--apply');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type BackfillSummary = {
  scanned: number;
  parsed: number;
  matched: number;
  updated: number;
  unchanged: number;
  missingMarkdown: number;
  missingTaxonomy: number;
  missingSpecies: number;
  invalidScientificName: number;
};

async function main(): Promise<void> {
  const summary: BackfillSummary = {
    scanned: 0,
    parsed: 0,
    matched: 0,
    updated: 0,
    unchanged: 0,
    missingMarkdown: 0,
    missingTaxonomy: 0,
    missingSpecies: 0,
    invalidScientificName: 0,
  };

  const jsonFiles = (await fs.readdir(normalizedDataDirectory))
    .filter((file) => file.endsWith('.json'))
    .sort();

  for (const jsonFile of jsonFiles) {
    summary.scanned += 1;
    const jsonPath = path.join(normalizedDataDirectory, jsonFile);
    const markdownPath = path.join(markdownDirectory, jsonFile.replace(/\.json$/u, '.md'));
    const rawJson = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(rawJson) as { scientificName?: unknown };
    const scientificName = typeof data.scientificName === 'string' ? data.scientificName.trim() : '';
    const genus = deriveGenus(scientificName);

    if (!genus) {
      summary.invalidScientificName += 1;
      continue;
    }

    let markdown: string;
    try {
      markdown = await fs.readFile(markdownPath, 'utf8');
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        summary.missingMarkdown += 1;
        continue;
      }
      throw error;
    }

    const taxonomy = parseTaxonomyFromMarkdown(markdown);
    if (!taxonomy) {
      summary.missingTaxonomy += 1;
      continue;
    }
    summary.parsed += 1;

    const species = await prisma.species.findUnique({ where: { scientificName } });
    if (!species) {
      summary.missingSpecies += 1;
      continue;
    }
    summary.matched += 1;

    if (!applyChanges) continue;

    const taxonomyId = await ensureTaxonomyPath(taxonomy, genus);
    if (species.taxonomyId === taxonomyId) {
      summary.unchanged += 1;
      continue;
    }

    await prisma.species.update({
      where: { id: species.id },
      data: { taxonomyId },
    });
    summary.updated += 1;
  }

  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', ...summary }));
}

async function ensureTaxonomyPath(nodes: ParsedTaxonomyNode[], genus: string): Promise<string> {
  let parentId: string | null = null;

  for (const node of nodes) {
    const taxonomyNode = await findOrCreateTaxonomyNode(node.rank, node.scientificName, node.nameVn, parentId);
    parentId = taxonomyNode.id;
  }

  return findOrCreateTaxonomyNode('GENUS', genus, '', parentId)
    .then((node) => node.id);
}

async function findOrCreateTaxonomyNode(
  rank: TaxonomyRank,
  scientificName: string,
  nameVn: string,
  parentId: string | null,
) {
  const existing = await prisma.taxonomy.findFirst({
    where: { rank, scientificName, parentId },
  });
  if (existing) return existing;

  return prisma.taxonomy.create({
    data: {
      rank,
      scientificName,
      nameVn: nameVn || null,
      parentId,
    },
  });
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
