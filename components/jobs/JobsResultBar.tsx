import { useTranslation } from "@/hooks/useTranslation";
import { JOBS_FILTER_OPTIONS, type JobsFilter } from "./constants";

type JobsResultBarProps = {
  total: number;
  showing: number;
  filter: JobsFilter;
  role: "freelancer" | "client" | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function JobsResultBar({
  total,
  showing,
  filter,
  role,
  onRefresh,
  refreshing,
}: JobsResultBarProps) {
  const { t } = useTranslation();

  const filterLabel =
    JOBS_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? t("Tất cả các công việc");

  return (
    <div className="jobs-result-bar">
      <p className="jobs-result-bar__text">
        {t("Hiển thị")} <strong>{showing}</strong>
        {showing !== total ? (
          <>
            {" "}
            / <strong>{total}</strong>
          </>
        ) : null}{" "}
        {t("công việc")}
        {role === "client" ? t(" đã đăng") : ""}
        <span className="jobs-result-bar__filter"> · {filterLabel}</span>
      </p>
      {onRefresh ? (
        <button
          type="button"
          className="jobs-result-bar__refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? t("Đang tải...") : t("Làm mới")}
        </button>
      ) : null}
    </div>
  );
}
