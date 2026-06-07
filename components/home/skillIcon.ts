import type { CategoryIconKey } from "./types";

const ICON_POOL: CategoryIconKey[] = [
  "code",
  "pen",
  "palette",
  "chart",
  "draft",
  "cog",
  "calc",
  "grad",
  "gavel",
];

export function getSkillIconKey(skillName: string, index = 0): CategoryIconKey {
  const name = skillName.toLowerCase();

  if (/react|next|node|javascript|typescript|python|java|php|sql|postgres|dev|code|lập trình|web/.test(name)) {
    return "code";
  }
  if (/design|photoshop|illustrat|figma|ui|ux|graphic|thiết kế|art/.test(name)) {
    return "palette";
  }
  if (/writ|content|copy|dịch|translate|bài viết|editor/.test(name)) {
    return "pen";
  }
  if (/market|seo|sales|quảng cáo|social/.test(name)) {
    return "chart";
  }
  if (/engineer|kiến trúc|cad|draft/.test(name)) {
    return "draft";
  }
  if (/admin|secret|excel|office|virtual/.test(name)) {
    return "cog";
  }
  if (/finance|business|kế toán|account/.test(name)) {
    return "calc";
  }
  if (/train|education|dạy|tutor/.test(name)) {
    return "grad";
  }
  if (/legal|luật|law/.test(name)) {
    return "gavel";
  }

  return ICON_POOL[index % ICON_POOL.length];
}
