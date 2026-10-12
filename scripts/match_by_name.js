const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { databaseConnectionString } = require('./runtime-config');

const JSON_DIR = path.join(__dirname, '../crawl4ai-project/json_output_ai');
const MD_DIR = path.join(__dirname, '../crawl4ai-project/output');

async function run() {
    const client = new Client({ connectionString: databaseConnectionString() });
    await client.connect();
    
    const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
        if (file === 'example.com.json' || file === 'www.vncreatures.net_chitiet.php.json') continue;
        
        const jsonPath = path.join(JSON_DIR, file);
        const mdPath = path.join(MD_DIR, file.replace('.json', '.md'));
        
        if (!fs.existsSync(mdPath)) continue;

        let data = {};
        try {
            data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } catch (e) {}

        const scName = data.scientificName || data.scientific_name;
        const nameVn = data.nameVn || data.name_vn;

        const mdContent = fs.readFileSync(mdPath, 'utf8');
        
        // Find the first image url in markdown: ![alt](url)
        let imageUrl = null;
        const imgMatch = mdContent.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (imgMatch) {
            imageUrl = imgMatch[1];
        }

        if (imageUrl && scName) {
            console.log(`Setting image for ${scName} to ${imageUrl}`);
            try {
                // try to find the species in db by scientific_name (ignore case)
                const res = await client.query('UPDATE species SET thumbnail_url = $1 WHERE LOWER(scientific_name) = LOWER($2) RETURNING slug', [imageUrl, scName]);
                if (res.rowCount > 0) {
                    console.log(`✅ Updated DB for ${scName} -> ${res.rows[0].slug}`);
                } else {
                    console.log(`⚠️ Not found in DB: ${scName}`);
                }
            } catch (e) {
                console.error(`❌ Failed for ${scName}: ${e.message}`);
            }
        }
    }
    
    await client.end();
}

run().catch(console.error);
