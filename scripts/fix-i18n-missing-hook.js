/**
 * Ensures components using t() have useTranslation() in function body.
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
  if (!content.includes('from "@/hooks/useTranslation"')) return false;
  if (!content.includes("t(")) return false;

  const original = content;

  // Remove hooks incorrectly placed inside nested functions
  content = content.replace(
    /\n\s*const \{ t(?:, formatVnd|, formatDate|, formatDateTime)?(?:, formatVnd)?(?:, formatDate)?(?:, formatDateTime)? \} = useTranslation\(\);\n(?=\s*(?:const refreshToken|if \(|try))/g,
    "\n",
  );

  const needsFormatVnd = content.includes("formatVnd(");
  const needsFormatDate = content.includes("formatDate(");
  const needsFormatDateTime = content.includes("formatDateTime(");
  const needsLocale = content.includes("locale") && content.includes("setLocale");

  const destructuringParts = ["t"];
  if (needsFormatVnd) destructuringParts.push("formatVnd");
  if (needsFormatDate) destructuringParts.push("formatDate");
  if (needsFormatDateTime) destructuringParts.push("formatDateTime");
  if (needsLocale) {
    if (!destructuringParts.includes("locale")) destructuringParts.push("locale");
    if (!destructuringParts.includes("setLocale")) destructuringParts.push("setLocale");
  }
  const hookLine = `  const { ${destructuringParts.join(", ")} } = useTranslation();\n`;

  // Check if main export default function already has hook in body
  const exportFnMatch = content.match(/export default function (\w+)/);
  if (!exportFnMatch) return false;

  const fnName = exportFnMatch[1];
  const fnStart = content.indexOf(`export default function ${fnName}`);
  const bodyStart = content.indexOf("{", fnStart);
  const nextChunk = content.slice(bodyStart + 1, bodyStart + 120);
  if (/^\s*const \{ t/.test(nextChunk)) return false;

  content =
    content.slice(0, bodyStart + 1) + "\n" + hookLine + content.slice(bodyStart + 1);

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
    if (file.includes("LocaleProvider.tsx")) continue;
    if (fixFile(file)) {
      count++;
      console.log("Fixed:", file);
    }
  }
}
console.log("Fixed", count, "files");
