"use client";

import Link from "next/link";
import {
  FaAt,
  FaBolt,
  FaChartBar,
  FaCheckCircle,
  FaCode,
  FaDesktop,
  FaEnvelope,
  FaGem,
  FaKey,
  FaPhoneAlt,
  FaShieldAlt,
  FaThumbsUp,
  FaTrashAlt,
  FaUser,
  FaWallet,
} from "react-icons/fa";

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
  | "credentials";

type EditAccountSidebarProps = {
  active?: AccountSidebarSection;
};

export default function EditAccountSidebar({ active = "contact" }: EditAccountSidebarProps) {
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
      <SidebarItem
        icon={<FaChartBar />}
        label="Thống kê hồ sơ"
        href="/ho-so/thong-ke"
        active={active === "stats"}
      />

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
      <SidebarItem icon={<FaAt />} label="Đăng nhập mạng xã hội" disabled />
      <SidebarItem icon={<FaShieldAlt />} label="Bảo mật tài khoản" disabled />

      <SidebarGroup label="Gói & Thanh toán" />
      <SidebarItem icon={<FaGem />} label="Gói thành viên" disabled />
      <SidebarItem icon={<FaBolt />} label="Đơn chào giá" disabled />
      <SidebarItem icon={<FaWallet />} label="Phương thức chuyển tiền" href="/payments" />

      <SidebarGroup label="Khác" />
      <SidebarItem icon={<FaCode />} label="API" disabled />
      <SidebarItem icon={<FaDesktop />} label="Nhật ký thiết bị" disabled />
      <SidebarItem icon={<FaEnvelope />} label="Tùy chọn email" disabled />
      <SidebarItem icon={<FaTrashAlt />} label="Xóa tài khoản" disabled />
    </aside>
  );
}
