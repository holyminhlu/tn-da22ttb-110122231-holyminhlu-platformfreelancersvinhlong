"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { FaFacebookF } from "./icons";

const FOOTER_LINKS = {
  navigate: [
    { labelKey: "footer.home", href: "/" },
    { labelKey: "footer.postJob", href: "/hire/post" },
    { labelKey: "nav.findFreelancer", href: "/freelancers" },
    { labelKey: "nav.findWork", href: "/findwork" },
  ],
  company: [
    { labelKey: "aboutNav.aboutVlc", href: "/about" },
    { labelKey: "aboutNav.howVlcWorks", href: "/how-vlc-works" },
    { labelKey: "aboutNav.whyVlc", href: "/why-vlc" },
  ],
  resources: [
    { labelKey: "footer.helpFaq", href: "/help" },
    { labelKey: "footer.contact", href: "/lien-he" },
  ],
  policies: [
    { labelKey: "footer.privacyPolicy", href: "/chinh-sach-bao-mat" },
    { labelKey: "footer.termsOfService", href: "/dieu-khoan-dich-vu" },
  ],
} as const;

function FooterColumn({
  title,
  links,
  t,
}: {
  title: string;
  links: readonly { labelKey: string; href: string }[];
  t: (text: string) => string;
}) {
  return (
    <div>
      <h4 className="mb-6 font-bold">{title}</h4>
      <ul className="space-y-4 text-sm text-gray-400">
        {links.map((link) => (
          <li key={link.labelKey}>
            <Link href={link.href} className="transition hover:text-white">
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#1a202c] pb-10 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-20 grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-6">
          <FooterColumn title={t("footer.navigate")} links={FOOTER_LINKS.navigate} t={t} />
          <FooterColumn title={t("footer.company")} links={FOOTER_LINKS.company} t={t} />
          <FooterColumn title={t("footer.resources")} links={FOOTER_LINKS.resources} t={t} />
          <FooterColumn title={t("footer.policies")} links={FOOTER_LINKS.policies} t={t} />
          <div className="lg:col-span-2">
            <h4 className="mb-6 font-bold">{t("footer.connect")}</h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 transition hover:bg-blue-600"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-gray-700 pt-8 text-xs text-gray-500 md:flex-row">
          <div className="mb-4 flex items-center gap-4 md:mb-0">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-600 bg-card">
              <Image
                src="/Logo/logochinhthuc.png"
                alt="Vĩnh Long Connect"
                width={56}
                height={56}
                className="h-full w-full scale-[1.45] object-contain"
              />
            </span>
            <span>{t("footer.tagline")}</span>
          </div>
          <div>{t("footer.copyright", { year: new Date().getFullYear() })}</div>
        </div>
      </div>
    </footer>
  );
}
