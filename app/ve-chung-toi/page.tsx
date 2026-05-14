import type { Metadata } from "next";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";

export const metadata: Metadata = {
  title: "Về chúng tôi | Vĩnh Long Connected",
  description: "Giới thiệu sứ mệnh và cách Vĩnh Long Connected kết nối khách hàng với freelancer địa phương.",
};

export default function VeChungToiPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Về chúng tôi</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700 sm:text-base">
            Vĩnh Long Connected là nền tảng kết nối dịch vụ địa phương — giúp người dân và doanh nghiệp tìm freelancer,
            thợ và chuyên gia tin cậy gần nhà, minh bạch và thuận tiện.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
