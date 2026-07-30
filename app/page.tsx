"use client";

import { useMemo, useState } from "react";

type QueryStatus = "recorded" | "pending" | "review";

type AdHocQuery = {
  id: string;
  number: string;
  title: string;
  category: string;
  status: QueryStatus;
  purpose: string;
  sql: string;
  result?: string;
};

const queries: AdHocQuery[] = [
  {
    id: "review-volume",
    number: "01",
    title: "Tổng số đánh giá chuyến bay",
    category: "Tổng quan",
    status: "recorded",
    purpose: "Xác lập quy mô tập airline review trước khi phân tích.",
    sql: "SELECT COUNT(*) AS total_reviews\nFROM validated.airline_reviews;",
    result: "156.323 airline reviews.",
  },
  {
    id: "most-mentioned",
    number: "02",
    title: "Hãng bay được nhắc tới nhiều nhất",
    category: "Hãng bay",
    status: "pending",
    purpose: "Đo mức độ hiện diện của từng hãng trong tập review.",
    sql: "SELECT a.airline_name, COUNT(*) AS review_count\nFROM validated.airline_reviews ar\nJOIN validated.airlines a ON a.airline_id = ar.airline_id\nGROUP BY a.airline_name\nORDER BY review_count DESC;",
  },
  {
    id: "recommendation-rate",
    number: "03",
    title: "Tỷ lệ khách hàng sẵn sàng giới thiệu",
    category: "Tổng quan",
    status: "pending",
    purpose: "Thiết lập KPI recommendation rate toàn bộ airline review.",
    sql: "SELECT COUNT(*) AS total_reviews,\n       ROUND(100.0 * AVG(CAST(is_recommended AS decimal)), 2) AS recommendation_rate_pct\nFROM validated.airline_reviews;",
  },
  {
    id: "nationalities",
    number: "04",
    title: "10 quốc tịch để lại nhiều đánh giá nhất",
    category: "Khách hàng",
    status: "recorded",
    purpose: "Hiểu cấu trúc địa lý của tập người viết review.",
    sql: "SELECT TOP (10) nationality, COUNT(*) AS review_count\nFROM validated.airline_reviews\nWHERE duplicate_rank = 1\nGROUP BY nationality\nORDER BY review_count DESC;",
    result:
      "Hoa Kỳ 51.208; Vương quốc Anh 24.934; Australia 13.414; Canada 12.756.",
  },
  {
    id: "seat-satisfaction",
    number: "05",
    title: "Điểm hài lòng ghế ngồi trung bình",
    category: "Dịch vụ",
    status: "pending",
    purpose: "Thiết lập baseline cho tiêu chí seat comfort.",
    sql: "SELECT COUNT(seat_comfort_clean) AS answered_reviews,\n       AVG(CAST(seat_comfort_clean AS decimal(10, 2))) AS avg_score\nFROM validated.airline_reviews;",
  },
  {
    id: "value-airlines",
    number: "06",
    title: "Top 10 hãng đáng tiền nhất",
    category: "Hãng bay",
    status: "recorded",
    purpose: "Xếp hạng value for money với ngưỡng mẫu tối thiểu 100.",
    sql: "SELECT TOP (10) a.airline_name,\n       AVG(CAST(ar.value_for_money_clean AS decimal(10, 2))) AS avg_score\nFROM validated.airline_reviews ar\nJOIN validated.airlines a ON a.airline_id = ar.airline_id\nWHERE ar.duplicate_rank = 1\nGROUP BY a.airline_name\nHAVING COUNT(ar.value_for_money_clean) >= 100\nORDER BY avg_score DESC;",
    result:
      "Hainan Airlines 4,40; China Southern Airlines 4,28; Garuda Indonesia 4,22.",
  },
  {
    id: "traveller-sentiment",
    number: "07",
    title: "Thiện cảm theo nhóm hành khách",
    category: "Khách hàng",
    status: "recorded",
    purpose: "So sánh recommendation rate giữa các travel segments.",
    sql: "SELECT type_of_traveller_normalized,\n       COUNT(*) AS review_count,\n       100.0 * AVG(CAST(is_recommended AS decimal(10, 2))) AS recommendation_rate\nFROM validated.airline_reviews\nWHERE duplicate_rank = 1\nGROUP BY type_of_traveller_normalized;",
    result:
      "Solo Leisure 37,71%; Business 31,09%; Couple Leisure 29,36%; Family Leisure 27,04%.",
  },
  {
    id: "airport-queues",
    number: "08",
    title: "10 sân bay bị chê xếp hàng lâu",
    category: "Sân bay",
    status: "recorded",
    purpose: "Tìm airport pain points theo điểm queuing thấp.",
    sql: "SELECT TOP (10) ap.airport_name,\n       AVG(CAST(apr.queuing_times_clean AS decimal(10, 2))) AS avg_queue_score\nFROM validated.airport_reviews apr\nJOIN validated.airports ap ON ap.airport_id = apr.airport_id\nWHERE duplicate_rank = 1\nGROUP BY ap.airport_name\nHAVING COUNT(*) >= 50\nORDER BY avg_queue_score ASC;",
    result:
      "Grenoble 1,11; Berlin Brandenburg 1,46; Lyon 1,57; Montego Bay 1,58.",
  },
  {
    id: "cabin-service",
    number: "09",
    title: "Phục vụ tiếp viên theo hạng ghế",
    category: "Dịch vụ",
    status: "recorded",
    purpose: "So sánh cabin staff service giữa các cabin.",
    sql: "SELECT seat_type_normalized,\n       COUNT(*) AS review_count,\n       AVG(CAST(cabin_staff_service_clean AS decimal(10, 2))) AS avg_score\nFROM validated.airline_reviews\nWHERE seat_type_normalized <> 'Unknown' AND duplicate_rank = 1\nGROUP BY seat_type_normalized\nORDER BY avg_score DESC;",
    result:
      "Business 3,74; First 3,53; Premium Economy 3,06; Economy 2,82.",
  },
  {
    id: "yearly-volume",
    number: "10",
    title: "Số lượt đánh giá theo năm",
    category: "Thời gian",
    status: "recorded",
    purpose: "Đánh giá độ phủ thời gian và biến động volume.",
    sql: "SELECT YEAR(date_submitted_clean) AS review_year,\n       COUNT(*) AS review_count\nFROM validated.airline_reviews\nWHERE duplicate_rank = 1\nGROUP BY YEAR(date_submitted_clean)\nORDER BY review_year;",
    result:
      "Volume đạt đỉnh trong dữ liệu ghi nhận ở 2019 với 16.251 review; 2020 còn 6.155.",
  },
  {
    id: "annual-ranking",
    number: "11",
    title: "Xếp hạng value for money theo năm",
    category: "Thời gian",
    status: "review",
    purpose: "Theo dõi hãng nổi bật từng năm với ngưỡng 50 đánh giá.",
    sql: "DENSE_RANK() OVER (\n  PARTITION BY review_year\n  ORDER BY avg_value_for_money\n) AS yearly_rank",
    result:
      "Đã có output 2011–2025, nhưng ORDER BY đang tăng dần nên hiện phản ánh nhóm điểm thấp thay vì nhóm dẫn đầu.",
  },
  {
    id: "seat-trend",
    number: "12",
    title: "Xu hướng hài lòng ghế ngồi",
    category: "Thời gian",
    status: "pending",
    purpose: "Đo mức thay đổi seat comfort so với năm trước bằng LAG.",
    sql: "SELECT review_year, avg_seat_score,\n       avg_seat_score - LAG(avg_seat_score) OVER (ORDER BY review_year) AS yoy_change\nFROM yearly_seat_scores;",
  },
  {
    id: "value-quartiles",
    number: "13",
    title: "Phân nhóm hãng theo mức đáng tiền",
    category: "Hãng bay",
    status: "pending",
    purpose: "Chia hãng thành bốn nhóm bằng NTILE để benchmark.",
    sql: "NTILE(4) OVER (\n  ORDER BY avg_value_for_money DESC\n) AS value_quartile",
  },
  {
    id: "route-complaints",
    number: "14",
    title: "20 chặng bay có recommendation thấp",
    category: "Tuyến bay",
    status: "pending",
    purpose: "Tìm route pain points với ít nhất 30 review.",
    sql: "SELECT TOP (20) origin_airport_clean, destination_airport_clean,\n       100.0 * AVG(CAST(is_recommended AS decimal(10, 2))) AS recommendation_rate\nFROM validated.airline_reviews\nWHERE duplicate_rank = 1\nGROUP BY origin_airport_clean, destination_airport_clean\nHAVING COUNT(*) >= 30\nORDER BY recommendation_rate ASC;",
  },
  {
    id: "premium",
    number: "15",
    title: "Hãng mạnh cả lounge lẫn ghế",
    category: "Premium",
    status: "pending",
    purpose: "Đánh giá trải nghiệm premium toàn diện trên hai nguồn review.",
    sql: "premium_overall_score =\n  (avg_lounge_score + avg_seat_score) / 2\n\nMinimum sample: 10 lounge + 10 seat reviews.",
  },
];

