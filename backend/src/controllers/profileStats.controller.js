const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");

const PERIODS = {
  "30d": {
    key: "30d",
    label: "30 ngày qua",
    eventFilter: "e.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'",
    contractFilter: "c.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'",
    chartDays: 30,
  },
  last_year: {
    key: "last_year",
    label: "Năm ngoái",
    eventFilter:
      "e.created_at >= (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year') AND e.created_at < date_trunc('year', CURRENT_DATE)",
    contractFilter:
      "c.created_at >= (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year') AND c.created_at < date_trunc('year', CURRENT_DATE)",
    chartDays: null,
  },
  all: {
    key: "all",
    label: "Mọi thời đại",
    eventFilter: "TRUE",
    contractFilter: "TRUE",
    chartDays: null,
  },
};

function parseStatsPeriod(raw) {
  const p = String(raw || "30d").toLowerCase().replace(/-/g, "_");
  if (p === "last_year" || p === "lastyear") return "last_year";
  if (p === "all" || p === "all_time") return "all";
  return "30d";
}

function countEvent(db, freelancerId, eventType, eventFilter) {
  return db.query(
    `SELECT COUNT(*)::int AS total
     FROM public.profile_analytics_events e
     WHERE e.freelancer_id = $1
       AND e.event_type = $2
       AND (${eventFilter})`,
    [freelancerId, eventType],
  );
}

async function getProfileViewsSeries(db, freelancerId, periodKey) {
  if (periodKey === "30d") {
    const result = await db.query(
      `SELECT
         gs.day::date AS day,
         COALESCE(COUNT(e.id), 0)::int AS views
       FROM generate_series(
         (CURRENT_DATE - INTERVAL '29 days')::date,
         CURRENT_DATE::date,
         '1 day'::interval
       ) AS gs(day)
       LEFT JOIN public.profile_analytics_events e
         ON e.freelancer_id = $1
        AND e.event_type = 'profile_view'
        AND e.created_at::date = gs.day::date
       GROUP BY gs.day
       ORDER BY gs.day ASC`,
      [freelancerId],
    );
    return result.rows.map((r) => ({
      date: r.day,
      views: Number(r.views) || 0,
    }));
  }

  if (periodKey === "last_year") {
    const result = await db.query(
      `SELECT
         date_trunc('month', e.created_at)::date AS month,
         COUNT(*)::int AS views
       FROM public.profile_analytics_events e
       WHERE e.freelancer_id = $1
         AND e.event_type = 'profile_view'
         AND e.created_at >= (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')
         AND e.created_at < date_trunc('year', CURRENT_DATE)
       GROUP BY 1
       ORDER BY 1 ASC`,
      [freelancerId],
    );
    return result.rows.map((r) => ({
      date: r.month,
      views: Number(r.views) || 0,
    }));
  }

  const result = await db.query(
    `SELECT
       date_trunc('month', e.created_at)::date AS month,
       COUNT(*)::int AS views
     FROM public.profile_analytics_events e
     WHERE e.freelancer_id = $1 AND e.event_type = 'profile_view'
     GROUP BY 1
     ORDER BY 1 ASC
     LIMIT 24`,
    [freelancerId],
  );
  return result.rows.map((r) => ({
    date: r.month,
    views: Number(r.views) || 0,
  }));
}

function computeMarketingScores({ profileViews, workInvitations, websiteClicks, contractsThis, contractsPrev, repeatClients, totalClients }) {
  const car =
    profileViews > 0 ? Math.min(100, Math.round((workInvitations / profileViews) * 100)) : 0;

  let cer = 0;
  if (contractsPrev > 0) {
    cer = Math.min(100, Math.max(0, Math.round(((contractsThis - contractsPrev) / contractsPrev) * 100)));
  } else if (contractsThis > 0) {
    cer = 100;
  }

  const crr =
    totalClients > 0 ? Math.min(100, Math.round((repeatClients / totalClients) * 100)) : 0;

  const tms = Math.round((car + cer + crr) / 3);

  return {
    tms,
    car,
    cer,
    crr,
    website_clicks: websiteClicks,
  };
}

