"use client";

import { useEffect, useMemo, useState } from "react";
import { airlineCriteria, airportCriteria, Criterion, Language, loadMart, MartRow, num, validEntityName } from "./dashboard-data";
import { DashboardTitle, PanelHeading } from "./dashboard-ui";
import DataInsightSection, { DataInsight } from "./data-insight-section";
import ChartViewport from "./chart-viewport";
import EChart, { chartPalette, escapeChartHtml } from "./echart";
import type { EChartsCoreOption } from "echarts/core";

type TrendPoint={year:number;value:number;evidence:number};
type TrendSeries={key:string;label:string;points:TrendPoint[];color:string};
type Risk={scope:"airline"|"airport";name:string;criterion:string;years:number;from:number;to:number;start:number;end:number;change:number;evidence:number};

const colors=["#147d73","#d7533c","#788600","#4169a1","#a45b8e","#c17b22","#4c837a","#78584a"];
const copy={
  en:{title:"Trend & Risk Monitoring",subtitle:"Track every airline and airport criterion over time, detect sustained deterioration and verify each signal against answered-rating volume.",from:"From year",to:"To year",reset:"Reset",rising:"Strongest rising criterion",falling:"Strongest declining criterion",risks:"Sustained-decline risks",evidence:"Total answered ratings",airlineChart:"Airline criterion trends",airportChart:"Airport criterion trends",chartNote:"Each line is a criterion. Hover a point for its score and evidence volume; hollow points have fewer than 30 answers.",riskTitle:"Entities declining continuously",riskNote:"A risk requires at least three consecutive years with 30+ answered ratings for the same criterion and a lower score each year.",airline:"Airline",airport:"Airport",yearStreak:"consecutive years",answered:"answered",perYear:"points per year",noRisk:"No entity has a qualifying continuous decline in the selected period.",loading:"Loading trend monitoring…",error:"Trend data could not be loaded.",noData:"No criterion trend is available for the selected period."},
  vi:{title:"Trend & Risk Monitoring",subtitle:"Theo dõi toàn bộ tiêu chí hãng bay và sân bay theo thời gian, phát hiện suy giảm kéo dài và kiểm tra tín hiệu bằng lượng rating được trả lời.",from:"Từ năm",to:"Đến năm",reset:"Đặt lại",rising:"Tiêu chí tăng mạnh nhất",falling:"Tiêu chí giảm mạnh nhất",risks:"Rủi ro giảm liên tục",evidence:"Tổng rating được trả lời",airlineChart:"Xu hướng tiêu chí hãng bay",airportChart:"Xu hướng tiêu chí sân bay",chartNote:"Mỗi đường là một tiêu chí. Hover vào điểm để xem điểm số và lượng bằng chứng; điểm rỗng có dưới 30 lượt trả lời.",riskTitle:"Đối tượng giảm liên tục",riskNote:"Chỉ cảnh báo khi cùng một tiêu chí có ít nhất ba năm liên tiếp, mỗi năm từ 30 lượt trả lời và điểm giảm qua từng năm.",airline:"Hãng bay",airport:"Sân bay",yearStreak:"năm liên tiếp",answered:"trả lời",perYear:"điểm mỗi năm",noRisk:"Không có đối tượng nào giảm liên tục và đạt điều kiện bằng chứng trong giai đoạn đã chọn.",loading:"Đang tải Trend & Risk Monitoring…",error:"Không thể tải dữ liệu xu hướng.",noData:"Không có xu hướng tiêu chí trong giai đoạn đã chọn."},
} as const;

function annualTrend(rows:MartRow[],criterion:Criterion):TrendPoint[]{
  const groups=new Map<number,MartRow[]>();
  rows.forEach(row=>{const year=num(row,"review_year");groups.set(year,[...(groups.get(year)??[]),row])});
  return [...groups.entries()].sort(([a],[b])=>a-b).map(([year,items])=>{const evidence=items.reduce((sum,row)=>sum+num(row,criterion.count),0);const weighted=items.reduce((sum,row)=>sum+num(row,criterion.score)*num(row,criterion.count),0);return{year,value:evidence?weighted/evidence:0,evidence}}).filter(point=>point.evidence>0);
}

