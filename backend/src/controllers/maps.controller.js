const { buildRoutePreviewImage, checkMapsHealth } = require("../services/googleMapsRoute.service");

async function getMapsStatus(_req, res) {
  try {
    const status = await checkMapsHealth();
    return res.json(status);
  } catch (error) {
    console.error("Maps status failed:", error.message);
    return res.status(500).json({
      ok: false,
      message: "Không kiểm tra được trạng thái Google Maps.",
    });
  }
}

async function getRoutePreview(req, res) {
  try {
    const buffer = await buildRoutePreviewImage(req.query);
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "private, max-age=300");
    return res.send(buffer);
  } catch (error) {
    if (error.code === "MAPS_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "Chưa cấu hình GOOGLE_MAPS_API_KEY. Tạo Server API key (không giới hạn HTTP referrer) trong Google Cloud.",
        code: error.code,
      });
    }
    if (error.code === "STATIC_MAP_ERROR") {
      console.error("Google Static Maps failed:", error.message);
      return res.status(502).json({
        message:
          "Google Maps chưa sẵn sàng. Bật Billing, Maps Static API và Directions API trên Google Cloud. Chi tiết: " +
          error.message,
        code: error.code,
      });
    }
    console.error("Route preview failed:", error.message);
    return res.status(500).json({ message: "Không tạo được ảnh bản đồ." });
  }
}

module.exports = {
  getMapsStatus,
  getRoutePreview,
};
