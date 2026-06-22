export type AudienceRole = "client" | "freelancer";

import { ROUTES } from "@/lib/routes/paths";

export const HOW_VLC_HERO = {
  title: "Cách VLC hoạt động",
  subtitle:
    "Vĩnh Long Connect kết nối hai chiều giữa người thuê và freelancer. Chọn vai trò của bạn để xem hướng dẫn quy trình phù hợp.",
} as const;

export const ROLE_OPTIONS = [
  {
    id: "client" as const,
    label: "Dành cho Doanh nghiệp / Người thuê",
    shortLabel: "Người thuê",
    hint: "Tôi muốn thuê freelancer",
  },
  {
    id: "freelancer" as const,
    label: "Dành cho Freelancer / Người tìm việc",
    shortLabel: "Freelancer",
    hint: "Tôi muốn tìm việc",
  },
] as const;

export const CLIENT_STEPS = [
  {
    step: 1,
    title: "Đăng ký & xác minh danh tính",
    description:
      "Tạo tài khoản Khách hàng tại trang đăng ký. Trước khi đăng tin tuyển dụng, hoàn thành xác minh danh tính (thông tin nhận dạng và thẻ) tại trang xác minh — hệ thống sẽ mở khóa tính năng đăng việc.",
    route: "/dang-ky",
    routeLabel: "Đăng ký Khách hàng",
  },
  {
    step: 2,
    title: "Đăng việc hoặc tìm freelancer",
    description:
      "Hai cách tiếp cận: (1) Đăng tin tuyển dụng qua wizard 5 bước — thông tin cơ bản, ngân sách, địa điểm, hình ảnh, xem lại & đăng. (2) Duyệt freelancer tại Tìm Freelancer hoặc Thuê việc → Tìm kiếm, xem hồ sơ và gửi yêu cầu báo giá gói dịch vụ.",
    route: "/hire/post",
    routeLabel: "Đăng tin tuyển dụng",
  },
  {
    step: 3,
    title: "Nhận & so sánh báo giá",
    description:
      "Freelancer ứng tuyển từ trang Tìm việc và gửi báo giá kèm thư đề xuất. Bạn xem danh sách tại Thuê việc → Báo giá, lọc/sắp xếp, so sánh ngân sách và hồ sơ trước khi quyết định.",
    route: "/hire/quotes",
    routeLabel: "Xem báo giá",
  },
  {
    step: 4,
    title: "Chấp nhận báo giá & nạp ký quỹ Escrow",
    description:
      "Chấp nhận báo giá phù hợp để khởi tạo hợp đồng. Nạp tiền ký quỹ (Escrow) từ ví tại trang Thanh toán — freelancer chỉ bắt đầu khi hợp đồng ở trạng thái Funded.",
    route: "/payments",
    routeLabel: "Quản lý thanh toán",
  },
  {
    step: 5,
    title: "Theo dõi, nghiệm thu & đánh giá",
    description:
      "Quản lý tiến độ tại Quản lý / Phòng làm việc và Thuê việc → Đơn dịch vụ. Xem demo, yêu cầu chỉnh sửa, nghiệm thu bàn giao, giải ngân cho freelancer và để lại đánh giá công khai.",
    route: "/manage",
    routeLabel: "Mở quản lý công việc",
  },
] as const;

