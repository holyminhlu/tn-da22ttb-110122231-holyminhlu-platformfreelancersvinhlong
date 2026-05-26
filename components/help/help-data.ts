export type HelpCategoryItem = {
  title: string;
  desc: string;
};

export type HelpRole = "employer" | "freelancer";

/** Lưới 3×4 — ô trống cuối giống mẫu help2.html */
export const EMPLOYER_CATEGORIES: (HelpCategoryItem | null)[] = [
  {
    title: "Về Vĩnh Long Connected",
    desc: "Cách hoạt động, chi phí, bảo mật",
  },
  {
    title: "Tài khoản của bạn",
    desc: "Tạo tài khoản, quản lý tài khoản, phương thức thanh toán, xây dựng nhóm",
  },
  {
    title: "Xác minh danh tính",
    desc: "Giới thiệu xác minh, nộp giấy tờ, duyệt hồ sơ, giới hạn tài khoản",
  },
  {
    title: "Đăng tin việc",
    desc: "Cách đăng tin, tin nổi bật, trạng thái tin, sửa/đăng lại, dừng nhận báo giá",
  },
  {
    title: "Thuê Freelancer",
    desc: "Tìm freelancer, xem báo giá, trao đổi, chọn và thuê freelancer",
  },
  {
    title: "Hợp đồng",
    desc: "Điều khoản thanh toán, tính năng bổ sung, chỉnh sửa và kết thúc hợp đồng",
  },
  {
    title: "Quản lý công việc",
    desc: "WorkRoom, cập nhật tiến độ, SafePay, tin nhắn, kết thúc việc",
  },
  {
    title: "Thanh toán",
    desc: "Phương thức thanh toán, tài khoản tiền, hóa đơn, báo cáo",
  },
  {
    title: "Phản hồi",
    desc: "Giới thiệu phản hồi, quản lý đánh giá",
  },
  {
    title: "SafePay",
    desc: "Giới thiệu SafePay, nạp tiền, giải ngân",
  },
  {
    title: "Trọng tài",
    desc: "Yêu cầu trọng tài, bổ sung chứng cứ, phán quyết, chi phí",
  },
  null,
];

export const FREELANCER_CATEGORIES: (HelpCategoryItem | null)[] = [
  {
    title: "Về Vĩnh Long Connected",
    desc: "Cách hoạt động, phí dịch vụ, bảo mật thông tin",
  },
  {
    title: "Tài khoản của bạn",
    desc: "Hồ sơ, kỹ năng, portfolio, cài đặt tài khoản",
  },
  {
    title: "Xác minh danh tính",
    desc: "Xác minh email, giấy tờ, giới hạn tài khoản",
  },
  {
    title: "Tìm việc & ứng tuyển",
    desc: "Tìm việc, gửi báo giá, theo dõi đơn ứng tuyển",
  },
  {
    title: "Dịch vụ của bạn",
    desc: "Tạo gói dịch vụ, giá, thời hạn giao hàng",
  },
  {
    title: "Hợp đồng",
    desc: "Nhận việc, điều khoản, chỉnh sửa và hoàn thành hợp đồng",
  },
  {
    title: "Quản lý công việc",
    desc: "WorkRoom, cập nhật tiến độ, giao file, tin nhắn khách hàng",
  },
  {
    title: "Thanh toán & thu nhập",
    desc: "Rút tiền, hóa đơn, lịch sử giao dịch",
  },
  {
    title: "Phản hồi",
    desc: "Nhận và phản hồi đánh giá từ khách hàng",
  },
  {
    title: "SafePay",
    desc: "Nhận tiền qua SafePay, giải ngân an toàn",
  },
  {
    title: "Trọng tài",
    desc: "Khiếu nại, bổ sung bằng chứng, quyết định trọng tài",
  },
  null,
];

export function isHelpRole(value: string): value is HelpRole {
  return value === "employer" || value === "freelancer";
}
