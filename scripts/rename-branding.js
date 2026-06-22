/**
 * Replace user-facing branding:
 * - Vĩnh Long Connected → Vĩnh Long Connect
 * - Client → Khách hàng (not code identifiers / component names)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".tsx", ".ts", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".txt"]);

/** PascalCase compounds starting with Client — keep identifier */
const CLIENT_COMPOUND_LOOKAHEAD =
  "Profile|Placeholder|Hire|Job|Cannot|Payments|Shell|Only|Side|Content|Page|Body|Nav|Route|Withdrawals";

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (EXT.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function transform(content) {
  let text = content;
  text = text.replace(/Vĩnh Long Connected/g, "Vĩnh Long Connect");
  text = text.replace(/Vinh Long Connected/g, "Vinh Long Connect");
  const clientRe = new RegExp(`\\bClient\\b(?!${CLIENT_COMPOUND_LOOKAHEAD})`, "g");
  text = text.replace(clientRe, "Khách hàng");
  return text;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  if (file.includes(`${path.sep}scripts${path.sep}rename-branding.js`)) continue;
  const original = fs.readFileSync(file, "utf8");
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changed += 1;
  }
}

console.log(`Updated ${changed} files.`);
