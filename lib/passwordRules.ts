export type PasswordChecks = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noSpaces: boolean;
};

export const PASSWORD_RULE_LABELS: { key: keyof PasswordChecks; label: string }[] = [
  { key: "minLength", label: "8 ký tự" },
  { key: "hasUpper", label: "Một chữ cái viết hoa" },
  { key: "hasNumber", label: "Một số" },
  { key: "hasSpecial", label: "Một nhân vật đặc biệt" },
  { key: "hasLower", label: "Một chữ cái viết thường" },
  { key: "noSpaces", label: "Không có khoảng trắng" },
];

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    noSpaces: !/\s/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}
