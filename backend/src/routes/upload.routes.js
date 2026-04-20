const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { put } = require('@vercel/blob');

// Use memory storage for Vercel Blob, disk storage for local dev
const isVercel = process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN;

const storage = isVercel 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
  }
});

// @desc    Test upload route
// @route   GET /api/upload/test
router.get('/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Upload route is active' });
});

// @desc    Upload an image
// @route   POST /api/upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let imageUrl;
    let filename;

    if (isVercel && process.env.BLOB_READ_WRITE_TOKEN) {
      // Upload to Vercel Blob
      const blob = await put(`ingredients/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      imageUrl = blob.url;
      filename = blob.pathname.split('/').pop();
    } else {
      // Fallback to local storage (for local development)
      const protocol = req.protocol;
      const host = req.get('host');
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      filename = req.file.filename;
    }

    res.status(200).json({
      success: true,
      data: {
        url: imageUrl,
        filename: filename
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed', 
      error: error.message 
    });
  }
});

module.exports = router;
