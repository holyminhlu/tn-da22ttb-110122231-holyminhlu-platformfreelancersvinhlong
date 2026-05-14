import type { Metadata } from "next";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";

export const metadata: Metadata = {
  title: "Giải pháp | Vĩnh Long Connected",
  description: "Các hướng tiếp cận tìm việc, tìm dịch vụ và quản lý hợp tác trên Vĩnh Long Connected.",
};

export default function GiaiPhapPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Giải pháp</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700 sm:text-base">
            Chúng tôi hỗ trợ bạn tìm việc làm freelance, tìm dịch vụ theo gói và kết nối với freelancer phù hợp — tập
            trung vào trải nghiệm đơn giản, an toàn giao dịch và minh bạch thông tin.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
