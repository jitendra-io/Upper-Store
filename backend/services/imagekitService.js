const ImageKit = require('@imagekit/nodejs');
const path = require('path');
const fs = require('fs');

let imagekit = null;
if (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PUBLIC_KEY !== 'your_imagekit_public_key' &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
) {
  try {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
    console.log('[ImageKit] Initialized successfully with endpoint:', process.env.IMAGEKIT_URL_ENDPOINT);
  } catch (err) {
    console.warn('[ImageKit] Initialization skipped:', err.message);
  }
}

// Helper to resolve full file URL fallback
const getFileUrl = (req, relativePath) => {
  if (process.env.BACKEND_URL) {
    const baseUrl = process.env.BACKEND_URL.replace(/\/$/, '');
    return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }
  const protocol = req?.protocol || 'http';
  const host = req?.get ? req.get('host') : 'localhost:5000';
  return `${protocol}://${host}/${relativePath.replace(/\\/g, '/')}`;
};

// Helper to upload a file to ImageKit or fallback to server URL
const uploadFileToCloudOrLocal = async (file, folder, req) => {
  if (!file) return null;

  // Determine local relative path if file was written to disk
  let relativePath = '';
  if (file.path) {
    relativePath = path.relative(path.join(__dirname, '..'), file.path);
  }
  let url = relativePath ? getFileUrl(req, relativePath) : '';

  if (imagekit) {
    try {
      let buffer = file.buffer;
      if (!buffer && file.path && fs.existsSync(file.path)) {
        buffer = fs.readFileSync(file.path);
      }

      if (buffer) {
        const uploadFn = (imagekit.files?.upload ? imagekit.files.upload.bind(imagekit.files) : imagekit.upload.bind(imagekit));
        const ext = file.originalname ? path.extname(file.originalname) : '.jpg';
        const rawName = file.filename || `upload-${Date.now()}${ext}`;

        const uploaded = await uploadFn({
          file: buffer.toString('base64'),
          fileName: rawName,
          folder: `/upper-store/${folder}`,
        });

        if (uploaded?.url) {
          url = uploaded.url;
          console.log(`[ImageKit] Uploaded (${folder}): ${url}`);

          // Remove local temporary staging file if saved to disk
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              console.warn(`[ImageKit] Note: Could not delete temp file ${file.path}:`, unlinkErr.message);
            }
          }
          return url;
        }
      }
    } catch (ikErr) {
      console.warn(`[ImageKit] Upload failed for ${file.originalname || file.filename}: ${ikErr.message}. Using fallback: ${url}`);
    }
  }

  // Fallback if ImageKit is not active or failed
  if (!url && file.buffer) {
    // If memory storage was used and ImageKit failed, persist to local disk as fallback
    const targetDir = path.join(__dirname, '..', 'uploads', folder === 'banners' ? 'images' : folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const safeName = `fallback-${Date.now()}-${file.originalname || 'cover.jpg'}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const destPath = path.join(targetDir, safeName);
    fs.writeFileSync(destPath, file.buffer);
    const rel = path.relative(path.join(__dirname, '..'), destPath);
    url = getFileUrl(req, rel);
  }

  console.log(`[Storage] Resolved file (${folder}): ${url}`);
  return url;
};

module.exports = {
  imagekit,
  getFileUrl,
  uploadFileToCloudOrLocal,
};

