const fs = require('fs');
const axios = require('axios');
const { Client } = require('pg');
const { databaseConnectionString } = require('./runtime-config');

const pgClient = new Client({ connectionString: databaseConnectionString() });

async function fetchWikiImage(query, lang = 'en') {
    try {
        const apiUrl = `https://${lang}.wikipedia.org/w/api.php`;
        const res = await axios.get(apiUrl, {
            params: {
                action: 'query',
                titles: query,
                prop: 'pageimages',
                format: 'json',
                pithumbsize: 800
            },
            headers: {
                'User-Agent': 'WildVNBot/1.0 (contact@wildvn.org)'
            }
        });
        const pages = res.data?.query?.pages;
        if (!pages) return null;
        
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return null; // Not found
        
        const thumbnail = pages[pageId].thumbnail;
        return thumbnail ? thumbnail.source : null;
    } catch (e) {
        console.error(`Wiki API error for ${query}:`, e.message);
        return null;
    }
}

async function main() {
    try {
        await pgClient.connect();
        console.log("Connected to PostgreSQL");
        
        const res = await pgClient.query("SELECT id, slug, scientific_name, name_vn FROM species WHERE thumbnail_url IS NULL OR thumbnail_url = '' OR thumbnail_url NOT LIKE 'http%';");
        const speciesList = res.rows;
        
        console.log(`Found ${speciesList.length} species with missing or local thumbnail_url.`);
        
        let updatedCount = 0;
        
        for (const sp of speciesList) {
            console.log(`\nProcessing: ${sp.name_vn} (${sp.scientific_name})`);
            
            // Try fetching by scientific name first (English wiki)
            let imgUrl = await fetchWikiImage(sp.scientific_name, 'en');
            
            // Fallback to Vietnamese name (Vietnamese wiki)
            if (!imgUrl && sp.name_vn) {
                console.log(`No image for scientific name, trying Vietnamese name: ${sp.name_vn}`);
                imgUrl = await fetchWikiImage(sp.name_vn, 'vi');
            }
            
            if (imgUrl) {
                console.log(`Found image: ${imgUrl}`);
                await pgClient.query("UPDATE species SET thumbnail_url = $1 WHERE id = $2", [imgUrl, sp.id]);
                updatedCount++;
                console.log(`✅ Updated ${sp.slug} with ${imgUrl}`);
            } else {
                console.log(`❌ No image found on Wikipedia for ${sp.name_vn}`);
            }
        }
        
        console.log(`\nFinished! Updated ${updatedCount} species.`);
    } catch (e) {
        console.error(e);
    } finally {
        await pgClient.end();
    }
}

main();
