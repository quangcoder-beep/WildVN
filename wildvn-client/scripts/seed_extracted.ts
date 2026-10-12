import 'dotenv/config'; // loads .env in wildvn-client
import { PrismaClient, TaxonomyRank } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getOrCreateTaxonomyNode(rank: TaxonomyRank, scientificName: string, parentId: string | null = null) {
  const existing = await prisma.taxonomy.findFirst({
    where: { rank, scientificName, parentId }
  });
  if (existing) return existing;
  return prisma.taxonomy.create({
    data: { rank, scientificName, parentId }
  });
}

async function main() {
  const processedDir = path.resolve(__dirname, '../../crawl4ai-project/processed');
  
  if (!fs.existsSync(processedDir)) {
    console.error(`Directory not found: ${processedDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(processedDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} JSON files to seed.`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    if (file === 'vncreatures.net_species.json' || file === 'example.com.json') {
      continue;
    }

    const filePath = path.join(processedDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (!data.taxonomy || typeof data.taxonomy !== 'object') {
        throw new Error('Missing or invalid taxonomy');
      }

      // Hierarchy: Kingdom -> Phylum -> Class -> Order -> Family -> Genus
      const kingdomName = data.taxonomy.kingdom || (data.habitatType?.includes('TERRESTRIAL') && data.dietType === 'HERBIVORE' ? 'Plantae' : 'Animalia');
      const kingdomNode = await getOrCreateTaxonomyNode('KINGDOM', kingdomName);

      const phylumName = data.taxonomy.phylum || 'Unknown';
      const phylumNode = await getOrCreateTaxonomyNode('PHYLUM', phylumName, kingdomNode.id);

      const className = data.taxonomy.class || 'Unknown';
      const classNode = await getOrCreateTaxonomyNode('CLASS', className, phylumNode.id);

      const orderName = data.taxonomy.order || 'Unknown';
      const orderNode = await getOrCreateTaxonomyNode('ORDER', orderName, classNode.id);

      const familyName = data.taxonomy.family || 'Unknown';
      const familyNode = await getOrCreateTaxonomyNode('FAMILY', familyName, orderNode.id);

      const genusName = data.taxonomy.genus || 'Unknown';
      const genusNode = await getOrCreateTaxonomyNode('GENUS', genusName, familyNode.id);
      
      let vnDecreeStatus = data.vnDecreeStatus || 'NONE';
      if (['IA', 'IB', 'IIA', 'IIB'].includes(vnDecreeStatus)) {
          vnDecreeStatus = `GROUP_${vnDecreeStatus}`;
      } else if (!['GROUP_IA', 'GROUP_IB', 'GROUP_IIA', 'GROUP_IIB', 'NONE'].includes(vnDecreeStatus)) {
          vnDecreeStatus = 'NONE';
      }

      let habitatType = data.habitatType || [];
      if (!Array.isArray(habitatType)) habitatType = [habitatType];
      habitatType = habitatType.map((h: string) => {
          if (h === 'ARBOREAL') return 'CANOPY';
          return h;
      }).filter((h: string) => ['TERRESTRIAL', 'FRESHWATER', 'MARINE', 'CANOPY'].includes(h));

      const validDietTypes = ['CARNIVORE', 'HERBIVORE', 'OMNIVORE', 'INSECTIVORE', 'AUTOTROPH'];
      const dietType = validDietTypes.includes(data.dietType) ? data.dietType : null;

      const validActivityPatterns = ['DIURNAL', 'NOCTURNAL', 'CREPUSCULAR'];
      const activityPattern = validActivityPatterns.includes(data.activityPattern) ? data.activityPattern : null;

      // Upsert species
      const species = await prisma.species.upsert({
        where: { slug: data.slug },
        update: {
          scientificName: data.scientificName,
          nameVn: data.nameVn,
          nameEn: data.nameEn || null,
          authorCitation: data.authorCitation || null,
          synonyms: data.synonyms || [],
          identificationDesc: data.identificationDesc || null,
          biologyDesc: data.biologyDesc || null,
          threatsDesc: data.threatsDesc || null,
          conservationDesc: data.conservationDesc || null,
          dietType: dietType,
          habitatType: habitatType,
          activityPattern: activityPattern,
          conservationStatus: data.conservationStatus || 'NE',
          vnRedListStatus: data.vnRedListStatus || 'NE',
          citesAppendix: data.citesAppendix || 'NONE',
          vnDecreeStatus: vnDecreeStatus as any,
          isFeatured: false,
          taxonomyId: genusNode.id,
        },
        create: {
          slug: data.slug,
          scientificName: data.scientificName,
          nameVn: data.nameVn,
          nameEn: data.nameEn || null,
          authorCitation: data.authorCitation || null,
          synonyms: data.synonyms || [],
          identificationDesc: data.identificationDesc || null,
          biologyDesc: data.biologyDesc || null,
          threatsDesc: data.threatsDesc || null,
          conservationDesc: data.conservationDesc || null,
          dietType: dietType,
          habitatType: habitatType,
          activityPattern: activityPattern,
          conservationStatus: data.conservationStatus || 'NE',
          vnRedListStatus: data.vnRedListStatus || 'NE',
          citesAppendix: data.citesAppendix || 'NONE',
          vnDecreeStatus: vnDecreeStatus as any,
          isFeatured: false,
          taxonomyId: genusNode.id,
        }
      });
      console.log(`Seeded: ${species.nameVn} (${species.scientificName})`);
      successCount++;
    } catch (e) {
      console.error(`Error seeding ${file}:`, e);
      failCount++;
    }
  }

  console.log(`\nSeeding Complete! Success: ${successCount}, Failed: ${failCount}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
