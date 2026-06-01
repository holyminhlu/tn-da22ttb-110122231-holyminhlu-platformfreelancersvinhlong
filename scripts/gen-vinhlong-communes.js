const fs = require("fs");
const src =
  "C:/Users/holyt/.cursor/projects/d-DA-TN-DATN-DATN-vl-connected/agent-tools/77d3eb82-dc72-41a0-8efe-7646073d3655.txt";
const text = fs.readFileSync(src, "utf8");
const re = /tên gọi là\s+(?:xã|phường|phường)\s+([^.\n]+)/gi;
const items = [];
let m;
while ((m = re.exec(text))) {
  const raw = m[0].toLowerCase();
  const kind = raw.includes("phường") || raw.includes("phường") ? "ward" : "commune";
  const name = m[1].trim().replace(/\s+/g, " ");
  items.push({ kind, name, label: (kind === "ward" ? "Phường " : "Xã ") + name });
}
const uniq = new Map();
for (const it of items) uniq.set(`${it.kind}|${it.name}`, it);
const extra = [
  { kind: "commune", name: "Long Hòa", label: "Xã Long Hòa" },
  { kind: "commune", name: "Đông Hải", label: "Xã Đông Hải" },
  { kind: "commune", name: "Long Vĩnh", label: "Xã Long Vĩnh" },
  { kind: "commune", name: "Hòa Minh", label: "Xã Hòa Minh" },
];
for (const e of extra) {
  if (!uniq.has(`${e.kind}|${e.name}`)) uniq.set(`${e.kind}|${e.name}`, e);
}
const list = [...uniq.values()].sort((a, b) => a.label.localeCompare(b.label, "vi"));
const out = `// 124 xã/phường tỉnh Vĩnh Long (mới) — Nghị quyết 1687/NQ-UBTVQH15, hiệu lực 01/07/2025
export type VinhLongCommune = {
  kind: "ward" | "commune";
  name: string;
  label: string;
};

export const VINH_LONG_PROVINCE = "Tỉnh Vĩnh Long";

export const VINH_LONG_COMMUNES_2025: VinhLongCommune[] = ${JSON.stringify(list, null, 2)};
`;
fs.writeFileSync("lib/geo/vinhLongCommunes2025.ts", out);
console.log("written", list.length);
