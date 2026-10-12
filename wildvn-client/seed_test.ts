import 'dotenv/config';
import prisma from './app/_shared/lib/prisma';
import { ConservationStatus, PublishStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('Bắt đầu quy trình Seed dữ liệu (Stage 4)...');
  
  // 1. Đảm bảo có một Taxonomy gốc (để test)
  let rootTaxonomy = await prisma.taxonomy.findFirst({
    where: { scientificName: 'Animalia' }
  });
  
  if (!rootTaxonomy) {
    rootTaxonomy = await prisma.taxonomy.create({
      data: {
        rank: 'KINGDOM',
        scientificName: 'Animalia',
        nameVn: 'Động vật',
      }
    });
    console.log('Đã tạo Taxonomy gốc: Animalia');
  }

  const jsonDir = path.join(__dirname, '../crawl4ai-project/json_output_ai');
  if (!fs.existsSync(jsonDir)) {
    console.error('Không tìm thấy thư mục:', jsonDir);
    return;
  }

  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  console.log(`Tìm thấy ${files.length} file JSON.`);

  for (const file of files) {
    const filePath = path.join(jsonDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const data = JSON.parse(content);
      
      const slug = generateSlug(data.scientificName);
      
      // Kiểm tra trùng lặp
      let species = await prisma.species.findFirst({
          where: { slug: slug }
      });

      const validDietTypes = ['CARNIVORE', 'HERBIVORE', 'OMNIVORE', 'INSECTIVORE'];
      const validHabitatTypes = ['TERRESTRIAL', 'FRESHWATER', 'MARINE', 'CANOPY'];
      const validActivityPatterns = ['DIURNAL', 'NOCTURNAL', 'CREPUSCULAR'];
      const validVnRedList = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'];
      const validCites = ['I', 'II', 'III', 'NONE'];
      const validDecree = ['GROUP_IA', 'GROUP_IB', 'GROUP_IIA', 'GROUP_IIB', 'NONE'];

      const diet = validDietTypes.includes(data.diet) ? data.diet : null;
      const habitats = (data.habitats || []).filter((h: string) => validHabitatTypes.includes(h));
      const activity = validActivityPatterns.includes(data.activityPattern) ? data.activityPattern : null;
      const vnRedList = validVnRedList.includes(data.vnRedListStatus) ? data.vnRedListStatus : null;
      const cites = validCites.includes(data.citesAppendix) ? data.citesAppendix : null;
      const vnDecree = validDecree.includes(data.vnDecreeStatus) ? data.vnDecreeStatus : null;

      if (!species) {
          species = await prisma.species.create({
            data: {
                taxonomyId: rootTaxonomy.id,
                slug: slug,
                scientificName: data.scientificName,
                nameVn: data.nameVn || 'Chưa rõ',
                nameEn: data.nameEn,
                authorCitation: data.authorCitation,
                synonyms: data.synonyms || [],
                identificationDesc: data.identificationDesc,
                biologyDesc: data.biologyDesc,
                threatsDesc: data.threatsDesc,
                conservationDesc: data.conservationDesc,
                dietType: diet,
                habitatType: habitats,
                activityPattern: activity,
                conservationStatus: ConservationStatus.NE,
                vnRedListStatus: vnRedList,
                citesAppendix: cites,
                vnDecreeStatus: vnDecree,
                publishStatus: PublishStatus.PUBLISHED,
            }
          });
          console.log(`-> Đã tạo mới vào Database: ${data.nameVn} (${data.scientificName})`);
      } else {
          console.log(`-> Đã tồn tại trong Database: ${data.nameVn} (${data.scientificName})`);
      }
      
    } catch (e) {
      console.error(`Lỗi khi seed file ${file}:`, e);
    }
  }
  
  console.log('Seed hoàn tất!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
