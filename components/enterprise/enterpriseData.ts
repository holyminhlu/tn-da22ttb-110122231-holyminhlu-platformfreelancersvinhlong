export const ENTERPRISE_HERO = {
  badge: "VLC Enterprise",
  title: "Giải pháp nhân sự toàn diện, linh hoạt và tối ưu cho quy mô doanh nghiệp của bạn.",
  description:
    "Vĩnh Long Connected Enterprise cung cấp nguồn lực chất lượng cao — giúp doanh nghiệp mở rộng quy mô dự án nhanh chóng mà không bị ràng buộc bởi các rào cản tuyển dụng truyền thống.",
} as const;

export const CORE_BENEFITS = [
  {
    icon: "talent" as const,
    title: 'Nguồn nhân tài "Top-Tier"',
    description:
      "Truy cập mạng lưới chuyên gia và freelancer đã qua quá trình kiểm duyệt khắt khe nhất — Top 1%–5% trên nền tảng, sẵn sàng cho dự án quy mô lớn.",
  },
  {
    icon: "compliance" as const,
    title: "Tuân thủ pháp lý & Hành chính",
    description:
      "Hỗ trợ xử lý hợp đồng lao động, xuất hóa đơn VAT và chứng từ thuế rõ ràng — giúp doanh nghiệp giảm thiểu rủi ro pháp lý khi làm việc với lao động tự do.",
  },
  {
    icon: "billing" as const,
    title: "Thanh toán linh hoạt & Hóa đơn gộp",
    description:
      "Consolidated Billing — thay vì thanh toán lẻ tẻ cho từng freelancer, doanh nghiệp có thể thanh toán một lần cuối tháng cho tất cả các dự án đang chạy.",
  },
] as const;

export const ADVANCED_FEATURES = [
  {
    icon: "seats" as const,
    title: "Tài khoản đa người dùng",
    description:
      "Multi-seat Accounts — nhiều quản lý và trưởng nhóm cùng truy cập, phân quyền và phối hợp trên một tài khoản công ty duy nhất.",
  },
  {
    icon: "dashboard" as const,
    title: "Bảng điều khiển & Báo cáo",
    description:
      "Custom Dashboards — báo cáo chi tiết về chi phí, thời gian làm việc và hiệu suất của các freelancer đang được thuê theo phòng ban hoặc dự án.",
  },
  {
    icon: "api" as const,
    title: "Tích hợp API",
    description:
      "Kết nối hệ thống quản lý nội bộ (ERP, HRIS) với nền tảng Vĩnh Long Connected — đồng bộ đơn hàng, hợp đồng và thanh toán tự động.",
    linkHref: "#enterprise-contact",
    linkLabel: "Liên hệ tích hợp API",
  },
] as const;

export const DEDICATED_SUPPORT = {
  title: "Dịch vụ hỗ trợ chuyên biệt",
  subtitle: "Đặc quyền Enterprise — không chỉ là nền tảng, mà là đối tác chiến lược.",
  highlights: [
    "Giám đốc Quản lý Tài khoản riêng (Dedicated Account Manager) hỗ trợ 24/7.",
    "Tư vấn chiến lược thuê freelancer phù hợp với từng giai đoạn dự án.",
    "Lọc hồ sơ và tuyển chọn freelancer thay doanh nghiệp — tiết kiệm thời gian tuyển dụng.",
    "Ưu tiên xử lý tranh chấp và hỗ trợ kỹ thuật cho tài khoản doanh nghiệp.",
  ],
} as const;

export const PARTNER_LOGOS = [
  { name: "VietTech Group", initials: "VT" },
  { name: "Mekong Logistics", initials: "ML" },
  { name: "Delta Retail", initials: "DR" },
  { name: "Sông Cửu Digital", initials: "SC" },
  { name: "VL Holdings", initials: "VH" },
  { name: "An Phát Solutions", initials: "AP" },
] as const;

export const CASE_STUDIES = [
  {
    industry: "Công nghệ & Phần mềm",
    title: "Giảm 40% thời gian tuyển dụng cho dự án mở rộng",
    summary:
      "Một công ty phần mềm tại Cần Thơ cần 8 developer trong 2 tuần. Account Manager VLC lọc và đề xuất 12 hồ sơ Top-Tier; doanh nghiệp onboard 6 freelancer trong 5 ngày, hoàn thành sprint đúng hạn.",
    metric: "40%",
    metricLabel: "thời gian tuyển dụng",
  },
  {
    industry: "Bán lẻ & Marketing",
    title: "Hóa đơn gộp giúp kiểm soát chi phí tập trung",
    summary:
      "Chuỗi bán lẻ vùng ĐBSCL thuê đồng thời 15 freelancer cho chiến dịch Tết. Consolidated Billing cuối tháng giúp phòng kế toán đối soát một lần, xuất VAT đầy đủ chứng từ.",
    metric: "15",
    metricLabel: "freelancer / chiến dịch",
  },
] as const;

export const COMPANY_SIZE_OPTIONS = [
  "50–200 nhân viên",
  "200–500 nhân viên",
  "500–1.000 nhân viên",
  "Trên 1.000 nhân viên",
] as const;
