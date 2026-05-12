"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HOME_A11Y, HOME_CONTRAST_HEX } from "@/components/home/theme";
import { apiPaths, apiUrl, getApiBaseUrl } from "@/config/api.config";

/** Chu vi hình chữ nhật bo góc — đơn vị px (khớp viewBox menu). */
function perimeterRoundedRectPx(rectW: number, rectH: number, rxInput: number) {
  const rx = Math.min(rxInput, rectW / 2, rectH / 2);
  const topFlat = rectW - 2 * rx;
  const rightFlat = rectH - 2 * rx;
  const cornerArc = (Math.PI / 2) * rx;
  const P = 2 * topFlat + 2 * rightFlat + 4 * cornerArc;
  return { P, rx, topFlat, rightFlat, cornerArc };
}

/**
 * Viền nét đứt một chu kỳ pathLength=100: highlight đối xứng cạnh trên + cạnh dưới theo đúng ô menu.
 */
function buildTabOutlineDash(options: {
  tabLeft: number;
  tabRight: number;
  outlineInset: number;
  rectW: number;
  rectH: number;
  rectRx: number;
}): { dasharray: string; offset: number } | null {
  const { tabLeft, tabRight, outlineInset, rectW, rectH, rectRx } = options;
  const { P, rx, topFlat, cornerArc, rightFlat } = perimeterRoundedRectPx(rectW, rectH, rectRx);
  if (P <= 0) return null;

  const x = outlineInset;
  const xTopStart = x + rx;
  const xTopEnd = x + rectW - rx;

  const segL = Math.min(Math.max(tabLeft, xTopStart), xTopEnd);
  const segR = Math.min(Math.max(tabRight, xTopStart), xTopEnd);
  const widthPx = Math.max(segR - segL, 2);

  const lenNorm = (widthPx / P) * 100;
  const t0 = Math.max(((segL - xTopStart) / P) * 100, 0);
  const t1 = t0 + lenNorm;

  const baseBeforeBottom = topFlat + cornerArc + rightFlat + cornerArc;
  const bottomStartDist = baseBeforeBottom + (xTopEnd - segR);
  const bottomEndDist = baseBeforeBottom + (xTopEnd - segL);
  const b0 = (bottomStartDist / P) * 100;
  const b1 = (bottomEndDist / P) * 100;
  const lenB = b1 - b0;

  const midGap = Math.max(b0 - t1, 0);
  const tailGap = Math.max(100 - b1, 0);

  const fmt = (v: number) => Number(v.toFixed(4));

  return {
    dasharray: [0, fmt(t0), fmt(lenNorm), fmt(midGap), fmt(lenB), fmt(tailGap)].join(" "),
    offset: 0,
  };
}

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  avatarUrl?: string;
};

function getInitials(fullName?: string, email?: string) {
  const fromName = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (fromName.length >= 2) {
    return `${fromName[0][0]}${fromName[fromName.length - 1][0]}`.toUpperCase();
  }

  if (fromName.length === 1 && fromName[0].length >= 2) {
    return fromName[0].slice(0, 2).toUpperCase();
  }

  const localPart = String(email || "").split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
  return (localPart.slice(0, 2) || "U").toUpperCase();
}

