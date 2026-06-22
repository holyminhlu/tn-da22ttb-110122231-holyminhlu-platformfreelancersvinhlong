export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
  /** Mục nhấn mạnh cảnh báo — icon đỏ */
  emphasis?: "default" | "warning" | "danger";
};

export const TERMS_META = {
  title: "Điều khoản dịch vụ",
  subtitle:
    "Quy định sử dụng nền tảng **Vĩnh Long Connect (VLC)** — áp dụng cho **Khách hàng**, **Freelancer** và **khách truy cập website**.",
  effectiveDate: "21/06/2025",
} as const;

/** Nội dung bám theo workflow SLA, Escrow, hoàn tiền & tranh chấp trong mã nguồn dự án. */
export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "acceptance",
    title: "1. Chấp nhận điều khoản",
    paragraphs: [
      "Khi đăng ký tài khoản, đăng nhập hoặc sử dụng bất kỳ tính năng nào trên **Vĩnh Long Connect** (sau đây gọi là “**Nền tảng**”, “**VLC**”), bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi **Điều khoản dịch vụ** này cùng **Chính sách bảo mật**.",
      "Nếu bạn không đồng ý, vui lòng !!ngừng sử dụng Nền tảng!!. VLC có thể cập nhật điều khoản; phiên bản mới có hiệu lực khi đăng trên website. Việc **tiếp tục sử dụng** sau khi cập nhật được coi là **chấp nhận thay đổi**.",
    ],
  },
  {
    id: "roles",
    title: "2. Vai trò người dùng",
    paragraphs: [
      "Nền tảng kết nối hai nhóm chính: **Khách hàng** (người thuê / doanh nghiệp) và **Freelancer** (người cung cấp dịch vụ). Mỗi tài khoản gắn với **một vai trò** khi đăng ký; một số thao tác chỉ khả dụng khi hồ sơ và **xác minh danh tính** đạt yêu cầu.",
      "Bạn chịu trách nhiệm bảo mật **thông tin đăng nhập**, **mật khẩu**, **mã PIN rút tiền** (nếu có) và !!mọi hoạt động phát sinh từ tài khoản của mình!!.",
    ],
    bullets: [
      "**Khách hàng**: đăng tin tuyển dụng, tìm freelancer, chấp nhận báo giá, nạp ký quỹ, nghiệm thu và thanh toán.",
      "**Freelancer**: tạo hồ sơ, gói dịch vụ, gửi báo giá / đề xuất, thực hiện công việc và nhận giải ngân sau nghiệm thu.",
      "**Tài khoản quản trị (Admin)**: xử lý duyệt hồ sơ, hoàn tiền, tranh chấp và rút tiền theo quy trình nội bộ.",
    ],
  },
  {
    id: "identity",
    title: "3. Xác minh danh tính & duyệt hồ sơ",
    emphasis: "warning",
    paragraphs: [
      "Trước khi thực hiện một số giao dịch quan trọng (ví dụ: đăng việc, gửi báo giá, rút tiền), người dùng có thể phải hoàn thành quy trình **xác minh danh tính** gồm thông tin cá nhân, xác minh liên hệ, thẻ thanh toán và gửi hồ sơ để **Admin duyệt**.",
      "VLC có quyền **từ chối**, **tạm khóa** hoặc yêu cầu bổ sung hồ sơ nếu thông tin không đầy đủ, không chính xác hoặc có dấu hiệu vi phạm. Thời gian duyệt hồ sơ phụ thuộc khối lượng yêu cầu; **thông báo trong ứng dụng** sẽ cập nhật trạng thái cho bạn.",
    ],
  },
  {
    id: "contracts",
    title: "4. Hợp đồng & quy trình năm giai đoạn",
    paragraphs: [
      "Đơn dịch vụ / hợp đồng trên VLC đi qua **năm giai đoạn workflow**: (1) Tiếp cận & chốt thỏa thuận, (2) Khởi tạo & ký quỹ Escrow, (3) Thực hiện & kiểm tra, (4) Bàn giao & nghiệm thu, (5) Kết thúc & đánh giá.",
      "Giá thỏa thuận, phạm vi công việc, **số lần chỉnh sửa (revision)** và thời hạn được ghi nhận trong hợp đồng / gói dịch vụ tại thời điểm hai bên chấp nhận. Khách hàng yêu cầu chỉnh sửa trong giới hạn gói; khi **hết lượt revision**, các bên cần thỏa thuận bổ sung hoặc sử dụng **cơ chế tranh chấp** nếu không đạt được thống nhất.",
    ],
    bullets: [
      "**Giai đoạn 1 — Selection**: Freelancer gửi đề xuất; Khách hàng trao đổi và chấp nhận báo giá.",
      "**Giai đoạn 2 — Escrow**: Khách hàng nạp tiền ký quỹ; Freelancer chỉ bắt đầu khi trạng thái **Funded**.",
      "**Giai đoạn 3 — Execution**: Thực hiện công việc, cập nhật tiến độ, xem demo.",
      "**Giai đoạn 4 — Delivery**: Freelancer bàn giao; Khách hàng kiểm tra, yêu cầu sửa hoặc nghiệm thu.",
      "**Giai đoạn 5 — Completion**: Giải ngân cho Freelancer; đánh giá công khai (không bắt buộc).",
    ],
  },
  {
    id: "escrow",
    title: "5. SafePay & ký quỹ (Escrow)",
    paragraphs: [
      "VLC cung cấp cơ chế giữ tiền an toàn (**SafePay / Escrow**): số tiền Khách hàng nạp được **giữ trên hệ thống** cho đến khi đơn hàng đạt điều kiện giải ngân hoặc được hoàn trả theo quy định.",
      "!!Tiền chưa nạp Escrow không được coi là đã thanh toán cho Freelancer.!! Trong giai đoạn chờ nạp ký quỹ, đơn có thể **hết hạn theo SLA** mà không phát sinh hoàn tiền (vì chưa trừ tiền từ ví Khách hàng).",
      "Khi giải ngân, **hoa hồng nền tảng** hiện được áp dụng ở mức khoảng **10%** trên phần thu nhập giải ngân cho Freelancer, trừ khi có thông báo chính sách phí khác trên Nền tảng.",
    ],
  },
  {
    id: "sla",
    title: "6. Thời hạn SLA & xử lý tự động",
    emphasis: "warning",
    paragraphs: [
      "Để tránh đơn hàng treo, hệ thống áp dụng **thời hạn (SLA)** và có thể **tự động hủy**, **hoàn tiền** hoặc **nghiệm thu** khi hết hạn. Các mốc chính (theo cấu hình hiện tại của Nền tảng):",
    ],
    bullets: [
      "Chờ đề xuất / báo giá (Giai đoạn 1): tối đa **7 ngày** — hết hạn có thể đóng đơn (**expired**).",
      "Chờ Khách hàng chấp nhận đề xuất: tối đa **7 ngày** kể từ khi Freelancer gửi — hết hạn đơn có thể expired.",
      "Chờ nạp Escrow (Giai đoạn 2): tối đa **5 ngày** — hết hạn đơn expired, **chưa trừ tiền**.",
      "Khách hàng yêu cầu hủy & hoàn tiền khi đã nạp Escrow: Freelancer có **2 ngày** phản hồi — nếu không phản hồi, hệ thống có thể !!tự động duyệt hoàn tiền 100% cho Khách hàng!!.",
      "Chờ nghiệm thu sau bàn giao: tối đa **7 ngày** — nếu Khách hàng không phản hồi, hệ thống có thể **tự động nghiệm thu và giải ngân**.",
      "Tranh chấp / phản đối hủy: các bên có thời hạn bổ sung bằng chứng (ví dụ **2 ngày**) trước khi chuyển **Admin** xem xét.",
    ],
    note: "**Nhắc trước hết hạn** (48 giờ / 24 giờ) có thể hiển thị trên giao diện đơn hàng. Email thông báo SLA có thể được bổ sung trong các phiên bản sau.",
  },
  {
    id: "cancel-refund",
    title: "7. Hủy đơn & hoàn tiền",
    paragraphs: [
      "Trước khi nạp Escrow, Khách hàng hoặc Freelancer có thể hủy / rút đề xuất / từ chối theo nút thao tác trên đơn; thường **không phát sinh phạt uy tín hay hoàn tiền** vì chưa có ký quỹ.",
      "Sau khi đã nạp Escrow, Khách hàng có thể gửi **yêu cầu hủy & hoàn tiền** trong giai đoạn thực hiện (trước khi bàn giao hoàn tất). Freelancer có thể đồng ý, phản đối hoặc im lặng trong **thời hạn SLA**.",
      "Mức hoàn tiền phụ thuộc giai đoạn đơn, mức độ tiến độ công việc và **tính chính đáng** của lý do hủy. Hệ thống phân loại gợi ý như sau:",
    ],
    bullets: [
      "Lý do thường được xem là **chính đáng**: nhà cung cấp không phản hồi, dịch vụ chưa được thực hiện, chọn sai dịch vụ / gói.",
      "Lý do thường được xem là **không chính đáng / hủy ngang**: đổi ý, thay đổi phương thức thanh toán; lý do khác có thể cần Admin xem xét.",
      "Chưa có tiến độ + lý do chính đáng (ở giai đoạn Escrow hoặc Execution): hoàn **100%** ký quỹ về ví VLC của Khách hàng.",
      "Đã có tiến độ + lý do chính đáng ở Giai đoạn 3: có thể chia **50%** cho Khách hàng và **50%** cho Freelancer (chưa trừ hoa hồng nền tảng trên phần hiển thị chia).",
      "Hủy không chính đáng: Khách hàng có thể chịu phí phạt khoảng !!10%–25%!! (mặc định **15%**) trên giá trị đơn, cộng thêm phần thanh toán công việc đã làm (nếu có); phần còn lại hoàn về ví Khách hàng.",
    ],
    note: "Số tiền hoàn / giải ngân thực tế được **ghi nhận trên hệ thống thanh toán** và có thể được Admin điều chỉnh trong trường hợp đặc biệt.",
  },
  {
    id: "disputes",
    title: "8. Tranh chấp & phân xử",
    emphasis: "warning",
    paragraphs: [
      "Khi hai bên không thống nhất (chất lượng, phạm vi, bàn giao, phản đối yêu cầu hủy…), Khách hàng hoặc Freelancer có thể **mở tranh chấp** từ giao diện đơn hàng. Trong thời gian tranh chấp, !!tiền Escrow không được giải ngân thêm!! cho đến khi có quyết định.",
      "**Admin VLC** xem xét bằng chứng, lịch sử trao đổi và chính sách hoàn tiền để ra quyết định, bao gồm nhưng không giới hạn: hoàn tiền toàn phần cho Khách hàng, giải ngân cho Freelancer, bác tranh chấp để tiếp tục đơn, hoặc phân chia theo tỷ lệ thỏa thuận / đánh giá công bằng.",
      "Quyết định của Admin trong phạm vi nền tảng là !!quyết định cuối cùng!! để giải phóng hoặc giữ tiền ký quỹ trên hệ thống VLC.",
    ],
  },
  {
    id: "payments",
    title: "9. Thanh toán, ví & rút tiền",
    paragraphs: [
      "Giao dịch trên Nền tảng sử dụng **đồng Việt Nam (VND)** qua **ví VLC** và các cổng thanh toán được tích hợp. Khách hàng nạp tiền để nạp Escrow; Freelancer nhận giải ngân vào ví sau nghiệm thu.",
      "Yêu cầu **rút tiền** về tài khoản ngân hàng có thể yêu cầu xác minh danh tính, liên kết tài khoản nhận tiền và **mã PIN rút tiền** (đối với Freelancer). Lệnh rút tiền do **Admin duyệt** theo quy trình chống rửa tiền và an toàn hệ thống.",
      "VLC không chịu trách nhiệm cho sai sót do người dùng nhập **sai thông tin ngân hàng** hoặc do ngân hàng / đối tác thanh toán trung gian xử lý chậm.",
    ],
  },
  {
    id: "conduct",
    title: "10. Hành vi bị cấm",
    emphasis: "danger",
    paragraphs: ["Người dùng cam kết **không**:"],
    bullets: [
      "!!Cung cấp thông tin giả mạo, mạo danh hoặc lừa đảo!! trong hồ sơ, báo giá hoặc bàn giao.",
      "!!Thao túng đánh giá, spam tin nhắn, quấy rối!! hoặc vi phạm pháp luật Việt Nam.",
      "!!Chuyển giao dịch trái phép ra ngoài Nền tảng!! nhằm trốn phí hoặc trốn cơ chế Escrow.",
      "!!Can thiệp trái phép vào hệ thống, tài khoản người khác!! hoặc dữ liệu của Nền tảng.",
    ],
  },
  {
    id: "account-lifecycle",
    title: "11. Tạm khóa & xóa tài khoản",
    paragraphs: [
      "Bạn có thể **tạm khóa tài khoản** hoặc yêu cầu **xóa vĩnh viễn** tại mục **Bảo mật tài khoản**. Tạm khóa ngăn đăng nhập cho đến khi được hỗ trợ kích hoạt lại; xóa tài khoản ẩn danh hóa dữ liệu cá nhân theo quy trình kỹ thuật và !!không thể hoàn tác!!.",
      "VLC và Admin có quyền **khóa tài khoản** (status rejected) khi phát hiện vi phạm điều khoản, gian lận hoặc theo yêu cầu cơ quan có thẩm quyền.",
    ],
  },
  {
    id: "liability",
    title: "12. Giới hạn trách nhiệm",
    paragraphs: [
      "VLC là **nền tảng trung gian** kết nối Khách hàng và Freelancer. Hợp đồng dịch vụ cụ thể là thỏa thuận giữa hai bên; VLC không đảm bảo chất lượng công việc ngoài cơ chế **Escrow**, **hoàn tiền** và **tranh chấp** đã mô tả.",
      "Trong phạm vi pháp luật cho phép, VLC **không chịu trách nhiệm** cho thiệt hại gián tiếp, mất lợi nhuận hoặc gián đoạn kinh doanh phát sinh từ việc sử dụng hoặc không thể sử dụng Nền tảng.",
    ],
  },
  {
    id: "support",
    title: "13. Hỗ trợ & liên hệ",
    paragraphs: [
      "Thắc mắc về đơn hàng, hoàn tiền hoặc tranh chấp: sử dụng **Trung tâm giải quyết / WorkRoom** trên đơn tương ứng hoặc mục **Trợ giúp** trên website.",
      "Khi cần hỗ trợ kích hoạt lại tài khoản tạm khóa hoặc khiếu nại quyết định Admin, vui lòng liên hệ **đội ngũ VLC** qua kênh hỗ trợ chính thức được công bố trên Nền tảng.",
    ],
  },
];
