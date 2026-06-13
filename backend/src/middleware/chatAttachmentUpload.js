const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads", "chat");

fs.mkdirSync(uploadDir, { recursive: true });

const imageMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const fileMime = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  ...imageMime,
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 12 ? ext : "";
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const uploadChatAttachment = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    if (fileMime.has(mime) || mime.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Định dạng tệp không được hỗ trợ."));
  },
});

module.exports = { uploadChatAttachment, imageMime };