function slope(points:TrendPoint[]){
  const recent=points.slice(-5);if(recent.length<2)return 0;
  const meanX=recent.reduce((sum,p)=>sum+p.year,0)/recent.length,meanY=recent.reduce((sum,p)=>sum+p.value,0)/recent.length;
  const denominator=recent.reduce((sum,p)=>sum+(p.year-meanX)**2,0);
  return denominator?recent.reduce((sum,p)=>sum+(p.year-meanX)*(p.value-meanY),0)/denominator:0;
}

function buildSeries(rows:MartRow[],criteria:Criterion[],language:Language):TrendSeries[]{
  return criteria.map((criterion,index)=>({key:criterion.key,label:criterion[language],points:annualTrend(rows,criterion),color:colors[index%colors.length]})).filter(series=>series.points.length>1);
}

function findRisks(rows:MartRow[],criteria:Criterion[],scope:"airline"|"airport",language:Language):Risk[]{
  const idField=scope==="airline"?"airline_id":"airport_id",nameField=scope==="airline"?"airline_name":"airport_name",groups=new Map<number,MartRow[]>();
  rows.forEach(row=>{const id=num(row,idField);groups.set(id,[...(groups.get(id)??[]),row])});
  const risks:Risk[]=[];
  groups.forEach(items=>criteria.forEach(criterion=>{
    const qualified=items.filter(row=>Boolean(row.meets_reporting_threshold)&&num(row,criterion.count)>=30).sort((a,b)=>num(a,"review_year")-num(b,"review_year"));
    if(qualified.length<3)return;
    const sequence=[qualified.at(-1)!];
    for(let index=qualified.length-2;index>=0;index--){const newer=sequence[0],older=qualified[index];if(num(newer,"review_year")-num(older,"review_year")===1&&num(newer,criterion.score)<num(older,criterion.score))sequence.unshift(older);else break}
    if(sequence.length<3)return;
    const start=num(sequence[0],criterion.score),end=num(sequence.at(-1)!,criterion.score);
    risks.push({scope,name:String(sequence[0][nameField]),criterion:criterion[language],years:sequence.length,from:num(sequence[0],"review_year"),to:num(sequence.at(-1)!,"review_year"),start,end,change:end-start,evidence:sequence.reduce((sum,row)=>sum+num(row,criterion.count),0)});
  }));
  return risks;
}

