/**
 * Removes useTranslation() from destructured params; keeps one hook in function body.
 */
const fs = require("fs");
const path = require("path");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  // Remove hook lines inside parameter destructuring
  content = content.replace(
    /(\{\s*\n?\s*)const \{ [^}]+\} = useTranslation\(\);\s*\n?/g,
    "$1",
  );
  content = content.replace(
    /(\(\{\s*)const \{ [^}]+\} = useTranslation\(\);\s*/g,
    "$1",
  );

  // Remove duplicate consecutive hook declarations in body
  content = content.replace(
    /(const \{ [^}]+\} = useTranslation\(\);\s*\n\s*)const \{ [^}]+\} = useTranslation\(\);\s*\n/g,
    "$1",
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

let count = 0;
for (const dir of ["components", "app"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (fixFile(file)) {
      count++;
      console.log("Fixed:", file);
    }
  }
}
console.log("Fixed", count, "files");
