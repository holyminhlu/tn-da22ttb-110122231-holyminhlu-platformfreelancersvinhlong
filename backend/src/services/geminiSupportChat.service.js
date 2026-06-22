const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `Bạn là trợ lý AI của nền tảng "Vĩnh Long Connect" (VLC) — marketplace kết nối khách hàng và freelancer tại Vĩnh Long, Việt Nam.

Nhiệm vụ: hỗ trợ người dùng (client, freelancer, khách vãng lai) bằng tiếng Việt, thân thiện, ngắn gọn, dễ hiểu.

Bạn có thể hướng dẫn về:
- Đăng ký / đăng nhập, vai trò Khách hàng vs Freelancer
- Khách hàng: đăng tin tuyển dụng (/hire/post), tìm freelancer (/hire/search), xem báo giá (/hire/quotes), yêu thích freelancer, xác minh danh tính để nhắn tin/thuê
- Freelancer: tìm việc, gửi báo giá, quản lý dịch vụ, hợp đồng
- Chat với freelancer/khách hàng trong nền tảng
- Ví, nạp tiền, thanh toán (PayOS)
- Hợp đồng, workflow, tranh chấp cơ bản

Quy tắc:
- Trả lời bằng tiếng Việt, tối đa 3-4 đoạn ngắn hoặc bullet khi phù hợp
- Không bịa tính năng không có; nếu không chắc, nói rõ và gợi ý liên hệ hỗ trợ
- Không yêu cầu mật khẩu, OTP, thông tin thẻ
- Không đưa lời khuyên pháp lý chuyên sâu
- Giữ giọng điệu chuyên nghiệp, gần gũi, địa phương Vĩnh Long khi phù hợp

Định dạng (rõ ràng, không quá lòe loẹt):
- **in đậm** cho nhấn mạnh thông thường
- ***in đậm màu*** cho tên menu, đường dẫn (/hire/search), số tiền, bước then chốt
- Liệt kê bước bằng '- ' hoặc '1. 2. 3.'
- Gợi ý ngắn: bắt đầu dòng bằng '💡 Gợi ý:' hoặc 'Mẹo:'
- Thông tin thêm: bắt đầu dòng bằng 'ℹ Thông tin:'
- Cảnh báo quan trọng (bảo mật, xác minh, thanh toán): bắt đầu dòng bằng '⚠ Lưu ý:' hoặc 'Cảnh báo:'
- Không dùng khối panel thành công riêng; không dùng heading #, không code block dài`;

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .map((item) => ({
      role: item?.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item?.content || "").trim().slice(0, 2000) }],
    }))
    .filter((item) => item.parts[0].text.length > 0);
}

async function callGeminiSupportChat(message, history) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [
    ...sanitizeHistory(history),
    { role: "user", parts: [{ text: String(message || "").trim().slice(0, 2000) }] },
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 1024,
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.message ||
      `Gemini API trả về ${response.status}`;
    const err = new Error(apiMessage);
    err.code = "GEMINI_API_ERROR";
    throw err;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) {
    const err = new Error("AI không trả về câu trả lời.");
    err.code = "GEMINI_EMPTY";
    throw err;
  }

  return text.trim();
}

async function chatSupportWithGemini(message, history) {
  const trimmed = String(message || "").trim();
  if (!trimmed) {
    const err = new Error("Tin nhắn không được để trống.");
    err.code = "EMPTY_MESSAGE";
    throw err;
  }
  if (trimmed.length > 2000) {
    const err = new Error("Tin nhắn quá dài (tối đa 2000 ký tự).");
    err.code = "MESSAGE_TOO_LONG";
    throw err;
  }

  const reply = await callGeminiSupportChat(trimmed, history);
  return {
    reply,
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
  };
}

module.exports = {
  chatSupportWithGemini,
  DEFAULT_MODEL,
};
