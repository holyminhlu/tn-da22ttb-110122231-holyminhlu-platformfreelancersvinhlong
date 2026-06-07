import AuthParticleStorm from "./AuthParticleStorm";
import styles from "./auth.module.css";
type AuthLayoutProps = {
  children: React.ReactNode;
  variant: "login" | "register";
};

const MOBILE_COPY = {
  login: {
    title: "Chào mừng trở lại",
    lead: "Đăng nhập để quản lý công việc, báo giá và kết nối với cộng đồng freelancer tại Vĩnh Long.",
  },
  register: {
    title: "Gia nhập VLC Connected",
    lead: "Tạo tài khoản Client hoặc Freelancer — đăng việc, nhận báo giá và làm việc trên nền tảng địa phương.",
  },
} as const;

export default function AuthLayout({ children, variant }: AuthLayoutProps) {
  const copy = MOBILE_COPY[variant];
  const isRegister = variant === "register";

  return (
    <div className={`auth-page ${styles.page}${isRegister ? ` ${styles.pageRegister}` : ""}`}>
      <div className={`${styles.grid}${isRegister ? ` ${styles.gridRegister}` : ""}`}>
        <aside
          className={`${styles.heroPanel}${isRegister ? ` ${styles.heroSticky}` : ""}`}
          aria-hidden
        >
          <AuthParticleStorm className={styles.heroCanvas} />
        </aside>
        <main
          id="main-content"
          className={`${styles.main}${isRegister ? ` ${styles.mainScroll}` : ""}`}
        >
          <div className={styles.mobileHero}>
            <p className={styles.mobileHeroTitle}>{copy.title}</p>
            <p className={styles.mobileHeroLead}>{copy.lead}</p>
          </div>
          <div className={`${styles.card}${variant === "register" ? ` ${styles.cardWide}` : ""}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
