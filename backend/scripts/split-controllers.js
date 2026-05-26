/**
 * Extract route handlers from _auth.routes.bak.js into controller modules.
 */
const fs = require("fs");
const path = require("path");

const bakPath = path.join(__dirname, "..", "src", "routes", "_auth.routes.bak.js");
const bak = fs.readFileSync(bakPath, "utf8");
const lines = bak.split("\n");

const handlers = [
  { name: "register", file: "auth.controller.js", start: 269, end: 361 },
  { name: "login", file: "auth.controller.js", start: 363, end: 432 },
  { name: "refresh", file: "auth.controller.js", start: 434, end: 498 },
  { name: "logout", file: "auth.controller.js", start: 500, end: 524 },
  { name: "updateAvatar", file: "users.controller.js", start: 526, end: 553 },
  { name: "updateProfile", file: "users.controller.js", start: 560, end: 696 },
  { name: "updateSkills", file: "users.controller.js", start: 699, end: 749 },
  { name: "createPortfolio", file: "users.controller.js", start: 752, end: 786 },
  { name: "uploadServiceImages", file: "services.controller.js", start: 788, end: 808 },
  { name: "uploadServiceThumbnail", file: "services.controller.js", start: 810, end: 830 },
  { name: "uploadServiceDemo", file: "services.controller.js", start: 832, end: 852 },
  { name: "createMyService", file: "services.controller.js", start: 854, end: 911 },
  { name: "updateMyService", file: "services.controller.js", start: 913, end: 991 },
  { name: "uploadJobImages", file: "jobs.controller.js", start: 993, end: 1013 },
  { name: "createMyJob", file: "jobs.controller.js", start: 1015, end: 1091 },
  { name: "acceptJob", file: "jobs.controller.js", start: 1100, end: 1180 },
  { name: "listMyContracts", file: "contracts.controller.js", start: 1183, end: 1232 },
  { name: "getMyWork", file: "contracts.controller.js", start: 1235, end: 1333 },
  { name: "patchMyContract", file: "contracts.controller.js", start: 1336, end: 1433 },
  { name: "reviewContract", file: "contracts.controller.js", start: 1436, end: 1508 },
  { name: "getMe", file: "users.controller.js", start: 1510, end: 1777 },
  { name: "listFreelancers", file: "freelancers.controller.js", start: 1780, end: 1931 },
  { name: "getFreelancer", file: "freelancers.controller.js", start: 1934, end: 2079 },
  { name: "googleAuth", file: "auth.controller.js", start: 2081, end: 2099 },
  { name: "googleCallback", file: "auth.controller.js", start: 2101, end: 2105 },
];

const ctrlDir = path.join(__dirname, "..", "src", "controllers");
fs.mkdirSync(ctrlDir, { recursive: true });

const fileBlocks = new Map();

for (const h of handlers) {
  let body = lines.slice(h.start - 1, h.end).join("\n");
  body = body
    .replace(/^router\.(post|get|patch|put|options)\([^,]+,\s*/m, "")
    .replace(/^async function updateAvatarHandler/, "async function updateAvatar")
    .replace(/updateAvatarHandler/g, "updateAvatar")
    .replace(/;\s*$/, "");

  if (!fileBlocks.has(h.file)) fileBlocks.set(h.file, []);
  fileBlocks.get(h.file).push({ name: h.name, body });
}

const commonImports = {
  "auth.controller.js": `const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const {
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRY,
  REFRESH_EXPIRY,
  getClientIp,
  normalizeEmail,
  signTokens,
  verifyAccessToken,
  persistRefreshToken,
} = require("../utils/authTokens");
`,
  "users.controller.js": `const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
`,
  "services.controller.js": `const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const {
  readServiceUpsertBody,
  buildDefaultServicePackages,
} = require("../utils/validators");
const { uploadServiceImages } = require("../middleware/serviceImagesUpload");
const { uploadServiceVideo } = require("../middleware/serviceVideoUpload");
`,
  "jobs.controller.js": `const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { normalizeJobImageUrls, parseUuidParam } = require("../utils/validators");
const { uploadJobImages } = require("../middleware/jobImagesUpload");
`,
  "contracts.controller.js": `const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
`,
  "freelancers.controller.js": `const { pool } = require("../db/pool");
const { parseUuidParam } = require("../utils/validators");
`,
};

for (const [file, blocks] of fileBlocks) {
  const exports = blocks
    .map((b) => {
      const fnMatch = b.body.match(/^(async function \w+|function \w+|\([^)]*\)\s*=>|async \(req)/);
      let code = b.body.trim();
      if (code.startsWith("async (req")) {
        code = `async function ${b.name}(req, res) {\n${code.slice(code.indexOf("{") + 1)}`;
      } else if (code.startsWith("(")) {
        code = `function ${b.name}(req, res) {\n${code.slice(code.indexOf("{") + 1)}`;
      }
      return code;
    })
    .join("\n\n");

  let header = commonImports[file] || "";
  if (file === "auth.controller.js") {
    header = header.replace(
      "const jwt = require",
      `async function logLoginAttempt(client, { email, ip, success }) {
  await client.query(
    "INSERT INTO public.login_attempts (email, ip_address, success) VALUES ($1, $2, $3)",
    [email, ip || "unknown", success],
  );
}

const jwt = require`,
    );
  }

  const content = `${header}\n${exports}\n\nmodule.exports = {\n${blocks.map((b) => `  ${b.name}`).join(",\n")},\n};\n`;
  fs.writeFileSync(path.join(ctrlDir, file), content);
  console.log("Wrote", file, blocks.map((b) => b.name).join(", "));
}
