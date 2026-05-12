"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";

type FreelancerLevel = "Mới" | "Trung cấp" | "Chuyên gia";

type FreelancerCard = {
  id: string;
  fullName: string;
  title: string;
  level: FreelancerLevel;
  district: string;
  responseTime: string;
  completedJobs: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  skills: string[];
  bio: string;
};

const FREELANCERS: FreelancerCard[] = [
  {
    id: "fr-01",
    fullName: "Phạm Minh Tuấn",
    title: "Kỹ thuật điện lạnh dân dụng",
    level: "Chuyên gia",
    district: "TP. Vĩnh Long",
    responseTime: "~15 phút",
    completedJobs: 124,
    rating: 4.9,
    reviewCount: 78,
    hourlyRate: 280000,
    skills: ["Điện lạnh", "Sửa chữa", "Bảo trì"],
    bio: "Hơn 7 năm kinh nghiệm lắp đặt và bảo trì thiết bị điện lạnh cho hộ gia đình, cửa hàng.",
  },
  {
    id: "fr-02",
    fullName: "Trần Thị Mai",
    title: "Gia sư tiếng Anh 1-1",
    level: "Chuyên gia",
    district: "Bình Minh",
    responseTime: "~30 phút",
    completedJobs: 92,
    rating: 5,
    reviewCount: 63,
    hourlyRate: 220000,
    skills: ["Gia sư", "Tiếng Anh", "Kèm online"],
    bio: "Xây dựng lộ trình học cá nhân hóa theo mục tiêu thi cử hoặc giao tiếp cho học sinh, sinh viên.",
  },
  {
    id: "fr-03",
    fullName: "Lê Hoàng Nam",
    title: "Developer Web Next.js",
    level: "Trung cấp",
    district: "Long Hồ",
    responseTime: "~45 phút",
    completedJobs: 48,
    rating: 4.8,
    reviewCount: 31,
    hourlyRate: 350000,
    skills: ["Next.js", "TypeScript", "SEO"],
    bio: "Thiết kế và phát triển website bán hàng, landing page, dashboard quản trị cho doanh nghiệp nhỏ.",
  },
  {
    id: "fr-04",
    fullName: "Ngô Thu Hà",
    title: "Makeup Artist tại nhà",
    level: "Trung cấp",
    district: "Trà Ôn",
    responseTime: "~20 phút",
    completedJobs: 57,
    rating: 4.7,
    reviewCount: 26,
    hourlyRate: 180000,
    skills: ["Trang điểm", "Làm đẹp", "Dự tiệc"],
    bio: "Makeup tone tự nhiên hoặc glam theo concept sự kiện, hỗ trợ gói đi tỉnh theo lịch hẹn.",
  },
  {
    id: "fr-05",
    fullName: "Võ Gia Hân",
    title: "Nhiếp ảnh sự kiện",
    level: "Trung cấp",
    district: "Vũng Liêm",
    responseTime: "~35 phút",
    completedJobs: 39,
    rating: 4.85,
    reviewCount: 24,
    hourlyRate: 300000,
    skills: ["Chụp ảnh", "Retouch", "Event"],
    bio: "Chụp sự kiện và xử lý hậu kỳ nhanh, trả ảnh đúng hẹn cho tiệc cưới, sinh nhật, khai trương.",
  },
  {
    id: "fr-06",
    fullName: "Nguyễn Quốc Bảo",
    title: "Thiết kế logo & social post",
    level: "Mới",
    district: "Tam Bình",
    responseTime: "~1 giờ",
    completedJobs: 16,
    rating: 4.6,
    reviewCount: 11,
    hourlyRate: 170000,
    skills: ["Thiết kế", "Canva", "Branding"],
    bio: "Hỗ trợ thiết kế logo, bài đăng mạng xã hội và bộ nhận diện cơ bản cho shop địa phương.",
  },
];

const SKILLS = ["Tất cả", "Điện lạnh", "Gia sư", "Next.js", "Trang điểm", "Chụp ảnh", "Thiết kế"] as const;
const DISTRICTS = ["Tất cả", "TP. Vĩnh Long", "Long Hồ", "Bình Minh", "Trà Ôn", "Vũng Liêm", "Tam Bình"] as const;

function formatCurrencyVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FreelancersPage() {
  const [query, setQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<(typeof SKILLS)[number]>("Tất cả");
  const [selectedDistrict, setSelectedDistrict] = useState<(typeof DISTRICTS)[number]>("Tất cả");

  const filteredFreelancers = useMemo(() => {
    return FREELANCERS.filter((freelancer) => {
      const text = `${freelancer.fullName} ${freelancer.title} ${freelancer.skills.join(" ")}`.toLowerCase();
      const byQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true;
      const bySkill = selectedSkill === "Tất cả" ? true : freelancer.skills.some((skill) => skill === selectedSkill);
      const byDistrict = selectedDistrict === "Tất cả" ? true : freelancer.district === selectedDistrict;
      return byQuery && bySkill && byDistrict;
    });
  }, [query, selectedDistrict, selectedSkill]);

  return (
    <>
      <Header />
      <main className="fv-profile-shell min-h-screen bg-[#FFFFFF] pb-16 pt-8 md:pb-16 md:pt-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <section className="border-b border-[#E8E8E8] pb-10 md:pb-12">
            <p className="fv-label-caps text-[#74767E]">Danh bạ freelancer</p>
            <h1 className="fv-display mt-2 max-w-[720px]">Tìm freelancer phù hợp trong vài phút</h1>
            <p className="fv-body mt-4 max-w-[720px]">
              Lọc theo kỹ năng, khu vực và đánh giá để tìm đúng người cho công việc của bạn tại Vĩnh Long. Danh sách minh
              họa — kết nối thật sẽ cần đăng nhập để liên hệ trực tiếp.
            </p>
            <div className="mt-8 flex min-h-[48px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/dich-vu" className="fv-btn-primary fv-focus-ring w-full text-center sm:w-auto">
                Xem dịch vụ đang mở
              </Link>
              <Link href="/viec-lam/dang-tin" className="fv-btn-secondary fv-focus-ring w-full text-center sm:w-auto">
                Đăng công việc
              </Link>
            </div>
          </section>

          <section className="fv-card mt-8 md:mt-10">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end lg:gap-6">
              <label className="block min-w-0">
                <span className="fv-label-caps mb-2 block text-[#74767E]">Tìm freelancer</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tên, vai trò hoặc kỹ năng..."
                  autoComplete="off"
                  className="fv-input fv-focus-ring box-border"
                />
              </label>
              <label className="block min-w-0">
                <span className="fv-label-caps mb-2 block text-[#74767E]">Kỹ năng</span>
                <select
                  value={selectedSkill}
                  onChange={(event) => setSelectedSkill(event.target.value as (typeof SKILLS)[number])}
                  className="fv-input fv-focus-ring box-border cursor-pointer"
                >
                  {SKILLS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0">
                <span className="fv-label-caps mb-2 block text-[#74767E]">Khu vực</span>
                <select
                  value={selectedDistrict}
                  onChange={(event) => setSelectedDistrict(event.target.value as (typeof DISTRICTS)[number])}
                  className="fv-input fv-focus-ring box-border cursor-pointer"
                >
                  {DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fv-caption pb-1 text-[#74767E] lg:text-right">
                Kết quả:{" "}
                <span className="font-semibold tabular-nums text-[#1DBF73]" aria-live="polite">
                  {filteredFreelancers.length}
                </span>
              </div>
            </div>
          </section>

          <section className="mt-8 md:mt-10">
            {filteredFreelancers.length === 0 ? (
              <div className="fv-alert-card" role="status">
                <p className="fv-heading text-[#404145]">Chưa có freelancer khớp bộ lọc — đừng vội bỏ cuộc</p>
                <p className="fv-body mt-3">
                  Thử bỏ bớt điều kiện hoặc đổi từ khóa ngắn gọn hơn. Nếu vẫn trống, có thể khu vực hoặc kỹ năng đó chưa có hồ
                  sơ — quay lại sau hoặc đăng tin để mọi người chủ động liên hệ bạn.
                </p>
              </div>
            ) : (
              <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {filteredFreelancers.map((freelancer, index) => {
                  const initials = freelancer.fullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase();
                  const avatarClass =
                    index % 2 === 0
                      ? "bg-[#404145] text-[#FFFFFF]"
                      : "bg-[#1DBF73] text-[#FFFFFF]";

                  return (
                    <li key={freelancer.id}>
                      <article className="flex h-full flex-col rounded-[8px] border border-[#E8E8E8] bg-[#FFFFFF] p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.08)] transition-[box-shadow,transform] duration-200 hover:shadow-[0px_2px_8px_rgba(0,0,0,0.12)]">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex size-[52px] shrink-0 items-center justify-center rounded-full text-[13.6px] font-bold leading-none md:size-14 md:text-base ${avatarClass}`}
                            aria-hidden
                          >
                            {initials || "F"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate fv-heading text-[#404145]">{freelancer.fullName}</h2>
                            <p className="fv-body-sm mt-1 line-clamp-2">{freelancer.title}</p>
                            <div className="mt-3 flex min-h-[44px] flex-wrap gap-2">
                              <span className="fv-badge-success">{freelancer.level}</span>
                              <span className="fv-badge-neutral">{freelancer.district}</span>
                            </div>
                          </div>
                        </div>

                        <div className="fv-inset-card mt-4 bg-[#FFFFFF]">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="fv-caption text-[#74767E]">Đánh giá</p>
                              <p className="fv-body-sm mt-1 font-bold text-[#404145] tabular-nums">{freelancer.rating.toFixed(1)}</p>
                            </div>
                            <div>
                              <p className="fv-caption text-[#74767E]">Việc xong</p>
                              <p className="fv-body-sm mt-1 font-bold text-[#404145] tabular-nums">{freelancer.completedJobs}</p>
                            </div>
                            <div>
                              <p className="fv-caption text-[#74767E]">Phản hồi</p>
                              <p className="fv-body-sm mt-1 font-bold text-[#404145]">{freelancer.responseTime}</p>
                            </div>
                          </div>
                        </div>

                        <p className="fv-body-sm mt-4 flex-1">{freelancer.bio}</p>

                        <div className="mt-4 flex min-h-[44px] flex-wrap gap-2">
                          {freelancer.skills.map((skill) => (
                            <span key={skill} className="fv-badge-neutral font-semibold normal-case">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <hr className="fv-divider my-4" />

                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <p className="fv-body-sm">
                            Từ{" "}
                            <span className="font-bold text-[#1DBF73]" aria-label={`Giá từ ${formatCurrencyVnd(freelancer.hourlyRate)} mỗi giờ`}>
                              {formatCurrencyVnd(freelancer.hourlyRate)}/giờ
                            </span>
                          </p>
                          <p className="fv-caption tabular-nums text-[#74767E]">{freelancer.reviewCount} đánh giá</p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Link href="/dang-nhap" className="fv-btn-secondary fv-focus-ring w-full text-center">
                            Xem hồ sơ
                          </Link>
                          <Link href="/dang-nhap" className="fv-btn-ghost fv-focus-ring w-full text-center">
                            Liên hệ
                          </Link>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
