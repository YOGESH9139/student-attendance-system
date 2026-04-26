const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 image string to Cloudinary.
 * @param {string} base64Str - Full data URI or raw base64
 * @param {string} folder    - Cloudinary folder name
 * @param {string} publicId  - Optional public ID (filename)
 * @returns {Promise<string>} Secure URL
 */
const uploadBase64 = async (base64Str, folder = 'sas', publicId = null) => {
  // Ensure it has the data URI prefix
  const dataUri = base64Str.startsWith('data:')
    ? base64Str
    : `data:image/jpeg;base64,${base64Str}`;

  const options = {
    folder,
    resource_type: 'image',
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'center' }],
  };
  if (publicId) options.public_id = publicId;

  const result = await cloudinary.uploader.upload(dataUri, options);
  return result.secure_url;
};

/**
 * Delete an image from Cloudinary by URL.
 * @param {string} url - Cloudinary secure URL
 */
const deleteByUrl = async (url) => {
  try {
    // Extract public_id from URL
    const parts = url.split('/');
    const folder = parts[parts.length - 2];
    const filename = parts[parts.length - 1].split('.')[0];
    await cloudinary.uploader.destroy(`${folder}/${filename}`);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { uploadBase64, deleteByUrl };
