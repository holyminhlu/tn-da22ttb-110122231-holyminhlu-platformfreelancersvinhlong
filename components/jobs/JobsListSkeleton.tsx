export default function JobsListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="jobs-list jobs-list--skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="jobs-card jobs-card--skeleton">
          <div className="jobs-skeleton-line jobs-skeleton-line--title" />
          <div className="jobs-skeleton-line jobs-skeleton-line--meta" />
          <div className="jobs-skeleton-line jobs-skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}
