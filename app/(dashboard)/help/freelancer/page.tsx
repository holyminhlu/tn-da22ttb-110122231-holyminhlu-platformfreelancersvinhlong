import type { Metadata } from "next";
import HelpCenter from "@/components/help/HelpCenter";

export const metadata: Metadata = {
  title: "Trợ giúp Freelancer — Vĩnh Long Connected",
  description: "Trung tâm trợ giúp dành cho freelancer.",
};

export default function HelpFreelancerPage() {
  return <HelpCenter initialRole="freelancer" />;
}
