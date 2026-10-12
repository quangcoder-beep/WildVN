const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { databaseConnectionString } = require('./runtime-config');

const DATA_FILE = path.join(__dirname, '../wildvn-server/src/main/resources/seed/data.json');

async function updateDb() {
    const client = new Client({ connectionString: databaseConnectionString() });
    
    await client.connect();

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    let ecoCount = 0;
    if (data.ecosystems) {
        for (const eco of data.ecosystems) {
            await client.query(
                'UPDATE ecosystems SET thumbnail_url = $1 WHERE id = $2',
                [eco.thumbnailUrl, eco.id]
            );
            ecoCount++;
        }
    }
    
    let spCount = 0;
    if (data.species) {
        for (const sp of data.species) {
            await client.query(
                'UPDATE species SET thumbnail_url = $1, gallery_urls = $2 WHERE id = $3',
                [sp.thumbnailUrl, sp.galleryUrls, sp.id]
            );
            spCount++;
        }
    }
    
    console.log(`Updated ${ecoCount} ecosystems and ${spCount} species in DB using pg.`);
    await client.end();
}

updateDb().catch(console.error);
