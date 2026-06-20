/**
 * Adds `import { tUi as t } from "@/lib/i18n/runtime"` to files using t() without defining it.
 */
const fs = require("fs");
const path = require("path");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) files.push(p);
  }
  return files;
}

function hasUndefinedT(content) {
  if (!content.includes("t(")) return false;
  if (content.includes("const { t") || content.includes("const {t")) return false;
  if (content.includes("function t(") || content.includes("=> t(")) return false;
  if (content.includes('tUi as t')) return false;
  if (content.includes("useTranslation()")) {
    // Has hook in main component but may lack in sub-functions — still need tUi if t( exists without const { t in same scope
    // Heuristic: if file has t( and only one const { t, sub-functions may need tUi
    const hookCount = (content.match(/const \{ t/g) || []).length;
    const tCallCount = (content.match(/\bt\(/g) || []).length;
    if (hookCount >= 1 && tCallCount <= hookCount + 2) return false;
  }
  return true;
}

function fixFile(filePath) {
  if (filePath.includes("LocaleProvider") || filePath.includes("runtime.ts")) return false;
  let content = fs.readFileSync(filePath, "utf8");
  if (!hasUndefinedT(content)) return false;

  const importLine = 'import { tUi as t } from "@/lib/i18n/runtime";\n';
  if (content.includes('from "@/lib/i18n/runtime"')) return false;

  if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
    content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${importLine}`);
  } else {
    content = importLine + content;
  }

  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

let count = 0;
for (const dir of ["components", "lib", "app"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (fixFile(file)) {
      count++;
    }
  }
}
console.log("Added tUi import to", count, "files");
