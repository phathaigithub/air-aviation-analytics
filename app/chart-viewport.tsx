"use client";

import { ReactNode, useEffect, useId, useState } from "react";

type ChartViewportProps = {
  children: ReactNode;
  label: string;
  language: "en" | "vi";
};

export default function ChartViewport({ children, label, language }: ChartViewportProps) {
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  const copy = language === "vi"
    ? { expand: "Phóng to biểu đồ", collapse: "Thu nhỏ", hint: "Nhấn Esc để đóng" }
    : { expand: "Expand chart", collapse: "Close expanded view", hint: "Press Esc to close" };

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return (
    <div
      className={`chart-viewport${expanded ? " is-expanded" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? "true" : undefined}
      aria-labelledby={expanded ? titleId : undefined}
    >
      <div className="chart-viewport-toolbar">
        <span id={titleId}>{expanded ? label : ""}</span>
        {expanded ? <small>{copy.hint}</small> : null}
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            {expanded
              ? <path d="M7 3v4H3M13 3v4h4M7 17v-4H3M13 17v-4h4" />
              : <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" />}
          </svg>
          {expanded ? copy.collapse : copy.expand}
        </button>
      </div>
      <div className="chart-viewport-content">{children}</div>
    </div>
  );
}
