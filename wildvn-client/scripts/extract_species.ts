import { GoogleGenerativeAI, Schema } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../crawl4ai-project/.env') });

// Ensure the API key is set
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY environment variable');
  process.exit(1);
}

const ai = new GoogleGenerativeAI(apiKey);

// Define the expected output schema based on our Prisma model
const SpeciesExtractionSchema: Schema = {
  type: 'object' as any,
  properties: {
    slug: {
      type: 'string' as any,
      description: "URL-friendly slug generated from the Vietnamese or scientific name.",
    },
    scientificName: {
      type: 'string' as any,
      description: "The scientific (Latin) name of the species.",
    },
    nameVn: {
      type: 'string' as any,
      description: "The Vietnamese name of the species.",
    },
    nameEn: {
      type: 'string' as any,
      description: "The English name of the species, if available.",
    },
    authorCitation: {
      type: 'string' as any,
      description: "The author and year of discovery (e.g., Linnaeus, 1758).",
    },
    synonyms: {
      type: 'array' as any,
      items: { type: 'string' as any },
      description: "List of synonymous scientific names.",
    },
    identificationDesc: {
      type: 'string' as any,
      description: "Detailed description of physical characteristics to identify the species.",
    },
    biologyDesc: {
      type: 'string' as any,
      description: "Biological and ecological details, including reproduction and habits.",
    },
    threatsDesc: {
      type: 'string' as any,
      description: "Information about threats to the species' survival.",
    },
    conservationDesc: {
      type: 'string' as any,
      description: "Conservation measures or notes.",
    },
    dietType: {
      type: 'string' as any,
      description: "Must be one of: CARNIVORE, HERBIVORE, OMNIVORE, INSECTIVORE, or null if unknown.",
    },
    habitatType: {
      type: 'array' as any,
      items: { type: 'string' as any },
      description: "Array containing any applicable habitats: TERRESTRIAL, AQUATIC, ARBOREAL, FOSSORIAL.",
    },
    activityPattern: {
      type: 'string' as any,
      description: "Must be one of: DIURNAL, NOCTURNAL, CREPUSCULAR, or null if unknown.",
    },
    conservationStatus: {
      type: 'string' as any,
      description: "Must be one of: EX, EW, CR, EN, VU, NT, LC, DD, NE.",
    },
    vnRedListStatus: {
      type: 'string' as any,
      description: "Must be one of: EX, EW, CR, EN, VU, NT, LC, DD, NE.",
    },
    citesAppendix: {
      type: 'string' as any,
      description: "Must be one of: I, II, III, NONE.",
    },
    vnDecreeStatus: {
      type: 'string' as any,
      description: "Must be one of: IB, IIB, NONE.",
    },
    taxonomy: {
      type: 'object' as any,
      properties: {
        class: { type: 'string' as any, description: "Class name in Latin or Vietnamese" },
        order: { type: 'string' as any, description: "Order name in Latin or Vietnamese" },
        family: { type: 'string' as any, description: "Family name in Latin or Vietnamese" },
        genus: { type: 'string' as any, description: "Genus name in Latin" }
      },
      required: ["class", "order", "family", "genus"]
    }
  },
  required: ["slug", "scientificName", "nameVn", "conservationStatus", "taxonomy"]
};

async function processFile(filePath: string) {
  console.log(`Processing: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // We don't need the huge navigation blocks, we can extract the main body
  // Wait, let's just pass the whole content, Gemini 2.0 can handle large context.

  const prompt = `
You are an expert biologist and data extractor. 
I have a markdown file scraped from a biodiversity website (vncreatures.net).
Extract all relevant species information and map it strictly to the provided JSON schema.
If an information field (like dietType, habitatType, activityPattern) is not explicitly stated but can be confidently inferred from the species biology, do so. 
If an exact match for enum values like IUCN conservation status is not found, map their Vietnamese equivalent (e.g. Sắp nguy cấp -> VU, Nguy cấp -> EN, Rất nguy cấp -> CR, v.v).
If missing, use appropriate defaults or null as defined by the schema.

Markdown Content:
${content}
`;

  try {
    const model = ai.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SpeciesExtractionSchema,
        temperature: 0.1,
      }
    });
    
    const response = await model.generateContent(prompt);

    if (response.response.text()) {
      const data = JSON.parse(response.response.text());
      console.log('Extracted successfully:', data.scientificName);
      return data;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
  return null;
}

async function main() {
  const inputDir = path.resolve(__dirname, '../../crawl4ai-project/output');
  const outputDir = path.resolve(__dirname, '../../crawl4ai-project/processed');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allFiles = fs.readdirSync(inputDir);
  const files = allFiles.filter(f => f.startsWith('vncreatures.net_species_') && f.endsWith('.md'));
  console.log(`Found ${files.length} species markdown files to process.`);

  const concurrency = 5;
  let index = 0;

  async function worker() {
    while (index < files.length) {
      const i = index++;
      const file = files[i];
      const jsonFile = file.replace('.md', '.json');
      const outputPath = path.join(outputDir, jsonFile);

      if (fs.existsSync(outputPath)) {
        console.log(`[${i + 1}/${files.length}] Skipping ${file} (already processed)`);
        continue;
      }

      console.log(`[${i + 1}/${files.length}] Processing ${file}...`);
      const filePath = path.join(inputDir, file);
      const result = await processFile(filePath);
      
      if (result) {
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log('Extraction completed.');
}

main().catch(console.error);
