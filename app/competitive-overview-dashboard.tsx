"use client";

import { useEffect, useMemo, useState } from "react";
import { aggregateEntities, airlineCriteria, airportCriteria, EntitySummary, Language, loadMart, MartRow, num } from "./dashboard-data";
import { DashboardTitle, PanelHeading } from "./dashboard-ui";
import RankingBarChart from "./ranking-bar-chart";
import DataInsightSection, { DataInsight } from "./data-insight-section";
import ChartViewport from "./chart-viewport";
import EChart, { chartPalette, escapeChartHtml } from "./echart";
import type { EChartsCoreOption } from "echarts/core";

type Scope = "airline" | "airport";
type RankMetric = "recommendation" | "overall";

const copy = {
  en: {
    title:"Competitive Overview",subtitle:"See who leads, who falls behind, where the gaps come from and whether the evidence is sufficient.",airline:"Airlines",airport:"Airports",from:"From",to:"To",min:"Minimum reviews",metric:"Ranking metric",recommendation:"Recommendation",rating:"Average rating",reset:"Reset",
    leader:"Leader",laggard:"Laggard",eligible:"Eligible entities",evidence:"Evidence rule",top:"Leaders",bottom:"Falling behind",topNote:"Highest-performing entities after the sample threshold.",bottomNote:"Lowest-performing entities after the same threshold.",criteria:"Criterion diagnostic",criteriaNote:"Score and response coverage for leaders and laggards; hover a cell for evidence detail.",reviews:"reviews",answered:"answered",coverage:"coverage",strong:"Strong",sufficient:"Sufficient",thin:"Thin",loading:"Loading competitive overview…",error:"Competitive data could not be loaded.",noData:"No entities meet the current evidence threshold.",market:"Market",
  },
  vi: {
    title:"Competitive Overview",subtitle:"Xác định ai dẫn đầu, ai tụt lại, khoảng cách nằm ở tiêu chí nào và kết quả có đủ dữ liệu hay không.",airline:"Hãng bay",airport:"Sân bay",from:"Từ năm",to:"Đến năm",min:"Review tối thiểu",metric:"Chỉ số xếp hạng",recommendation:"Tỷ lệ giới thiệu",rating:"Điểm trung bình",reset:"Đặt lại",
    leader:"Dẫn đầu",laggard:"Tụt lại",eligible:"Đối tượng đủ mẫu",evidence:"Quy tắc bằng chứng",top:"Nhóm dẫn đầu",bottom:"Nhóm tụt lại",topNote:"Các đối tượng có kết quả cao nhất sau khi áp dụng ngưỡng mẫu.",bottomNote:"Các đối tượng có kết quả thấp nhất theo cùng một ngưỡng mẫu.",criteria:"Chẩn đoán theo tiêu chí",criteriaNote:"Điểm và độ bao phủ phản hồi của nhóm dẫn đầu và tụt lại; hover để xem chi tiết bằng chứng.",reviews:"review",answered:"trả lời",coverage:"độ phủ",strong:"Mạnh",sufficient:"Đủ",thin:"Mỏng",loading:"Đang tải Competitive Overview…",error:"Không thể tải dữ liệu cạnh tranh.",noData:"Không có đối tượng đạt ngưỡng bằng chứng hiện tại.",market:"Thị trường",
  },
} as const;

