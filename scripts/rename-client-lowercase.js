/**
 * Second pass: lowercase "client" in user-facing text → "khách hàng"
 * Preserves role literals "client" / 'client'
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".tsx", ".ts", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".txt"]);

const ROLE_PLACEHOLDER = "__ROLE_CLIENT__";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (EXT.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function transform(content) {
  let text = content;
  text = text.replace(/"client"/g, `"${ROLE_PLACEHOLDER}"`);
  text = text.replace(/'client'/g, `'${ROLE_PLACEHOLDER}'`);
  text = text.replace(/\bclient\b/g, "khách hàng");
  text = text.replace(new RegExp(`"${ROLE_PLACEHOLDER}"`, "g"), '"client"');
  text = text.replace(new RegExp(`'${ROLE_PLACEHOLDER}'`, "g"), "'client'");
  return text;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  if (file.includes("rename-branding.js") || file.includes("rename-client-lowercase.js")) continue;
  const original = fs.readFileSync(file, "utf8");
  const updated = transform(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, "utf8");
    changed += 1;
  }
}

console.log(`Updated ${changed} files (lowercase client).`);