export default function MultiLineTrendDashboard({language}:{language:Language}){
  const [airlineRows,setAirlineRows]=useState<MartRow[]|null>(null),[airportRows,setAirportRows]=useState<MartRow[]|null>(null),[failed,setFailed]=useState(false),[fromYear,setFromYear]=useState(2019),[toYear,setToYear]=useState(2025);
  const t=copy[language],locale=language==="vi"?"vi-VN":"en-US";
  useEffect(()=>{let active=true;Promise.all([loadMart("/data/marts/airline_yearly_performance.json"),loadMart("/data/marts/airport_yearly_performance.json")]).then(([a,b])=>{if(active){setAirlineRows(a);setAirportRows(b)}}).catch(()=>active&&setFailed(true));return()=>{active=false}},[]);
  const years=useMemo(()=>airlineRows?[...new Set([...airlineRows,...(airportRows??[])].map(row=>num(row,"review_year")))].sort((a,b)=>a-b):[],[airlineRows,airportRows]);
  const filteredAirlines=useMemo(()=>airlineRows?.filter(row=>num(row,"review_year")>=fromYear&&num(row,"review_year")<=toYear&&validEntityName(row.airline_name))??[],[airlineRows,fromYear,toYear]);
  const filteredAirports=useMemo(()=>airportRows?.filter(row=>num(row,"review_year")>=fromYear&&num(row,"review_year")<=toYear&&validEntityName(row.airport_name))??[],[airportRows,fromYear,toYear]);
  const airlineSeries=useMemo(()=>buildSeries(filteredAirlines,airlineCriteria,language),[filteredAirlines,language]);
  const airportSeries=useMemo(()=>buildSeries(filteredAirports,airportCriteria,language),[filteredAirports,language]);
  const signals=[...airlineSeries.map(series=>({...series,scope:"airline" as const,rate:slope(series.points)})),...airportSeries.map(series=>({...series,scope:"airport" as const,rate:slope(series.points)}))];
  const rising=[...signals].filter(item=>item.rate>0).sort((a,b)=>b.rate-a.rate)[0],falling=[...signals].filter(item=>item.rate<0).sort((a,b)=>a.rate-b.rate)[0];
  const risks=useMemo(()=>[...findRisks(filteredAirlines,airlineCriteria,"airline",language),...findRisks(filteredAirports,airportCriteria,"airport",language)].sort((a,b)=>a.change-b.change||b.years-a.years),[filteredAirlines,filteredAirports,language]);
  const totalEvidence=[...airlineSeries,...airportSeries].reduce((sum,series)=>sum+series.points.reduce((pointSum,point)=>pointSum+point.evidence,0),0);
  const trendEvidence=(signal:typeof rising)=>signal?signal.points.slice(-5).reduce((sum,point)=>sum+point.evidence,0):0;
  const topRisk=risks[0];
  const trendInsights:DataInsight[]=language==="vi"?[
    rising?{title:`${rising.label} là tiêu chí tăng nhanh nhất`,body:`Xu hướng tăng trung bình ${rising.rate.toFixed(2)} điểm mỗi năm trong tối đa 5 năm dữ liệu gần nhất; nên tiếp tục theo dõi để xác nhận mức tăng được duy trì.`,evidence:`${rising.scope==="airline"?t.airline:t.airport} · ${rising.points.slice(-5)[0].year}–${rising.points.at(-1)!.year} · ${trendEvidence(rising).toLocaleString(locale)} ${t.answered}.`}:{title:"Không có tiêu chí tăng",body:"Không có đường xu hướng nào có slope dương trong giai đoạn đã chọn.",evidence:`${fromYear}–${toYear} · ${totalEvidence.toLocaleString(locale)} ${t.answered}.`},
    falling?{title:`${falling.label} là tiêu chí giảm nhanh nhất`,body:`Xu hướng giảm ${Math.abs(falling.rate).toFixed(2)} điểm mỗi năm trong tối đa 5 năm gần nhất; đây là tín hiệu nên được kiểm tra nguyên nhân trước các tiêu chí không giảm.`,evidence:`${falling.scope==="airline"?t.airline:t.airport} · ${falling.points.slice(-5)[0].year}–${falling.points.at(-1)!.year} · ${trendEvidence(falling).toLocaleString(locale)} ${t.answered}.`}:{title:"Không có tiêu chí giảm",body:"Không có đường xu hướng nào có slope âm trong giai đoạn đã chọn.",evidence:`${fromYear}–${toYear} · ${totalEvidence.toLocaleString(locale)} ${t.answered}.`},
    topRisk?{title:`${topRisk.name} có rủi ro giảm rõ nhất ở ${topRisk.criterion}`,body:`Điểm giảm liên tục từ ${topRisk.start.toFixed(2)} xuống ${topRisk.end.toFixed(2)} trong ${topRisk.years} năm; nên drill-down đối tượng–tiêu chí này trước khi đề xuất biện pháp cải thiện.`,evidence:`${topRisk.scope==="airline"?t.airline:t.airport} · ${topRisk.from}–${topRisk.to} · ${topRisk.evidence.toLocaleString(locale)} ${t.answered} · thay đổi ${topRisk.change.toFixed(2)}.`}:{title:"Chưa có rủi ro giảm liên tục đủ bằng chứng",body:"Không có đối tượng–tiêu chí nào giảm trong ít nhất 3 năm liên tiếp với từ 30 lượt trả lời mỗi năm.",evidence:`0 ${t.risks.toLowerCase()} · ${fromYear}–${toYear}.`},
  ]:[
    rising?{title:`${rising.label} is the fastest-rising criterion`,body:`The trend rises by ${rising.rate.toFixed(2)} points per year over up to five latest available years; continue monitoring to confirm that the gain persists.`,evidence:`${rising.scope==="airline"?t.airline:t.airport} · ${rising.points.slice(-5)[0].year}–${rising.points.at(-1)!.year} · ${trendEvidence(rising).toLocaleString(locale)} ${t.answered}.`}:{title:"No rising criterion",body:"No criterion line has a positive slope in the selected period.",evidence:`${fromYear}–${toYear} · ${totalEvidence.toLocaleString(locale)} ${t.answered}.`},
    falling?{title:`${falling.label} is the fastest-declining criterion`,body:`The trend falls by ${Math.abs(falling.rate).toFixed(2)} points per year over up to five latest available years; investigate this signal before criteria without a decline.`,evidence:`${falling.scope==="airline"?t.airline:t.airport} · ${falling.points.slice(-5)[0].year}–${falling.points.at(-1)!.year} · ${trendEvidence(falling).toLocaleString(locale)} ${t.answered}.`}:{title:"No declining criterion",body:"No criterion line has a negative slope in the selected period.",evidence:`${fromYear}–${toYear} · ${totalEvidence.toLocaleString(locale)} ${t.answered}.`},
    topRisk?{title:`${topRisk.name} has the clearest decline risk in ${topRisk.criterion}`,body:`Its score declines continuously from ${topRisk.start.toFixed(2)} to ${topRisk.end.toFixed(2)} across ${topRisk.years} years; drill into this entity–criterion pair before prescribing an improvement.`,evidence:`${topRisk.scope==="airline"?t.airline:t.airport} · ${topRisk.from}–${topRisk.to} · ${topRisk.evidence.toLocaleString(locale)} ${t.answered} · ${topRisk.change.toFixed(2)} change.`}:{title:"No evidence-qualified continuous decline",body:"No entity–criterion pair declines for at least three consecutive years with 30 or more answers per year.",evidence:`0 ${t.risks.toLowerCase()} · ${fromYear}–${toYear}.`},
  ];
  function reset(){setFromYear(2019);setToYear(2025)}
  if(failed)return <p className="mart-state mart-error">{t.error}</p>;if(!airlineRows||!airportRows)return <p className="mart-state">{t.loading}</p>;
  return <div className="focused-dashboard trend-risk-dashboard">
    <DashboardTitle page="03" title={t.title} subtitle={t.subtitle} onReset={reset} resetLabel={t.reset}/>
    <div className="diagnostic-toolbar trend-time-toolbar"><label>{t.from}<select value={fromYear} onChange={e=>setFromYear(Math.min(+e.target.value,toYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label><label>{t.to}<select value={toYear} onChange={e=>setToYear(Math.max(+e.target.value,fromYear))}>{years.map(year=><option key={year}>{year}</option>)}</select></label></div>
    {airlineSeries.length||airportSeries.length?<>
      <div className="diagnostic-kpis"><article><span>{t.rising}</span><strong>{rising?.label??"—"}</strong><b className="positive">{rising?`+${rising.rate.toFixed(2)}`:"—"}</b><small>{rising?(rising.scope==="airline"?t.airline:t.airport):""} · {t.perYear}</small></article><article><span>{t.falling}</span><strong>{falling?.label??"—"}</strong><b className="negative">{falling?.rate.toFixed(2)??"—"}</b><small>{falling?(falling.scope==="airline"?t.airline:t.airport):""} · {t.perYear}</small></article><article><span>{t.risks}</span><strong>{risks.length}</strong><b>{t.airline} + {t.airport}</b><small>≥ 3 {t.yearStreak}</small></article><article><span>{t.evidence}</span><strong>{totalEvidence.toLocaleString(locale)}</strong><b>{t.answered}</b><small>{fromYear}–{toYear}</small></article></div>
      <section className="focused-panel"><PanelHeading title={t.airlineChart} note={t.chartNote} aside={`${airlineSeries.length} lines`}/><ChartViewport label={t.airlineChart} language={language}><MultiLineChart series={airlineSeries} locale={locale} evidenceLabel={t.answered}/></ChartViewport></section>
      <section className="focused-panel"><PanelHeading title={t.airportChart} note={t.chartNote} aside={`${airportSeries.length} lines`}/><ChartViewport label={t.airportChart} language={language}><MultiLineChart series={airportSeries} locale={locale} evidenceLabel={t.answered}/></ChartViewport></section>
      <section className="focused-panel"><PanelHeading title={t.riskTitle} note={t.riskNote} aside={`${risks.length} ${t.risks.toLowerCase()}`}/>{risks.length?<div className="continuous-risk-list">{risks.slice(0,12).map((risk,index)=><article key={`${risk.scope}-${risk.name}-${risk.criterion}`}><span>{String(index+1).padStart(2,"0")}</span><strong>{risk.name}<small>{risk.scope==="airline"?t.airline:t.airport} · {risk.criterion}</small></strong><div><i style={{width:`${Math.min(100,Math.abs(risk.change)/2*100)}%`}}/></div><b>{risk.start.toFixed(2)} → {risk.end.toFixed(2)}</b><em>{risk.change.toFixed(2)}</em><small>{risk.from}–{risk.to} · {risk.evidence.toLocaleString(locale)} {t.answered}</small></article>)}</div>:<p className="dashboard-empty">{t.noRisk}</p>}</section>
      <DataInsightSection items={trendInsights} language={language}/>
    </>:<p className="dashboard-empty">{t.noData}</p>}
  </div>;
}

function MultiLineChart({series,locale,evidenceLabel}:{series:TrendSeries[];locale:string;evidenceLabel:string}){
  const option=useMemo<EChartsCoreOption>(()=>({
    animationDuration:500,
    aria:{enabled:true,decal:{show:false}},
    color:series.map(item=>item.color),
    grid:{left:54,right:28,top:82,bottom:78,containLabel:true},
    legend:{type:"scroll",top:8,left:8,right:96,textStyle:{color:chartPalette.muted,fontSize:11},selectedMode:"multiple"},
    toolbox:{right:4,top:2,feature:{dataZoom:{},restore:{},saveAsImage:{name:"aviation-trends",pixelRatio:2}}},
    tooltip:{
      trigger:"axis",
      confine:true,
      axisPointer:{type:"cross"},
      formatter:(raw:unknown)=>{
        const params=(Array.isArray(raw)?raw:[raw]) as Array<{seriesName:string;marker:string;data:{value:[number,number];evidence:number}}>;
        if(!params.length)return "";
        const year=params[0].data.value[0];
        return `<strong>${year}</strong><br/>${params.map(param=>`${param.marker}${escapeChartHtml(param.seriesName)}: <b>${param.data.value[1].toFixed(2)}/5</b> · ${param.data.evidence.toLocaleString(locale)} ${escapeChartHtml(evidenceLabel)}`).join("<br/>")}`;
      },
    },
    xAxis:{type:"value",min:"dataMin",max:"dataMax",minInterval:1,axisLabel:{color:chartPalette.muted,formatter:(value:number)=>String(Math.round(value))},splitLine:{show:false}},
    yAxis:{type:"value",min:0,max:5,interval:1,axisLabel:{color:chartPalette.muted},splitLine:{lineStyle:{color:chartPalette.line}}},
    dataZoom:[{type:"inside",xAxisIndex:0},{type:"slider",xAxisIndex:0,height:18,bottom:20,borderColor:"transparent",fillerColor:"rgba(20,125,115,.14)"}],
    series:series.map(item=>({
      name:item.label,
      type:"line",
      smooth:.18,
      showSymbol:true,
      symbol:"circle",
      symbolSize:(value:unknown,params:{data:{evidence:number}})=>params.data.evidence>=30?8:6,
      connectNulls:false,
      emphasis:{focus:"series",lineStyle:{width:4}},
      lineStyle:{width:2.5,color:item.color},
      itemStyle:{color:chartPalette.surface,borderColor:item.color,borderWidth:2.5},
      data:item.points.map(point=>({value:[point.year,point.value],evidence:point.evidence,itemStyle:point.evidence<30?{color:chartPalette.surface,borderType:"dashed"}:undefined})),
    })),
  }),[series,locale,evidenceLabel]);
  return <EChart option={option} ariaLabel={evidenceLabel}/>;
}
