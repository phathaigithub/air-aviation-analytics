"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption, EChartsType } from "echarts/core";
import { BarChart, HeatmapChart, LineChart } from "echarts/charts";
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

export type EChartClickParams = {
  componentType?: string;
  data?: unknown;
  dataIndex?: number;
  name?: string;
  seriesName?: string;
  value?: unknown;
};

type EChartProps = {
  option: EChartsCoreOption;
  ariaLabel: string;
  className?: string;
  onClick?: (params: EChartClickParams) => void;
};

export const chartPalette = {
  accent: "#147d73",
  coral: "#cf543e",
  lime: "#788600",
  text: "#15272b",
  muted: "#607277",
  line: "rgba(21,39,43,.12)",
  surface: "#ffffff",
};

export function escapeChartHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export default function EChart({ option, ariaLabel, className = "", onClick }: EChartProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onClick) return;
    const handler = (params: EChartClickParams) => onClick(params);
    chart.on("click", handler);
    return () => {
      chart.off("click", handler);
    };
  }, [onClick]);

  return <div ref={elementRef} className={`echart ${className}`.trim()} role="img" aria-label={ariaLabel} />;
}
