const Minio = require('minio');

function requireEnvironment(name) {
    const value = process.env[name];
    if (!value || !value.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value.trim();
}

function databaseConnectionString() {
    return requireEnvironment('DATABASE_URL');
}

function createMinioClient() {
    const useSSL = process.env.MINIO_USE_SSL === 'true';

    return new Minio.Client({
        endPoint: requireEnvironment('MINIO_ENDPOINT'),
        port: Number(process.env.MINIO_PORT || (useSSL ? '443' : '9000')),
        useSSL,
        accessKey: requireEnvironment('MINIO_ACCESS_KEY'),
        secretKey: requireEnvironment('MINIO_SECRET_KEY'),
    });
}

function minioBucketName() {
    return process.env.MINIO_BUCKET || 'wildvn';
}

module.exports = {
    createMinioClient,
    databaseConnectionString,
    minioBucketName,
};
