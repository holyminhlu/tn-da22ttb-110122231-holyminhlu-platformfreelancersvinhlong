import Image from "next/image";
import Link from "next/link";
import { FaAndroid, FaApple, FaFacebookF, FaLinkedinIn, FaTwitter } from "./icons";

const FOOTER_LINKS = {
  navigate: [
    { label: "Home", href: "/" },
    { label: "Post a Job", href: "#" },
    { label: "Find a Freelancer", href: "/freelancers" },
    { label: "Find a Job", href: "/findwork" },
    { label: "Enterprise Solutions", href: "/enterprise" },
    { label: "Agency Solutions", href: "/agency" },
    { label: "PO Solutions", href: "/purchase-orders" },
  ],
  company: [
    { label: "About VLC Connected", href: "/about" },
    { label: "How It Works", href: "/how-vlc-works" },
    { label: "Why VLC Connected", href: "/why-vlc" },
    { label: "Work Agreements", href: "/agreements" },
    { label: "SafePay", href: "/safepay" },
    { label: "Pricing", href: "/pricing" },
  ],
  resources: [
    { label: "Help & FAQ", href: "/help" },
    { label: "Blog", href: "/blog" },
    { label: "Contact Us", href: "#" },
    { label: "Mobile App", href: "#" },
    { label: "APIs", href: "#" },
    { label: "Sitemap", href: "#" },
    { label: "Cookie Settings", href: "#" },
  ],
  policies: [
    { label: "IP Policy", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
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
          <FooterColumn title="Navigate" links={FOOTER_LINKS.navigate} />
          <FooterColumn title="Company Info" links={FOOTER_LINKS.company} />
          <FooterColumn title="Resources" links={FOOTER_LINKS.resources} />
          <FooterColumn title="Policies" links={FOOTER_LINKS.policies} />
          <div className="lg:col-span-2">
            <h4 className="mb-6 font-bold">Connect With Us</h4>
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
            <h4 className="mb-6 font-bold">Get the VLC App</h4>
            <div className="flex space-x-4">
              <a href="#" className="transition hover:opacity-80" aria-label="App Store">
                <FaApple className="text-3xl" />
              </a>
              <a href="#" className="transition hover:opacity-80" aria-label="Google Play">
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
            <span>Get Work Done</span>
          </div>
          <div>Copyright © {new Date().getFullYear()}, Vĩnh Long Connected</div>
        </div>
      </div>
    </footer>
  );
}
