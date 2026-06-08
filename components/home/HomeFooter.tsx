import Image from "next/image";
import Link from "next/link";
import { FaAndroid, FaApple, FaFacebookF, FaLinkedinIn, FaTwitter } from "./icons";

const FOOTER_LINKS = {
  navigate: [
    { label: "Trang chủ", href: "/" },
    { label: "Đăng việc", href: "#" },
    { label: "Tìm Freelancer", href: "/freelancers" },
    { label: "Tìm việc", href: "/findwork" },
  ],
  company: [
    { label: "Giới thiệu về VLC", href: "/about" },
    { label: "Cách VLC hoạt động", href: "/how-vlc-works" },
    { label: "Tại sao chọn VLC", href: "/why-vlc" },
    { label: "Bảng giá", href: "/pricing" },
  ],
  resources: [
    { label: "Trợ giúp & FAQ", href: "/help" },
    { label: "Blog", href: "/blog" },
    { label: "Liên hệ", href: "#" },
    { label: "Ứng dụng di động", href: "#" },
    { label: "API", href: "#" },
    { label: "Sơ đồ trang", href: "#" },
    { label: "Cài đặt cookie", href: "#" },
  ],
  policies: [
    { label: "Chính sách sở hữu trí tuệ", href: "#" },
    { label: "Chính sách bảo mật", href: "#" },
    { label: "Điều khoản dịch vụ", href: "#" },
  ],
} as const;

function FooterColumn({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="mb-6 font-bold">{title}</h4>
      <ul className="space-y-4 text-sm text-gray-400">
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeFooter() {
  return (
    <footer className="bg-[#1a202c] pb-10 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
          <FooterColumn title="Điều hướng" links={FOOTER_LINKS.navigate} />
          <FooterColumn title="Thông tin công ty" links={FOOTER_LINKS.company} />
          <FooterColumn title="Tài nguyên" links={FOOTER_LINKS.resources} />
          <FooterColumn title="Chính sách" links={FOOTER_LINKS.policies} />
          <div className="lg:col-span-2">
            <h4 className="mb-6 font-bold">Kết nối với chúng tôi</h4>
            <div className="mb-10 flex space-x-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn />
              </a>
            </div>
            <h4 className="mb-6 font-bold">Tải ứng dụng VLC</h4>
            <div className="flex space-x-4">
              <a href="#" className="transition hover:opacity-80" aria-label="Tải trên App Store">
                <FaApple className="text-3xl" />
              </a>
              <a href="#" className="transition hover:opacity-80" aria-label="Tải trên Google Play">
                <FaAndroid className="text-3xl" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-gray-700 pt-8 text-xs text-gray-500 md:flex-row">
          <div className="mb-4 flex items-center gap-4 md:mb-0">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-600 bg-white">
              <Image
                src="/Logo/Logo.png"
                alt="Vĩnh Long Connect"
                width={56}
                height={56}
                className="h-full w-full object-contain p-1.5"
              />
            </span>
            <span>Hoàn thành mọi công việc</span>
          </div>
          <div>Bản quyền © {new Date().getFullYear()}, Vĩnh Long Connected</div>
        </div>
      </div>
    </footer>
  );
}
