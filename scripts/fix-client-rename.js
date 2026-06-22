/**
 * Fix broken technical identifiers after lowercase client rename.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".tsx", ".ts", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".txt"]);

const FIXES = [
  ["./client", "./client"],
  ["@/lib/api/client", "@/lib/api/client"],
  ["client-dashboard.css", "client-dashboard.css"],
  ["client-profile.css", "client-profile.css"],
  ["/admin/rut-tien-client", "/admin/rut-tien-client"],
  ["rut-tien-client", "rut-tien-client"],
];

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

let changed = 0;
for (const file of walk(ROOT)) {
  if (file.includes("rename-")) continue;
  let text = fs.readFileSync(file, "utf8");
  const orig = text;
  for (const [from, to] of FIXES) {
    text = text.split(from).join(to);
  }
  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    changed += 1;
  }
}
console.log(`Fixed ${changed} files.`);
