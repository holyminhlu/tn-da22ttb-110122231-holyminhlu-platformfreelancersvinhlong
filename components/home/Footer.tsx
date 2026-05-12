import type { SVGProps } from "react";
import Link from "next/link";
import { HOME_A11Y } from "@/components/home/theme";

function IconFacebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

function IconYoutube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-900">
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold tracking-tight">Vĩnh Long Connected</p>
            <p className={`mt-3 text-sm leading-relaxed ${HOME_A11Y.textMuted}`}>
              Kết nối dịch vụ địa phương — minh bạch, gần gũi và đáng tin cậy cho người dân Vĩnh Long.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-900">Liên hệ</p>
            <ul className={`mt-4 space-y-2 text-sm ${HOME_A11Y.textMuted}`}>
              <li>Hotline: <a href="tel:+84701234567" className={HOME_A11Y.linkOnLight}>070 123 4567</a></li>
              <li>
                Email:{" "}
                <a href="mailto:contact@vinhlongconnected.vn" className={HOME_A11Y.linkOnLight}>
                  contact@vinhlongconnected.vn
                </a>
              </li>
              <li>Địa chỉ: TP. Vĩnh Long, tỉnh Vĩnh Long</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-900">Pháp lý</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/chinh-sach-bao-mat" className={HOME_A11Y.linkOnLight}>
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/dieu-khoan" className={HOME_A11Y.linkOnLight}>
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/huong-dan" className={HOME_A11Y.linkOnLight}>
                  Hướng dẫn an toàn giao dịch
                </Link>
              </li>
            </ul>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-900">Theo dõi</p>
            <div className="mt-3 flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-700 transition-all duration-300 hover:border-brand-green/50 hover:bg-brand-green hover:text-white"
                aria-label="Facebook"
              >
                <IconFacebook className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-700 transition-all duration-300 hover:border-brand-green/50 hover:bg-brand-green hover:text-white"
                aria-label="YouTube"
              >
                <IconYoutube className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Vĩnh Long Connected. Đồ án / dự án nền tảng kết nối dịch vụ địa phương.
        </div>
      </div>
    </footer>
  );
}
