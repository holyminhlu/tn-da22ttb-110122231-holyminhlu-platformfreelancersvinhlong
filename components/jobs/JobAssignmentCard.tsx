import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";
import { formatDate, formatVnd } from "@/lib/format";
import {
  contractStatusClass,
  contractStatusLabel,
  type JobsListItem,
} from "./jobs-filter";

type JobAssignmentCardProps = {
  item: JobsListItem;
  role?: "freelancer" | "client" | null;
};

export default function JobAssignmentCard({ item, role }: JobAssignmentCardProps) {
  const price =
    item.agreedPrice != null ? formatVnd(item.agreedPrice) : formatVnd(item.budget);
  const counterpartyLabel = role === "client" ? "Freelancer" : "Khách hàng";

  return (
    <article className="jobs-card jobs-card--interactive">
      <Link href={`/work/detail/${item.jobId}`} className="jobs-card__link">
        <div className="jobs-card__head">
          <div className="jobs-card__body">
            <h2 className="jobs-card__title">{item.title}</h2>
            {item.counterparty ? (
              <p className="jobs-card__meta">
                {counterpartyLabel}: {item.counterparty}
              </p>
            ) : null}
            <div className="jobs-card__row">
              <span className={contractStatusClass(item.contractStatus)}>
                {contractStatusLabel(item.contractStatus)}
              </span>
              <span className="jobs-card__price">{price}</span>
            </div>
            <p className="jobs-card__meta jobs-card__meta--foot">
              Hoạt động gần nhất: {formatDate(item.activityAt)}
              {item.jobId ? (
                <>
                  {" "}
                  · Mã{" "}
                  <span className="jobs-card__code">{item.jobId.slice(0, 8)}…</span>
                </>
              ) : null}
            </p>
          </div>
          <FaChevronRight className="jobs-card__chevron" aria-hidden />
        </div>
      </Link>
    </article>
  );
}
