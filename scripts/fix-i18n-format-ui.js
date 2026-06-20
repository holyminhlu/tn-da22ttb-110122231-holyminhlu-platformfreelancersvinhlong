/**
 * Adds formatDateUi/formatVndUi aliases to inner functions using formatDate/formatVnd without hook.
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

  const needsFormatDate = content.includes("formatDate(") && !content.includes("formatDate =");
  const needsFormatVnd = content.includes("formatVnd(") && !content.includes("formatVnd =");
  if (!needsFormatDate && !needsFormatVnd) return false;

  if (!content.includes('from "@/lib/i18n/runtime"')) {
    const imp = needsFormatDate && needsFormatVnd
      ? 'import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";\n'
      : needsFormatDate
        ? 'import { formatDateUi, tUi } from "@/lib/i18n/runtime";\n'
        : 'import { formatVndUi, tUi } from "@/lib/i18n/runtime";\n';
    if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
      content = content.replace(/^(["']use client["'];?\s*\n)/, `$1${imp}`);
    } else {
      content = imp + content;
    }
  } else {
    if (needsFormatDate && !content.includes("formatDateUi")) {
      content = content.replace(
        'import { tUi } from "@/lib/i18n/runtime";',
        'import { formatDateUi, tUi } from "@/lib/i18n/runtime";',
      );
    }
    if (needsFormatVnd && !content.includes("formatVndUi")) {
      content = content.replace(
        /import \{([^}]+)\} from "@\/lib\/i18n\/runtime";/,
        (m, inner) => {
          const parts = inner.split(",").map((s) => s.trim()).filter(Boolean);
          if (!parts.includes("formatVndUi")) parts.push("formatVndUi");
          return `import { ${parts.join(", ")} } from "@/lib/i18n/runtime";`;
        },
      );
    }
  }

  content = content.replace(
    /function (\w+)\([^)]*\)\s*\{\s*\n(\s*const t = tUi;\s*\n)?/g,
    (match, name, tLine) => {
      const fnStart = content.indexOf(match);
      const nextFn = content.indexOf("\nfunction ", fnStart + match.length);
      const nextExport = content.indexOf("\nexport default function", fnStart + match.length);
      const end = Math.min(nextFn > -1 ? nextFn : Infinity, nextExport > -1 ? nextExport : Infinity);
      const body = content.slice(fnStart, end === Infinity ? undefined : end);
      let extra = "";
      if (needsFormatDate && body.includes("formatDate(") && !body.includes("const formatDate")) {
        extra += "  const formatDate = formatDateUi;\n";
      }
      if (needsFormatVnd && body.includes("formatVnd(") && !body.includes("const formatVnd")) {
        extra += "  const formatVnd = formatVndUi;\n";
      }
      if (!extra) return match;
      if (tLine) return match.replace(tLine, tLine + extra);
      return match + extra;
    },
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

let count = 0;
for (const file of walk("components")) {
  if (fixFile(file)) count++;
}
console.log("Fixed format helpers in", count, "files");
