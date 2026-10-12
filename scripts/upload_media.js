const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { createMinioClient, minioBucketName } = require('./runtime-config');

const minioClient = createMinioClient();
const BUCKET_NAME = minioBucketName();
const DATA_FILE = path.join(__dirname, '../wildvn-server/src/main/resources/seed/data.json');

async function downloadImage(url) {
    if (!url || !url.startsWith('http')) return null;
    
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // guess extension
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

async function initBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`Bucket ${BUCKET_NAME} created.`);
            
            // Set bucket policy for public read access
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'PublicRead',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        } else {
            console.log(`Bucket ${BUCKET_NAME} already exists.`);
        }
    } catch (e) {
        console.error('Error initializing bucket:', e);
    }
}

async function processData() {
    await initBucket();
    
    console.log(`Reading data from ${DATA_FILE}`);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to read data.json:', e);
        return;
    }
    
    let updatedCount = 0;

    // Process Ecosystems
    if (data.ecosystems) {
        for (const eco of data.ecosystems) {
            if (eco.thumbnailUrl && eco.thumbnailUrl.startsWith('http')) {
                console.log(`Downloading eco thumbnail: ${eco.thumbnailUrl}`);
                const img = await downloadImage(eco.thumbnailUrl);
                if (img) {
                    const objectName = `ecosystems/${eco.slug || eco.id}${img.ext}`;
                    const success = await uploadToMinio(img.buffer, objectName, img.contentType);
                    if (success) {
                        eco.thumbnailUrl = `/${objectName}`;
                        updatedCount++;
                        console.log(`Updated ecosystem ${eco.name} to ${eco.thumbnailUrl}`);
                    }
                }
            }
        }
    }

    // Process Species
    if (data.species) {
        for (const sp of data.species) {
            if (sp.thumbnailUrl && sp.thumbnailUrl.startsWith('http')) {
                console.log(`Downloading species thumbnail: ${sp.thumbnailUrl}`);
                const img = await downloadImage(sp.thumbnailUrl);
                if (img) {
                    const objectName = `species/${sp.slug || sp.id}/thumbnail${img.ext}`;
                    const success = await uploadToMinio(img.buffer, objectName, img.contentType);
                    if (success) {
                        sp.thumbnailUrl = `/${objectName}`;
                        updatedCount++;
                        console.log(`Updated species ${sp.name} to ${sp.thumbnailUrl}`);
                    }
                }
            }
            
            // Process galleryUrls
            if (sp.galleryUrls && sp.galleryUrls !== '[]') {
                try {
                    const urls = JSON.parse(sp.galleryUrls);
                    const newUrls = [];
                    for (let i = 0; i < urls.length; i++) {
                        const url = urls[i];
                        if (url && url.startsWith('http')) {
                            console.log(`Downloading species gallery: ${url}`);
                            const img = await downloadImage(url);
                            if (img) {
                                const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
                                const objectName = `species/${sp.slug || sp.id}/gallery_${hash}${img.ext}`;
                                const success = await uploadToMinio(img.buffer, objectName, img.contentType);
                                if (success) {
                                    newUrls.push(`/${objectName}`);
                                    updatedCount++;
                                } else {
                                    newUrls.push(url);
                                }
                            } else {
                                newUrls.push(url);
                            }
                        } else {
                            newUrls.push(url);
                        }
                    }
                    sp.galleryUrls = JSON.stringify(newUrls);
                } catch (e) {
                    console.error('Error parsing galleryUrls for species:', sp.name);
                }
            }
        }
    }

    console.log(`Finished processing. Updated ${updatedCount} paths.`);
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved updated data.json`);
}

processData().catch(console.error);
