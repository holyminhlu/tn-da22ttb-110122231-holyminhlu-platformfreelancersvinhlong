/** Chuẩn hóa mảng URL ảnh (tối đa 3): https/http hoặc đường dẫn upload nội bộ */
function normalizeJobImageUrls(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= 3) break;
    const u = String(item ?? "").trim();
    if (!u) continue;
    if (/^https?:\/\//i.test(u) || u.startsWith("/uploads/jobs/")) {
      out.push(u);
    }
  }
  return out;
}

const ALLOWED_SERVICE_DELIVERY_DAYS = new Set([1, 3, 5, 7, 15, 30]);

/** Ảnh minh hoạ dịch vụ (tối đa 12): https hoặc /uploads/services/ — loại URL video */
function normalizeServiceImageUrls(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= 12) break;
    const u = String(item ?? "").trim();
    if (!u) continue;
    if (!/^https?:\/\//i.test(u) && !u.startsWith("/uploads/services/")) continue;
    const pathOnly = u.split("?")[0].toLowerCase();
    if (/\.(mp4|webm|mov|ogg)(\b|$)/i.test(pathOnly)) continue;
    out.push(u);
  }
  return out;
}

/** Một URL ảnh thumbnail card — cùng quy tắc với từng phần tử media_urls */
function normalizeServiceThumbnailUrl(raw) {
  const u = String(raw ?? "").trim().slice(0, 2000);
  if (!u) return null;
  if (!/^https?:\/\//i.test(u) && !u.startsWith("/uploads/services/")) return null;
  const pathOnly = u.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov|ogg)(\b|$)/i.test(pathOnly)) return null;
  return u;
}

function inferDemoKindFromUrl(url) {
  const pathOnly = String(url || "").split("?")[0].toLowerCase();
  if (/(\.youtube\.com\/|youtu\.be\/)/i.test(url)) return "video";
  if (/\.(mp4|webm|ogg|mov)(\b|$)/i.test(pathOnly)) return "video";
  return "image";
}

/** Một video demo ngắn: chỉ lưu { url, kind: 'video' } */
function normalizeServiceDemoMedia(raw) {
  if (!raw || typeof raw !== "object") return null;
  const url = String(raw.url ?? "").trim().slice(0, 2000);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/uploads/")) return null;
  let kind = String(raw.kind ?? "").trim().toLowerCase();
  if (kind !== "image" && kind !== "video") {
    kind = inferDemoKindFromUrl(url);
  }
  if (kind !== "video") return null;
  return { url, kind: "video" };
}

/**
 * Parse & validate body tạo/cập nhật dịch vụ.
 * @returns {{ ok: true, values: object } | { ok: false, message: string }}
 */
