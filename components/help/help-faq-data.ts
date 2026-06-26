export type HelpRole = "employer" | "freelancer";

export type HelpFaqLink = {
  label: string;
  href: string;
};

export type HelpFaqItem = {
  id: string;
  question: string;
  /** Một hoặc nhiều đoạn trả lời */
  answer: string | string[];
  links?: HelpFaqLink[];
  keywords?: string[];
};

export type HelpCategory = {
  id: string;
  title: string;
  desc: string;
  items: HelpFaqItem[];
};

export function isHelpRole(value: string): value is HelpRole {
  return value === "employer" || value === "freelancer";
}

export function getCategoriesForRole(role: HelpRole): HelpCategory[] {
  return role === "employer" ? EMPLOYER_FAQ_CATEGORIES : FREELANCER_FAQ_CATEGORIES;
}

export function getCategoryById(role: HelpRole, categoryId: string): HelpCategory | undefined {
  return getCategoriesForRole(role).find((c) => c.id === categoryId);
}

export function searchHelpFaqs(
  role: HelpRole,
  query: string,
): { category: HelpCategory; item: HelpFaqItem }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: { category: HelpCategory; item: HelpFaqItem }[] = [];

  for (const category of getCategoriesForRole(role)) {
    for (const item of category.items) {
      const answerText = Array.isArray(item.answer) ? item.answer.join(" ") : item.answer;
      const hay = [
        category.title,
        category.desc,
        item.question,
        answerText,
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      if (hay.includes(q)) {
        results.push({ category, item });
      }
    }
  }

  return results;
}

