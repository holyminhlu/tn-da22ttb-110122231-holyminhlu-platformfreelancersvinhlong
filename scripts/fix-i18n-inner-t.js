/**
 * Adds `const t = tUi` to inner functions that call t() without useTranslation.
 */
const fs = require("fs");
const path = require("path");

const IMPORT = 'import { tUi } from "@/lib/i18n/runtime";\n';

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
  if (filePath.includes("LocaleProvider")) return false;
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("t(")) return false;

  const original = content;
  let needsImport = false;

  content = content.replace(
    /function (\w+)\([^)]*\)\s*\{\s*\n(?!\s*const \{ t|\s*const t = tUi)/g,
    (match, name) => {
      const fnStart = content.indexOf(match);
      const nextFn = content.indexOf("\nfunction ", fnStart + match.length);
      const nextExport = content.indexOf("\nexport default function", fnStart + match.length);
      const end = Math.min(
        nextFn > -1 ? nextFn : Infinity,
        nextExport > -1 ? nextExport : Infinity,
      );
      const body = content.slice(fnStart, end === Infinity ? undefined : end);
      if (!body.includes("t(")) return match;
      needsImport = true;
      return match + "  const t = tUi;\n";
    },
  );

  if (needsImport && !content.includes('from "@/lib/i18n/runtime"')) {
    if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${IMPORT}`);
    } else {
      content = IMPORT + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

let count = 0;
for (const dir of ["components"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (fixFile(file)) count++;
  }
}
console.log("Fixed inner functions in", count, "files");
