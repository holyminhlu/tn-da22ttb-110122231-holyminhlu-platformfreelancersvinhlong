"use client";

import Link from "next/link";
import {
  FaChartBar,
  FaCheckCircle,
  FaCog,
  FaKey,
  FaPhoneAlt,
  FaShieldAlt,
  FaThumbsUp,
  FaUser,
} from "react-icons/fa";
import { useStoredUser } from "@/hooks/useStoredUser";
import { useTranslation } from "@/hooks/useTranslation";

type SidebarItemProps = {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
  disabled?: boolean;
};

function SidebarItem({ icon, label, active, href, disabled }: SidebarItemProps) {
  const className = `ea-sidebar-item${active ? " ea-sidebar-item--active" : ""}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {icon ? <span className="ea-sidebar-icon" aria-hidden>{icon}</span> : null}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} aria-current={active ? "page" : undefined}>
      {icon ? <span className="ea-sidebar-icon" aria-hidden>{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function SidebarGroup({ label }: { label: string }) {
  return <p className="ea-sidebar-group">{label}</p>;
}

export type AccountSidebarSection =
  | "profile"
  | "feedback"
  | "stats"
  | "contact"
  | "verification"
  | "credentials"
  | "security"
  | "settings";

type EditAccountSidebarProps = {
  active?: AccountSidebarSection;
};

export default function EditAccountSidebar({
  active = "contact" }: EditAccountSidebarProps) {
  const { t } = useTranslation();

  const { ready, isClient } = useStoredUser({ refreshFromApi: false });
  const hideClientMenus = ready && isClient;

  return (
    <aside className="ea-sidebar" aria-label={t("accountSidebar.ariaLabel")}>
      <SidebarGroup label={t("accountSidebar.profile")} />
      <SidebarItem
        icon={<FaUser />}
        label={t("accountSidebar.myProfile")}
        href="/ho-so"
        active={active === "profile"}
      />
      <SidebarItem
        icon={<FaThumbsUp />}
        label={t("accountSidebar.feedback")}
        href="/ho-so/phan-hoi"
        active={active === "feedback"}
      />
      {!hideClientMenus ? (
        <SidebarItem
          icon={<FaChartBar />}
          label={t("accountSidebar.profileStats")}
          href="/ho-so/thong-ke"
          active={active === "stats"}
        />
      ) : null}

      <SidebarGroup label={t("accountSidebar.accountSettings")} />
      <SidebarItem
        icon={<FaPhoneAlt />}
        label={t("accountSidebar.contactInfo")}
        href="/edit-account"
        active={active === "contact"}
      />
      <SidebarItem
        icon={<FaCheckCircle />}
        label={t("accountSidebar.identityVerification")}
        href="/edit-account/xac-minh"
        active={active === "verification"}
      />
      <SidebarItem
        icon={<FaKey />}
        label={t("accountSidebar.credentials")}
        href="/edit-account/ten-dang-nhap"
        active={active === "credentials"}
      />
      <SidebarItem
        icon={<FaShieldAlt />}
        label={t("accountSidebar.security")}
        href="/edit-account/bao-mat"
        active={active === "security"}
      />

      <SidebarGroup label={t("accountSidebar.other")} />
      <SidebarItem
        icon={<FaCog />}
        label={t("accountSidebar.settings")}
        href="/edit-account/cai-dat"
        active={active === "settings"}
      />
    </aside>
  );
}
