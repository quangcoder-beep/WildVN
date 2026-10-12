const fs = require('fs');
const { createMinioClient, minioBucketName } = require('./runtime-config');

const minioClient = createMinioClient();

const imagePath = process.argv[2];
const buffer = fs.readFileSync(imagePath);

minioClient.putObject(minioBucketName(), 'species/moduza-procris/thumbnail.png', buffer, buffer.length, {
    'Content-Type': 'image/png'
}).then(() => {
    console.log("Uploaded successfully!");
}).catch(e => {
    console.error(e);
});
