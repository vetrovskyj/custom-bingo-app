const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const ensureLocalUploadsDir = () => {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
};

const makeFileName = (originalName = '', mimeType = 'application/octet-stream') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const fallbackExt = mimeType.includes('png')
    ? '.png'
    : mimeType.includes('gif')
      ? '.gif'
      : mimeType.includes('webp')
        ? '.webp'
        : '.jpg';
  const originalExt = path.extname(originalName || '').toLowerCase();
  const extension = originalExt || fallbackExt;
  return `${timestamp}-${random}${extension}`;
};

const getAzureBlobConfig = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  if (!connectionString || !containerName) {
    return null;
  }

  return {
    connectionString,
    containerName,
    publicBaseUrl: process.env.AZURE_STORAGE_PUBLIC_BASE_URL || '',
  };
};

const uploadToAzureBlob = async ({ buffer, mimeType, blobName }) => {
  const config = getAzureBlobConfig();
  if (!config) return null;

  const { BlobServiceClient } = require('@azure/storage-blob');
  const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
  const containerClient = blobServiceClient.getContainerClient(config.containerName);

  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType || 'application/octet-stream',
    },
  });

  if (config.publicBaseUrl) {
    const trimmed = config.publicBaseUrl.endsWith('/')
      ? config.publicBaseUrl.slice(0, -1)
      : config.publicBaseUrl;
    return `${trimmed}/${blobName}`;
  }

  return blockBlobClient.url;
};

const uploadToLocalStorage = async ({ buffer, fileName }) => {
  ensureLocalUploadsDir();
  const fullPath = path.join(LOCAL_UPLOADS_DIR, fileName);
  await fs.promises.writeFile(fullPath, buffer);
  return `/uploads/${fileName}`;
};

const storeUploadedImage = async (file, options = {}) => {
  if (!file || !file.buffer) {
    throw new Error('File buffer is required');
  }

  const folder = options.folder || 'general';
  const fileName = makeFileName(file.originalname, file.mimetype);
  const blobName = `${folder}/${fileName}`;

  try {
    const cloudUrl = await uploadToAzureBlob({
      buffer: file.buffer,
      mimeType: file.mimetype,
      blobName,
    });

    if (cloudUrl) return cloudUrl;
  } catch (error) {
    console.warn('Azure Blob upload failed, using local storage fallback:', error.message);
  }

  return uploadToLocalStorage({ buffer: file.buffer, fileName });
};

module.exports = {
  LOCAL_UPLOADS_DIR,
  ensureLocalUploadsDir,
  storeUploadedImage,
};
