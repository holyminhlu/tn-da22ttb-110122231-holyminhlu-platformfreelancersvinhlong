import { NextRequest, NextResponse } from "next/server";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

export async function POST(request: NextRequest) {
  const backendBaseUrl = getApiBaseUrl();
  const authHeader = request.headers.get("authorization") || "";

  try {
    const body = await request.text();
    const response = await fetch(apiUrl(apiPaths.auth.meAvatar, backendBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Không thể kết nối backend để cập nhật avatar.",
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 502 },
    );
  }
}

