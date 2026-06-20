/**
 * Adds useTranslation hook to components that use t() but lack it.
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
  if (filePath.includes("LocaleProvider.tsx")) return false;

  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("t(")) return false;
  if (content.includes("const { t")) return false;

  const original = content;

  if (!content.includes('from "@/hooks/useTranslation"')) {
    if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1import { useTranslation } from "@/hooks/useTranslation";\n`);
    } else {
      content = `import { useTranslation } from "@/hooks/useTranslation";\n${content}`;
    }
  }

  const needsFormatVnd = content.includes("formatVnd(");
  const needsFormatDate = content.includes("formatDate(");
  const needsFormatDateTime = content.includes("formatDateTime(");
  const parts = ["t"];
  if (needsFormatVnd) parts.push("formatVnd");
  if (needsFormatDate) parts.push("formatDate");
  if (needsFormatDateTime) parts.push("formatDateTime");
  if (content.includes("setLocale")) parts.push("locale", "setLocale");
  const hookLine = `  const { ${parts.join(", ")} } = useTranslation();\n`;

  const replaced = content.replace(
    /export default function (\w+)\(([\s\S]*?)\)\s*\{/,
    (match, name, params) => `export default function ${name}(${params}) {\n${hookLine}`,
  );

  if (replaced === content) return false;

  fs.writeFileSync(filePath, replaced, "utf8");
  return true;
}

let count = 0;
for (const dir of ["components", "app"]) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (fixFile(file)) {
      count++;
      console.log("Added hook:", file);
    }
  }
}
console.log("Added hook to", count, "files");