export const FREELANCER_STEPS = [
  {
    step: 1,
    title: "Đăng ký & xây dựng hồ sơ dịch vụ",
    description:
      "Tạo tài khoản Freelancer, hoàn thiện hồ sơ công khai và đăng gói dịch vụ (tiêu đề, mô tả, gói giá) tại Dịch vụ → Quản lý — giúp khách hàng tìm thấy và đặt hàng trực tiếp.",
    route: "/dang-ky",
    routeLabel: "Đăng ký Freelancer",
  },
  {
    step: 2,
    title: "Tìm việc hoặc nhận đơn từ khách hàng",
    description:
      "Duyệt tin tuyển dụng tại Tìm việc — lọc theo danh mục, ngân sách, địa điểm. Đồng thời theo dõi Khách hàng tiềm năng tại Tìm việc → Leads khi khách hàng đặt gói dịch vụ và chờ bạn gửi đề xuất.",
    route: "/findwork",
    routeLabel: "Tìm việc làm",
  },
  {
    step: 3,
    title: "Gửi báo giá / đề xuất",
    description:
      "Với tin tuyển dụng: mở chi tiết công việc, soạn thư đề xuất (proposal), nhập ngân sách và xác nhận gửi báo giá. Với đơn dịch vụ: soạn đề xuất kỹ thuật, tiến độ và ngân sách cho khách hàng xem xét.",
    route: "/findwork/quotes",
    routeLabel: "Theo dõi báo giá",
  },
  {
    step: 4,
    title: "Thực hiện sau khi khách hàng nạp ký quỹ",
    description:
      "Khi hợp đồng Funded, bắt đầu làm việc theo 5 giai đoạn: chốt thỏa thuận → ký quỹ → thực hiện & kiểm tra → bàn giao → kết thúc. Cập nhật tiến độ, gửi link demo và đóng gói bàn giao tại Tìm việc → Đơn hàng.",
    route: ROUTES.services.orders,
    routeLabel: "Xem đơn hàng",
  },
  {
    step: 5,
    title: "Nhận thanh toán & xây dựng uy tín",
    description:
      "Sau khi khách hàng nghiệm thu, tiền Escrow được giải ngân vào ví của bạn tại Thanh toán. Đánh giá công khai từ khách hàng giúp hồ sơ uy tín hơn cho các dự án tiếp theo.",
    route: "/payments",
    routeLabel: "Xem thanh toán",
  },
] as const;

export const WORKFLOW_STAGES = [
  {
    id: "selection",
    label: "Giai đoạn 1",
    title: "Tiếp cận & Chốt thỏa thuận",
    clientHint: "Chờ freelancer gửi đề xuất, trao đổi làm rõ yêu cầu rồi chấp nhận báo giá.",
    freelancerHint: "Gửi đề xuất kỹ thuật, tiến độ và ngân sách cho khách hàng.",
  },
  {
    id: "escrow",
    label: "Giai đoạn 2",
    title: "Khởi tạo hợp đồng & Ký quỹ",
    clientHint: "Nạp tiền Escrow vào sàn. Freelancer chỉ bắt đầu khi trạng thái Funded.",
    freelancerHint: "Chờ khách hàng nạp ký quỹ. Khi Funded bạn có thể bắt đầu làm việc.",
  },
  {
    id: "execution",
    label: "Giai đoạn 3",
    title: "Thực hiện & Kiểm tra",
    clientHint: "Theo dõi tiến độ, xem demo staging, yêu cầu chỉnh sửa trong giới hạn gói.",
    freelancerHint: "Cập nhật tiến độ, gửi link demo. Điều chỉnh theo phản hồi khách hàng.",
  },
  {
    id: "delivery",
    label: "Giai đoạn 4",
    title: "Bàn giao & Nghiệm thu",
    clientHint: "Kiểm tra sản phẩm cuối, báo lỗi nếu có, sau đó nghiệm thu.",
    freelancerHint: "Đóng gói bàn giao (mã nguồn, tài liệu, triển khai) và gửi cho khách hàng.",
  },
  {
    id: "completion",
    label: "Giai đoạn 5",
    title: "Kết thúc & Đánh giá",
    clientHint: "Giải ngân cho freelancer và để lại đánh giá công khai.",
    freelancerHint: "Chờ khách hàng giải ngân và đánh giá.",
  },
] as const;

export const HOW_VLC_CTA = {
  client: {
    title: "Sẵn sàng thuê freelancer?",
    subtitle: "Đăng tin tuyển dụng miễn phí và nhận báo giá từ freelancer tại Vĩnh Long.",
    primary: { label: "Đăng tin tuyển dụng", href: "/hire/post" },
    secondary: { label: "Tìm Freelancer", href: "/freelancers" },
  },
  freelancer: {
    title: "Sẵn sàng bắt đầu làm việc tự do?",
    subtitle: "Khám phá cơ hội việc làm hoặc tạo tài khoản để gửi báo giá ngay hôm nay.",
    primary: { label: "Tìm việc", href: "/findwork" },
    secondary: { label: "Đăng ký", href: "/dang-ky" },
  },
} as const;
