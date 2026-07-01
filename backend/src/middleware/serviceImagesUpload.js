const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "services");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(ext) ? ext : ".jpg";
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];
const ALLOWED_IMAGE_MIMES = /^image\/(jpeg|jpg|pjpeg|png|webp|gif|heic|heif)$/i;

function isAllowedServiceImage(file) {
  if (ALLOWED_IMAGE_MIMES.test(String(file.mimetype || ""))) return true;
  const ext = path.extname(file.originalname || "").toLowerCase();
  return ALLOWED_IMAGE_EXTS.includes(ext);
}

/** Tối đa 12 ảnh, mỗi ảnh 5MB — ảnh minh hoạ dịch vụ */
const uploadServiceImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedServiceImage(file)) {
      cb(null, true);
      return;
    }
    cb(new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF hoặc HEIC."));
  },
});

module.exports = { uploadServiceImages };
