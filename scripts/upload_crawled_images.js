const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Client } = require('pg');
const { createMinioClient, databaseConnectionString, minioBucketName } = require('./runtime-config');

const JSON_DIR = path.join(__dirname, '../crawl4ai-project/json_output_ai');
const MD_DIR = path.join(__dirname, '../crawl4ai-project/output');

const minioClient = createMinioClient();
const BUCKET_NAME = minioBucketName();

async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadImage(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

async function run() {
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
            console.log(`Downloading ${imageUrl} for slug ${slug}...`);
            
            try {
                const buffer = await downloadImage(imageUrl);
                let ext = 'jpg';
                if (imageUrl.toLowerCase().endsWith('.png')) ext = 'png';
                
                const minioPath = `species/${slug}/thumbnail.${ext}`;
                
                await minioClient.putObject(BUCKET_NAME, minioPath, buffer, buffer.length, {
                    'Content-Type': `image/${ext}`
                });
                
                console.log(`✅ Uploaded to MinIO: wildvn/${minioPath}`);
                
                // We should also update the database thumbnail_url to point to this new path
                const client = new Client({ connectionString: databaseConnectionString() });
                await client.connect();
                await client.query('UPDATE species SET thumbnail_url = $1 WHERE slug = $2 OR slug = $3', [`/species/${slug}/thumbnail.${ext}`, slug, 'moduza-procris']);
                await client.end();
            } catch (e) {
                console.error(`❌ Failed for ${slug}: ${e.message}`);
            }
        }
    }
}

run().catch(console.error);
