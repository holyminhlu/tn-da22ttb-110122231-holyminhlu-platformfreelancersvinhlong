export const WHY_VLC_HERO = {
  slogan: "Kết nối nhân tài thực chất – Kiến tạo thành công bền vững.",
  description:
    "Vĩnh Long Connected mang đến môi trường làm việc tự do minh bạch, chuyên nghiệp và an toàn — nơi doanh nghiệp tìm đúng người, freelancer nhận đúng việc và được trả đúng tiền.",
} as const;

export const CLIENT_BENEFITS = [
  {
    icon: "talent" as const,
    title: "Tiếp cận nhân tài dễ dàng",
    description:
      "Mạng lưới freelancer được kiểm duyệt hồ sơ, xác minh danh tính và đánh giá công khai — giúp bạn chọn đúng người có năng lực thực chất tại Vĩnh Long và khu vực lân cận.",
  },
  {
    icon: "cost" as const,
    title: "Tối ưu chi phí & thời gian",
    description:
      "Không mất chi phí tuyển dụng truyền thống. Đăng tin miễn phí, nhận báo giá nhanh và chốt hợp đồng chỉ trong vài giờ thay vì vài tuần.",
  },
  {
    icon: "manage" as const,
    title: "Quản lý linh hoạt",
    description:
      "Theo dõi tiến độ qua Work Agreements rõ ràng, phòng làm việc trực tuyến và quy trình 5 giai đoạn — từ chốt thỏa thuận đến nghiệm thu bàn giao.",
  },
] as const;

export const FREELANCER_BENEFITS = [
  {
    icon: "projects" as const,
    title: "Nguồn việc làm chất lượng",
    description:
      "Đa dạng dự án từ thiết kế, lập trình, marketing đến dịch vụ địa phương — từ hộ kinh doanh, doanh nghiệp nhỏ đến khách hàng uy tín trên nền tảng.",
  },
  {
    icon: "safepay" as const,
    title: "Bảo vệ thu nhập tối đa",
    description:
      "Không còn nỗi lo bị \"bùng tiền\" nhờ SafePay — client nạp ký quỹ Escrow trước, bạn nhận giải ngân sau khi nghiệm thu công việc.",
  },
  {
    icon: "fee" as const,
    title: "Phí dịch vụ cạnh tranh",
    description:
      "Phí nền tảng minh bạch, thanh toán bằng VND — mức chiết khấu cạnh tranh, thấp hơn nhiều nền tảng quốc tế, giúp bạn giữ nhiều thu nhập hơn.",
  },
] as const;

export const USPS = [
  {
    icon: "local" as const,
    title: "Tính địa phương & Toàn quốc",
    description:
      "Bắt đầu từ thấu hiểu thị trường lao động Vĩnh Long và ĐBSCL — hỗ trợ sát sao, giao tiếp thuận tiện, đồng thời mở rộng cơ hội việc làm ra toàn quốc.",
  },
  {
    icon: "support" as const,
    title: "Hỗ trợ 24/7",
    description:
      "Đội ngũ chăm sóc khách hàng sẵn sàng qua email và hotline — giải quyết thắc mắc, tranh chấp nhanh chóng và công bằng cho cả hai bên.",
  },
  {
    icon: "trust" as const,
    title: "Minh bạch & An toàn",
    description:
      "Mọi thỏa thuận, báo giá và giao dịch đều có lịch sử rõ ràng trên nền tảng — ký quỹ Escrow bảo vệ quyền lợi từng bước.",
  },
] as const;

export const SOCIAL_STATS = [
  { icon: "users" as const, value: "2.500+", label: "Freelancer đang hoạt động" },
  { icon: "invoice" as const, value: "8.000+", label: "Dự án đã hoàn thành" },
  { icon: "money" as const, value: "6,25 tỷ ₫", label: "Đã thanh toán qua nền tảng" },
  { icon: "thumbs" as const, value: "99%", label: "Mức hài lòng khách hàng", highlight: true },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Chúng tôi cần thiết kế logo và fanpage trong 3 ngày — đăng tin trên VLC, nhận 5 báo giá và chốt freelancer địa phương ngay trong chiều. Tiết kiệm cả thời gian lẫn chi phí so với thuê agency.",
    name: "Chị Nguyễn Thị Mai",
    role: "Chủ hộ kinh doanh thời trang, Vĩnh Long",
    type: "client" as const,
  },
  {
    quote:
      "Làm freelance 2 năm, tôi từng gặp client trả chậm. Từ khi dùng SafePay trên VLC, mọi hợp đồng đều có ký quỹ trước — tôi yên tâm làm việc và tập trung vào chất lượng sản phẩm.",
    name: "Anh Trần Minh Đức",
    role: "Freelancer thiết kế đồ họa",
    type: "freelancer" as const,
  },
  {
    quote:
      "Đội hỗ trợ phản hồi nhanh khi có tranh chấp nhỏ về phạm vi công việc. Cảm giác được đứng về phía công bằng — không phải nền tảng lớn mà bỏ rơi người dùng địa phương.",
    name: "Anh Lê Văn Hùng",
    role: "Giám đốc DN công nghệ, Cần Thơ",
    type: "client" as const,
  },
] as const;

export const WHY_VLC_CTA = {
  title: "Bắt đầu hành trình cùng Vĩnh Long Connected",
  subtitle: "Dù bạn cần thuê người hay tìm việc — nền tảng sẵn sàng đồng hành.",
  client: { label: "Đăng tin tuyển dụng", href: "/hire/post" },
  freelancer: { label: "Tìm việc", href: "/findwork" },
} as const;