export default function Header() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navEffectContainerRef = useRef<HTMLDivElement | null>(null);
  const navLinkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const hoveredNavIdxRef = useRef<number | null>(null);
  const [navOutlineSize, setNavOutlineSize] = useState({ w: 400, h: 52 });
  const [hoveredNavIdx, setHoveredNavIdx] = useState<number | null>(null);
  const [navOutlineDash, setNavOutlineDash] = useState<{ dasharray: string; offset: number } | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    function syncUser() {
      try {
        const stored = window.localStorage.getItem("vlc_current_user");
        if (!stored) {
          setCurrentUser(null);
          return;
        }
        setCurrentUser(JSON.parse(stored) as CurrentUser);
      } catch {
        setCurrentUser(null);
      }
    }

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("vlc-user-updated", syncUser as EventListener);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("vlc-user-updated", syncUser as EventListener);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function syncOutlineDashForIndex(idx: number | null, size?: { w: number; h: number }) {
    if (idx === null) {
      setNavOutlineDash(null);
      return;
    }
    const container = navEffectContainerRef.current;
    const link = navLinkRefs.current[idx];
    if (!container || !link) return;

    const cr = container.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    const navW = size?.w ?? navOutlineSize.w;
    const navH = size?.h ?? navOutlineSize.h;

    const outlineStroke = 2.5;
    const outlineInset = outlineStroke / 2;
    const rectW = Math.max(navW - outlineInset * 2, 1);
    const rectH = Math.max(navH - outlineInset * 2, 1);
    const rectRx = Math.min(13, Math.max(6, rectH / 2 - 0.5));

    const dash = buildTabOutlineDash({
      tabLeft: lr.left - cr.left,
      tabRight: lr.right - cr.left,
      outlineInset,
      rectW,
      rectH,
      rectRx,
    });
    setNavOutlineDash(dash);
  }

  useLayoutEffect(() => {
    const el = navEffectContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    function updateSize() {
      const box = navEffectContainerRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const next = {
        w: Math.max(Math.round(rect.width), 120),
        h: Math.max(Math.round(rect.height), 44),
      };
      setNavOutlineSize(next);
      syncOutlineDashForIndex(hoveredNavIdxRef.current, next);
    }

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    hoveredNavIdxRef.current = hoveredNavIdx;
    syncOutlineDashForIndex(hoveredNavIdx);
  }, [hoveredNavIdx, navOutlineSize.w, navOutlineSize.h]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    const accessToken = window.localStorage.getItem("vlc_access_token");
    const refreshToken = window.localStorage.getItem("vlc_refresh_token");

    try {
      if (accessToken && refreshToken) {
        await fetch(apiUrl(apiPaths.auth.logout, apiBaseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      window.localStorage.removeItem("vlc_current_user");
      window.localStorage.removeItem("vlc_access_token");
      window.localStorage.removeItem("vlc_refresh_token");
      setOpenMenu(false);
      setCurrentUser(null);
      setLoggingOut(false);
      window.location.assign("/");
    }
  }

  const menuItems = [
    { href: "/tro-thanh-freelancer", label: "Trở thành Freelancer" },
    { href: "/viec-lam", label: "Việc làm" },
    { href: "/dich-vu", label: "Dịch vụ" },
    { href: "/freelancer", label: "Freelancer" },
  ];

  const outlineStroke = 2.5;
  const outlineInset = outlineStroke / 2;
  const rectW = Math.max(navOutlineSize.w - outlineInset * 2, 1);
  const rectH = Math.max(navOutlineSize.h - outlineInset * 2, 1);
  const rectRx = Math.min(13, Math.max(6, rectH / 2 - 0.5));

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg outline-none ring-brand-green transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Image
            src="/Logo/Logo.png"
            alt="Vĩnh Long Connected"
            width={210}
            height={62}
            className="h-11 w-auto sm:h-12"
            priority
          />
        </Link>

        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3"
          aria-label="Điều hướng chính"
        >
          <div className="vlc-home-nav relative h-[52px] w-full max-w-full min-w-0 overflow-visible sm:h-[52px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
            <div
              ref={navEffectContainerRef}
              className="vlc-home-nav__container absolute inset-0 flex flex-row items-stretch justify-around gap-0 rounded-2xl px-1 py-1 sm:px-1.5"
              onMouseLeave={() => setHoveredNavIdx(null)}
            >
              {menuItems.map((item, idx) => (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={(el) => {
                    navLinkRefs.current[idx] = el;
                  }}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onMouseEnter={() => setHoveredNavIdx(idx)}
                  className={`vlc-home-nav__btn relative z-[1] flex h-full min-h-0 min-w-0 flex-1 items-center justify-center rounded-xl px-1.5 py-0 text-center text-xs font-semibold leading-snug text-brand-navy transition-colors duration-100 sm:px-2 sm:text-sm ${HOME_A11Y.focusRing} active:scale-[0.98] ${
                    pathname === item.href ? "bg-white/35" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <svg
                className="vlc-home-nav__outline h-full w-full"
                overflow="visible"
                viewBox={`0 0 ${navOutlineSize.w} ${navOutlineSize.h}`}
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <rect
                  className="vlc-home-nav__rect"
                  vectorEffect="nonScalingStroke"
                  pathLength={100}
                  x={outlineInset}
                  y={outlineInset}
                  width={rectW}
                  height={rectH}
                  rx={rectRx}
                  ry={rectRx}
                  fill="transparent"
                  strokeWidth={outlineStroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={
                    navOutlineDash
                      ? {
                          strokeDasharray: navOutlineDash.dasharray,
                          strokeDashoffset: navOutlineDash.offset,
                        }
                      : undefined
                  }
                />
              </svg>
            </div>
          </div>
          {currentUser ? (
            <div className="relative ml-1 sm:ml-2" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpenMenu((prev) => !prev)}
                className={`inline-flex h-10 items-center gap-1 rounded-full border border-brand-green bg-white pl-2.5 pr-2 text-sm font-bold text-brand-navy transition-all duration-200 hover:bg-zinc-50 ${HOME_A11Y.focusRing}`}
                title={currentUser.fullName || currentUser.email}
                aria-label={currentUser.fullName || currentUser.email}
                aria-haspopup="menu"
                aria-expanded={openMenu}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/15">
                  {currentUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(currentUser.fullName, currentUser.email)
                  )}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden
                  className={`h-4 w-4 transition-transform duration-200 ${openMenu ? "rotate-180" : "rotate-0"}`}
                >
                  <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div
                className={`absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl transition-all duration-200 ${
                  openMenu ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                <div className="pointer-events-none absolute right-4 top-0 h-3 w-3 -translate-y-1/2 rotate-45 border-l border-t border-zinc-200 bg-white" />
                <div className="border-b border-zinc-100 px-4 pb-2 pt-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">{currentUser.fullName || "Người dùng"}</p>
                  <p className="truncate text-xs text-zinc-500">{currentUser.email}</p>
                </div>

                <Link
                  href="/ho-so"
                  onClick={() => setOpenMenu(false)}
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/ho-so" ? "bg-brand-green/10 text-brand-navy" : "text-zinc-700 hover:bg-zinc-50 hover:text-brand-navy"
                  }`}
                >
                  Hồ sơ người dùng
                </Link>
                <Link
                  href="/cai-dat"
                  onClick={() => setOpenMenu(false)}
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/cai-dat" ? "bg-brand-green/10 text-brand-navy" : "text-zinc-700 hover:bg-zinc-50 hover:text-brand-navy"
                  }`}
                >
                  Cài đặt
                </Link>
                {(currentUser.role === "client" || currentUser.role === "freelancer") && (
                  <Link
                    href="/cong-viec-cua-toi"
                    onClick={() => setOpenMenu(false)}
                    className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                      pathname === "/cong-viec-cua-toi"
                        ? "bg-brand-green/10 text-brand-navy"
                        : "text-zinc-700 hover:bg-zinc-50 hover:text-brand-navy"
                    }`}
                  >
                    Công việc của tôi
                  </Link>
                )}
                <Link
                  href="/"
                  onClick={() => setOpenMenu(false)}
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === "/" ? "bg-brand-green/10 text-brand-navy" : "text-zinc-700 hover:bg-zinc-50 hover:text-brand-navy"
                  }`}
                >
                  Trang chủ
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/dang-nhap"
              className={`ml-1 rounded-full border border-brand-navy px-3 py-2 text-sm font-semibold text-brand-navy transition-all duration-300 hover:bg-brand-navy hover:text-white ${HOME_A11Y.focusRing} active:scale-[0.98] sm:ml-2 sm:px-4`}
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
      <style jsx global>{`
        .vlc-home-nav__outline {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .vlc-home-nav__rect {
          stroke-dashoffset: 5;
          stroke-dasharray: 0 0 10 40 10 40;
          transition: stroke-dashoffset 0.5s ease, stroke-dasharray 0.5s ease;
          stroke: ${HOME_CONTRAST_HEX.brandGreen};
        }

        .vlc-home-nav__container {
          overflow: visible;
          background: linear-gradient(135deg, rgba(224, 247, 250, 0.92) 0%, rgba(216, 243, 232, 0.96) 50%, rgba(224, 242, 254, 0.9) 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
        }

        .vlc-home-nav__container:hover:not(:has(.vlc-home-nav__btn:hover)) .vlc-home-nav__outline .vlc-home-nav__rect {
          transition: stroke-dashoffset 999999s linear, stroke-dasharray 999999s linear;
          stroke-dashoffset: 1;
          stroke-dasharray: 0;
        }

        .vlc-home-nav__btn:hover {
          background: rgba(255, 255, 255, 0.22);
        }
      `}</style>
    </header>
  );
}
