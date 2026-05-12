import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Vĩnh Long Connected",
  description: "Đăng nhập bằng email/password hoặc tiếp tục với Google.",
};

export default function LoginPage() {
  return <LoginForm />;
}
