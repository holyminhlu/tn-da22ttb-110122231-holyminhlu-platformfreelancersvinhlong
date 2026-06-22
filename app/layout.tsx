import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist, Inter } from "next/font/google";
import SkipToContentLink from "@/components/layout/SkipToContentLink";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import UserPreferencesInit from "@/components/providers/UserPreferencesInit";
import VlcAiSupportWidget from "@/components/support/VlcAiSupportWidget";
import ScrollNavButtons from "@/components/ui/ScrollNavButtons";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";
/* Turbopack: import trực tiếp để dark override luôn có trong bundle */
import "./styles/global/components-dark.css";
import "./styles/global/hire-dark.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vĩnh Long Connect — Kết nối dịch vụ địa phương",
  description:
    "Tìm thợ giỏi, chuyên gia và dịch vụ địa phương tại Vĩnh Long. Nền tảng tối giản, minh bạch đánh giá, kết nối nhanh.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("scroll-smooth", beVietnam.variable, inter.variable, "font-sans", geist.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${beVietnam.className} flex min-h-screen flex-col bg-background text-foreground antialiased`}>
        <LocaleProvider>
          <UserPreferencesInit />
          <SkipToContentLink />
          {children}
          <VlcAiSupportWidget />
          <ScrollNavButtons />
        </LocaleProvider>
      </body>
    </html>
  );
}
