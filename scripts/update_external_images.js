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
        
        let slug = '';
        const match = file.match(/_species_(.*)\.json/);
        if (match) {
            slug = match[1];
        } else {
            continue;
        }

        if (!fs.existsSync(mdPath)) continue;

        const mdContent = fs.readFileSync(mdPath, 'utf8');
        
        // Find the first image url in markdown: ![alt](url)
        const imgMatch = mdContent.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (imgMatch) {
            const imageUrl = imgMatch[1];
            console.log(`Setting image for ${slug} to ${imageUrl}`);
            
            try {
                await client.query('UPDATE species SET thumbnail_url = $1 WHERE slug = $2 OR slug = $3', [imageUrl, slug, 'moduza-procris']);
                console.log(`✅ Updated DB for ${slug}`);
            } catch (e) {
                console.error(`❌ Failed for ${slug}: ${e.message}`);
            }
        }
    }
    
    await client.end();
}

run().catch(console.error);
