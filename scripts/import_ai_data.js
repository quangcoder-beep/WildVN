const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { databaseConnectionString } = require('./runtime-config');

const JSON_DIR = path.join(__dirname, '../crawl4ai-project/json_output_ai');

async function importAiData() {
    const client = new Client({ connectionString: databaseConnectionString() });
    
    await client.connect();
    console.log('Connected to PostgreSQL');

    const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    let updatedCount = 0;

    for (const file of files) {
        const filePath = path.join(JSON_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const data = JSON.parse(content);
            
            // Extract slug from filename or generate from name
            // Filename format seems to be: vncreatures.net_species_buom-giap-chot-rau-cam.json
            let slug = '';
            const match = file.match(/_species_(.*)\.json/);
            if (match) {
                slug = match[1];
            } else if (file === 'example.com.json' || file === 'www.vncreatures.net_chitiet.php.json') {
                continue; // Skip dummy files
            } else {
                continue;
            }

            const query = `
                UPDATE species 
                SET 
                    identification_desc = $1,
                    biology_desc = $2,
                    threats_desc = $3,
                    conservation_desc = $4,
                    synonyms = $5
                WHERE slug = $6
            `;
            
            const values = [
                data.identificationDesc || null,
                data.biologyDesc || null,
                data.threatsDesc || null,
                data.conservationDesc || null,
                data.synonyms || [],
                slug
            ];

            const res = await client.query(query, values);
            if (res.rowCount > 0) {
                console.log(`✅ Updated ${slug}`);
                updatedCount++;
            } else {
                // If not found by slug, maybe try by scientific_name
                if (data.scientificName) {
                    const q2 = `
                        UPDATE species 
                        SET 
                            identification_desc = $1,
                            biology_desc = $2,
                            threats_desc = $3,
                            conservation_desc = $4,
                            synonyms = $5
                        WHERE scientific_name = $6
                    `;
                    const res2 = await client.query(q2, [...values.slice(0, 5), data.scientificName]);
                    if (res2.rowCount > 0) {
                         console.log(`✅ Updated ${slug} by scientific name: ${data.scientificName}`);
                         updatedCount++;
                    } else {
                         console.log(`⚠️ Not found in DB: ${slug} (${data.scientificName})`);
                    }
                } else {
                    console.log(`⚠️ Not found in DB: ${slug}`);
                }
            }
        } catch (e) {
            console.error(`Error parsing ${file}:`, e.message);
        }
    }
    
    console.log(`\nFinished! Updated ${updatedCount} species.`);
    await client.end();
}

importAiData().catch(console.error);
