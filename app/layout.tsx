import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vĩnh Long Connected — Kết nối dịch vụ địa phương",
  description:
    "Tìm thợ giỏi, chuyên gia và dịch vụ địa phương tại Vĩnh Long. Nền tảng tối giản, minh bạch đánh giá, kết nối nhanh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} scroll-smooth`}>
      <body className={`${beVietnam.className} flex min-h-screen flex-col bg-white text-zinc-900 antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
        >
          Bỏ qua đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