/** Khách hàng (employer trong route /help/employer) */
export const EMPLOYER_FAQ_CATEGORIES: HelpCategory[] = [
  {
    id: "about-vlc",
    title: "Về Vĩnh Long Connect",
    desc: "Giới thiệu nền tảng, vai trò và cách bắt đầu",
    items: [
      {
        id: "what-is-vlc",
        question: "Vĩnh Long Connect là gì?",
        answer: [
          "Vĩnh Long Connect (VLC) là nền tảng kết nối Khách hàng (người thuê) và Freelancer tại Vĩnh Long.",
          "Bạn có thể đăng tin tuyển dụng, tìm freelancer, chốt báo giá, thanh toán qua Escrow (SafePay) và quản lý đơn hàng trên một hệ thống thống nhất.",
        ],
        links: [
          { label: "Cách VLC hoạt động", href: "/how-vlc-works" },
          { label: "Tại sao chọn VLC", href: "/why-vlc" },
        ],
      },
      {
        id: "client-vs-freelancer",
        question: "Khách hàng và Freelancer khác nhau thế nào?",
        answer:
          "Khi đăng ký bạn chọn một vai trò: Khách hàng đăng việc, thuê người và thanh toán; Freelancer tạo hồ sơ, gửi báo giá và nhận việc. Mỗi tài khoản gắn một vai trò — hãy chọn đúng nhu cầu của bạn.",
        links: [{ label: "Đăng ký", href: "/dang-ky" }],
      },
      {
        id: "platform-fee",
        question: "Phí nền tảng là bao nhiêu?",
        answer:
          "Khi giải ngân cho Freelancer sau nghiệm thu, hệ thống áp dụng hoa hồng nền tảng khoảng 10% trên phần thu nhập giải ngân. Khách hàng nạp Escrow theo giá thỏa thuận trên đơn — không phát sinh phí ẩn ngoài chính sách hiển thị trên đơn hàng.",
        links: [{ label: "Điều khoản dịch vụ", href: "/dieu-khoan-dich-vu" }],
      },
    ],
  },
  {
    id: "account",
    title: "Tài khoản & đăng nhập",
    desc: "Đăng ký, đăng nhập Google, mật khẩu và cài đặt",
    items: [
      {
        id: "register-login",
        question: "Làm sao để tạo tài khoản Khách hàng?",
        answer: [
          "Vào Đăng ký, chọn vai trò Khách hàng, nhập họ tên, email và mật khẩu đủ mạnh.",
          "Bạn cũng có thể đăng nhập bằng Google — sau đó bổ sung mật khẩu VLC tại Tên đăng nhập & mật khẩu nếu muốn đăng nhập bằng email.",
        ],
        links: [
          { label: "Đăng ký", href: "/dang-ky" },
          { label: "Đăng nhập", href: "/dang-nhap" },
        ],
      },
      {
        id: "forgot-password",
        question: "Quên mật khẩu hoặc không đăng nhập được?",
        answer:
          "Nếu dùng Google, hãy đăng nhập qua Google. Nếu đã đặt mật khẩu VLC, kiểm tra email đăng nhập đúng và Caps Lock. Vẫn không vào được — liên hệ hỗ trợ kèm email tài khoản.",
        links: [{ label: "Liên hệ", href: "/lien-he" }],
      },
      {
        id: "account-settings",
        question: "Đổi email, mật khẩu hoặc ngôn ngữ ở đâu?",
        answer:
          "Vào Cài đặt tài khoản (menu tài khoản → Chỉnh sửa tài khoản): đổi email/mật khẩu tại Tên đăng nhập & mật khẩu; bật thông báo và ngôn ngữ tại Cài đặt; quản lý phiên đăng nhập tại Bảo mật.",
        links: [
          { label: "Cài đặt tài khoản", href: "/edit-account/cai-dat" },
          { label: "Bảo mật", href: "/edit-account/bao-mat" },
        ],
      },
      {
        id: "deactivate-account",
        question: "Tạm khóa hoặc xóa tài khoản?",
        answer: [
          "Tại Bảo mật tài khoản, cuối trang có Tạm khóa (nhập DEACTIVATE) hoặc Xóa vĩnh viễn (nhập DELETE).",
          "Tạm khóa chặn đăng nhập đến khi liên hệ hỗ trợ mở lại. Xóa tài khoản ẩn danh hóa email và không thể hoàn tác.",
        ],
        links: [{ label: "Bảo mật tài khoản", href: "/edit-account/bao-mat" }],
      },
    ],
  },
  {
    id: "identity",
    title: "Xác minh danh tính",
    desc: "IDV, giấy tờ, thẻ và duyệt hồ sơ Admin",
    items: [
      {
        id: "why-idv",
        question: "Tại sao phải xác minh danh tính?",
        answer:
          "Xác minh giúp bảo vệ giao dịch: đăng tin việc, nhắn tin/thuê freelancer, nạp tiền Escrow và một số thao tác thanh toán yêu cầu hồ sơ đã duyệt. Hồ sơ gồm thông tin cá nhân, giấy tờ, xác minh liên hệ và (nếu cần) thẻ thanh toán.",
        links: [{ label: "Xác minh danh tính", href: "/edit-account/xac-minh" }],
        keywords: ["idv", "duyệt", "giấy tờ"],
      },
      {
        id: "idv-steps",
        question: "Các bước xác minh gồm những gì?",
        answer: [
          "1) Điền thông tin cá nhân và địa chỉ.",
          "2) Xác minh số điện thoại / email liên hệ.",
          "3) Tải ảnh giấy tờ (CMND/CCCD) và ảnh chân dung nếu được yêu cầu.",
          "4) Thêm thẻ (chỉ lưu 4 số cuối, không lưu CVV) và gửi hồ sơ chờ Admin duyệt.",
        ],
        links: [{ label: "Bắt đầu xác minh", href: "/edit-account/xac-minh" }],
      },
      {
        id: "idv-pending",
        question: "Hồ sơ đang chờ duyệt — tôi làm gì?",
        answer:
          "Trạng thái pending nghĩa là Admin đang xem xét. Bạn sẽ thấy thông báo trong ứng dụng khi được duyệt hoặc bị từ chối. Nếu bị từ chối, mở lại Xác minh để bổ sung theo ghi chú.",
      },
      {
        id: "idv-rejected",
        question: "Bị từ chối xác minh thì sao?",
        answer:
          "Đọc lý do trong thông báo hoặc trang xác minh, chỉnh sửa thông tin/ảnh không rõ hoặc sai và gửi lại. Một số tính năng (đăng việc, nhắn tin) sẽ khóa cho đến khi hồ sơ approved.",
      },
    ],
  },
  {
    id: "post-job",
    title: "Đăng tin & tuyển dụng",
    desc: "Đăng job, báo giá và chọn freelancer",
    items: [
      {
        id: "how-post-job",
        question: "Làm sao đăng tin tuyển dụng?",
        answer:
          "Chỉ tài khoản Khách hàng: vào Thuê → Đăng tin (hoặc /hire/post), điền tiêu đề, mô tả, ngân sách, địa điểm/hình thức làm việc và đăng. Freelancer sẽ gửi báo giá; bạn xem tại Thuê → Báo giá.",
        links: [
          { label: "Đăng tin tuyển dụng", href: "/hire/post" },
          { label: "Danh sách báo giá", href: "/hire/quotes" },
        ],
      },
      {
        id: "review-quotes",
        question: "Xem và so sánh báo giá ở đâu?",
        answer:
          "Vào Thuê → Báo giá để xem đề xuất từ freelancer. Mở từng báo giá để đọc nội dung, trao đổi tin nhắn và (nếu có) dùng gợi ý AI so sánh ứng viên. Chấp nhận báo giá phù hợp để tạo hợp đồng.",
        links: [{ label: "Báo giá", href: "/hire/quotes" }],
      },
      {
        id: "hire-service-package",
        question: "Thuê qua gói dịch vụ (gig) khác đăng job thế nào?",
        answer:
          "Tìm freelancer tại Tìm Freelancer, mở hồ sơ và đặt gói dịch vụ trực tiếp. Đơn đi qua cùng quy trình 5 giai đoạn Escrow như hợp đồng từ job. Đơn dịch vụ quản lý tại Thuê → Đơn hàng dịch vụ.",
        links: [
          { label: "Tìm Freelancer", href: "/freelancers" },
          { label: "Đơn hàng dịch vụ", href: "/hire/orders" },
        ],
      },
      {
        id: "quote-sla",
        question: "Báo giá / đơn hết hạn khi nào?",
        answer: [
          "Giai đoạn 1 — chờ báo giá: tối đa 7 ngày, hết hạn đơn có thể đóng (expired).",
          "Sau khi freelancer gửi đề xuất — bạn có tối đa 7 ngày để chấp nhận.",
          "Sau khi chấp nhận — tối đa 5 ngày để nạp Escrow, nếu không nạp đơn expired và chưa trừ tiền.",
        ],
        keywords: ["sla", "hết hạn", "7 ngày", "5 ngày"],
      },
    ],
  },
  {
    id: "workflow-sla",
    title: "Quy trình đơn hàng & SLA",
    desc: "5 giai đoạn làm việc, Escrow và thời hạn tự động",
    items: [
      {
        id: "five-workflow-stages",
        question: "Một đơn việc tuyển hoặc dịch vụ đi qua những giai đoạn nào?",
        answer: [
          "Mọi hợp đồng từ job hoặc gói dịch vụ đều đi qua 5 giai đoạn workflow thống nhất trên WorkRoom:",
          "Giai đoạn 1 — Tiếp cận & chốt thỏa thuận: freelancer gửi báo giá/đề xuất, hai bên trao đổi, bạn chấp nhận để tạo hợp đồng.",
          "Giai đoạn 2 — Khởi tạo & ký quỹ Escrow: bạn nạp tiền ký quỹ; freelancer chỉ được bắt đầu khi trạng thái Funded.",
          "Giai đoạn 3 — Thực hiện & kiểm tra: freelancer làm việc, cập nhật tiến độ, gửi demo; bạn theo dõi và yêu cầu chỉnh sửa trong giới hạn gói.",
          "Giai đoạn 4 — Bàn giao & nghiệm thu: freelancer gửi bàn giao cuối; bạn kiểm tra và bấm Nghiệm thu (hoặc yêu cầu sửa).",
          "Giai đoạn 5 — Kết thúc & đánh giá: tiền Escrow giải ngân cho freelancer, hai bên có thể đánh giá công khai.",
        ],
        links: [
          { label: "Cách VLC hoạt động", href: "/how-vlc-works" },
          { label: "Phòng làm việc", href: "/manage/phong-lam-viec" },
        ],
        keywords: ["giai đoạn", "workflow", "5 giai đoạn", "việc tuyển", "dịch vụ"],
      },
      {
        id: "escrow-money-handover",
        question: "Hình thức bàn giao tiền (Escrow / SafePay) hoạt động ra sao?",
        answer: [
          "Tiền không chuyển trực tiếp cho freelancer khi bạn thanh toán. Sau khi chốt báo giá, bạn nạp ký quỹ (Escrow) vào hệ thống VLC — số tiền được giữ an toàn trên nền tảng.",
          "Freelancer chỉ bắt đầu công việc khi đơn ở trạng thái Funded (đã nạp đủ ký quỹ).",
          "Trong lúc thực hiện, tiền vẫn nằm trong Escrow — chưa giải ngân cho ai.",
          "Khi bạn nghiệm thu bàn giao (giai đoạn 4→5), hệ thống giải ngân cho freelancer (trừ hoa hồng nền tảng khoảng 10%).",
          "Nếu đơn bị hủy đúng quy trình hoặc được hoàn tiền, phần ký quỹ còn lại trả về ví VLC của bạn để dùng cho đơn tiếp theo.",
          "Trong thời gian tranh chấp, tiền Escrow bị đóng băng — không giải ngân thêm cho đến khi có quyết định.",
        ],
        links: [
          { label: "Thanh toán", href: "/payments" },
          { label: "Điều khoản — Escrow", href: "/dieu-khoan-dich-vu#escrow" },
        ],
        keywords: ["bàn giao tiền", "escrow", "safepay", "ký quỹ", "giải ngân", "funded"],
      },
      {
        id: "sla-deadlines",
        question: "Các mốc SLA (thời hạn) và xử lý tự động là gì?",
        answer: [
          "Hệ thống áp dụng thời hạn SLA để tránh đơn treo. Các mốc chính:",
          "Chờ báo giá / đề xuất (Giai đoạn 1): tối đa 7 ngày — hết hạn đơn có thể đóng (expired).",
          "Sau khi freelancer gửi đề xuất: bạn có tối đa 7 ngày để chấp nhận.",
          "Chờ nạp Escrow (Giai đoạn 2): tối đa 5 ngày — hết hạn đơn expired, chưa trừ tiền.",
          "Freelancer phản hồi yêu cầu hủy & hoàn tiền: 2 ngày — không phản hồi có thể tự động hoàn 100% cho bạn.",
          "Chờ nghiệm thu sau bàn giao: 7 ngày — không phản hồi có thể tự động nghiệm thu và giải ngân.",
          "Bổ sung bằng chứng tranh chấp: 2 ngày trước khi Admin xem xét.",
          "Nhắc trước hết hạn (48 giờ / 24 giờ) có thể hiển thị trên đơn hàng.",
        ],
        links: [{ label: "Điều khoản — SLA", href: "/dieu-khoan-dich-vu#sla" }],
        keywords: ["sla", "hết hạn", "tự động", "7 ngày", "5 ngày", "2 ngày"],
      },
      {
        id: "refund-scenarios-detail",
        question: "Hoàn tiền trong các tình huống cụ thể?",
        answer: [
          "Trước khi nạp Escrow: hủy đơn thường không cần hoàn vì chưa trừ tiền.",
          "Sau khi nạp Escrow, giai đoạn thực hiện: gửi yêu cầu hủy & hoàn tiền — freelancer có 2 ngày phản hồi.",
          "Chưa có tiến độ + lý do chính đáng: hoàn 100% ký quỹ về ví VLC.",
          "Đã có tiến độ + lý do chính đáng: có thể chia 50% — 50% giữa hoàn cho bạn và thanh toán phần việc đã làm.",
          "Hủy không chính đáng: có thể phạt 10%–25% (mặc định 15%) cộng thanh toán phần công việc freelancer đã hoàn thành.",
          "Sau khi nghiệm thu và giải ngân: hoàn tiền chỉ qua tranh chấp hoặc thỏa thuận với hỗ trợ Admin.",
        ],
        links: [
          { label: "Quản lý hoàn tiền", href: "/manage/hoan-tien" },
          { label: "Điều khoản — Hoàn tiền", href: "/dieu-khoan-dich-vu#cancel-refund" },
        ],
        keywords: ["hoàn tiền", "hủy đơn", "100%", "50%", "phạt"],
      },
      {
        id: "dispute-scenarios-detail",
        question: "Tranh chấp xảy ra khi nào và được xử lý thế nào?",
        answer: [
          "Nên mở tranh chấp khi hai bên không thống nhất về chất lượng, phạm vi công việc, bàn giao, hoặc khi phản đối yêu cầu hủy của đối phương.",
          "Mở tranh chấp từ giao diện đơn hàng — trong lúc tranh chấp, tiền Escrow không giải ngân thêm.",
          "Trao đổi tại Trung tâm giải quyết, đính kèm bằng chứng (tin nhắn, file, demo).",
          "Mỗi bên có 2 ngày bổ sung chứng cứ trước khi chuyển Admin VLC xem xét.",
          "Admin có thể: hoàn toàn phần cho bạn, giải ngân cho freelancer, hoặc chia tỷ lệ theo đánh giá công bằng.",
          "Hết lượt revision mà vẫn không đạt thỏa thuận: cũng có thể dùng cơ chế tranh chấp.",
        ],
        links: [
          { label: "Tranh chấp", href: "/manage/tranh-chap" },
          { label: "Điều khoản — Tranh chấp", href: "/dieu-khoan-dich-vu#disputes" },
        ],
        keywords: ["tranh chấp", "bằng chứng", "admin", "phân xử"],
      },
    ],
  },
  {
    id: "escrow",
    title: "SafePay & Escrow",
    desc: "Nạp ký quỹ, giải ngân và an toàn thanh toán",
    items: [
      {
        id: "what-escrow",
        question: "Escrow (SafePay) hoạt động thế nào?",
        answer: [
          "Sau khi chốt báo giá, bạn nạp tiền ký quỹ vào hệ thống. Tiền được giữ an toàn — freelancer chỉ bắt đầu khi trạng thái Funded.",
          "Khi nghiệm thu bàn giao, tiền được giải ngân cho freelancer (trừ hoa hồng nền tảng). Nếu hủy đúng quy trình, tiền hoàn về ví VLC của bạn.",
        ],
        links: [{ label: "Phương thức thanh toán", href: "/payments/phuong-thuc" }],
      },
      {
        id: "how-fund",
        question: "Nạp Escrow bằng cách nào?",
        answer:
          "Mở đơn hàng đang ở giai đoạn Escrow, chọn Nạp ký quỹ / Thanh toán. Thêm phương thức tại Thanh toán → Phương thức nếu chưa có. Hệ thống tích hợp cổng thanh toán (PayOS) — làm theo hướng dẫn trên màn hình đơn.",
        links: [{ label: "Thanh toán", href: "/payments" }],
      },
      {
        id: "not-funded",
        question: "Chưa nạp Escrow thì freelancer có làm việc không?",
        answer:
          "Không. Freelancer chỉ được bắt đầu thực hiện khi đơn ở trạng thái Funded. Trước đó hai bên có thể trao đổi và hủy mà thường không phát sinh hoàn tiền vì chưa trừ tiền.",
      },
      {
        id: "release-payment",
        question: "Khi nào tiền được giải ngân cho freelancer?",
        answer:
          "Sau khi bạn nghiệm thu bàn giao (giai đoạn 4→5). Nếu bạn không phản hồi trong 7 ngày sau bàn giao, hệ thống có thể tự động nghiệm thu và giải ngân theo SLA.",
        keywords: ["auto", "nghiệm thu", "7 ngày"],
      },
    ],
  },
  {
    id: "workspace",
    title: "Quản lý đơn & WorkRoom",
    desc: "Tiến độ, demo, chỉnh sửa và tin nhắn",
    items: [
      {
        id: "open-workroom",
        question: "Mở phòng làm việc (WorkRoom) ở đâu?",
        answer:
          "Vào Quản lý → Phòng làm việc hoặc mở trực tiếp từ đơn hàng dịch vụ / hợp đồng việc. Tại đây bạn theo dõi 5 giai đoạn, timeline và các nút thao tác (nạp Escrow, yêu cầu sửa, nghiệm thu…).",
        links: [{ label: "Phòng làm việc", href: "/manage/phong-lam-viec" }],
      },
      {
        id: "revisions",
        question: "Yêu cầu chỉnh sửa (revision) thế nào?",
        answer:
          "Ở giai đoạn thực hiện / bàn giao, dùng nút yêu cầu chỉnh sửa trong đơn. Số lần revision phụ thuộc gói dịch vụ hoặc thỏa thuận khi chốt báo giá. Hết lượt revision cần thỏa thuận thêm hoặc mở tranh chấp nếu không đạt thỏa thuận.",
      },
      {
        id: "messages",
        question: "Nhắn tin với freelancer?",
        answer:
          "Dùng Thuê → Tin nhắn hoặc hộp chat trong báo giá / đơn hàng. Cần xác minh danh tính đạt yêu cầu để nhắn tin với freelancer lần đầu.",
        links: [{ label: "Tin nhắn", href: "/hire/messages" }],
      },
      {
        id: "accept-delivery",
        question: "Nghiệm thu bàn giao ra sao?",
        answer:
          "Xem link demo / file bàn giao freelancer gửi, kiểm tra đúng phạm vi. Nếu ổn, bấm Nghiệm thu để chuyển sang giải ngân. Nếu còn lỗi lớn, yêu cầu chỉnh sửa trong giới hạn gói trước khi nghiệm thu.",
      },
    ],
  },
  {
    id: "refunds",
    title: "Hủy đơn & hoàn tiền",
    desc: "Yêu cầu hủy, phân bổ và SLA phản hồi",
    items: [
      {
        id: "cancel-before-escrow",
        question: "Hủy trước khi nạp Escrow?",
        answer:
          "Bạn có thể hủy / từ chối đề xuất trên đơn khi chưa Funded. Thường không phát sinh phạt hay hoàn tiền vì chưa trừ tiền từ ví.",
      },
      {
        id: "request-refund",
        question: "Yêu cầu hủy & hoàn tiền sau khi đã nạp Escrow?",
        answer:
          "Trong giai đoạn thực hiện (trước khi bàn giao hoàn tất), dùng nút yêu cầu hủy & hoàn tiền trên đơn, chọn lý do. Freelancer có 2 ngày phản hồi — im lặng có thể dẫn tới tự động duyệt hoàn 100%.",
        links: [{ label: "Quản lý hoàn tiền", href: "/manage/hoan-tien" }],
        keywords: ["hoàn tiền", "2 ngày"],
      },
      {
        id: "refund-amounts",
        question: "Mức hoàn tiền được tính thế nào?",
        answer: [
          "Chưa có tiến độ + lý do chính đáng: hoàn 100% ký quỹ về ví VLC.",
          "Đã có tiến độ + lý do chính đáng (giai đoạn 3): có thể chia 50% — 50%.",
          "Hủy không chính đáng: có thể chịu phí phạt 10%–25% (mặc định 15%) cộng phần thanh toán công việc đã làm.",
        ],
        links: [{ label: "Điều khoản — Hoàn tiền", href: "/dieu-khoan-dich-vu#cancel-refund" }],
      },
      {
        id: "legitimate-reasons",
        question: "Lý do hủy nào được coi là chính đáng?",
        answer:
          "Ví dụ: freelancer không phản hồi, dịch vụ chưa được thực hiện, chọn sai dịch vụ/gói. Đổi ý hoặc đổi phương thức thanh toán thường được xem là không chính đáng và có thể bị phạt.",
      },
    ],
  },
  {
    id: "disputes",
    title: "Tranh chấp",
    desc: "Mở tranh chấp, bằng chứng và quyết định Admin",
    items: [
      {
        id: "open-dispute",
        question: "Khi nào nên mở tranh chấp?",
        answer:
          "Khi hai bên không thống nhất về chất lượng, phạm vi, bàn giao hoặc phản đối yêu cầu hủy. Mở tranh chấp từ giao diện đơn hàng. Trong lúc tranh chấp, tiền Escrow không giải ngân thêm.",
        links: [{ label: "Tranh chấp", href: "/manage/tranh-chap" }],
      },
      {
        id: "dispute-process",
        question: "Quy trình tranh chấp diễn ra thế nào?",
        answer: [
          "Trao đổi tại Trung tâm giải quyết trên đơn, đính kèm bằng chứng nếu có.",
          "Các bên có thời hạn bổ sung chứng cứ (ví dụ 2 ngày) trước khi Admin xem xét.",
          "Admin có thể hoàn toàn phần cho bạn, giải ngân cho freelancer, hoặc chia tỷ lệ.",
        ],
      },
      {
        id: "dispute-final",
        question: "Quyết định Admin có phải quyết định cuối không?",
        answer:
          "Trên nền tảng VLC, quyết định Admin trong phạm vi Escrow là quyết định để giải phóng hoặc giữ tiền ký quỹ. Nếu không đồng ý, bạn có thể liên hệ hỗ trợ kèm mã đơn.",
        links: [{ label: "Liên hệ", href: "/lien-he" }],
      },
    ],
  },
  {
    id: "payments",
    title: "Thanh toán & ví",
    desc: "Phương thức thanh toán, ví và hóa đơn",
    items: [
      {
        id: "payment-methods",
        question: "Thêm thẻ / phương thức thanh toán?",
        answer:
          "Khách hàng: Thanh toán → Phương thức thanh toán. Hệ thống chỉ lưu 4 số cuối thẻ và hạn dùng — không lưu CVV, tuân thủ chuẩn bảo mật thanh toán.",
        links: [{ label: "Phương thức thanh toán", href: "/payments/phuong-thuc" }],
      },
      {
        id: "wallet-balance",
        question: "Số dư ví VLC dùng để làm gì?",
        answer:
          "Tiền hoàn từ Escrow về ví của bạn có thể dùng nạp đơn tiếp theo. Lịch sử giao dịch xem tại mục Thanh toán trên dashboard Khách hàng.",
        links: [{ label: "Thanh toán", href: "/payments" }],
      },
      {
        id: "deposit-failed",
        question: "Nạp tiền thất bại hoặc treo trạng thái?",
        answer:
          "Kiểm tra kết nối và thử lại. Nếu đã trừ tiền ngân hàng mà đơn chưa Funded, chờ vài phút hoặc liên hệ hỗ trợ kèm mã giao dịch / mã đơn nạp.",
        links: [{ label: "Liên hệ", href: "/lien-he" }],
      },
    ],
  },
  {
    id: "reviews",
    title: "Đánh giá & phản hồi",
    desc: "Đánh giá freelancer sau khi hoàn thành",
    items: [
      {
        id: "leave-review",
        question: "Đánh giá freelancer khi nào?",
        answer:
          "Sau khi nghiệm thu và giải ngân (giai đoạn 5), bạn có thể để lại đánh giá công khai trên đơn. Đánh giá giúp cộng đồng chọn freelancer uy tín.",
      },
      {
        id: "view-feedback",
        question: "Xem phản hồi về tài khoản của tôi?",
        answer:
          "Vào Hồ sơ → Phản hồi để xem đánh giá liên quan tài khoản Khách hàng (nếu freelancer đánh giá lại sau hợp đồng).",
        links: [{ label: "Phản hồi", href: "/ho-so/phan-hoi" }],
      },
    ],
  },
  {
    id: "support",
    title: "Hỗ trợ thêm",
    desc: "AI, liên hệ và tài liệu pháp lý",
    items: [
      {
        id: "ai-widget",
        question: "Trợ lý AI trên website là gì?",
        answer:
          "Widget chat góc màn hình hỗ trợ hướng dẫn nhanh về đăng ký, thuê freelancer, Escrow, thanh toán. AI không yêu cầu mật khẩu hay thông tin thẻ — với vấn đề phức tạp hãy dùng FAQ này hoặc liên hệ hỗ trợ.",
      },
      {
        id: "contact-human",
        question: "Liên hệ đội ngũ VLC?",
        answer:
          "Xem email, số điện thoại và địa chỉ tại trang Liên hệ. Gửi kèm email tài khoản và mã đơn (nếu có) để được hỗ trợ nhanh hơn.",
        links: [{ label: "Liên hệ", href: "/lien-he" }],
      },
      {
        id: "legal-docs",
        question: "Đọc điều khoản và chính sách bảo mật?",
        answer: "Điều khoản dịch vụ mô tả Escrow, SLA, hoàn tiền và tranh chấp. Chính sách bảo mật mô tả cách xử lý dữ liệu cá nhân.",
        links: [
          { label: "Điều khoản dịch vụ", href: "/dieu-khoan-dich-vu" },
          { label: "Chính sách bảo mật", href: "/chinh-sach-bao-mat" },
        ],
      },
    ],
  },
];

