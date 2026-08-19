"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EntitySummary, Language } from "./dashboard-data";
import EChart, { chartPalette, escapeChartHtml } from "./echart";

export type RankingMetric = "recommendation" | "overall" | "queue";

type RankingBarLabels = {
  recommendation: string;
  rating: string;
  reviews: string;
  queue?: string;
};

type RankingBarChartProps = {
  items: EntitySummary[];
  language: Language;
  metric: RankingMetric;
  labels: RankingBarLabels;
  selectedId?: number;
  onSelect: (name: string) => void;
};

function metricValue(item: EntitySummary, metric: RankingMetric) {
  if (metric === "recommendation") return item.recommendation;
  if (metric === "queue") return item.criteria.queue?.score ?? 0;
  return item.averageRating;
}

function formattedValue(value: number, metric: RankingMetric) {
  return metric === "recommendation" ? `${value.toFixed(1)}%` : `${value.toFixed(2)} / 5`;
}

export default function RankingBarChart({ items, language, metric, labels, selectedId, onSelect }: RankingBarChartProps) {
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const scaleMax = metric === "recommendation" ? 100 : 5;
  const metricLabel = metric === "recommendation" ? labels.recommendation : metric === "queue" ? labels.queue ?? labels.rating : labels.rating;
  const option = useMemo<EChartsCoreOption>(() => {
    const rows = items.map(item => ({
      name: item.name,
      value: metricValue(item, metric),
      recommendation: item.recommendation,
      rating: item.averageRating,
      queue: item.criteria.queue,
      reviews: item.reviews,
      itemStyle: { color: selectedId === item.id ? chartPalette.coral : chartPalette.accent },
    }));
    return {
      animationDuration: 450,
      aria: { enabled: true, decal: { show: false } },
      grid: { left: 8, right: 72, top: 18, bottom: 42, containLabel: true },
      toolbox: {
        right: 4,
        feature: { restore: {}, saveAsImage: { name: "aviation-ranking", pixelRatio: 2 } },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        confine: true,
        formatter: (raw: unknown) => {
          const param = (Array.isArray(raw) ? raw[0] : raw) as { data: (typeof rows)[number] };
          const row = param.data;
          return `<strong>${escapeChartHtml(row.name)}</strong><br/>${escapeChartHtml(metricLabel)}: <b>${formattedValue(row.value, metric)}</b><br/>${escapeChartHtml(labels.recommendation)}: ${row.recommendation.toFixed(1)}%<br/>${escapeChartHtml(labels.rating)}: ${row.rating.toFixed(2)} / 5${row.queue?.answered ? `<br/>${escapeChartHtml(labels.queue)}: ${row.queue.score.toFixed(2)} / 5` : ""}<br/>${escapeChartHtml(labels.reviews)}: ${row.reviews.toLocaleString(locale)}`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: scaleMax,
        axisLabel: { color: chartPalette.muted, formatter: metric === "recommendation" ? "{value}%" : "{value}" },
        splitLine: { lineStyle: { color: chartPalette.line } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map(row => row.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: chartPalette.text, width: 170, overflow: "truncate", fontWeight: 650 },
      },
      dataZoom: [{ type: "inside", yAxisIndex: 0, filterMode: "none" }],
      series: [{
        name: metricLabel,
        type: "bar",
        data: rows,
        barMaxWidth: 28,
        showBackground: true,
        backgroundStyle: { color: "rgba(21,39,43,.06)", borderRadius: 4 },
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        emphasis: { focus: "self", itemStyle: { color: chartPalette.coral } },
        label: {
          show: true,
          position: "right",
          color: chartPalette.accent,
          fontFamily: "monospace",
          formatter: (params: { value?: number }) => formattedValue(Number(params.value ?? 0), metric),
        },
      }],
    };
  }, [items, labels, locale, metric, metricLabel, scaleMax, selectedId]);

  return <EChart className="echart-compact" option={option} ariaLabel={metricLabel} onClick={params => params.name && onSelect(params.name)} />;
}