const categories = [
  "Tất cả",
  "Tổng quan",
  "Hãng bay",
  "Khách hàng",
  "Dịch vụ",
  "Sân bay",
  "Tuyến bay",
  "Thời gian",
  "Premium",
];

const statusLabel: Record<QueryStatus, string> = {
  recorded: "Có kết quả ghi lại",
  pending: "Chờ xuất kết quả",
  review: "Cần rà soát logic",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function PlaneMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M7 34 57 14 39 36l-2 17-9-12-10 6 2-12Z" />
      <path d="m20 35 19 1" />
    </svg>
  );
}

export default function Home() {
  const [category, setCategory] = useState("Tất cả");
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredQueries = useMemo(
    () =>
      category === "Tất cả"
        ? queries
        : queries.filter((query) => query.category === category),
    [category],
  );

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Xóm Air — về đầu trang">
          <span className="brand-mark">
            <PlaneMark />
          </span>
          <span>
            XÓM AIR
            <small>analytics case study</small>
          </span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-label="Mở menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav className={menuOpen ? "nav-open" : ""}>
          <a href="#case-study" onClick={() => setMenuOpen(false)}>
            Case study
          </a>
          <a href="#method" onClick={() => setMenuOpen(false)}>
            Phương pháp
          </a>
          <a href="#signals" onClick={() => setMenuOpen(false)}>
            Tín hiệu
          </a>
          <a href="#ad-hoc" onClick={() => setMenuOpen(false)}>
            15 ad-hoc
          </a>
          <a className="nav-cta" href="#roadmap" onClick={() => setMenuOpen(false)}>
            Tiến độ <ArrowIcon />
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Aviation customer experience / Case study 01</p>
            <h1>
              Biến tiếng nói
              <br />
              hành khách thành
              <br />
              <em>tín hiệu quyết định.</em>
            </h1>
            <p className="hero-lede">
              Một dự án end-to-end xử lý và khám phá <strong>214.681 đánh giá</strong>{" "}
              về hãng bay, sân bay, phòng chờ và ghế ngồi bằng Python cùng SQL
              Server.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#case-study">
                Khám phá case study <ArrowIcon />
              </a>
              <a className="text-link" href="#ad-hoc">
                Xem 15 câu hỏi SQL
              </a>
            </div>
          </div>

          <aside className="flight-recorder" aria-label="Trạng thái dự án">
            <div className="recorder-top">
              <span>PROJECT STATUS</span>
              <span className="live-dot">ACTIVE</span>
            </div>
            <div className="route-art" aria-hidden="true">
              <span className="route-origin">RAW</span>
              <span className="route-line">
                <i />
              </span>
              <span className="route-destination">SQL</span>
            </div>
            <dl className="recorder-stats">
              <div>
                <dt>Review records</dt>
                <dd>214.681</dd>
              </div>
              <div>
                <dt>Source tables</dt>
                <dd>06</dd>
              </div>
              <div>
                <dt>Acceptance checks</dt>
                <dd>15/15</dd>
              </div>
              <div>
                <dt>Ad-hoc questions</dt>
                <dd>15</dd>
              </div>
            </dl>
            <div className="recorder-footer">
              <span>Current checkpoint</span>
              <strong>Ad-hoc exploration complete</strong>
            </div>
          </aside>
        </div>
        <div className="hero-index">
          <span>SQL Server</span>
          <span>Python 3.11+</span>
          <span>Validated layer</span>
          <span>Vietnam / 2026</span>
        </div>
      </section>

      <section className="case-study section" id="case-study">
        <div className="section-heading">
          <p className="section-number">01 / THE BRIEF</p>
          <div>
            <h2>Hiểu trải nghiệm bay ở nơi nó thực sự đứt gãy.</h2>
            <p>
              Dữ liệu review tự nguyện không trả lời mọi câu hỏi, nhưng đủ để
              định vị pain point, khoảng cách phân khúc và những tín hiệu đáng
              kiểm chứng tiếp theo.
            </p>
          </div>
        </div>

        <div className="brief-grid">
          <article className="brief-card brief-card-dark">
            <span className="card-kicker">Business objective</span>
            <h3>Từ điểm số rời rạc đến thứ tự ưu tiên có căn cứ.</h3>
            <p>
              Project hướng đến việc xác định hãng và sân bay đang dẫn đầu hoặc
              mất điểm, dịch vụ liên hệ với recommendation, và trải nghiệm nào
              cần ưu tiên cải thiện.
            </p>
          </article>
          <article className="brief-card">
            <span className="card-kicker">Dataset scope</span>
            <ul className="scope-list">
              <li>
                <strong>156.323</strong>
                <span>airline reviews</span>
              </li>
              <li>
                <strong>49.505</strong>
                <span>airport reviews</span>
              </li>
              <li>
                <strong>5.087</strong>
                <span>lounge reviews</span>
              </li>
              <li>
                <strong>3.766</strong>
                <span>seat reviews</span>
              </li>
            </ul>
          </article>
          <article className="brief-card brief-questions">
            <span className="card-kicker">Decision questions</span>
            <ol>
              <li>Ai đang dẫn đầu — và kết quả có đủ mẫu không?</li>
              <li>Nhóm hành khách nào đang có trải nghiệm kém hơn?</li>
              <li>Airport, route và service nào tạo ra pain point?</li>
              <li>Hãng nào nhất quán ở cả lounge và seat?</li>
            </ol>
          </article>
        </div>
      </section>

      <section className="method section section-dark" id="method">
        <div className="section-heading section-heading-light">
          <p className="section-number">02 / DATA METHOD</p>
          <div>
            <h2>Một pipeline có thể truy vết, không sửa nguồn.</h2>
            <p>
              Nguồn SQL Server được giữ read-only. Python đảm nhiệm export,
              cleaning và validation trước khi dữ liệu được nạp vào schema
              validated của database AirReviews.
            </p>
          </div>
        </div>

        <div className="pipeline">
          {[
            ["01", "Raw extract", "6 CSV / 97 trường", "done"],
            ["02", "Python cleaning", "Row-preserving", "done"],
            ["03", "Validation", "15/15 checks PASS", "done"],
            ["04", "SQL validated", "6 bảng / 214.681 review", "done"],
            ["05", "Ad-hoc SQL", "15 câu hỏi đã chạy", "done"],
            ["06", "Marts & visuals", "Sắp triển khai", "next"],
          ].map(([step, title, note, status]) => (
            <article className={`pipeline-step pipeline-${status}`} key={step}>
              <span>{step}</span>
              <div>
                <h3>{title}</h3>
                <p>{note}</p>
              </div>
              <i>{status === "done" ? "✓" : "→"}</i>
            </article>
          ))}
        </div>

        <div className="guardrails">
          <div>
            <span className="guardrail-value">100%</span>
            <p>review được giữ lại sau cleaning</p>
          </div>
          <div>
            <span className="guardrail-value">0</span>
            <p>foreign-key orphan sau validation</p>
          </div>
          <div>
            <span className="guardrail-value">1–5</span>
            <p>rating range được bảo toàn</p>
          </div>
          <div>
            <span className="guardrail-value">NULL</span>
            <p>rating thiếu không bị impute</p>
          </div>
        </div>
      </section>

      <section className="signals section" id="signals">
        <div className="section-heading">
          <p className="section-number">03 / EARLY SIGNALS</p>
          <div>
            <h2>Những tín hiệu sơ bộ đã đọc được từ output SQL.</h2>
            <p>
              Đây là kết quả mô tả đã được ghi cùng truy vấn, chưa phải insight
              cuối cùng. Chart, coverage audit và diễn giải kinh doanh sẽ được
              cập nhật ở vòng tiếp theo.
            </p>
          </div>
        </div>

        <div className="signal-grid">
          <article className="signal-card signal-feature">
            <div className="signal-topline">
              <span>Value for money</span>
              <span>≥100 ratings</span>
            </div>
            <p className="signal-rank">01</p>
            <h3>Hainan Airlines</h3>
            <div className="score-row">
              <strong>4,40</strong>
              <span>/ 5,00</span>
            </div>
            <p>
              Dẫn đầu output đã lưu, theo sau bởi China Southern Airlines
              (4,28) và Garuda Indonesia (4,22).
            </p>
          </article>

          <article className="signal-card">
            <div className="signal-topline">
              <span>Traveller gap</span>
              <span>Recommendation</span>
            </div>
            <h3>Solo Leisure đang tích cực nhất trong các nhóm đã biết.</h3>
            <div className="mini-comparison">
              <span>Solo</span>
              <b style={{ "--bar": "75%" } as React.CSSProperties}>37,71%</b>
              <span>Family</span>
              <b style={{ "--bar": "54%" } as React.CSSProperties}>27,04%</b>
            </div>
            <p className="signal-note">
              Nhóm “Unknown” đạt 53,27% nhưng không nên diễn giải như một segment.
            </p>
          </article>

          <article className="signal-card">
            <div className="signal-topline">
              <span>Airport pain point</span>
              <span>Queue score</span>
            </div>
            <h3>Grenoble xuất hiện thấp nhất trong output xếp hàng.</h3>
            <div className="score-row score-row-alert">
              <strong>1,11</strong>
              <span>/ 5,00 · 77 reviews</span>
            </div>
            <p>
              Berlin Brandenburg (1,46) và Lyon (1,57) là hai điểm tiếp theo cần
              kiểm chứng coverage.
            </p>
          </article>

          <article className="signal-card">
            <div className="signal-topline">
              <span>Cabin service</span>
              <span>Staff score</span>
            </div>
            <h3>Khoảng cách rõ giữa Business và Economy.</h3>
            <div className="metric-pair">
              <div>
                <strong>3,74</strong>
                <span>Business</span>
              </div>
              <div>
                <strong>2,82</strong>
                <span>Economy</span>
              </div>
            </div>
            <p className="signal-note">
              Chênh lệch mô tả 0,92 điểm; chưa kiểm soát airline mix hay thời gian.
            </p>
          </article>
        </div>

        <div className="signal-disclaimer">
          <span>READING NOTE</span>
          <p>
            Review tự nguyện không đại diện ngẫu nhiên cho toàn bộ hành khách.
            Các kết quả phản ánh association trong tập dữ liệu, không mặc định là
            quan hệ nhân quả.
          </p>
        </div>
      </section>

      <section className="adhoc section" id="ad-hoc">
        <div className="section-heading">
          <p className="section-number">04 / QUERY LOG</p>
          <div>
            <h2>15 câu hỏi ad-hoc, một lớp dữ liệu đã kiểm chứng.</h2>
            <p>
              Lọc theo chủ đề, mở từng card để xem logic SQL rút gọn và trạng
              thái output hiện tại.
            </p>
          </div>
        </div>

        <div className="query-toolbar" aria-label="Lọc truy vấn theo chủ đề">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="query-count">
          Hiển thị <strong>{filteredQueries.length}</strong> / 15 truy vấn
        </div>

        <div className="query-grid">
          {filteredQueries.map((query) => (
            <details className="query-card" key={query.id}>
              <summary>
                <span className="query-number">{query.number}</span>
                <div className="query-title">
                  <span>{query.category}</span>
                  <h3>{query.title}</h3>
                  <p>{query.purpose}</p>
                </div>
                <span className={`status status-${query.status}`}>
                  {statusLabel[query.status]}
                </span>
                <span className="query-toggle" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="query-detail">
                <div>
                  <span className="detail-label">SQL logic</span>
                  <pre>
                    <code>{query.sql}</code>
                  </pre>
                </div>
                <div className="query-output">
                  <span className="detail-label">Recorded output</span>
                  <p>
                    {query.result ??
                      "Truy vấn đã chạy thành công; kết quả chưa được xuất vào source để website đọc."}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="roadmap section section-coral" id="roadmap">
        <div className="section-heading">
          <p className="section-number">05 / WHAT’S NEXT</p>
          <div>
            <h2>Nền móng đã xong. Lớp kể chuyện sẽ được bổ sung tiếp.</h2>
            <p>
              Website hiện phản ánh đúng checkpoint của project. Ba lớp dưới đây
              đã có vị trí sẵn để cập nhật mà không phải thiết kế lại case study.
            </p>
          </div>
        </div>

        <div className="roadmap-grid">
          <article>
            <span>01</span>
            <h3>Export query results</h3>
            <p>
              Python chạy 15 file SQL và sinh JSON có metadata, sample threshold
              và thời điểm refresh.
            </p>
            <strong>Next action</strong>
          </article>
          <article>
            <span>02</span>
            <h3>Visual evidence</h3>
            <p>
              Thêm trend, ranking, segment gap và premium consistency từ output
              đã đối soát.
            </p>
            <strong>Planned</strong>
          </article>
          <article>
            <span>03</span>
            <h3>Insights & marts</h3>
            <p>
              Chốt KPI ổn định, chuyển logic lặp lại thành mart rồi viết
              recommendation có mức ưu tiên.
            </p>
            <strong>Planned</strong>
          </article>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark">
            <PlaneMark />
          </span>
          <div>
            <strong>XÓM AIR</strong>
            <p>Aviation Customer Experience Analytics</p>
          </div>
        </div>
        <div className="footer-meta">
          <span>Built with Python + SQL Server</span>
          <span>Case study checkpoint · 30.07.2026</span>
        </div>
        <a href="#top" className="back-top" aria-label="Về đầu trang">
          ↑
        </a>
      </footer>
    </main>
  );
}
