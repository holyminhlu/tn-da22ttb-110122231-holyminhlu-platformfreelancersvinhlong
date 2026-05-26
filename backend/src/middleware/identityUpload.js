const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "identity");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safe = ext.match(/^\.(jpe?g|png|webp)$/) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safe}`);
  },
});

const uploadIdentityFile = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype || "");
    cb(ok ? null : new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP."), ok);
  },
});

module.exports = { uploadIdentityFile };
