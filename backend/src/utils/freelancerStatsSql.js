/** SQL fragments: thống kê freelancer tính runtime từ contracts + chat (không thêm cột/bảng). */

const COMPLETED_JOBS_AGG = `
  SELECT freelancer_id, COUNT(*)::int AS completed_jobs
  FROM public.contracts
  WHERE status = 'completed' AND deleted_at IS NULL
  GROUP BY freelancer_id
`;

const JOB_SUCCESS_SCORE_AGG = `
  SELECT
    freelancer_id,
    CASE
      WHEN COUNT(*) = 0 THEN NULL
      ELSE ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::numeric
        / COUNT(*)::numeric * 100
      )::smallint
    END AS job_success_score
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IN ('completed', 'cancelled', 'disputed')
  GROUP BY freelancer_id
`;

const AVG_RESPONSE_MINUTES_AGG = `
  SELECT
    ordered.freelancer_id,
    ROUND(AVG(
      EXTRACT(EPOCH FROM (ordered.next_created_at - ordered.created_at)) / 60.0
    ))::int AS avg_response_minutes
  FROM (
    SELECT
      c.freelancer_id,
      c.client_id,
      m.created_at,
      m.sender_id,
      LEAD(m.sender_id) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at ASC) AS next_sender_id,
      LEAD(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at ASC) AS next_created_at
    FROM public.chat_messages m
    INNER JOIN public.chat_conversations c ON c.id = m.conversation_id
  ) ordered
  WHERE ordered.sender_id = ordered.client_id
    AND ordered.next_sender_id = ordered.freelancer_id
    AND ordered.next_created_at IS NOT NULL
    AND ordered.next_created_at >= ordered.created_at
  GROUP BY ordered.freelancer_id
`;

const SKILL_EXPERIENCE_YEARS_AGG = `
  SELECT user_id, MAX(years_of_experience)::int AS skill_experience_years
  FROM public.user_skills
  WHERE years_of_experience > 0
  GROUP BY user_id
`;

function completedJobsJoin(freelancerIdExpr, alias = "ct") {
  return `
  LEFT JOIN (${COMPLETED_JOBS_AGG}) ${alias} ON ${alias}.freelancer_id = ${freelancerIdExpr}`;
}

function jobSuccessScoreJoin(freelancerIdExpr, alias = "jss") {
  return `
  LEFT JOIN (${JOB_SUCCESS_SCORE_AGG}) ${alias} ON ${alias}.freelancer_id = ${freelancerIdExpr}`;
}

function avgResponseMinutesJoin(freelancerIdExpr, alias = "arpm") {
  return `
  LEFT JOIN (${AVG_RESPONSE_MINUTES_AGG}) ${alias} ON ${alias}.freelancer_id = ${freelancerIdExpr}`;
}

function skillExperienceYearsJoin(freelancerIdExpr, alias = "sey") {
  return `
  LEFT JOIN (${SKILL_EXPERIENCE_YEARS_AGG}) ${alias} ON ${alias}.user_id = ${freelancerIdExpr}`;
}

function freelancerStatsJoins(freelancerIdExpr) {
  return [
    completedJobsJoin(freelancerIdExpr),
    jobSuccessScoreJoin(freelancerIdExpr),
    avgResponseMinutesJoin(freelancerIdExpr),
    skillExperienceYearsJoin(freelancerIdExpr),
  ].join("\n");
}

/** Ưu tiên self-reported; fallback max năm KN từ user_skills. */
const EXPERIENCE_YEARS_SELECT = "COALESCE(fp.experience_years, sey.skill_experience_years) AS experience_years";

module.exports = {
  freelancerStatsJoins,
  completedJobsJoin,
  jobSuccessScoreJoin,
  avgResponseMinutesJoin,
  skillExperienceYearsJoin,
  EXPERIENCE_YEARS_SELECT,
};
