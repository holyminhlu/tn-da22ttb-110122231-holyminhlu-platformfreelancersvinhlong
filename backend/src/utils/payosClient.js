const { PayOS } = require("@payos/node");

function readEnv(name) {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : "";
}

function isTruthyEnv(name) {
  const value = readEnv(name).toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function isPayosConfigured() {
  const clientId = readEnv("PAYOS_CLIENT_ID");
  const apiKey = readEnv("PAYOS_API_KEY");
  const checksumKey = readEnv("PAYOS_CHECKSUM_KEY");
  return Boolean(
    clientId &&
      apiKey &&
      checksumKey &&
      clientId !== "your-payos-client-id" &&
      apiKey !== "your-payos-api-key",
  );
}

/** Credentials kênh Chi hộ — có thể tách riêng PAYOS_PAYOUT_* hoặc dùng chung PAYOS_*. */
function getPayosPayoutCredentials() {
  const clientId = readEnv("PAYOS_PAYOUT_CLIENT_ID") || readEnv("PAYOS_CLIENT_ID");
  const apiKey = readEnv("PAYOS_PAYOUT_API_KEY") || readEnv("PAYOS_API_KEY");
  const checksumKey = readEnv("PAYOS_PAYOUT_CHECKSUM_KEY") || readEnv("PAYOS_CHECKSUM_KEY");
  return { clientId, apiKey, checksumKey };
}

/**
 * Chi hộ (payout) tách biệt kênh Thu hộ trên payOS.
 * Chỉ gọi API payout thật khi PAYOS_PAYOUT_ENABLED=true và có đủ key.
 */
function isPayosPayoutConfigured() {
  if (!isTruthyEnv("PAYOS_PAYOUT_ENABLED")) return false;
  const { clientId, apiKey, checksumKey } = getPayosPayoutCredentials();
  return Boolean(
    clientId &&
      apiKey &&
      checksumKey &&
      clientId !== "your-payos-client-id" &&
      apiKey !== "your-payos-api-key",
  );
}

function mapPayosPayoutError(message) {
  const text = String(message || "").toLowerCase();
  if (text.includes("api key") || text.includes("client") || text.includes("không tồn tại")) {
    return (
      "Kênh Chi hộ payOS chưa được kích hoạt hoặc API Key chi hộ chưa đúng. " +
      "Trên my.payos.vn: bật Kênh chi, lấy Client ID / API Key / Checksum Key chi hộ, " +
      "rồi đặt PAYOS_PAYOUT_ENABLED=true trong .env (có thể dùng PAYOS_PAYOUT_CLIENT_ID, PAYOS_PAYOUT_API_KEY, PAYOS_PAYOUT_CHECKSUM_KEY)."
    );
  }
  return message || "Không thể gửi lệnh chi hộ payOS.";
}

let payosClient = null;

function getPayosClient() {
  if (!isPayosConfigured()) {
    throw new Error("payOS chưa được cấu hình. Điền PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env.");
  }
  if (!payosClient) {
    payosClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return payosClient;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function getPayosWebhookUrl() {
  if (process.env.PAYOS_WEBHOOK_URL) {
    return process.env.PAYOS_WEBHOOK_URL.trim();
  }
  const port = Number(process.env.PORT) || 5000;
  const base = process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  return `${base.replace(/\/+$/, "")}/api/payments/payos-webhook`;
}

function getPayosPayoutWebhookUrl() {
  if (process.env.PAYOS_PAYOUT_WEBHOOK_URL) {
    return process.env.PAYOS_PAYOUT_WEBHOOK_URL.trim();
  }
  const port = Number(process.env.PORT) || 5000;
  const base = process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  return `${base.replace(/\/+$/, "")}/api/payments/payos-payout-webhook`;
}

function buildPayosDescription(orderCode) {
  const text = `Nap vi VLC ${orderCode}`;
  return text.length <= 25 ? text : text.slice(0, 25);
}

module.exports = {
  isPayosConfigured,
  isPayosPayoutConfigured,
  getPayosPayoutCredentials,
  mapPayosPayoutError,
  getPayosClient,
  getFrontendUrl,
  getPayosWebhookUrl,
  getPayosPayoutWebhookUrl,
  buildPayosDescription,
};
