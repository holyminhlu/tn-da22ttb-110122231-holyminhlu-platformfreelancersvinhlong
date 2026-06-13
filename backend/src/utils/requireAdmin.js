const { verifyAccessToken } = require("./authTokens");

function requireAdmin(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return null;
  const role = String(payload.role || "").toLowerCase();
  if (role !== "admin" && role !== "administrator") {
    res.status(403).json({ message: "Chỉ tài khoản quản trị viên được truy cập." });
    return null;
  }
  return payload;
}

module.exports = { requireAdmin };
