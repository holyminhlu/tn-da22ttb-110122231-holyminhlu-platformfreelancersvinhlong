function parseUserAgent(raw) {
  const ua = String(raw || "");
  if (!ua) {
    return { label: "Thiết bị không xác định", browser: "—", os: "—" };
  }

  let os = "Hệ điều hành khác";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Trình duyệt khác";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  const mobile = /Mobile|Android|iPhone/i.test(ua);
  const device = mobile ? "Di động" : "Máy tính";

  return {
    label: `${browser} · ${os} · ${device}`,
    browser,
    os,
    device,
  };
}

module.exports = { parseUserAgent };
