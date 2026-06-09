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
  FaWallet,
} from "react-icons/fa";
import { useStoredUser } from "@/hooks/useStoredUser";

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
  | "settings";

type EditAccountSidebarProps = {
  active?: AccountSidebarSection;
};

export default function EditAccountSidebar({ active = "contact" }: EditAccountSidebarProps) {
  const { ready, isClient } = useStoredUser({ refreshFromApi: false });
  const hideClientMenus = ready && isClient;

  return (
    <aside className="ea-sidebar" aria-label="Cài đặt tài khoản">
      <SidebarGroup label="Hồ sơ" />
      <SidebarItem
        icon={<FaUser />}
        label="Hồ sơ của tôi"
        href="/ho-so"
        active={active === "profile"}
      />
      <SidebarItem
        icon={<FaThumbsUp />}
        label="Phản hồi"
        href="/ho-so/phan-hoi"
        active={active === "feedback"}
      />
      {!hideClientMenus ? (
        <SidebarItem
          icon={<FaChartBar />}
          label="Thống kê hồ sơ"
          href="/ho-so/thong-ke"
          active={active === "stats"}
        />
      ) : null}

      <SidebarGroup label="Cài đặt tài khoản" />
      <SidebarItem
        icon={<FaPhoneAlt />}
        label="Thông tin liên hệ"
        href="/edit-account"
        active={active === "contact"}
      />
      <SidebarItem
        icon={<FaCheckCircle />}
        label="Xác minh danh tính"
        href="/edit-account/xac-minh"
        active={active === "verification"}
      />
      <SidebarItem
        icon={<FaKey />}
        label="Tên đăng nhập & Mật khẩu"
        href="/edit-account/ten-dang-nhap"
        active={active === "credentials"}
      />
      <SidebarItem icon={<FaShieldAlt />} label="Bảo mật tài khoản" disabled />

      <SidebarGroup label="Gói & Thanh toán" />
      <SidebarItem icon={<FaWallet />} label="Phương thức chuyển tiền" href="/payments" />

      <SidebarGroup label="Khác" />
      <SidebarItem
        icon={<FaCog />}
        label="Cài đặt"
        href="/edit-account/cai-dat"
        active={active === "settings"}
      />
    </aside>
  );
}