/** Freelancer */
export const FREELANCER_FAQ_CATEGORIES: HelpCategory[] = [
  {
    id: "about-vlc",
    title: "Về Vĩnh Long Connect",
    desc: "Bắt đầu làm việc trên VLC",
    items: [
      {
        id: "fl-what-is",
        question: "Freelancer trên VLC làm được gì?",
        answer: [
          "Tạo hồ sơ và gói dịch vụ, gửi báo giá cho tin tuyển dụng, nhận đơn đặt gói từ Khách hàng.",
          "Làm việc theo 5 giai đoạn Escrow, nhận giải ngân vào ví sau khi Khách hàng nghiệm thu.",
        ],
        links: [{ label: "Cách VLC hoạt động", href: "/how-vlc-works" }],
      },
      {
        id: "fl-fee",
        question: "Phí nền tảng với Freelancer?",
        answer:
          "Khoảng 10% hoa hồng trên phần thu nhập được giải ngân sau nghiệm thu. Số tiền thực nhận hiển thị trên đơn và mục Thanh toán trước khi rút.",
      },
    ],
  },
  {
    id: "account",
    title: "Tài khoản & hồ sơ",
    desc: "Đăng ký, portfolio, kỹ năng",
    items: [
      {
        id: "fl-register",
        question: "Đăng ký tài khoản Freelancer?",
        answer:
          "Chọn vai trò Freelancer khi đăng ký. Hoàn thiện hồ sơ công khai: ảnh, tiểu sử, kỹ năng, portfolio — giúp Khách hàng tin tưởng và chọn bạn.",
        links: [
          { label: "Đăng ký", href: "/dang-ky" },
          { label: "Hồ sơ của tôi", href: "/ho-so" },
        ],
      },
      {
        id: "fl-profile-tips",
        question: "Làm sao hồ sơ nổi bật hơn?",
        answer: [
          "Thêm portfolio dự án thật, mô tả rõ lĩnh vực và địa điểm.",
          "Đăng gói dịch vụ có giá và thời hạn rõ ràng tại Dịch vụ → Quản lý.",
          "Hoàn thành xác minh danh tính để được duyệt và mở đầy đủ tính năng.",
        ],
        links: [{ label: "Quản lý dịch vụ", href: "/dich-vu/quan-ly" }],
      },
    ],
  },
  {
    id: "identity",
    title: "Xác minh danh tính",
    desc: "Duyệt hồ sơ, giới hạn tài khoản",
    items: [
      {
        id: "fl-why-idv",
        question: "Freelancer cần xác minh để làm gì?",
        answer:
          "Gửi báo giá, nhận đơn, rút tiền và một số tính năng chat yêu cầu hồ sơ xác minh đã được Admin duyệt (approved).",
        links: [{ label: "Xác minh", href: "/edit-account/xac-minh" }],
      },
      {
        id: "fl-idv-reject",
        question: "Hồ sơ bị từ chối — xử lý thế nào?",
        answer:
          "Đọc ghi chú Admin, cập nhật ảnh giấy tờ rõ nét, thông tin khớp CMND/CCCD và gửi lại. Trạng thái rejected chặn duyệt các đơn mới cho đến khi sửa.",
      },
    ],
  },
  {
    id: "find-work",
    title: "Tìm việc & báo giá",
    desc: "Job, leads và đề xuất",
    items: [
      {
        id: "fl-find-jobs",
        question: "Tìm việc ở đâu?",
        answer:
          "Vào Tìm việc làm để duyệt tin tuyển dụng — lọc theo danh mục, ngân sách, địa điểm. Mở chi tiết job và gửi báo giá (proposal) kèm ngân sách và thư giới thiệu.",
        links: [{ label: "Tìm việc làm", href: "/findwork" }],
      },
      {
        id: "fl-leads",
        question: "Khách hàng tiềm năng (Leads) là gì?",
        answer:
          "Khi Khách hàng đặt gói dịch vụ của bạn và chờ đề xuất, đơn xuất hiện tại Tìm việc → Leads. Soạn đề xuất kỹ thuật, tiến độ và giá để Khách hàng xem xét.",
        links: [{ label: "Leads", href: "/findwork/leads" }],
      },
      {
        id: "fl-quote-status",
        question: "Theo dõi báo giá đã gửi?",
        answer:
          "Tìm việc → Báo giá job liệt kê đề xuất của bạn và trạng thái (chờ phản hồi, được chọn, từ chối…). Khách hàng có thể nhắn tin trước khi chốt.",
        links: [{ label: "Báo giá của tôi", href: "/findwork/quotes" }],
      },
      {
        id: "fl-cannot-quote",
        question: "Không gửi được báo giá?",
        answer: [
          "Kiểm tra: bạn đăng nhập vai trò Freelancer (Khách hàng không báo giá job người khác).",
          "Đã gửi báo giá cho job này rồi — chờ phản hồi hoặc Khách hàng đã gửi offer.",
          "Hồ sơ xác minh chưa đạt yêu cầu.",
        ],
      },
    ],
  },
  {
    id: "services",
    title: "Gói dịch vụ",
    desc: "Tạo, sửa và đăng dịch vụ",
    items: [
      {
        id: "fl-create-service",
        question: "Tạo gói dịch vụ như thế nào?",
        answer:
          "Dịch vụ → Tạo mới hoặc Quản lý: nhập tiêu đề, mô tả, ảnh, các gói giá (basic/standard/premium), thời gian giao và số lần revision. Đăng sau khi hoàn thiện — Khách hàng có thể đặt trực tiếp.",
        links: [
          { label: "Tạo dịch vụ", href: "/dich-vu/tao-moi" },
          { label: "Quản lý dịch vụ", href: "/dich-vu/quan-ly" },
        ],
      },
      {
        id: "fl-service-orders",
        question: "Đơn đặt gói dịch vụ quản lý ở đâu?",
        answer:
          "Dịch vụ → Đơn hàng dịch vụ liệt kê hợp đồng từ gig. Mở đơn để cập nhật tiến độ, gửi demo và bàn giao — cùng workflow Escrow như job.",
        links: [{ label: "Đơn hàng dịch vụ", href: "/dich-vu/don-hang" }],
      },
    ],
  },
  {
    id: "workflow-sla",
    title: "Quy trình đơn hàng & SLA",
    desc: "5 giai đoạn làm việc, Escrow và thời hạn tự động",
    items: [
      {
        id: "fl-five-workflow-stages",
        question: "Một đơn việc tuyển hoặc dịch vụ đi qua những giai đoạn nào?",
        answer: [
          "Mọi hợp đồng từ job hoặc gói dịch vụ đều đi qua 5 giai đoạn workflow thống nhất:",
          "Giai đoạn 1 — Tiếp cận & chốt thỏa thuận: bạn gửi báo giá/đề xuất, trao đổi với Khách hàng, chờ họ chấp nhận.",
          "Giai đoạn 2 — Khởi tạo & ký quỹ Escrow: chờ Khách hàng nạp ký quỹ; bạn chỉ bắt đầu khi trạng thái Funded.",
          "Giai đoạn 3 — Thực hiện & kiểm tra: làm việc, cập nhật tiến độ, gửi demo; chỉnh sửa theo phản hồi trong giới hạn revision của gói.",
          "Giai đoạn 4 — Bàn giao & nghiệm thu: gửi bàn giao cuối (file, link, hướng dẫn); Khách hàng kiểm tra và nghiệm thu.",
          "Giai đoạn 5 — Kết thúc & đánh giá: tiền Escrow giải ngân vào ví của bạn, Khách hàng có thể đánh giá công khai.",
        ],
        links: [
          { label: "Cách VLC hoạt động", href: "/how-vlc-works" },
          { label: "Hợp đồng việc", href: "/jobs" },
        ],
        keywords: ["giai đoạn", "workflow", "5 giai đoạn", "việc tuyển", "dịch vụ"],
      },
      {
        id: "fl-escrow-money-handover",
        question: "Hình thức bàn giao tiền (Escrow / SafePay) với Freelancer?",
        answer: [
          "Khách hàng nạp ký quỹ (Escrow) vào hệ thống — tiền được giữ trên nền tảng, không chuyển thẳng cho bạn ngay.",
          "Bạn chỉ nên bắt đầu công việc khi đơn ở trạng thái Funded.",
          "Trong lúc thực hiện, tiền vẫn nằm trong Escrow — chưa giải ngân.",
          "Sau khi Khách hàng nghiệm thu bàn giao, hệ thống giải ngân vào ví VLC của bạn (trừ hoa hồng nền tảng khoảng 10%).",
          "Nếu đơn bị hủy hoặc hoàn tiền, phần ký quỹ trả về ví Khách hàng theo chính sách phân bổ.",
          "Trong thời gian tranh chấp, tiền Escrow bị đóng băng — không giải ngân cho đến khi Admin ra quyết định.",
        ],
        links: [
          { label: "Thanh toán", href: "/payments" },
          { label: "Điều khoản — Escrow", href: "/dieu-khoan-dich-vu#escrow" },
        ],
        keywords: ["bàn giao tiền", "escrow", "safepay", "ký quỹ", "giải ngân", "funded"],
      },
      {
        id: "fl-sla-deadlines",
        question: "Các mốc SLA (thời hạn) ảnh hưởng đến Freelancer?",
        answer: [
          "Hệ thống áp dụng thời hạn SLA để tránh đơn treo. Các mốc chính:",
          "Chờ bạn gửi đề xuất (Giai đoạn 1): tối đa 7 ngày — hết hạn đơn có thể đóng.",
          "Sau khi bạn gửi đề xuất: Khách hàng có tối đa 7 ngày để chấp nhận.",
          "Chờ Khách hàng nạp Escrow (Giai đoạn 2): tối đa 5 ngày — hết hạn đơn expired.",
          "Bạn phản hồi yêu cầu hủy & hoàn tiền: 2 ngày — không phản hồi có thể dẫn tới tự động hoàn 100% cho Khách hàng.",
          "Chờ Khách hàng nghiệm thu sau bàn giao: 7 ngày — không phản hồi có thể tự động nghiệm thu và giải ngân cho bạn.",
          "Bổ sung bằng chứng tranh chấp: 2 ngày trước khi Admin xem xét.",
        ],
        links: [{ label: "Điều khoản — SLA", href: "/dieu-khoan-dich-vu#sla" }],
        keywords: ["sla", "hết hạn", "tự động", "7 ngày", "5 ngày", "2 ngày"],
      },
      {
        id: "fl-refund-scenarios-detail",
        question: "Hoàn tiền ảnh hưởng đến Freelancer thế nào?",
        answer: [
          "Trước khi nạp Escrow: hủy đơn thường không phát sinh hoàn tiền vì chưa có ký quỹ.",
          "Khách hàng yêu cầu hủy sau khi đã nạp Escrow: bạn có 2 ngày để đồng ý, phản đối hoặc trao đổi.",
          "Chưa có tiến độ + lý do chính đáng: Khách hàng có thể được hoàn 100% ký quỹ.",
          "Đã có tiến độ + lý do chính đáng: có thể chia 50% — 50% giữa hoàn cho Khách hàng và thanh toán phần việc bạn đã làm.",
          "Hủy không chính đáng: bạn có thể nhận phần phạt (10%–25%) cộng thanh toán công việc đã hoàn thành.",
          "Sau khi nghiệm thu và giải ngân: hoàn tiền chỉ qua tranh chấp hoặc quyết định Admin.",
        ],
        links: [
          { label: "Yêu cầu hoàn tiền", href: "/dich-vu/hoan-tien" },
          { label: "Điều khoản — Hoàn tiền", href: "/dieu-khoan-dich-vu#cancel-refund" },
        ],
        keywords: ["hoàn tiền", "hủy đơn", "100%", "50%", "phạt"],
      },
      {
        id: "fl-dispute-scenarios-detail",
        question: "Tranh chấp — Freelancer cần làm gì?",
        answer: [
          "Tranh chấp mở khi hai bên không thống nhất về chất lượng, phạm vi, bàn giao, hoặc khi phản đối yêu cầu hủy.",
          "Trong lúc tranh chấp, tiền Escrow không giải ngân — hãy phản hồi đúng hạn tại Trung tâm giải quyết.",
          "Đính kèm bằng chứng: tin nhắn, file, demo, mô tả tiến độ đã hoàn thành.",
          "Bạn có 2 ngày bổ sung chứng cứ trước khi Admin VLC xem xét.",
          "Admin có thể: hoàn toàn phần cho Khách hàng, giải ngân cho bạn, hoặc chia tỷ lệ.",
          "Hết lượt revision mà vẫn không đạt thỏa thuận: Khách hàng có thể mở tranh chấp — hãy chuẩn bị bằng chứng đầy đủ.",
        ],
        links: [
          { label: "Tranh chấp", href: "/dich-vu/tranh-chap" },
          { label: "Điều khoản — Tranh chấp", href: "/dieu-khoan-dich-vu#disputes" },
        ],
        keywords: ["tranh chấp", "bằng chứng", "admin", "phân xử"],
      },
    ],
  },
  {
    id: "escrow",
    desc: "Funded, tiến độ và bàn giao",
    items: [
      {
        id: "fl-wait-funded",
        question: "Khi nào được bắt đầu làm?",
        answer:
          "Chỉ khi Khách hàng nạp Escrow và đơn chuyển trạng thái Funded. Trước đó hãy trao đổi làm rõ yêu cầu; đừng bắt đầu công việc lớn khi chưa có ký quỹ.",
      },
      {
        id: "fl-progress-demo",
        question: "Cập nhật tiến độ và gửi demo?",
        answer:
          "Trong WorkRoom / đơn hàng: cập nhật mô tả tiến độ, đính kèm link staging để Khách hàng kiểm tra. Phản hồi chỉnh sửa trong giới hạn revision của gói.",
        links: [{ label: "Hợp đồng việc", href: "/jobs" }],
      },
      {
        id: "fl-deliver",
        question: "Bàn giao công việc?",
        answer:
          "Khi hoàn thành, gửi bàn giao (file, link, hướng dẫn) qua đơn. Khách hàng nghiệm thu hoặc yêu cầu sửa. Sau nghiệm thu, tiền giải ngân vào ví Freelancer của bạn.",
      },
    ],
  },
  {
    id: "refunds",
    title: "Hủy & hoàn tiền",
    desc: "Phản hồi yêu cầu hủy từ Khách hàng",
    items: [
      {
        id: "fl-refund-request",
        question: "Khách hàng yêu cầu hủy — tôi làm gì?",
        answer:
          "Bạn có 2 ngày để đồng ý, phản đối hoặc trao đổi thêm trên đơn. Không phản hồi có thể dẫn tới tự động hoàn 100% cho Khách hàng. Xem chi tiết phân bổ tại Dịch vụ → Hoàn tiền hoặc đơn hàng.",
        links: [{ label: "Yêu cầu hoàn tiền", href: "/dich-vu/hoan-tien" }],
      },
      {
        id: "fl-penalty",
        question: "Phí phạt khi Khách hàng hủy ngang?",
        answer:
          "Hủy không chính đáng có thể chia tiền gồm phần phạt (10%–25% giá trị đơn) và thanh toán phần việc bạn đã làm. Số liệu preview hiển thị trên đơn trước khi chấp nhận.",
      },
    ],
  },
  {
    id: "disputes",
    title: "Tranh chấp",
    desc: "Bằng chứng và Trung tâm giải quyết",
    items: [
      {
        id: "fl-dispute-open",
        question: "Khách hàng mở tranh chấp?",
        answer:
          "Tham gia trao đổi tại Trung tâm giải quyết trên đơn, cung cấp bằng chứng (tin nhắn, file, demo). Phản hồi đúng hạn để tránh quyết định bất lợi.",
        links: [{ label: "Tranh chấp", href: "/dich-vu/tranh-chap" }],
      },
    ],
  },
  {
    id: "payments",
    title: "Thanh toán & rút tiền",
    desc: "Ví, PIN rút tiền và ngân hàng",
    items: [
      {
        id: "fl-wallet",
        question: "Tiền giải ngân vào đâu?",
        answer:
          "Sau nghiệm thu, Escrow giải ngân vào ví VLC của bạn. Xem số dư và lịch sử tại Thanh toán trên dashboard Freelancer.",
        links: [{ label: "Thanh toán", href: "/payments" }],
      },
      {
        id: "fl-payout-account",
        question: "Liên kết tài khoản nhận tiền?",
        answer:
          "Thêm tài khoản ngân hàng nội địa tại mục Thanh toán / Tài khoản nhận tiền. Thông tin hiển thị che một phần số tài khoản để bảo mật.",
      },
      {
        id: "fl-withdraw-pin",
        question: "Rút tiền và mã PIN?",
        answer: [
          "Thiết lập mã PIN rút tiền (băm, không lưu dạng văn bản) trước khi tạo lệnh rút.",
          "Gửi yêu cầu rút — Admin duyệt trong 24–48 giờ làm việc. Cần xác minh danh tính đạt yêu cầu.",
        ],
        keywords: ["pin", "rút tiền"],
      },
    ],
  },
  {
    id: "reviews",
    title: "Đánh giá",
    desc: "Nhận và quản lý phản hồi",
    items: [
      {
        id: "fl-reviews",
        question: "Đánh giá từ Khách hàng?",
        answer:
          "Sau khi hoàn thành đơn, Khách hàng có thể đánh giá công khai trên hồ sơ của bạn. Đánh giá tốt giúp nhận thêm đơn — xem tại Dịch vụ → Đánh giá và Hồ sơ → Phản hồi.",
        links: [{ label: "Đánh giá dịch vụ", href: "/dich-vu/danh-gia" }],
      },
    ],
  },
  {
    id: "support",
    title: "Hỗ trợ thêm",
    desc: "AI, liên hệ, pháp lý",
    items: [
      {
        id: "fl-ai",
        question: "Hỏi trợ lý AI?",
        answer:
          "Dùng widget chat trên website để hỏi nhanh về tìm việc, báo giá, Escrow. Không chia sẻ mật khẩu hay OTP qua chat.",
      },
      {
        id: "fl-contact",
        question: "Liên hệ hỗ trợ con người?",
        answer: "Trang Liên hệ có email, điện thoại và địa chỉ VLC. Gửi kèm mã đơn / email tài khoản.",
        links: [{ label: "Liên hệ", href: "/lien-he" }],
      },
    ],
  },
];

/** @deprecated — dùng EMPLOYER_FAQ_CATEGORIES */
export const EMPLOYER_CATEGORIES = EMPLOYER_FAQ_CATEGORIES.map((c) => ({
  title: c.title,
  desc: c.desc,
}));

/** @deprecated */
export const FREELANCER_CATEGORIES = FREELANCER_FAQ_CATEGORIES.map((c) => ({
  title: c.title,
  desc: c.desc,
}));
