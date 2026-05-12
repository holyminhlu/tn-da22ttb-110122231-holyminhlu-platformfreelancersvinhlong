const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "services");

fs.mkdirSync(uploadDir, { recursive: true });

function pickVideoExt(mimetype, originalName) {
  const fromName = path.extname(originalName || "").toLowerCase();
  if ([".mp4", ".webm", ".mov"].includes(fromName)) return fromName;
  if (mimetype === "video/webm") return ".webm";
  if (mimetype === "video/quicktime") return ".mov";
  return ".mp4";
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = pickVideoExt(file.mimetype, file.originalname) || ".mp4";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

/** Một video demo ngắn — tối đa ~25MB */
const uploadServiceVideo = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^video\/(mp4|webm|quicktime)$/i.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Chỉ chấp nhận video MP4, WebM hoặc MOV (clip ngắn)."));
  },
});

module.exports = { uploadServiceVideo };
