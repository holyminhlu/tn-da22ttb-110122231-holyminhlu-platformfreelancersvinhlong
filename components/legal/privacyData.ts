import type { TermsSection } from "./termsData";

export const PRIVACY_META = {
  title: "Chính sách bảo mật",
  subtitle:
    "Cách **Vĩnh Long Connect (VLC)** thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu của **Khách hàng**, **Freelancer** và **khách truy cập website**.",
  effectiveDate: "21/06/2025",
} as const;

/** Nội dung bám theo auth, security, IDV, thanh toán và cài đặt tài khoản trong mã nguồn. */
export const PRIVACY_SECTIONS: TermsSection[] = [
  {
    id: "scope",
    title: "1. Phạm vi & đối tượng áp dụng",
    paragraphs: [
      "Chính sách này mô tả cách **Vĩnh Long Connect** (“**Nền tảng**”, “**VLC**”, “**chúng tôi**”) xử lý thông tin cá nhân khi bạn truy cập website, đăng ký tài khoản, sử dụng dịch vụ marketplace hoặc tương tác với hỗ trợ.",
      "Chính sách áp dụng cho mọi vai trò: **Khách hàng**, **Freelancer**, **quản trị viên** (trong phạm vi nội bộ) và **khách vãng lai** (ví dụ khi dùng widget trợ lý AI hoặc xem nội dung công khai).",
      "Khi sử dụng Nền tảng, bạn đồng thời chịu ràng buộc bởi **Điều khoản dịch vụ**. Nếu có mâu thuẫn về quyền riêng tư, chính sách này được ưu tiên trong phạm vi bảo vệ dữ liệu cá nhân.",
    ],
  },
  {
    id: "data-collected",
    title: "2. Dữ liệu chúng tôi thu thập",
    paragraphs: [
      "Tùy cách bạn sử dụng Nền tảng, VLC có thể thu thập các nhóm dữ liệu sau:",
    ],
    bullets: [
      "**Tài khoản & đăng nhập**: họ tên, email, vai trò (Khách hàng / Freelancer), mật khẩu (lưu dưới dạng **băm bcrypt**, không lưu văn bản gốc), liên kết **Google OAuth** (nếu bạn chọn đăng nhập Google).",
      "**Hồ sơ công khai & nội bộ**: tiểu sử, kỹ năng, portfolio, địa điểm, ảnh đại diện, gói dịch vụ, đánh giá — theo thông tin bạn nhập tại mục Hồ sơ / Dịch vụ.",
      "**Xác minh danh tính (IDV)**: thông tin cá nhân, giấy tờ tùy thân, địa chỉ, tọa độ địa lý (nếu bạn chọn trên bản đồ), trạng thái duyệt hồ sơ (**pending / approved / rejected**).",
      "**Thanh toán & ví**: lịch sử giao dịch Escrow, nạp/rút tiền, hóa đơn; **chỉ lưu 4 số cuối thẻ** và hạn dùng — !!không lưu CVV / mã bảo mật thẻ!!; thông tin tài khoản ngân hàng nhận tiền (Freelancer) được che một phần khi hiển thị.",
      "**Hợp đồng & trao đổi**: nội dung đơn dịch vụ, báo giá, tin nhắn chat trong nền tảng, tệp đính kèm, nhật ký tiến độ và tranh chấp.",
      "**Bảo mật & phiên đăng nhập**: địa chỉ IP, trình duyệt / thiết bị (user-agent), refresh token, **lịch sử đăng nhập** thành công và thất bại, cảnh báo đăng nhập mới (nếu bật).",
      "**Cài đặt ứng dụng**: ngôn ngữ (vi/en), giao diện sáng/tối, tùy chọn thông báo đơn hàng / tin nhắn / báo giá — lưu trên trình duyệt và (với thông báo) trên máy chủ.",
      "**Trợ lý AI**: nội dung tin nhắn bạn gửi tới widget hỗ trợ AI (tối đa vài chục tin gần nhất, giới hạn độ dài) để trả lời ngữ cảnh.",
    ],
  },
  {
    id: "purposes",
    title: "3. Mục đích sử dụng dữ liệu",
    paragraphs: ["VLC sử dụng dữ liệu để:"],
    bullets: [
      "Cung cấp và vận hành dịch vụ: đăng ký, đăng nhập, kết nối Khách hàng – Freelancer, **Escrow**, hợp đồng năm giai đoạn.",
      "Xác minh danh tính, chống gian lận, duyệt hồ sơ và đảm bảo an toàn thanh toán / rút tiền.",
      "Gửi **thông báo trong ứng dụng** theo tùy chọn của bạn (đơn hàng, tin nhắn, báo giá) và **thông báo hệ thống bắt buộc** (xác minh, bảo mật, rút tiền, kết quả duyệt).",
      "Hỗ trợ khách hàng, xử lý tranh chấp, hoàn tiền và tuân thủ nghĩa vụ pháp lý.",
      "Cải thiện trải nghiệm: gợi ý AI, thống kê ẩn danh, phát triển tính năng mới.",
    ],
  },
  {
    id: "legal-basis",
    title: "4. Cơ sở xử lý & thông báo đăng nhập",
    paragraphs: [
      "Việc xử lý dữ liệu dựa trên **thực hiện hợp đồng dịch vụ** với bạn, **lợi ích hợp pháp** (an ninh, chống lạm dụng) và, khi pháp luật yêu cầu, **sự đồng ý** (ví dụ bật cảnh báo đăng nhập, liên kết Google).",
      "Khi **cảnh báo đăng nhập mới** được bật, hệ thống so sánh IP / thiết bị với lần đăng nhập trước; nếu khác biệt, bạn có thể nhận thông báo. Bạn tắt/bật tính năng này tại **Bảo mật tài khoản**.",
    ],
  },
  {
    id: "storage-security",
    title: "5. Lưu trữ & biện pháp bảo mật",
    emphasis: "warning",
    paragraphs: [
      "Dữ liệu được lưu trên **máy chủ backend** (PostgreSQL) và một phần trên **trình duyệt** của bạn khi đăng nhập.",
    ],
    bullets: [
      "**Mật khẩu**: băm một chiều bằng **bcrypt**; VLC không lưu mật khẩu gốc.",
      "**Phiên đăng nhập**: access token (JWT) và refresh token; refresh token lưu trên server kèm IP, user-agent, thời hạn — bạn có thể **đăng xuất thiết bị khác** hoặc **tất cả phiên** tại Bảo mật.",
      "**Trình duyệt (localStorage)**: `vlc_access_token`, `vlc_refresh_token`, `vlc_current_user`, tùy chọn giao diện / ngôn ngữ / thông báo cục bộ.",
      "**Thẻ thanh toán**: mã hóa theo tiêu chuẩn **PCI DSS** khi nhập; hệ thống chỉ lưu **4 số cuối**, loại thẻ và hạn — !!không lưu CVV!!.",
      "**Mã PIN rút tiền** (Freelancer): lưu dạng băm, dùng xác nhận lệnh rút tiền.",
      "Truy cập nội bộ Admin bị giới hạn theo vai trò; log thao tác nhạy cảm có thể được ghi nhận phục vụ kiểm toán.",
    ],
    note: "Không có hệ thống nào an toàn tuyệt đối. Bạn nên dùng **mật khẩu mạnh**, không chia sẻ token đăng nhập và đăng xuất trên thiết bị dùng chung.",
  },
  {
    id: "sharing",
    title: "6. Chia sẻ với bên thứ ba",
    paragraphs: [
      "VLC **không bán** dữ liệu cá nhân. Chúng tôi chỉ chia sẻ khi cần thiết để vận hành dịch vụ:",
    ],
    bullets: [
      "**Google**: đăng nhập OAuth (email, tên, ảnh hồ sơ Google nếu bạn đồng ý).",
      "**PayOS** và đối tác thanh toán: xử lý nạp tiền, Escrow, rút tiền về ngân hàng.",
      "**Google Gemini**: nội dung chat trợ lý AI và (khi bạn dùng) so sánh báo giá — theo chính sách của Google Cloud.",
      "**Dịch vụ bản đồ / địa lý** (ví dụ Nominatim): chuyển đổi địa chỉ khi bạn chọn vị trí trong xác minh danh tính.",
      "**Cơ quan nhà nước**: khi có yêu cầu hợp pháp hoặc để bảo vệ quyền, an toàn của người dùng và Nền tảng.",
    ],
    note: "Freelancer và Khách hàng có thể thấy **hồ sơ công khai**, đánh giá và nội dung trao đổi liên quan đơn hàng — đây là tính năng cốt lõi của marketplace, không phải chia sẻ cho bên thứ ba marketing.",
  },
  {
    id: "cookies",
    title: "7. Cookie & bộ nhớ cục bộ",
    paragraphs: [
      "Website sử dụng **cookie / localStorage** chủ yếu cho chức năng thiết yếu, không dùng cookie quảng cáo bên thứ ba trong phiên bản hiện tại.",
    ],
    bullets: [
      "**Phiên đăng nhập** — duy trì trạng thái đã đăng nhập.",
      "**Tùy chọn giao diện** (`vlc_theme`) — sáng / tối / theo hệ thống.",
      "**Thông báo cục bộ** (`vlc_notification_prefs`) — bổ trợ đồng bộ với máy chủ.",
    ],
    note: "Bạn có thể xóa dữ liệu trình duyệt bất cứ lúc nào; điều này sẽ **đăng xuất** bạn và xóa tùy chọn cục bộ.",
  },
  {
    id: "rights",
    title: "8. Quyền & lựa chọn của bạn",
    paragraphs: ["Trong phạm vi pháp luật Việt Nam và khả năng kỹ thuật, bạn có thể:"],
    bullets: [
      "**Xem & cập nhật** hồ sơ, email, mật khẩu tại Cài đặt tài khoản.",
      "Thiết lập **email / số điện thoại khôi phục** và bật/tắt **cảnh báo đăng nhập** tại Bảo mật.",
      "Xem **lịch sử đăng nhập** và **quản lý phiên** (đăng xuất thiết bị khác).",
      "Tùy chỉnh **thông báo** đơn hàng, tin nhắn, báo giá (thông báo hệ thống bảo mật vẫn được gửi).",
      "**Tạm khóa tài khoản** (nhập `DEACTIVATE`) — chặn đăng nhập đến khi liên hệ hỗ trợ kích hoạt lại.",
      "**Xóa tài khoản vĩnh viễn** (nhập `DELETE`) — ẩn danh hóa email, đánh dấu `deleted_at`, thu hồi phiên; !!không thể hoàn tác!!.",
    ],
  },
  {
    id: "retention",
    title: "9. Thời gian lưu giữ",
    paragraphs: [
      "Dữ liệu được lưu **trong thời gian tài khoản còn hoạt động** và thêm một khoảng hợp lý sau đó để giải quyết tranh chấp, kế toán Escrow và tuân thủ pháp luật.",
      "Sau **xóa tài khoản**, thông tin nhận dạng trực tiếp (email) được thay bằng định danh ẩn danh; một số bản ghi giao dịch / hợp đồng có thể được **giữ lại dạng tổng hợp** phục vụ báo cáo và nghĩa vụ pháp lý.",
      "Refresh token hết hạn hoặc bị thu hồi sẽ không còn hiệu lực; log đăng nhập có thể được giới hạn số dòng hiển thị (ví dụ 30–100 mục gần nhất).",
    ],
  },
  {
    id: "children",
    title: "10. Trẻ em & người chưa đủ năng lực",
    emphasis: "danger",
    paragraphs: [
      "Nền tảng **không hướng tới** người dưới **16 tuổi**. Chúng tôi không cố ý thu thập dữ liệu trẻ em. Nếu phát hiện tài khoản vi phạm, VLC có thể **khóa hoặc xóa** sau khi xác minh.",
    ],
  },
  {
    id: "changes",
    title: "11. Cập nhật chính sách",
    paragraphs: [
      "Chúng tôi có thể cập nhật Chính sách bảo mật khi thêm tính năng mới (ví dụ **2FA**, Passkey — hiện đang lên kế hoạch) hoặc khi luật thay đổi. Ngày hiệu lực được ghi ở đầu trang.",
      "Thay đổi quan trọng sẽ được thông báo trên website hoặc trong ứng dụng. **Tiếp tục sử dụng** sau khi cập nhật đồng nghĩa bạn chấp nhận phiên bản mới.",
    ],
  },
  {
    id: "contact",
    title: "12. Liên hệ & khiếu nại",
    paragraphs: [
      "Mọi câu hỏi về quyền riêng tư, yêu cầu truy cập / chỉnh sửa / xóa dữ liệu hoặc khiếu nại xử lý thông tin cá nhân, vui lòng liên hệ **đội ngũ VLC** qua kênh hỗ trợ chính thức tại **Trợ giúp** hoặc email công bố trên Nền tảng.",
      "Bạn cũng có quyền khiếu nại tới **cơ quan quản lý nhà nước** có thẩm quyền tại Việt Nam nếu cho rằng quyền của mình bị vi phạm.",
    ],
  },
];
