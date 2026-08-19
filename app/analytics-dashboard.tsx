"use client";

import { lazy, Suspense } from "react";

const CompetitiveOverviewDashboard = lazy(() => import("./competitive-overview-dashboard"));
const CustomerSegmentDiagnosisDashboard = lazy(() => import("./customer-segment-diagnosis-dashboard"));
const MultiLineTrendDashboard = lazy(() => import("./multi-line-trend-dashboard"));

type Language = "en" | "vi";

export default function AnalyticsDashboard({ language }: { language: Language }) {
  const pages = language === "vi"
    ? ["Competitive Overview", "Customer Segment Diagnosis", "Trend & Risk Monitoring"]
    : ["Competitive Overview", "Customer Segment Diagnosis", "Trend & Risk Monitoring"];
  const loading = language === "vi" ? "Đang tải dashboard tương tác…" : "Loading interactive dashboard…";
  return (
    <div className="analytics-workspace">
      <div className="diagnostic-page-nav" aria-label="Dashboard pages">
        {pages.map((page,index)=><a href={`#dashboard-page-${index+1}`} key={page}><span>0{index+1}</span>{page}</a>)}
      </div>
      <div id="dashboard-page-1">
        <Suspense fallback={<p className="mart-state">{loading}</p>}><CompetitiveOverviewDashboard language={language} /></Suspense>
      </div>
      <div className="dashboard-page-separator" aria-hidden="true" />
      <div id="dashboard-page-2">
        <Suspense fallback={<p className="mart-state">{loading}</p>}><CustomerSegmentDiagnosisDashboard language={language} /></Suspense>
      </div>
      <div className="dashboard-page-separator" aria-hidden="true" />
      <div id="dashboard-page-3">
        <Suspense fallback={<p className="mart-state">{loading}</p>}><MultiLineTrendDashboard language={language} /></Suspense>
      </div>
    </div>
  );
}
