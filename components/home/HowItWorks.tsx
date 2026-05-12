import { IconCheckBadge, IconHandshake, IconSearchFlow } from "@/components/home/icons";
import MediaCarousel3d from "@/components/home/MediaCarousel3d";
import { HOME_A11Y } from "@/components/home/theme";

const STEPS = [
  {
    title: "Tìm kiếm",
    body: "Nhập dịch vụ và khu vực — lọc thợ gần bạn, có đánh giá rõ ràng.",
    Icon: IconSearchFlow,
  },
  {
    title: "Kết nối",
    body: "Trao đổi nhanh qua nền tảng, thống nhất phạm vi công việc và chi phí.",
    Icon: IconHandshake,
  },
  {
    title: "Hoàn thành",
    body: "Nghiệm thu công việc và để lại đánh giá — giúp cộng đồng tin cậy hơn.",
    Icon: IconCheckBadge,
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="border-t border-zinc-100 bg-white px-4 py-14 sm:px-6" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 md:grid-cols-2 md:gap-10 md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-navy">Video giới thiệu</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Khám phá cách Vĩnh Long Connected vận hành</h3>
            <p className={`mt-3 text-sm leading-relaxed md:text-base ${HOME_A11Y.textMuted}`}>
              Nền tảng giúp bạn tìm đúng người đúng việc ngay trong khu vực, kết nối nhanh và theo dõi chất lượng dịch vụ minh bạch.
              Video mô tả tổng quan trải nghiệm cho cả người thuê và freelancer.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black shadow-sm">
            <video
              className="pointer-events-none aspect-video h-full w-full select-none"
              src="/Media/vinhlongmedia1.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          </div>
        </div>

        <MediaCarousel3d />

        <h2 id="how-heading" className="mt-12 text-center text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
          Cách hoạt động
        </h2>
        <p className={`mx-auto mt-3 max-w-2xl text-center ${HOME_A11Y.textMuted}`}>
          Ba bước đơn giản — thiết kế cho người bận rộn, ưu tiên rõ ràng và an tâm.
        </p>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ title, body, Icon }, i) => (
            <li key={title}>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-green px-1.5 text-xs font-bold text-white shadow-sm ring-2 ring-white">
                    {i + 1}
                  </span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-50 text-brand-navy ring-1 ring-zinc-100 transition-transform duration-300 hover:scale-105 hover:ring-brand-green/40">
                    <Icon className="h-8 w-8 [stroke-width:1.5]" />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
                <p className={`mt-2 max-w-xs text-sm leading-relaxed ${HOME_A11Y.textMuted}`}>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
