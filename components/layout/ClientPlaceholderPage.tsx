import type { Metadata } from "next";
import ClientShell from "./ClientShell";

type ClientPlaceholderPageProps = {
  title: string;
  description?: string;
};

export function clientPageMetadata(title: string, description?: string): Metadata {
  return {
    title: `${title} — Vĩnh Long Connected`,
    description: description ?? title,
  };
}

export default function ClientPlaceholderPage({ title, description }: ClientPlaceholderPageProps) {
  return (
    <ClientShell>
      <div>
        <h1 className="client-page__title">{title}</h1>
        {description ? <p className="client-page__desc">{description}</p> : null}
      </div>
    </ClientShell>
  );
}
