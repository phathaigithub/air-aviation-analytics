import { Language } from "./dashboard-data";
import { PanelHeading } from "./dashboard-ui";

export type DataInsight = {
  title: string;
  body: string;
  evidence: string;
};

export default function DataInsightSection({items,language}:{items:DataInsight[];language:Language}) {
  const title=language==="vi"?"3 insight từ dữ liệu":"3 data-backed insights";
  const note=language==="vi"?"Các nhận định được tính lại theo bộ lọc hiện tại và luôn đi kèm số liệu kiểm chứng.":"Findings are recalculated from the active filters and always include supporting evidence.";
  const aside=language==="vi"?"Không dùng nhận định viết sẵn":"No preset findings";
  return <section className="focused-panel data-insight-section">
    <PanelHeading title={title} note={note} aside={aside}/>
    <div className="data-insight-grid">{items.slice(0,3).map((item,index)=><article key={`${index}-${item.title}`}><span>0{index+1}</span><h4>{item.title}</h4><p>{item.body}</p><small>{item.evidence}</small></article>)}</div>
  </section>;
}
