import Image from "next/image";
import { FaCircle, FaDotCircle } from "./icons";

const PAYMENT_TERMS = [
  {
    id: "fixed",
    active: true,
    title: "Trọn gói",
    desc: "Đặt tổng chi phí cho công việc, chia milestone theo từng giai đoạn — nghiệm thu xong mới giải ngân ký quỹ tương ứng.",
  },
  {
    id: "hourly",
    active: false,
    title: "Theo giờ",
    desc: null,
  },
  {
    id: "package",
    active: false,
    title: "Gói dịch vụ",
    desc: null,
  },
  {
    id: "escrow",
    active: false,
    title: "Ký quỹ từng giai đoạn",
    desc: null,
  },
] as const;

export default function HomeWorkYourWay() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-bold">Làm việc theo cách của bạn</h2>
          <div className="mx-auto h-1 w-12 bg-blue-500" />
        </div>
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <div className="flex-1">
            <Image
              src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=800"
              alt="Làm việc linh hoạt với freelancer tại Vĩnh Long"
              width={800}
              height={500}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
          <div className="flex-1 space-y-6">
            <h3 className="mb-6 text-xl font-bold">
              Chọn hình thức ngân sách khi đăng việc hoặc đặt dịch vụ với freelancer địa phương.
            </h3>
            <div className="space-y-4">
              {PAYMENT_TERMS.map((term) =>
                term.active ? (
                  <div
                    key={term.id}
                    className="rounded border border-blue-500 bg-blue-50 p-4"
                  >
                    <div className="mb-2 flex items-center font-bold text-blue-600">
                      <FaDotCircle className="mr-3" aria-hidden />
                      {term.title}
                    </div>
                    {term.desc ? (
                      <p className="pl-8 text-sm text-gray-600">{term.desc}</p>
                    ) : null}
                  </div>
                ) : (
                  <div
                    key={term.id}
                    className="flex items-center rounded border border-gray-200 p-4 font-bold text-gray-700"
                  >
                    <FaCircle className="mr-3" aria-hidden />
                    {term.title}
                  </div>
                ),
              )}
            </div>
            <div className="pt-6">
              <button
                type="button"
                className="rounded bg-[#0066cc] px-8 py-3 font-bold text-white transition hover:bg-blue-700"
              >
                Tìm hiểu quy trình hợp đồng
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
