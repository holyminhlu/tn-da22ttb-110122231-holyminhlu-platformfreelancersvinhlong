"use client";

import { useSearchParams } from "next/navigation";
import GoogleCallbackHandler from "./GoogleCallbackHandler";
import LoginForm from "./LoginForm";

export default function DangNhapEntry() {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");
  const oauthError = searchParams.get("error");

  if (ticket || oauthError) {
    return <GoogleCallbackHandler />;
  }

  return <LoginForm />;
}
