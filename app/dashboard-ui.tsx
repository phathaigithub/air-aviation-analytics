import type { ReactNode } from "react";

export function DashboardTitle({ page, title, subtitle, onReset, resetLabel }: { page:string;title:string;subtitle:string;onReset:()=>void;resetLabel:string }) {
  return <div className="executive-titlebar"><div><span className="dashboard-kicker">PAGE {page}</span><h3>{title}</h3><p>{subtitle}</p></div><button type="button" className="dashboard-reset" onClick={onReset}>{resetLabel}</button></div>;
}

export function PanelHeading({ title, note, aside }: { title:string;note:string;aside:ReactNode }) {
  return <div className="dashboard-panel-heading"><div><h4>{title}</h4><p>{note}</p></div><span>{aside}</span></div>;
}
