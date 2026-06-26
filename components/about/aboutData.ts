export const ABOUT_INTRO = {
  title: "Giới thiệu về Vĩnh Long Connect",
  subtitle:
    "Nền tảng kết nối trực tuyến hàng đầu giúp doanh nghiệp tìm kiếm nhân tài và freelancer tìm kiếm cơ hội làm việc tự do — bắt nguồn từ Vĩnh Long, phục vụ cộng đồng địa phương và vươn ra toàn quốc.",
  mission: {
    title: "Sứ mệnh",
    description:
      "Kết nối chủ việc và freelancer một cách minh bạch, an toàn và hiệu quả — giúp mọi người làm việc tự do có cơ hội phát triển nghề nghiệp bền vững, đồng thời hỗ trợ doanh nghiệp tiếp cận nguồn nhân lực chất lượng với chi phí tối ưu.",
  },
  vision: {
    title: "Tầm nhìn",
    description:
      "Xây dựng một cộng đồng làm việc tự do uy tín, chất lượng cao — bắt nguồn từ Vĩnh Long và mở rộng ra toàn quốc, trở thành nền tảng freelance Việt Nam được tin dùng nhất.",
  },
} as const;

export const WHY_CHOOSE = [
  {
    audience: "Doanh nghiệp",
    icon: "building" as const,
    highlights: [
      "Tiếp cận nguồn nhân lực chất lượng, được xác minh và đánh giá công khai",
      "Chi phí tối ưu với phí nền tảng minh bạch, thanh toán bằng VND",
      "Hệ thống quản lý công việc trực tuyến — theo dõi tiến độ từng giai đoạn",
      "Thanh toán an toàn qua SafePay (ký quỹ escrow) bảo vệ cả hai bên",
    ],
  },
  {
    audience: "Freelancer",
    icon: "user" as const,
    highlights: [
      "Đa dạng dự án từ thiết kế, lập trình đến marketing và dịch vụ địa phương",
      "Bảo vệ quyền lợi thanh toán — giải ngân khi nghiệm thu công việc",
      "Xây dựng hồ sơ uy tín với đánh giá và lịch sử hợp đồng công khai",
      "Cơ hội phát triển nghề nghiệp và mở rộng mạng lưới khách hàng",
    ],
  },
] as const;

export const STORY = {
  title: "Câu chuyện hình thành",
  intro:
    "Vĩnh Long Connect ra đời từ một quan sát đơn giản: tại Vĩnh Long và Đồng bằng sông Cửu Long, có rất nhiều người làm nghề tự do tài năng nhưng thiếu kênh kết nối uy tín với doanh nghiệp và hộ kinh doanh địa phương.",
  body:
    "Đội ngũ sáng lập — những người con quê Vĩnh Long, am hiểu cả thị trường lao động tự do lẫn nhu cầu số hóa của doanh nghiệp vùng — quyết định xây dựng một nền tảng vừa dễ dùng, vừa đảm bảo minh bạch trong mọi giao dịch. Từ ý tưởng ban đầu trên giấy, qua nhiều vòng phỏng vấn người dùng và thử nghiệm, VLC dần hình thành với sứ mệnh phục vụ cộng đồng địa phương trước, mở rộng sau.",
  milestones: [
    {
      year: "3/2026",
      title: "Khởi nguồn ý tưởng",
      description: "Khảo sát nhu cầu freelancer và doanh nghiệp tại Vĩnh Long, xác định khoảng trống thị trường.",
    },
    {
      year: "4/2026",
      title: "Phát triển & thử nghiệm",
      description: "Xây dựng MVP, thử nghiệm nội bộ với nhóm freelancer và chủ việc đầu tiên.",
    },
    {
      year: "6/2026",
      title: "Ra mắt chính thức",
      description: "Công bố nền tảng Vĩnh Long Connect, mở rộng dịch vụ và cộng đồng người dùng.",
    },
  ],
} as const;

export const CORE_VALUES = [
  {
    icon: "transparency" as const,
    title: "Minh bạch",
    description: "Rõ ràng trong mọi thỏa thuận, báo giá và chi phí — không phí ẩn, không giao dịch mập mờ.",
  },
  {
    icon: "security" as const,
    title: "Bảo mật",
    description: "An toàn dữ liệu cá nhân và thanh toán qua hệ thống ký quỹ SafePay được mã hóa.",
  },
  {
    icon: "quality" as const,
    title: "Chất lượng",
    description: "Freelancer được kiểm duyệt hồ sơ; đánh giá công khai giúp bạn chọn đúng người phù hợp.",
  },
  {
    icon: "community" as const,
    title: "Cộng đồng",
    description: "Ưu tiên phát triển cộng đồng làm việc tự do bền vững, gắn kết tại Vĩnh Long và vùng lân cận.",
  },
] as const;

export const TEAM_MEMBERS = [
  {
    name: "Hồ Lý Minh Lữ",
    role: "Nhà sáng lập",
    bio: "Sinh viên Đại học Trà Vinh, người sáng lập và phát triển Vĩnh Long Connect — nền tảng kết nối freelancer với doanh nghiệp địa phương tại quê hương Vĩnh Long.",
    image: "/Logo/z6891119899306_be17912d506be2e8067f870ec57769d2.jpg",
  },
] as const;

export const ABOUT_CTA = {
  title: "Sẵn sàng bắt đầu với Vĩnh Long Connect?",
  subtitle: "Dù bạn là nhà tuyển dụng hay freelancer — chúng tôi có giải pháp phù hợp cho bạn.",
  actions: [
    { label: "Tìm Freelancer", href: "/freelancers", variant: "primary" as const },
    { label: "Tìm việc", href: "/findwork", variant: "secondary" as const },
    { label: "Đăng ký", href: "/dang-ky", variant: "outline" as const },
  ],
} as const;
