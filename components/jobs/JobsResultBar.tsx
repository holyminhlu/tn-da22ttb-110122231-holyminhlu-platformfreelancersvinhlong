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
  const filterLabel =
    JOBS_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Tất cả các công việc";

  return (
    <div className="jobs-result-bar">
      <p className="jobs-result-bar__text">
        Hiển thị <strong>{showing}</strong>
        {showing !== total ? (
          <>
            {" "}
            / <strong>{total}</strong>
          </>
        ) : null}{" "}
        công việc
        {role === "client" ? " đã đăng" : ""}
        <span className="jobs-result-bar__filter"> · {filterLabel}</span>
      </p>
      {onRefresh ? (
        <button
          type="button"
          className="jobs-result-bar__refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      ) : null}
    </div>
  );
}
