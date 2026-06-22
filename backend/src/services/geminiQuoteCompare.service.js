const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const COMPARE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Tóm tắt ngắn gọn bằng tiếng Việt về bức tranh tổng thể các báo giá",
    },
    focusedFreelancer: {
      type: "object",
      properties: {
        quoteId: { type: "string" },
        name: { type: "string" },
        overallScore: { type: "number", description: "Điểm tổng hợp 0-100" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
      },
      required: ["quoteId", "name", "overallScore", "strengths", "weaknesses"],
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Tên tiêu chí, ví dụ: Giá, Kinh nghiệm" },
          focusedValue: { type: "string" },
          bestValue: { type: "string" },
          bestFreelancerName: { type: "string" },
          verdict: {
            type: "string",
            enum: ["leading", "competitive", "trailing"],
            description: "Vị trí của freelancer đang xem so với các ứng viên khác",
          },
        },
        required: ["label", "focusedValue", "bestValue", "bestFreelancerName", "verdict"],
      },
    },
    competitors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quoteId: { type: "string" },
          name: { type: "string" },
          overallScore: { type: "number" },
          oneLiner: { type: "string", description: "Một câu đánh giá ngắn" },
        },
        required: ["quoteId", "name", "overallScore", "oneLiner"],
      },
    },
    recommendation: {
      type: "object",
      properties: {
        suggestedQuoteId: { type: "string", nullable: true },
        suggestedFreelancerName: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        reasoning: { type: "string" },
        actionTips: { type: "array", items: { type: "string" } },
      },
      required: [
        "suggestedQuoteId",
        "suggestedFreelancerName",
        "confidence",
        "reasoning",
        "actionTips",
      ],
    },
  },
  required: ["summary", "focusedFreelancer", "criteria", "competitors", "recommendation"],
};

function formatAmount(quote) {
  if (quote.amount == null || quote.amount === "") return "Thỏa thuận";
  const num = Number(quote.amount);
  if (!Number.isFinite(num)) return String(quote.amount);
  const formatted = new Intl.NumberFormat("vi-VN").format(num);
  const suffix = quote.pricing_type === "hourly" ? " VND/giờ" : " VND";
  return `${formatted}${suffix}`;
}

function ratingPercent(quote) {
  if (quote.job_success_score != null && quote.job_success_score > 0) {
    return Math.min(100, Math.round(Number(quote.job_success_score)));
  }
  if (quote.rating_avg != null && quote.rating_avg > 0) {
    return Math.min(100, Math.round((Number(quote.rating_avg) / 5) * 100));
  }
  return 0;
}

function buildQuoteSnapshot(quote) {
  return {
    quoteId: quote.id,
    freelancerId: quote.freelancer_id,
    name: quote.freelancer_name || "Freelancer",
    title: quote.freelancer_title || null,
    bio: quote.freelancer_bio || null,
    location: quote.freelancer_location || null,
    amount: formatAmount(quote),
    pricingType: quote.pricing_type || "fixed",
    message: quote.message || null,
    status: quote.status,
    ratingPercent: ratingPercent(quote),
    ratingAvg: quote.rating_avg != null ? Number(quote.rating_avg) : null,
    totalReviews: Number(quote.total_reviews) || 0,
    completedJobs: Number(quote.completed_jobs) || 0,
    jobSuccessScore: quote.job_success_score != null ? Number(quote.job_success_score) : null,
    submittedAt: quote.created_at,
  };
}

function buildComparePrompt({ job, focusedQuote, allQuotes }) {
  const focused = buildQuoteSnapshot(focusedQuote);
  const others = allQuotes
    .filter((q) => q.id !== focusedQuote.id)
    .map((q) => buildQuoteSnapshot(q));

  return `Bạn là cố vấn tuyển dụng cho nền tảng freelance tại Vĩnh Long, Việt Nam.
Nhiệm vụ: so sánh freelancer đang được khách hàng xem xét với TẤT CẢ freelancer khác đã báo giá cho cùng một công việc, giúp khách hàng chọn ứng viên phù hợp nhất.

Trả lời hoàn toàn bằng tiếng Việt, khách quan, thực tế. Không bịa thông tin không có trong dữ liệu.
Nếu thiếu dữ liệu (ví dụ chưa có đánh giá), hãy nêu rõ và điều chỉnh trọng số phù hợp.

## Công việc
- Tiêu đề: ${job.title || "Không rõ"}
- Ngân sách khách hàng: ${job.budget != null ? `${Number(job.budget).toLocaleString("vi-VN")} VND` : "Chưa đặt"}
- Loại ngân sách: ${job.budget_type || "fixed"}
- Mô tả: ${job.description || "Không có mô tả chi tiết"}

## Freelancer đang xem (FOCUS)
${JSON.stringify(focused, null, 2)}

## Các freelancer khác (${others.length} báo giá)
${JSON.stringify(others, null, 2)}

## Hướng dẫn phân tích
1. So sánh giá so với ngân sách và các báo giá khác (cùng loại fixed/hourly).
2. So sánh uy tín: đánh giá, số review, việc hoàn thành, job success score.
3. Phân tích chất lượng đề xuất trong message và mức độ phù hợp với mô tả công việc.
4. Đưa ra 4-6 tiêu chí trong criteria (Giá, Kinh nghiệm, Uy tín, Nội dung đề xuất, v.v.).
5. verdict: "leading" nếu freelancer focus dẫn đầu tiêu chí đó, "competitive" nếu ngang cơ, "trailing" nếu yếu hơn.
6. Gợi ý cuối cùng có thể chọn freelancer focus HOẶC một freelancer khác nếu hợp lý hơn — luôn ghi rõ suggestedQuoteId.
7. actionTips: 2-4 gợi ý hành động cụ thể cho khách hàng (ví dụ nhắn tin hỏi thêm, đặt lịch phỏng vấn).`;
}

async function callGeminiJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error("GEMINI_NOT_CONFIGURED");
    err.code = "GEMINI_NOT_CONFIGURED";
    throw err;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: COMPARE_RESPONSE_SCHEMA,
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
    err.status = response.status;
    throw err;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error("Gemini không trả về nội dung phân tích.");
    err.code = "GEMINI_EMPTY";
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("Không thể đọc kết quả phân tích từ AI.");
    err.code = "GEMINI_PARSE";
    throw err;
  }
}

async function compareJobQuotesWithGemini({ job, focusedQuote, allQuotes }) {
  if (!focusedQuote) {
    const err = new Error("MISSING_FOCUS_QUOTE");
    err.code = "MISSING_FOCUS_QUOTE";
    throw err;
  }

  if (allQuotes.length < 2) {
    const err = new Error("Cần ít nhất 2 báo giá để so sánh.");
    err.code = "INSUFFICIENT_QUOTES";
    throw err;
  }

  const prompt = buildComparePrompt({ job, focusedQuote, allQuotes });
  const analysis = await callGeminiJson(prompt);

  return {
    model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
    job: {
      id: job.id,
      title: job.title || null,
      budget: job.budget != null ? Number(job.budget) : null,
      budget_type: job.budget_type || "fixed",
    },
    focusedQuoteId: focusedQuote.id,
    totalQuotes: allQuotes.length,
    analysis,
  };
}

module.exports = {
  compareJobQuotesWithGemini,
  DEFAULT_MODEL,
};
