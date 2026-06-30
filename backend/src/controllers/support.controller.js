const { chatSupportWithGemini } = require("../services/geminiSupportChat.service");

async function postAiSupportChat(req, res) {
  const message = String(req.body?.message || "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ message: "Tin nhắn không được để trống." });
  }

  try {
    const result = await chatSupportWithGemini(message, history);
    return res.json(result);
  } catch (error) {
    if (error.code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "Chưa cấu hình GEMINI_API_KEY. Thêm key tại Admin → Quản lý API key hoặc file .env.",
        code: error.code,
      });
    }
    if (error.code === "EMPTY_MESSAGE" || error.code === "MESSAGE_TOO_LONG") {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    if (error.code === "GEMINI_API_ERROR") {
      console.error("Gemini support chat failed:", error.message);
      // 503 (not 502): Cloudflare/nginx treat 502 as proxy failure and hide JSON body.
      return res.status(503).json({
        message: "Không thể kết nối AI. Kiểm tra GEMINI_API_KEY trên server và thử lại.",
        code: error.code,
        detail: error.message,
      });
    }
    console.error("Support AI chat failed:", error.message);
    return res.status(500).json({ message: "Không thể xử lý yêu cầu chat AI." });
  }
}

module.exports = {
  postAiSupportChat,
};
