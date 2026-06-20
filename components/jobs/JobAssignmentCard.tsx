import { formatDateUi, formatVndUi, tUi } from "@/lib/i18n/runtime";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa";
import {
  contractStatusClass,
  contractStatusLabel,
  type JobsListItem,
} from "./jobs-filter";

type JobAssignmentCardProps = {
  item: JobsListItem;
  role?: "freelancer" | "client" | null;
};

export default function JobAssignmentCard({
  item, role }: JobAssignmentCardProps) {  const { t, formatVnd, formatDate } = useTranslation();

  const price =
    item.agreedPrice != null ? formatVndUi(item.agreedPrice) : formatVndUi(item.budget);
  const counterpartyLabel = role === "client" ? "Freelancer" : t("Khách hàng");

  const href =
    role === "freelancer" && item.id && item.id !== item.jobId
      ? `/findwork/orders/${item.id}`
      : `/work/detail/${item.jobId}`;

  return (
    <article className="jobs-card jobs-card--interactive">
      <Link href={href} className="jobs-card__link">
        <div className="jobs-card__head">
          <div className="jobs-card__body">
            <h2 className="jobs-card__title">{t(item.title)}</h2>
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
              {t("Hoạt động gần nhất:")} {formatDateUi(item.activityAt)}
              {item.jobId ? (
                <>
                  {" "}
                  · {t("Mã")}{" "}
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
