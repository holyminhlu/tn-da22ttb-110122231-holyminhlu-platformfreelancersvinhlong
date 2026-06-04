import Link from "next/link";
import HomeNavbarLogo from "@/components/home/HomeNavbarLogo";
import "../home/home.css";
import styles from "./auth.module.css";

type AuthLayoutProps = {
  children: React.ReactNode;
  variant: "login" | "register";
};

const HERO_COPY = {
  login: {
    title: "Chào mừng trở lại",
    lead: "Đăng nhập để quản lý công việc, báo giá và kết nối với cộng đồng freelancer tại Vĩnh Long.",
    bullets: ["Theo dõi đơn hàng & hợp đồng", "Nhắn tin & báo giá an toàn", "Thanh toán minh bạch"],
  },
  register: {
    title: "Gia nhập VLC Connected",
    lead: "Tạo tài khoản Client hoặc Freelancer — đăng việc, nhận báo giá và làm việc trên nền tảng địa phương.",
    bullets: ["Đăng ký miễn phí", "Xác minh danh tính linh hoạt", "Hỗ trợ tiếng Việt"],
  },
} as const;

export default function AuthLayout({ children, variant }: AuthLayoutProps) {
  const copy = HERO_COPY[variant];

  return (
    <div className={`auth-page home-landing ${styles.page}`}>
      <header className={styles.header}>
        <HomeNavbarLogo />
        <Link href="/" className={styles.backLink}>
          ← Về trang chủ
        </Link>
      </header>

      <div className={styles.grid}>
        <aside className={`hero-gradient ${styles.hero}`} aria-hidden={false}>
          <div className={styles.heroInner}>
            <p className={styles.heroBadge}>Vĩnh Long Connected</p>
            <h1 className={styles.heroTitle}>{copy.title}</h1>
            <p className={styles.heroLead}>{copy.lead}</p>
            <ul className={styles.heroList}>
              {copy.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>

        <main id="main-content" className={styles.main}>
          <div className={`hero-gradient ${styles.mobileHero}`}>
            <p className={styles.mobileHeroTitle}>{copy.title}</p>
            <p className={styles.mobileHeroLead}>{copy.lead}</p>
          </div>
          <div
            className={`${styles.card}${variant === "register" ? ` ${styles.cardWide}` : ""}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
