import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký | Vĩnh Long Connected",
  description: "Đăng ký Client hoặc Freelancer và lưu hồ sơ vào hệ thống.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
