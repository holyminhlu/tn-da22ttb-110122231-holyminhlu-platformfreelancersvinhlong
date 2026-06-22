import type { Metadata } from "next";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "@/components/home/home.css";

type FreelancerPlaceholderPageProps = {
  title: string;
  description?: string;
};

export function freelancerPageMetadata(title: string, description?: string): Metadata {
  return {
    title: `${title} — Vĩnh Long Connect`,
    description: description ?? title,
  };
}

export default function FreelancerPlaceholderPage({ title, description }: FreelancerPlaceholderPageProps) {
  return (
    <div className="home-landing min-h-screen bg-background text-foreground">
      <HomeNavbar />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-3 text-muted-foreground">{description}</p> : null}
      </main>
      <HomeFooter />
    </div>
  );
}