async function getProfileStats(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (String(payload.role || "").toLowerCase() !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới xem thống kê hồ sơ." });
  }

  const periodKey = parseStatsPeriod(req.query.period);
  const period = PERIODS[periodKey];
  const freelancerId = payload.sub;
  const db = await pool.connect();

  try {
    const viewsSeries = await getProfileViewsSeries(db, freelancerId, periodKey);
    const profileViewsTotal = viewsSeries.reduce((sum, row) => sum + row.views, 0);

    const [websiteRes, invitationEventRes, contractsRes, servicesRes, portfolioRes, retentionRes] =
      await Promise.all([
        countEvent(db, freelancerId, "website_click", period.eventFilter),
        countEvent(db, freelancerId, "work_invitation", period.eventFilter),
        db.query(
          `SELECT COUNT(*)::int AS total
           FROM public.contracts c
           WHERE c.freelancer_id = $1 AND c.deleted_at IS NULL AND (${period.contractFilter})`,
          [freelancerId],
        ),
        db.query(
          `SELECT
             s.id,
             s.title,
             COALESCE(SUM(CASE WHEN e.event_type = 'service_view' THEN 1 ELSE 0 END), 0)::int AS views,
             COALESCE(SUM(CASE WHEN e.event_type = 'service_conversion' THEN 1 ELSE 0 END), 0)::int AS conversions
           FROM public.services s
           LEFT JOIN public.profile_analytics_events e
             ON e.service_id = s.id
            AND e.freelancer_id = $1
            AND (${period.eventFilter})
           WHERE s.freelancer_id = $1
           GROUP BY s.id, s.title
           ORDER BY views DESC, s.title ASC`,
          [freelancerId],
        ),
        db.query(
          `SELECT
             p.id,
             p.title,
             COALESCE(COUNT(e.id), 0)::int AS views
           FROM public.freelancer_portfolios p
           LEFT JOIN public.profile_analytics_events e
             ON e.portfolio_id = p.id
            AND e.freelancer_id = $1
            AND e.event_type = 'portfolio_view'
            AND (${period.eventFilter})
           WHERE p.freelancer_id = $1 AND p.deleted_at IS NULL
           GROUP BY p.id, p.title
           ORDER BY views DESC, p.title ASC`,
          [freelancerId],
        ),
        db.query(
          `SELECT
             COUNT(*) FILTER (WHERE cnt > 1)::int AS repeat_clients,
             COUNT(*)::int AS total_clients
           FROM (
             SELECT c.client_id, COUNT(*)::int AS cnt
             FROM public.contracts c
             WHERE c.freelancer_id = $1 AND c.deleted_at IS NULL
             GROUP BY c.client_id
           ) t`,
          [freelancerId],
        ),
      ]);

    let contractsPrev = 0;
    if (periodKey === "30d") {
      const prev = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM public.contracts c
         WHERE c.freelancer_id = $1 AND c.deleted_at IS NULL
           AND c.created_at >= CURRENT_TIMESTAMP - INTERVAL '60 days'
           AND c.created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'`,
        [freelancerId],
      );
      contractsPrev = prev.rows[0]?.total ?? 0;
    } else if (periodKey === "last_year") {
      const prev = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM public.contracts c
         WHERE c.freelancer_id = $1 AND c.deleted_at IS NULL
           AND c.created_at >= (date_trunc('year', CURRENT_DATE) - INTERVAL '2 years')
           AND c.created_at < (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')`,
        [freelancerId],
      );
      contractsPrev = prev.rows[0]?.total ?? 0;
    }

    const workInvitations =
      Number(invitationEventRes.rows[0]?.total ?? 0) + Number(contractsRes.rows[0]?.total ?? 0);
    const websiteClicks = Number(websiteRes.rows[0]?.total ?? 0);
    const contractsThis = Number(contractsRes.rows[0]?.total ?? 0);

    const services = servicesRes.rows.map((row) => {
      const views = Number(row.views) || 0;
      const conversions = Number(row.conversions) || 0;
      const conversion_rate = views > 0 ? Math.round((conversions / views) * 1000) / 10 : 0;
      return {
        id: row.id,
        title: row.title,
        views,
        conversions,
        conversion_rate,
      };
    });

    const portfolio = portfolioRes.rows.map((row) => ({
      id: row.id,
      title: row.title,
      views: Number(row.views) || 0,
    }));

    const marketing = computeMarketingScores({
      profileViews: profileViewsTotal,
      workInvitations,
      websiteClicks,
      contractsThis,
      contractsPrev,
      repeatClients: Number(retentionRes.rows[0]?.repeat_clients ?? 0),
      totalClients: Number(retentionRes.rows[0]?.total_clients ?? 0),
    });

    const summaryText =
      periodKey === "30d"
        ? `${profileViewsTotal} lượt xem trong 30 ngày qua`
        : `${profileViewsTotal} lượt xem — ${period.label.toLowerCase()}`;

    return res.json({
      period: periodKey,
      period_label: period.label,
      profile_views: {
        total: profileViewsTotal,
        series: viewsSeries,
        summary: summaryText,
      },
      conversion: {
        work_invitations: workInvitations,
        website_clicks: websiteClicks,
      },
      services,
      portfolio,
      marketing,
    });
  } catch (error) {
    console.error("Get profile stats failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng profile_analytics_events. Chạy backend/sql/profile_analytics.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải thống kê hồ sơ." });
  } finally {
    db.release();
  }
}

module.exports = {
  getProfileStats,
};
