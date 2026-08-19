"use client";

import { useEffect, useMemo, useState } from "react";
import { Language, loadMart, MartRow, num, validEntityName } from "./dashboard-data";
import { DashboardTitle, PanelHeading } from "./dashboard-ui";
import DataInsightSection, { DataInsight } from "./data-insight-section";
import ChartViewport from "./chart-viewport";
import EChart, { chartPalette, escapeChartHtml } from "./echart";
import type { EChartsCoreOption } from "echarts/core";

type SegmentName = "Business" | "Leisure";
type SegmentResult = { name:SegmentName;reviews:number;recommendation:number;rating:number;criteria:Record<string,{score:number;answered:number}> };
const segmentCriteria=[
  {key:"value",score:"avg_value_for_money",count:"value_for_money_answered_count",en:"Value for money",vi:"Đáng tiền"},
  {key:"seat",score:"avg_seat_comfort",count:"seat_comfort_answered_count",en:"Seat comfort",vi:"Thoải mái ghế"},
  {key:"cabin",score:"avg_cabin_staff_service",count:"cabin_staff_answered_count",en:"Cabin staff",vi:"Tiếp viên"},
  {key:"ground",score:"avg_ground_service",count:"ground_service_answered_count",en:"Ground service",vi:"Dịch vụ mặt đất"},
] as const;

const copy={
  en:{title:"Customer Segment Diagnosis",subtitle:"Compare Business and Leisure passengers, isolate criterion gaps and identify airlines with the widest experience divide.",from:"From",to:"To",min:"Minimum reviews per group",reset:"Reset",business:"Business",leisure:"Leisure",least:"Least satisfied group",largestCriterion:"Largest criterion gap",largestAirline:"Largest airline gap",eligible:"Comparable airlines",rating:"Experience score",recommendation:"Recommendation",reviews:"reviews",criteria:"Where groups differ",criteriaNote:"Weighted criterion scores; the gap is Business minus Leisure.",airlines:"Airlines with the widest segment gap",airlinesNote:"Only airlines meeting the review threshold in both Business and Leisure are included.",gap:"B − L gap",answered:"answered",businessHigher:"Business higher",leisureHigher:"Leisure higher",loading:"Loading customer segments…",error:"Customer segment data could not be loaded.",noData:"No Business–Leisure comparison meets the current threshold."},
  vi:{title:"Customer Segment Diagnosis",subtitle:"So sánh khách Công vụ và Du lịch, xác định tiêu chí khác biệt và hãng có khoảng cách trải nghiệm lớn nhất.",from:"Từ năm",to:"Đến năm",min:"Review tối thiểu mỗi nhóm",reset:"Đặt lại",business:"Công vụ",leisure:"Du lịch",least:"Nhóm ít hài lòng nhất",largestCriterion:"Chênh lệch tiêu chí lớn nhất",largestAirline:"Chênh lệch hãng lớn nhất",eligible:"Hãng đủ điều kiện so sánh",rating:"Điểm trải nghiệm",recommendation:"Tỷ lệ giới thiệu",reviews:"review",criteria:"Khác biệt nằm ở đâu",criteriaNote:"Điểm tiêu chí có trọng số; chênh lệch bằng Công vụ trừ Du lịch.",airlines:"Hãng có khoảng cách phân khúc lớn nhất",airlinesNote:"Chỉ gồm hãng đạt ngưỡng review ở cả nhóm Công vụ và Du lịch.",gap:"Chênh lệch CV − DL",answered:"trả lời",businessHigher:"Công vụ cao hơn",leisureHigher:"Du lịch cao hơn",loading:"Đang tải Customer Segment Diagnosis…",error:"Không thể tải dữ liệu phân khúc khách hàng.",noData:"Không có so sánh Công vụ–Du lịch nào đạt ngưỡng hiện tại."},
} as const;

