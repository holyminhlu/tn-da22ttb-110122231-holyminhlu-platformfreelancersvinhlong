/**
 * Moves useTranslation() from broken parameter lists into function bodies.
 */
const fs = require("fs");
const path = require("path");

const TARGET_DIRS = ["components", "app"];

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

  // Pattern: hook inserted after opening `{` of destructured params
  content = content.replace(
    /(export default function \w+\(\{\s*\n\s*)const \{ t \} = useTranslation\(\);\s*\n/g,
    "$1",
  );

  content = content.replace(
    /(function \w+\(\{\s*\n\s*)const \{ t \} = useTranslation\(\);\s*\n/g,
    "$1",
  );

  // Single-line broken: function Foo({ const { t } = useTranslation(); rest
  content = content.replace(
    /(\(\{\s*)const \{ t \} = useTranslation\(\);\s*/g,
    "$1",
  );

  // Add hook after function body opens if t( is used but hook missing in body
  const usesT = content.includes("t(") || content.includes('{t("');
  const hasHookInBody =
    /function \w+[^{]+\)\s*\{\s*\n\s*const \{ t \} = useTranslation\(\)/.test(content) ||
    /function \w+[^{]+\)\s*\{\s*const \{ t \} = useTranslation\(\)/.test(content);

  if (usesT && content.includes("useTranslation") && !hasHookInBody) {
    content = content.replace(
      /(export default function \w+[^{]+\)\s*\{)(\s*)/,
      "$1\n  const { t } = useTranslation();$2",
    );
    content = content.replace(
      /(function \w+[^{]+\)\s*\{)(\s*(?!const \{ t \}))/,
      "$1\n  const { t } = useTranslation();$2",
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

let count = 0;
for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (fixFile(file)) {
      count++;
      console.log("Fixed:", file);
    }
  }
}
console.log("Fixed", count, "files");
