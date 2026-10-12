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

        const mdContent = fs.readFileSync(mdPath, 'utf8');
        
        // Find all image urls in markdown
        const imgMatches = [...mdContent.matchAll(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g)];
        const imageUrls = imgMatches.map(m => m[1]);
        
        if (imageUrls.length > 0 && scName) {
            // first is thumbnail, all others are gallery
            const thumbnail = imageUrls[0];
            const gallery = JSON.stringify(imageUrls);
            
            console.log(`Setting gallery for ${scName} with ${imageUrls.length} images`);
            try {
                const res = await client.query('UPDATE species SET thumbnail_url = $1, gallery_urls = $2 WHERE LOWER(scientific_name) = LOWER($3) RETURNING slug', [thumbnail, gallery, scName]);
                if (res.rowCount > 0) {
                    console.log(`✅ Updated DB for ${scName} -> ${res.rows[0].slug}`);
                }
            } catch (e) {
                console.error(`❌ Failed for ${scName}: ${e.message}`);
            }
        }
    }
    
    await client.end();
}

run().catch(console.error);