export default function CompetitiveOverviewDashboard({language}:{language:Language}) {
  const [airlineRows,setAirlineRows]=useState<MartRow[]|null>(null),[airportRows,setAirportRows]=useState<MartRow[]|null>(null),[failed,setFailed]=useState(false);
  const [scope,setScope]=useState<Scope>("airline"),[metric,setMetric]=useState<RankMetric>("recommendation"),[fromYear,setFromYear]=useState(2019),[toYear,setToYear]=useState(2025),[minReviews,setMinReviews]=useState(50);
  const [focusedName,setFocusedName]=useState<string>();
  const t=copy[language],locale=language==="vi"?"vi-VN":"en-US";

  useEffect(()=>{let active=true;Promise.all([loadMart("/data/marts/airline_yearly_performance.json"),loadMart("/data/marts/airport_yearly_performance.json")]).then(([a,b])=>{if(active){setAirlineRows(a);setAirportRows(b)}}).catch(()=>active&&setFailed(true));return()=>{active=false}},[]);
  const sourceRows=scope==="airline"?airlineRows:airportRows;
  const criteria=scope==="airline"?airlineCriteria:airportCriteria;
  const years=useMemo(()=>sourceRows?[...new Set(sourceRows.map(row=>num(row,"review_year")))].sort((a,b)=>a-b):[],[sourceRows]);
  const summaries=useMemo(()=>aggregateEntities(sourceRows?.filter(row=>num(row,"review_year")>=fromYear&&num(row,"review_year")<=toYear)??[],criteria,scope==="airline"?"airline_id":"airport_id",scope==="airline"?"airline_name":"airport_name").filter(item=>item.reviews>=minReviews),[sourceRows,criteria,scope,fromYear,toYear,minReviews]);
  const value=(item:EntitySummary)=>metric==="recommendation"?item.recommendation:item.averageRating;
  const ordered=[...summaries].sort((a,b)=>value(b)-value(a));
  const top=ordered.slice(0,6),bottom=[...ordered].reverse().slice(0,6);
  const diagnostic=useMemo(()=>{const seen=new Set<number>();return [...top.slice(0,3),...bottom.slice(0,3)].filter(item=>!seen.has(item.id)&&Boolean(seen.add(item.id)))},[summaries,metric]);
  const focusedEntity=summaries.find(item=>item.name===focusedName);
  const format=(item?:EntitySummary)=>item?metric==="recommendation"?`${item.recommendation.toFixed(1)}%`:`${item.averageRating.toFixed(2)}/5`:"—";
  const leader=ordered[0],laggard=ordered.at(-1);
  const criterionGap=leader&&laggard?criteria.map(meta=>({meta,leader:leader.criteria[meta.key],laggard:laggard.criteria[meta.key],gap:leader.criteria[meta.key].score-laggard.criteria[meta.key].score})).filter(item=>item.leader.answered&&item.laggard.answered).sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap))[0]:undefined;
  const weakest=laggard?criteria.map(meta=>({meta,result:laggard.criteria[meta.key]})).filter(item=>item.result.answered).sort((a,b)=>a.result.score-b.result.score)[0]:undefined;
  const competitiveInsights:DataInsight[]=leader&&laggard?language==="vi"?[
    {title:`Khoảng cách giữa ${leader.name} và ${laggard.name}`,body:`Theo ${metric==="recommendation"?t.recommendation.toLowerCase():t.rating.toLowerCase()}, nhóm cần cải thiện đang thấp hơn nhóm dẫn đầu ${Math.abs(value(leader)-value(laggard)).toFixed(metric==="recommendation"?1:2)}${metric==="recommendation"?" điểm %":" điểm"}.`,evidence:`${leader.name}: ${format(leader)} · ${leader.reviews.toLocaleString(locale)} ${t.reviews}; ${laggard.name}: ${format(laggard)} · ${laggard.reviews.toLocaleString(locale)} ${t.reviews}.`},
    {title:criterionGap?`${criterionGap.meta[language]} tạo khoảng cách tiêu chí lớn nhất`:"Chưa đủ dữ liệu so sánh tiêu chí",body:criterionGap?`${laggard.name} đạt ${criterionGap.laggard.score.toFixed(2)}/5 so với ${leader.name} ${criterionGap.leader.score.toFixed(2)}/5; đây là tiêu chí cần được kiểm tra trước khi tìm nguyên nhân vận hành.`:"Không có tiêu chí được trả lời ở cả hai đối tượng để so sánh trực tiếp.",evidence:criterionGap?`${criterionGap.leader.answered.toLocaleString(locale)} / ${criterionGap.laggard.answered.toLocaleString(locale)} ${t.answered} · chênh lệch ${criterionGap.gap>=0?"+":""}${criterionGap.gap.toFixed(2)}.`:`0 ${t.answered}.`},
    {title:weakest?`Điểm yếu nhất của ${laggard.name}: ${weakest.meta[language]}`:"Chưa xác định được điểm yếu",body:weakest?`Điểm ${weakest.result.score.toFixed(2)}/5 là thấp nhất trong các tiêu chí có phản hồi của đối tượng cuối bảng; nên ưu tiên drill-down tiêu chí này thay vì suy đoán từ điểm tổng.`:"Đối tượng cuối bảng chưa có rating tiêu chí đủ để chẩn đoán.",evidence:weakest?`${weakest.result.answered.toLocaleString(locale)} ${t.answered} · ${weakest.result.coverage.toFixed(0)}% ${t.coverage}.`:`0 ${t.answered}.`},
  ]:[
    {title:`Gap between ${leader.name} and ${laggard.name}`,body:`On ${metric==="recommendation"?t.recommendation.toLowerCase():t.rating.toLowerCase()}, the lagging entity trails the leader by ${Math.abs(value(leader)-value(laggard)).toFixed(metric==="recommendation"?1:2)}${metric==="recommendation"?" percentage points":" points"}.`,evidence:`${leader.name}: ${format(leader)} · ${leader.reviews.toLocaleString(locale)} ${t.reviews}; ${laggard.name}: ${format(laggard)} · ${laggard.reviews.toLocaleString(locale)} ${t.reviews}.`},
    {title:criterionGap?`${criterionGap.meta[language]} is the largest criterion gap`:"Insufficient criterion comparison",body:criterionGap?`${laggard.name} scores ${criterionGap.laggard.score.toFixed(2)}/5 versus ${leader.name} at ${criterionGap.leader.score.toFixed(2)}/5; validate this criterion first before diagnosing an operational cause.`:"No criterion is answered for both entities.",evidence:criterionGap?`${criterionGap.leader.answered.toLocaleString(locale)} / ${criterionGap.laggard.answered.toLocaleString(locale)} ${t.answered} · ${criterionGap.gap>=0?"+":""}${criterionGap.gap.toFixed(2)} gap.`:`0 ${t.answered}.`},
    {title:weakest?`${laggard.name}'s weakest result: ${weakest.meta[language]}`:"Weakness not identifiable",body:weakest?`${weakest.result.score.toFixed(2)}/5 is its lowest answered criterion; drill into this result before inferring a cause from the overall score.`:"The lagging entity has no criterion ratings for diagnosis.",evidence:weakest?`${weakest.result.answered.toLocaleString(locale)} ${t.answered} · ${weakest.result.coverage.toFixed(0)}% ${t.coverage}.`:`0 ${t.answered}.`},
  ]:[];
  function reset(){setScope("airline");setMetric("recommendation");setFromYear(2019);setToYear(2025);setMinReviews(50);setFocusedName(undefined)}
  if(failed)return <p className="mart-state mart-error">{t.error}</p>;if(!airlineRows||!airportRows)return <p className="mart-state">{t.loading}</p>;

  return <div className="focused-dashboard competitive-dashboard">
    <DashboardTitle page="01" title={t.title} subtitle={t.subtitle} onReset={reset} resetLabel={t.reset}/>
    <div className="diagnostic-toolbar">
      <div className="dashboard-toggle diagnostic-scope"><button className={scope==="airline"?"active":""} onClick={()=>setScope("airline")}>{t.airline}</button><button className={scope==="airport"?"active":""} onClick={()=>setScope("airport")}>{t.airport}</button></div>
      <label>{t.from}<select value={fromYear} onChange={e=>setFromYear(Math.min(+e.target.value,toYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label>
      <label>{t.to}<select value={toYear} onChange={e=>setToYear(Math.max(+e.target.value,fromYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label>
      <label>{t.metric}<select value={metric} onChange={e=>setMetric(e.target.value as RankMetric)}><option value="recommendation">{t.recommendation}</option><option value="overall">{t.rating}</option></select></label>
      <label>{t.min}<select value={minReviews} onChange={e=>setMinReviews(+e.target.value)}>{[30,50,100,250,500].map(n=><option key={n}>{n}</option>)}</select></label>
    </div>
    {ordered.length?<>
      <div className="diagnostic-kpis">
        <article><span>{t.leader}</span><strong>{ordered[0].name}</strong><b>{format(ordered[0])}</b><small>{ordered[0].reviews.toLocaleString(locale)} {t.reviews}</small></article>
        <article><span>{t.laggard}</span><strong>{ordered.at(-1)?.name}</strong><b>{format(ordered.at(-1))}</b><small>{ordered.at(-1)?.reviews.toLocaleString(locale)} {t.reviews}</small></article>
        <article><span>{t.eligible}</span><strong>{ordered.length.toLocaleString(locale)}</strong><b>{scope==="airline"?t.airline:t.airport}</b><small>{fromYear}–{toYear}</small></article>
        <article><span>{t.evidence}</span><strong>≥ {minReviews}</strong><b>{t.reviews}</b><small>{t.sufficient}</small></article>
      </div>
      <div className="competitive-rank-grid">
        <section className="focused-panel"><PanelHeading title={t.top} note={t.topNote} aside={metric==="recommendation"?t.recommendation:t.rating}/><ChartViewport label={t.top} language={language}><RankingBarChart items={top} language={language} metric={metric} labels={{recommendation:t.recommendation,rating:t.rating,queue:criteria.find(c=>c.key==="queue")?.[language],reviews:t.reviews}} selectedId={focusedEntity?.id} onSelect={setFocusedName}/></ChartViewport></section>
        <section className="focused-panel"><PanelHeading title={t.bottom} note={t.bottomNote} aside={metric==="recommendation"?t.recommendation:t.rating}/><ChartViewport label={t.bottom} language={language}><RankingBarChart items={bottom} language={language} metric={metric} labels={{recommendation:t.recommendation,rating:t.rating,queue:criteria.find(c=>c.key==="queue")?.[language],reviews:t.reviews}} selectedId={focusedEntity?.id} onSelect={setFocusedName}/></ChartViewport></section>
      </div>
      <section className="focused-panel competitive-criteria-panel"><PanelHeading title={t.criteria} note={t.criteriaNote} aside={`${diagnostic.length} × ${criteria.length}`}/><ChartViewport label={t.criteria} language={language}><CompetitiveHeatmapChart items={diagnostic} criteria={criteria} language={language} locale={locale} selectedName={focusedName} onSelect={setFocusedName}/></ChartViewport></section>
      <DataInsightSection items={competitiveInsights} language={language}/>
    </>:<p className="dashboard-empty">{t.noData}</p>}
  </div>;
}

function CompetitiveHeatmapChart({items,criteria,language,locale,selectedName,onSelect}:{items:EntitySummary[];criteria:typeof airlineCriteria;language:Language;locale:string;selectedName?:string;onSelect:(name:string)=>void}){
  const t=copy[language];
  const option=useMemo<EChartsCoreOption>(()=>{
    const data=items.flatMap((item,rowIndex)=>criteria.map((criterion,columnIndex)=>{
      const result=item.criteria[criterion.key];
      return {name:item.name,value:[columnIndex,rowIndex,result.answered?result.score:null],score:result.score,answered:result.answered,coverage:result.coverage,criterion:criterion[language],reviews:item.reviews,itemStyle:selectedName===item.name?{borderColor:chartPalette.text,borderWidth:3}:undefined};
    }));
    return {
      animationDuration:400,
      aria:{enabled:true,decal:{show:false}},
      grid:{left:8,right:58,top:64,bottom:74,containLabel:true},
      toolbox:{right:4,feature:{dataZoom:{},restore:{},saveAsImage:{name:"criterion-heatmap",pixelRatio:2}}},
      tooltip:{trigger:"item",confine:true,formatter:(raw:unknown)=>{
        const param=raw as {data:(typeof data)[number]};const cell=param.data;
        const level=cell.coverage>=70?t.strong:cell.coverage>=40?t.sufficient:t.thin;
        return `<strong>${escapeChartHtml(cell.name)}</strong><br/>${escapeChartHtml(cell.criterion)}: <b>${cell.answered?`${cell.score.toFixed(2)}/5`:"—"}</b><br/>${cell.answered.toLocaleString(locale)} ${escapeChartHtml(t.answered)}<br/>${cell.coverage.toFixed(0)}% ${escapeChartHtml(t.coverage)} · ${escapeChartHtml(level)}<br/>${cell.reviews.toLocaleString(locale)} ${escapeChartHtml(t.reviews)}`;
      }},
      xAxis:{type:"category",data:criteria.map(criterion=>criterion[language]),position:"top",axisTick:{show:false},axisLine:{show:false},axisLabel:{color:chartPalette.text,interval:0,rotate:criteria.length>6?24:0,fontSize:10}},
      yAxis:{type:"category",inverse:true,data:items.map(item=>item.name),axisTick:{show:false},axisLine:{show:false},axisLabel:{color:chartPalette.text,width:180,overflow:"truncate",fontWeight:650}},
      visualMap:{min:1,max:5,calculable:true,orient:"horizontal",left:"center",bottom:8,inRange:{color:["#f5c1b8","#f2ead2","#b8d9d3","#147d73"]},textStyle:{color:chartPalette.muted}},
      dataZoom:[{type:"inside",yAxisIndex:0,filterMode:"none"}],
      series:[{name:t.criteria,type:"heatmap",data,label:{show:true,color:chartPalette.text,formatter:(params:{data?:{score:number;answered:number;coverage:number}})=>params.data?.answered?`${params.data.score.toFixed(2)}\n${params.data.coverage.toFixed(0)}%`:"—"},emphasis:{focus:"self",itemStyle:{shadowBlur:12,shadowColor:"rgba(21,39,43,.28)",borderColor:chartPalette.text,borderWidth:2}}}],
    };
  },[criteria,items,language,locale,selectedName,t]);
  return <EChart option={option} ariaLabel={t.criteria} onClick={params=>params.name&&onSelect(params.name)}/>;
}
