const { requireAdmin } = require("../utils/requireAdmin");
const {
  getGeminiAdminSettings,
  saveGeminiAdminSettings,
  testGeminiConnection,
} = require("../services/geminiConfig.service");

async function getAdminAiSettings(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    const settings = await getGeminiAdminSettings();
    return res.json(settings);
  } catch (error) {
    console.error("getAdminAiSettings failed:", error.message);
    return res.status(500).json({ message: "Không thể tải cấu hình Gemini." });
  }
}

async function patchAdminAiSettings(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const apiKey = req.body?.apiKey;
  const model = req.body?.model;
  const clearApiKey = req.body?.clearApiKey === true;

  if (apiKey === undefined && model === undefined && !clearApiKey) {
    return res.status(400).json({ message: "Không có thay đổi nào để lưu." });
  }

  try {
    const settings = await saveGeminiAdminSettings(
      { apiKey, model, clearApiKey },
      payload.email || payload.sub || null,
    );
    return res.json({
      message: "Đã lưu cấu hình Gemini. Áp dụng ngay, không cần khởi động lại.",
      settings,
    });
  } catch (error) {
    if (error.code === "INVALID_MODEL") {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    console.error("patchAdminAiSettings failed:", error.message);
    return res.status(500).json({ message: "Không thể lưu cấu hình Gemini." });
  }
}

async function postAdminAiSettingsTest(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  try {
    const result = await testGeminiConnection();
    return res.json({
      message: "Kết nối Gemini thành công.",
      ...result,
    });
  } catch (error) {
    if (error.code === "GEMINI_NOT_CONFIGURED") {
      return res.status(503).json({
        message: "Chưa có API key Gemini. Nhập key mới hoặc cấu hình GEMINI_API_KEY trong .env.",
        code: error.code,
      });
    }
    if (error.code === "GEMINI_API_ERROR") {
      return res.status(502).json({
        message: error.message || "Gemini API từ chối kết nối.",
        code: error.code,
      });
    }
    console.error("postAdminAiSettingsTest failed:", error.message);
    return res.status(500).json({ message: "Không thể kiểm tra kết nối Gemini." });
  }
}

module.exports = {
  getAdminAiSettings,
  patchAdminAiSettings,
  postAdminAiSettingsTest,
};
