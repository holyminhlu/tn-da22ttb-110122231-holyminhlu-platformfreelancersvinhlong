"use client";

import { Suspense } from "react";
import HomeFooter from "@/components/home/HomeFooter";
import HomeNavbar from "@/components/home/HomeNavbar";
import "../home/home.css";
import "../hire/hire.css";
import "./find-freelancers.css";
import FindFreelancersBody from "./FindFreelancersBody";

type FindFreelancersPageProps = {
  children?: React.ReactNode;
};

export default function FindFreelancersPage({ children }: FindFreelancersPageProps) {
  return (
    <div className="home-landing find-freelancers-page min-h-screen text-gray-900">
      <HomeNavbar />
      <main id="main-content" className="find-freelancers-page__main">
        {children ?? (
          <Suspense fallback={<div className="hire-page px-6 py-16 text-center text-gray-500">Đang tải…</div>}>
            <FindFreelancersBody />
          </Suspense>
        )}
      </main>
      <HomeFooter />
    </div>
  );
}