function readServiceUpsertBody(req) {
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const price = Number(req.body?.price);
  let deliveryDays = null;
  const ddRaw = req.body?.deliveryDays;
  if (ddRaw !== undefined && ddRaw !== null && String(ddRaw).trim() !== "") {
    deliveryDays = Number(ddRaw);
    if (!ALLOWED_SERVICE_DELIVERY_DAYS.has(deliveryDays)) {
      return { ok: false, message: "Thời gian bàn giao phải là 1, 3, 5, 7, 15 hoặc 30 ngày." };
    }
  }
  const category = String(req.body?.category || "").trim().slice(0, 255);
  const requirements = String(req.body?.requirements || "").trim().slice(0, 4000);
  const supportUpsell = String(req.body?.supportUpsell || "").trim().slice(0, 255);
  const mediaUrls = normalizeServiceImageUrls(req.body?.mediaUrls);
  const thumbnailUrl = normalizeServiceThumbnailUrl(req.body?.thumbnailUrl);
  const demoMedia = normalizeServiceDemoMedia(req.body?.demoMedia);
  const techStack = Array.isArray(req.body?.techStack)
    ? req.body.techStack.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 32)
    : [];
  const faqs = Array.isArray(req.body?.faqs)
    ? req.body.faqs
        .map((row) => ({
          q: String(row?.q || "").trim().slice(0, 300),
          a: String(row?.a || "").trim().slice(0, 1200),
        }))
        .filter((row) => row.q && row.a)
        .slice(0, 20)
    : [];
  const packages = Array.isArray(req.body?.packages)
    ? req.body.packages
        .map((pack) => ({
          id: String(pack?.id || "").trim().toLowerCase().slice(0, 40),
          name: String(pack?.name || "").trim().slice(0, 60),
          price: Number(pack?.price),
          deliveryDays: Number(pack?.deliveryDays),
          revisions: String(pack?.revisions || "").trim().slice(0, 120),
          features: Array.isArray(pack?.features)
            ? pack.features.map((f) => String(f || "").trim()).filter(Boolean).slice(0, 20)
            : [],
        }))
        .filter((pack) => pack.id && pack.name && Number.isFinite(pack.price) && pack.price > 0)
        .slice(0, 3)
    : [];
  const responseTimeHoursRaw = req.body?.responseTimeHours;
  const responseTimeHours =
    responseTimeHoursRaw !== undefined && responseTimeHoursRaw !== null && responseTimeHoursRaw !== ""
      ? Number(responseTimeHoursRaw)
      : null;

  const listingStatus = String(req.body?.listingStatus || req.body?.listing_status || "")
    .trim()
    .toLowerCase();
  const isDraft = listingStatus === "draft";

  if (isDraft) {
    if (!title) {
      return { ok: false, message: "Nháp cần ít nhất tiêu đề dịch vụ." };
    }
    const draftPrice = Number.isFinite(price) && price > 0 ? price : 1000000;
    const draftDelivery =
      deliveryDays && ALLOWED_SERVICE_DELIVERY_DAYS.has(deliveryDays) ? deliveryDays : 5;
    return {
      ok: true,
      values: {
        title,
        description,
        price: draftPrice,
        deliveryDays: draftDelivery,
        category,
        requirements,
        supportUpsell,
        mediaUrls,
        thumbnailUrl,
        demoMedia,
        techStack,
        faqs,
        packages,
        responseTimeHours: responseTimeHours ?? 24,
        listingStatus: "draft",
      },
    };
  }

  if (!title || !Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "Tiêu đề và giá dịch vụ hợp lệ là bắt buộc." };
  }
  if (responseTimeHours !== null && (!Number.isFinite(responseTimeHours) || responseTimeHours <= 0)) {
    return { ok: false, message: "Thời gian phản hồi trung bình không hợp lệ." };
  }

  return {
    ok: true,
    values: {
      title,
      description,
      price,
      deliveryDays,
      category,
      requirements,
      supportUpsell,
      mediaUrls,
      thumbnailUrl,
      demoMedia,
      techStack,
      faqs,
      packages,
      responseTimeHours,
      listingStatus:
        listingStatus && ["pending", "active"].includes(listingStatus) ? listingStatus : "pending",
    },
  };
}

function buildDefaultServicePackages(price, deliveryDays) {
  const base = Math.max(500000, Number(price) || 1500000);
  const deliveryBase = Number.isFinite(Number(deliveryDays)) && Number(deliveryDays) > 0 ? Number(deliveryDays) : 5;
  return [
    {
      id: "basic",
      name: "Basic",
      price: Math.round(base * 0.7),
      deliveryDays: Math.max(2, deliveryBase - 2),
      revisions: "1 lần",
      features: ["1 trang", "Responsive cơ bản", "Bàn giao mã nguồn"],
    },
    {
      id: "standard",
      name: "Standard",
      price: Math.round(base),
      deliveryDays: deliveryBase,
      revisions: "3 lần",
      features: ["3 trang", "Responsive đầy đủ", "SEO on-page"],
    },
    {
      id: "premium",
      name: "Premium",
      price: Math.round(base * 1.5),
      deliveryDays: deliveryBase + 4,
      revisions: "Không giới hạn",
      features: ["5+ trang", "SEO kỹ thuật", "Hỗ trợ sau bàn giao 7 ngày"],
    },
  ];
}


function parseUuidParam(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return null;
  return s;
}

module.exports = {
  normalizeJobImageUrls,
  normalizeServiceImageUrls,
  normalizeServiceThumbnailUrl,
  normalizeServiceDemoMedia,
  readServiceUpsertBody,
  buildDefaultServicePackages,
  parseUuidParam,
  ALLOWED_SERVICE_DELIVERY_DAYS,
};
