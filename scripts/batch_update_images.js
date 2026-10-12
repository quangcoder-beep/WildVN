const fs = require('fs');
const axios = require('axios');
const { Client } = require('pg');
const { createMinioClient, databaseConnectionString, minioBucketName } = require('./runtime-config');

const minioClient = createMinioClient();
const BUCKET_NAME = minioBucketName();
const pgClient = new Client({ connectionString: databaseConnectionString() });

async function downloadImage(url) {
    if (!url || !url.startsWith('http')) return null;
    
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'WildVN/1.0 (contact@wildvn.org) axios/1.20.0'
            }
        });
        
        let ext = '.jpg';
        const contentType = response.headers['content-type'];
        if (contentType) {
            if (contentType.includes('png')) ext = '.png';
            if (contentType.includes('webp')) ext = '.webp';
            if (contentType.includes('gif')) ext = '.gif';
        }
        
        return {
            buffer: Buffer.from(response.data),
            ext,
            contentType
        };
    } catch (e) {
        console.error(`Error downloading ${url}:`, e.message);
        return null;
    }
}

async function uploadToMinio(buffer, objectName, contentType) {
    try {
        await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
            'Content-Type': contentType || 'image/jpeg'
        });
        return true;
    } catch (e) {
        console.error(`Error uploading ${objectName} to MinIO:`, e.message);
        return false;
    }
}

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
        
        const res = await pgClient.query("SELECT id, slug, scientific_name, name_vn FROM species WHERE thumbnail_url IS NULL OR thumbnail_url = '';");
        const speciesList = res.rows;
        
        console.log(`Found ${speciesList.length} species missing thumbnail_url.`);
        
        let updatedCount = 0;
        
        for (const sp of speciesList) {
            console.log(`\nProcessing: ${sp.name_vn} (${sp.scientific_name})`);
            
            // Try fetching by scientific name first (English wiki)
            let imgUrl = await fetchWikiImage(sp.scientific_name, 'en');
            
            // Fallback to Vietnamese name (Vietnamese wiki)
            if (!imgUrl) {
                console.log(`No image for scientific name, trying Vietnamese name: ${sp.name_vn}`);
                imgUrl = await fetchWikiImage(sp.name_vn, 'vi');
            }
            
            if (imgUrl) {
                console.log(`Found image: ${imgUrl}`);
                const img = await downloadImage(imgUrl);
                if (img) {
                    const objectName = `species/${sp.slug}/thumbnail${img.ext}`;
                    const success = await uploadToMinio(img.buffer, objectName, img.contentType);
                    if (success) {
                        const minioPath = `/${objectName}`;
                        await pgClient.query("UPDATE species SET thumbnail_url = $1 WHERE id = $2", [minioPath, sp.id]);
                        updatedCount++;
                        console.log(`✅ Updated ${sp.slug} with ${minioPath}`);
                    }
                }
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
