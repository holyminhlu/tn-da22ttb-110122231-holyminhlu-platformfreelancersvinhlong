import HireShell from "./HireShell";
import "./hire.css";

type ClientHirePlaceholderPageProps = {
  title: string;
  description?: string;
};

export default function ClientHirePlaceholderPage({
  title,
  description,
}: ClientHirePlaceholderPageProps) {
  return (
    <HireShell>
      <div className="hire-page">
        <h1 className="hire-page__title">{title}</h1>
        {description ? <p className="hire-page__lead">{description}</p> : null}
      </div>
    </HireShell>
  );
}