function aggregate(rows:MartRow[],name:SegmentName):SegmentResult {
  const reviews=rows.reduce((s,row)=>s+num(row,"review_count"),0);
  const recommendation=reviews?rows.reduce((s,row)=>s+num(row,"recommendation_rate_pct")*num(row,"review_count"),0)/reviews:0;
  let total=0,answeredTotal=0;const criteria:SegmentResult["criteria"]={};
  segmentCriteria.forEach(c=>{const answered=rows.reduce((s,row)=>s+num(row,c.count),0),weighted=rows.reduce((s,row)=>s+num(row,c.score)*num(row,c.count),0);criteria[c.key]={score:answered?weighted/answered:0,answered};total+=weighted;answeredTotal+=answered});
  return{name,reviews,recommendation,rating:answeredTotal?total/answeredTotal:0,criteria};
}

export default function CustomerSegmentDiagnosisDashboard({language}:{language:Language}){
  const [rows,setRows]=useState<MartRow[]|null>(null),[failed,setFailed]=useState(false),[fromYear,setFromYear]=useState(2015),[toYear,setToYear]=useState(2025),[minReviews,setMinReviews]=useState(30);
  const t=copy[language],locale=language==="vi"?"vi-VN":"en-US";
  useEffect(()=>{let active=true;loadMart("/data/marts/airline_segment_performance.json").then(data=>active&&setRows(data)).catch(()=>active&&setFailed(true));return()=>{active=false}},[]);
  const years=useMemo(()=>rows?[...new Set(rows.map(row=>num(row,"review_year")))].sort((a,b)=>a-b):[],[rows]);
  const filtered=useMemo(()=>rows?.filter(row=>num(row,"review_year")>=fromYear&&num(row,"review_year")<=toYear&&Boolean(row.meets_reporting_threshold)&&validEntityName(row.airline_name)&&(row.travel_purpose==="Business"||row.travel_purpose==="Leisure"))??[],[rows,fromYear,toYear]);
  const market=useMemo(()=>({Business:aggregate(filtered.filter(row=>row.travel_purpose==="Business"),"Business"),Leisure:aggregate(filtered.filter(row=>row.travel_purpose==="Leisure"),"Leisure")}),[filtered]);
  const criterionGaps=segmentCriteria.map(c=>({meta:c,business:market.Business.criteria[c.key],leisure:market.Leisure.criteria[c.key],gap:market.Business.criteria[c.key].score-market.Leisure.criteria[c.key].score})).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap));
  const airlineGaps=useMemo(()=>{const groups=new Map<string,MartRow[]>();filtered.forEach(row=>{const name=String(row.airline_name);groups.set(name,[...(groups.get(name)??[]),row])});return [...groups.entries()].map(([name,items])=>{const business=aggregate(items.filter(row=>row.travel_purpose==="Business"),"Business"),leisure=aggregate(items.filter(row=>row.travel_purpose==="Leisure"),"Leisure");return{name,business,leisure,gap:business.recommendation-leisure.recommendation}}).filter(item=>item.business.reviews>=minReviews&&item.leisure.reviews>=minReviews).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap))},[filtered,minReviews]);
  const least=market.Business.rating<=market.Leisure.rating?market.Business:market.Leisure,largestCriterion=criterionGaps[0],largestAirline=airlineGaps[0];
  const other=least.name==="Business"?market.Leisure:market.Business;
  const segmentInsights:DataInsight[]=language==="vi"?[
    {title:`${least.name==="Business"?t.business:t.leisure} là nhóm ít hài lòng hơn`,body:`Điểm trải nghiệm thấp hơn nhóm ${other.name==="Business"?t.business:t.leisure} ${(other.rating-least.rating).toFixed(2)} điểm; các cải thiện nên được kiểm chứng trước với nhóm có kết quả thấp hơn này.`,evidence:`${least.rating.toFixed(2)}/5 và ${least.recommendation.toFixed(1)}% giới thiệu từ ${least.reviews.toLocaleString(locale)} ${t.reviews}; nhóm còn lại ${other.rating.toFixed(2)}/5.`},
    {title:`${largestCriterion.meta[language]} khác biệt rõ nhất giữa hai nhóm`,body:`Khoảng cách ${Math.abs(largestCriterion.gap).toFixed(2)} điểm cho thấy trải nghiệm tiêu chí này không đồng đều; cần drill-down theo nhóm thay vì dùng một điểm trung bình chung.`,evidence:`${t.business}: ${largestCriterion.business.score.toFixed(2)}/5 (${largestCriterion.business.answered.toLocaleString(locale)} ${t.answered}); ${t.leisure}: ${largestCriterion.leisure.score.toFixed(2)}/5 (${largestCriterion.leisure.answered.toLocaleString(locale)} ${t.answered}).`},
    largestAirline?{title:`${largestAirline.name} có khoảng cách phân khúc lớn nhất`,body:`Chênh lệch recommendation ${Math.abs(largestAirline.gap).toFixed(1)} điểm % là lớn nhất trong ${airlineGaps.length} hãng đủ mẫu; đây là hãng nên được phân tích sâu theo nhóm khách trước.`,evidence:`${t.business}: ${largestAirline.business.recommendation.toFixed(1)}% từ ${largestAirline.business.reviews.toLocaleString(locale)} ${t.reviews}; ${t.leisure}: ${largestAirline.leisure.recommendation.toFixed(1)}% từ ${largestAirline.leisure.reviews.toLocaleString(locale)} ${t.reviews}.`}:{title:"Chưa đủ hãng để so sánh khoảng cách",body:`Không có hãng nào đạt tối thiểu ${minReviews} review ở cả hai nhóm; chưa nên kết luận hãng nào có khoảng cách lớn nhất.`,evidence:`0 ${t.eligible.toLowerCase()} · ngưỡng ${minReviews} ${t.reviews} mỗi nhóm.`},
  ]:[
    {title:`${least.name} is the less-satisfied group`,body:`Its experience score is ${(other.rating-least.rating).toFixed(2)} points below ${other.name}; validate improvements with this lower-performing group first.`,evidence:`${least.rating.toFixed(2)}/5 and ${least.recommendation.toFixed(1)}% recommendation from ${least.reviews.toLocaleString(locale)} ${t.reviews}; the other group scores ${other.rating.toFixed(2)}/5.`},
    {title:`${largestCriterion.meta[language]} differs most by segment`,body:`The ${Math.abs(largestCriterion.gap).toFixed(2)}-point gap shows that this experience is not uniform; drill down by segment instead of relying on one market average.`,evidence:`${t.business}: ${largestCriterion.business.score.toFixed(2)}/5 (${largestCriterion.business.answered.toLocaleString(locale)} ${t.answered}); ${t.leisure}: ${largestCriterion.leisure.score.toFixed(2)}/5 (${largestCriterion.leisure.answered.toLocaleString(locale)} ${t.answered}).`},
    largestAirline?{title:`${largestAirline.name} has the widest segment divide`,body:`Its ${Math.abs(largestAirline.gap).toFixed(1)} percentage-point recommendation gap is the largest among ${airlineGaps.length} qualified airlines; prioritize a segment drill-down for this airline.`,evidence:`${t.business}: ${largestAirline.business.recommendation.toFixed(1)}% from ${largestAirline.business.reviews.toLocaleString(locale)} ${t.reviews}; ${t.leisure}: ${largestAirline.leisure.recommendation.toFixed(1)}% from ${largestAirline.leisure.reviews.toLocaleString(locale)} ${t.reviews}.`}:{title:"Insufficient airlines for a gap comparison",body:`No airline reaches ${minReviews} reviews in both groups, so the widest airline gap cannot be concluded.`,evidence:`0 ${t.eligible.toLowerCase()} · ${minReviews}-${t.reviews} threshold per group.`},
  ];
  function reset(){setFromYear(2015);setToYear(2025);setMinReviews(30)}
  if(failed)return <p className="mart-state mart-error">{t.error}</p>;if(!rows)return <p className="mart-state">{t.loading}</p>;
  return <div className="focused-dashboard segment-diagnosis-dashboard">
    <DashboardTitle page="02" title={t.title} subtitle={t.subtitle} onReset={reset} resetLabel={t.reset}/>
    <div className="diagnostic-toolbar segment-toolbar"><label>{t.from}<select value={fromYear} onChange={e=>setFromYear(Math.min(+e.target.value,toYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label><label>{t.to}<select value={toYear} onChange={e=>setToYear(Math.max(+e.target.value,fromYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label><label>{t.min}<select value={minReviews} onChange={e=>setMinReviews(+e.target.value)}>{[20,30,50,100,250].map(n=><option key={n}>{n}</option>)}</select></label></div>
    {market.Business.reviews&&market.Leisure.reviews?<>
      <div className="diagnostic-kpis">
        <article><span>{t.least}</span><strong>{least.name==="Business"?t.business:t.leisure}</strong><b>{least.rating.toFixed(2)}/5</b><small>{least.recommendation.toFixed(1)}% {t.recommendation.toLowerCase()}</small></article>
        <article><span>{t.largestCriterion}</span><strong>{largestCriterion?.meta[language]}</strong><b>{largestCriterion?`${largestCriterion.gap>=0?"+":""}${largestCriterion.gap.toFixed(2)}`:"—"}</b><small>{largestCriterion?.gap>=0?t.businessHigher:t.leisureHigher}</small></article>
        <article><span>{t.largestAirline}</span><strong>{largestAirline?.name??"—"}</strong><b>{largestAirline?`${largestAirline.gap>=0?"+":""}${largestAirline.gap.toFixed(1)} pp`:"—"}</b><small>{t.recommendation}</small></article>
        <article><span>{t.eligible}</span><strong>{airlineGaps.length}</strong><b>{t.business} × {t.leisure}</b><small>≥ {minReviews} {t.reviews}</small></article>
      </div>
      <section className="focused-panel"><PanelHeading title={t.criteria} note={t.criteriaNote} aside={`${t.business} vs ${t.leisure}`}/><ChartViewport label={t.criteria} language={language}><SegmentCriteriaChart items={criterionGaps} language={language} locale={locale}/></ChartViewport></section>
      <section className="focused-panel"><PanelHeading title={t.airlines} note={t.airlinesNote} aside={`${airlineGaps.length} ${t.eligible.toLowerCase()}`}/>{airlineGaps.length?<ChartViewport label={t.airlines} language={language}><SegmentAirlineChart items={airlineGaps.slice(0,12)} language={language} locale={locale}/></ChartViewport>:<p className="dashboard-empty">{t.noData}</p>}</section>
      <DataInsightSection items={segmentInsights} language={language}/>
    </>:<p className="dashboard-empty">{t.noData}</p>}
  </div>;
}

type CriterionGap = {
  meta:(typeof segmentCriteria)[number];
  business:{score:number;answered:number};
  leisure:{score:number;answered:number};
  gap:number;
};

type AirlineGap = {
  name:string;
  business:SegmentResult;
  leisure:SegmentResult;
  gap:number;
};

function SegmentCriteriaChart({items,language,locale}:{items:CriterionGap[];language:Language;locale:string}){
  const t=copy[language];
  const option=useMemo<EChartsCoreOption>(()=>({
    animationDuration:450,
    aria:{enabled:true,decal:{show:false}},
    color:[chartPalette.accent,chartPalette.coral],
    grid:{left:8,right:36,top:58,bottom:48,containLabel:true},
    legend:{top:8,data:[t.business,t.leisure],textStyle:{color:chartPalette.muted}},
    toolbox:{right:4,feature:{restore:{},saveAsImage:{name:"segment-criteria",pixelRatio:2}}},
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},confine:true,formatter:(raw:unknown)=>{
      const params=(Array.isArray(raw)?raw:[raw]) as Array<{name:string;seriesName:string;marker:string;data:{value:number;answered:number;gap:number}}>;
      if(!params.length)return "";
      return `<strong>${escapeChartHtml(params[0].name)}</strong><br/>${params.map(param=>`${param.marker}${escapeChartHtml(param.seriesName)}: <b>${param.data.value.toFixed(2)}/5</b> · ${param.data.answered.toLocaleString(locale)} ${escapeChartHtml(t.answered)}`).join("<br/>")}<br/>${escapeChartHtml(t.gap)}: ${params[0].data.gap>=0?"+":""}${params[0].data.gap.toFixed(2)}`;
    }},
    xAxis:{type:"value",min:0,max:5,interval:1,axisLabel:{color:chartPalette.muted},splitLine:{lineStyle:{color:chartPalette.line}}},
    yAxis:{type:"category",inverse:true,data:items.map(item=>item.meta[language]),axisTick:{show:false},axisLine:{show:false},axisLabel:{color:chartPalette.text,fontWeight:650}},
    series:[
      {name:t.business,type:"bar",barMaxWidth:22,data:items.map(item=>({value:item.business.score,answered:item.business.answered,gap:item.gap})),itemStyle:{borderRadius:[0,4,4,0]}},
      {name:t.leisure,type:"bar",barMaxWidth:22,data:items.map(item=>({value:item.leisure.score,answered:item.leisure.answered,gap:item.gap})),itemStyle:{borderRadius:[0,4,4,0]}},
    ],
  }),[items,language,locale,t]);
  return <EChart className="echart-compact" option={option} ariaLabel={t.criteria}/>;
}

function SegmentAirlineChart({items,language,locale}:{items:AirlineGap[];language:Language;locale:string}){
  const t=copy[language];
  const maxGap=Math.max(10,...items.map(item=>Math.ceil(Math.abs(item.gap)/10)*10));
  const option=useMemo<EChartsCoreOption>(()=>({
    animationDuration:500,
    aria:{enabled:true,decal:{show:false}},
    grid:{left:8,right:76,top:42,bottom:58,containLabel:true},
    toolbox:{right:4,feature:{dataZoom:{},restore:{},saveAsImage:{name:"segment-airline-gap",pixelRatio:2}}},
    tooltip:{trigger:"axis",axisPointer:{type:"shadow"},confine:true,formatter:(raw:unknown)=>{
      const param=(Array.isArray(raw)?raw[0]:raw) as {name:string;data:{value:number;business:SegmentResult;leisure:SegmentResult}};
      return `<strong>${escapeChartHtml(param.name)}</strong><br/>${escapeChartHtml(t.business)}: <b>${param.data.business.recommendation.toFixed(1)}%</b> · ${param.data.business.reviews.toLocaleString(locale)} ${escapeChartHtml(t.reviews)}<br/>${escapeChartHtml(t.leisure)}: <b>${param.data.leisure.recommendation.toFixed(1)}%</b> · ${param.data.leisure.reviews.toLocaleString(locale)} ${escapeChartHtml(t.reviews)}<br/>${escapeChartHtml(t.gap)}: <b>${param.data.value>=0?"+":""}${param.data.value.toFixed(1)} pp</b>`;
    }},
    xAxis:{type:"value",min:-maxGap,max:maxGap,axisLabel:{color:chartPalette.muted,formatter:"{value} pp"},splitLine:{lineStyle:{color:chartPalette.line}}},
    yAxis:{type:"category",inverse:true,data:items.map(item=>item.name),axisTick:{show:false},axisLine:{show:false},axisLabel:{color:chartPalette.text,width:180,overflow:"truncate",fontWeight:650}},
    dataZoom:[{type:"inside",yAxisIndex:0,filterMode:"none"}],
    series:[{name:t.gap,type:"bar",barMaxWidth:24,data:items.map(item=>({value:item.gap,business:item.business,leisure:item.leisure,itemStyle:{color:item.gap>=0?chartPalette.accent:chartPalette.coral}})),itemStyle:{borderRadius:4},label:{show:true,position:"right",color:chartPalette.text,fontFamily:"monospace",formatter:(params:{value?:number})=>`${Number(params.value??0)>=0?"+":""}${Number(params.value??0).toFixed(1)}`},markLine:{silent:true,symbol:"none",lineStyle:{color:chartPalette.text,width:1},data:[{xAxis:0}]}}],
  }),[items,locale,maxGap,t]);
  return <EChart option={option} ariaLabel={t.airlines}/>;
}
