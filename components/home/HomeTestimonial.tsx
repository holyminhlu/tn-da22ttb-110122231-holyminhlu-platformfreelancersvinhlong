import Image from "next/image";
import { FaChevronLeft, FaChevronRight } from "./icons";

export default function HomeTestimonial() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold">Khách hàng nói gì</h2>
        <div className="mx-auto mb-16 h-1 w-12 bg-blue-500" />
        <div className="relative px-12">
          <p className="mb-12 text-lg italic leading-relaxed text-gray-600">
            Công ty chúng tôi thường xuyên phỏng vấn khách hàng mục tiêu qua điện thoại, mỗi buổi
            khoảng 30–45 phút. Việc vừa lắng nghe, vừa đặt câu hỏi sâu và vừa ghi chép đầy đủ khiến
            tôi rất vất vả. Một đồng nghiệp gợi ý tìm freelancer trên VLC Connected để phiên âm các
            buổi phỏng vấn… Người tôi thuê đã đồng hành cùng tôi gần hai năm — nhanh, chính xác và
            giá hợp lý. Nếu không có VLC Connected, tôi khó có thể tìm được giải pháp hiệu quả cho
            nhu cầu phiên âm thường xuyên của mình.
          </p>
          <div className="flex flex-col items-center">
            <Image
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100"
              alt="Nguyễn Minh Tuấn"
              width={64}
              height={64}
              className="mb-4 rounded-full object-cover"
            />
            <h4 className="font-bold">Nguyễn Minh Tuấn</h4>
            <p className="text-sm text-gray-500">Giám đốc Marketing sản phẩm, Công ty TNHH ABC</p>
          </div>
          <button
            type="button"
            className="absolute -left-4 top-1/2 text-3xl text-gray-300 hover:text-blue-500"
            aria-label="Cảm nhận trước"
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className="absolute -right-4 top-1/2 text-3xl text-gray-300 hover:text-blue-500"
            aria-label="Cảm nhận sau"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
