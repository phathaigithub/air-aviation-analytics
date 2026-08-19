"use client";

import { useEffect, useState } from "react";
import AnalyticsDashboard from "./analytics-dashboard";

type Language = "en" | "vi";

const datasets = [
  { en: "Airline", vi: "Hãng bay", rows: "156,323", share: "72.8%" },
  { en: "Airport", vi: "Sân bay", rows: "49,505", share: "23.1%" },
  { en: "Lounge", vi: "Phòng chờ", rows: "5,087", share: "2.4%" },
  { en: "Seat", vi: "Ghế ngồi", rows: "3,766", share: "1.7%" },
];

const keyFields = [
  {
    group: { en: "Outcome", vi: "Kết quả" },
    fields: "is_recommended · is_verified",
    use: {
      en: "Recommendation and review credibility",
      vi: "Mức sẵn sàng giới thiệu và độ tin cậy của review",
    },
  },
  {
    group: { en: "Ratings", vi: "Điểm dịch vụ" },
    fields: "*_clean rating fields",
    use: {
      en: "Service performance on a 1–5 scale",
      vi: "Hiệu suất dịch vụ trên thang điểm 1–5",
    },
  },
  {
    group: { en: "Segments", vi: "Phân khúc" },
    fields: "traveller · seat type · nationality",
    use: {
      en: "Customer and product comparisons",
      vi: "So sánh nhóm khách hàng và sản phẩm",
    },
  },
  {
    group: { en: "Time", vi: "Thời gian" },
    fields: "date_submitted_clean · experience_date_clean",
    use: {
      en: "Trend and period analysis",
      vi: "Phân tích xu hướng và giai đoạn",
    },
  },
  {
    group: { en: "Route", vi: "Tuyến bay" },
    fields: "route_key · is_route_analysis_eligible",
    use: {
      en: "Origin-to-destination analysis",
      vi: "Phân tích điểm đi đến điểm đến",
    },
  },
  {
    group: { en: "Quality", vi: "Chất lượng" },
    fields: "duplicate_rank · is_nlp_eligible · lineage",
    use: {
      en: "Filtering, audit and traceability",
      vi: "Lọc dữ liệu, kiểm toán và truy vết",
    },
  },
];

const tableRows = (value: string) =>
  value
    .trim()
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()));

const adHocItems = [
  {
    question: {
      en: "How many airline reviews are available?",
      vi: "Có bao nhiêu lượt đánh giá hãng bay?",
    },
    table: {
      headers: [{ en: "Total reviews", vi: "Tổng số đánh giá" }],
      rows: [["156,323"]],
    },
  },
  {
    question: {
      en: "Which airlines are mentioned most often?",
      vi: "Những hãng bay nào được nhắc tới nhiều nhất?",
    },
    table: {
      headers: [
        { en: "Airline", vi: "Tên hãng" },
        { en: "Mentions", vi: "Số lượt nhắc" },
      ],
      rows: tableRows(`
        American Airlines | 6,357
        Spirit Airlines | 5,289
        United Airlines | 5,139
        British Airways | 4,025
        Frontier Airlines | 3,833
        Delta Air Lines | 3,215
        Turkish Airlines | 2,834
        Qatar Airways | 2,694
        Lufthansa | 2,601
        Air Canada | 2,515
        Emirates | 2,500
        Ryanair | 2,357
        China Southern Airlines | 2,058
        Allegiant Air | 2,004
        Qantas Airways | 1,995
        Etihad Airways | 1,960
        Southwest Airlines | 1,912
        KLM Royal Dutch Airlines | 1,730
        Jetblue Airways | 1,701
      `),
    },
  },
  {
    question: {
      en: "What percentage of customers would recommend their airline?",
      vi: "Tỷ lệ khách hàng sẵn sàng giới thiệu hãng bay là bao nhiêu?",
    },
    table: {
      headers: [
        { en: "Total reviews", vi: "Tổng số đánh giá" },
        { en: "Recommendation rate", vi: "Tỷ lệ giới thiệu" },
      ],
      rows: [["156,323", "37.46%"]],
    },
  },
  {
    question: {
      en: "Which nationalities contribute the most airline reviews?",
      vi: "Những quốc tịch nào để lại nhiều đánh giá hãng bay nhất?",
    },
    table: {
      headers: [
        { en: "Nationality", vi: "Quốc tịch" },
        { en: "Total reviews", vi: "Tổng số đánh giá" },
      ],
      rows: tableRows(`
        United States | 51,208
        United Kingdom | 24,934
        Australia | 13,414
        Canada | 12,756
        Germany | 4,240
        India | 3,702
        Singapore | 2,420
        Netherlands | 2,298
        France | 2,125
        New Zealand | 1,781
      `),
    },
  },
  {
    question: {
      en: "What is the average seat-comfort score?",
      vi: "Điểm hài lòng trung bình về ghế ngồi là bao nhiêu?",
    },
    table: {
      headers: [
        { en: "Answered reviews", vi: "Đánh giá có trả lời" },
        { en: "Average seat-comfort score", vi: "Điểm ghế trung bình" },
      ],
      rows: [["140,098", "2.71 / 5"]],
    },
  },
  {
    question: {
      en: "Which airlines offer the best value for money?",
      vi: "Những hãng bay nào đáng tiền nhất?",
    },
    table: {
      headers: [
        { en: "Airline", vi: "Tên hãng" },
        { en: "Reviews", vi: "Tổng số review" },
        { en: "Average score", vi: "Điểm trung bình" },
      ],
      rows: tableRows(`
        Hainan Airlines | 426 | 4.40
        China Southern Airlines | 2,058 | 4.28
        Garuda Indonesia | 977 | 4.22
        Asiana Airlines | 527 | 4.11
        EVA Air | 673 | 4.06
        Royal Brunei Airlines | 376 | 4.02
        Volotea | 718 | 3.98
        Thai Smile Airways | 274 | 3.93
        ANA All Nippon Airways | 626 | 3.90
        Qatar Airways | 2,694 | 3.86
      `),
    },
  },
  {
    question: {
      en: "How does recommendation differ by traveller type?",
      vi: "Tỷ lệ giới thiệu khác nhau thế nào theo nhóm hành khách?",
    },
    table: {
      headers: [
        { en: "Traveller type", vi: "Nhóm khách hàng" },
        { en: "Reviews", vi: "Số lượt đánh giá" },
        { en: "Recommendation rate", vi: "Tỷ lệ giới thiệu" },
      ],
      rows: tableRows(`
        Business | 17,844 | 31.09%
        Couple Leisure | 30,371 | 29.36%
        Family Leisure | 26,322 | 27.04%
        Solo Leisure | 42,340 | 37.71%
        Unknown | 39,446 | 53.27%
      `),
    },
  },
  {
    question: {
      en: "Which airports receive the lowest queuing-time scores?",
      vi: "Những sân bay nào có điểm thời gian xếp hàng thấp nhất?",
    },
    table: {
      headers: [
        { en: "Airport", vi: "Sân bay" },
        { en: "Average queuing score", vi: "Điểm xếp hàng trung bình" },
        { en: "Reviews", vi: "Số lượt đánh giá" },
      ],
      rows: tableRows(`
        Grenoble | 1.11 | 77
        Berlin Brandenburg | 1.46 | 210
        Lyon | 1.57 | 144
        Montego Bay | 1.58 | 60
        Beauvais | 1.61 | 105
        London Stansted | 1.62 | 938
        Bordeaux | 1.64 | 194
        Heraklion | 1.64 | 168
        Luton | 1.66 | 805
        Geneva | 1.66 | 311
      `),
    },
  },
  {
    question: {
      en: "How does cabin-staff service differ by seat class?",
      vi: "Điểm phục vụ tiếp viên khác nhau thế nào theo hạng ghế?",
    },
    table: {
      headers: [
        { en: "Seat class", vi: "Hạng ghế" },
        { en: "Reviews", vi: "Lượt đánh giá" },
        { en: "Average cabin-staff score", vi: "Điểm phục vụ trung bình" },
      ],
      rows: tableRows(`
        Business | 19,180 | 3.74
        First | 3,208 | 3.53
        Premium Economy | 6,096 | 3.06
        Economy | 124,737 | 2.82
      `),
    },
  },
  {
    question: {
      en: "How has airline-review volume changed over time?",
      vi: "Số lượng đánh giá hãng bay thay đổi thế nào theo thời gian?",
    },
    table: {
      headers: [
        { en: "Year", vi: "Năm" },
        { en: "Reviews", vi: "Lượt đánh giá" },
      ],
      rows: tableRows(`
        2002 | 13
        2003 | 41
        2004 | 120
        2005 | 160
        2006 | 187
        2007 | 308
        2008 | 426
        2009 | 592
        2010 | 1,488
        2011 | 3,081
        2012 | 4,622
        2013 | 8,603
        2014 | 14,365
        2015 | 14,663
        2016 | 12,775
        2017 | 12,168
        2018 | 14,935
        2019 | 16,251
        2020 | 6,155
        2021 | 6,780
        2022 | 12,896
        2023 | 12,779
        2024 | 7,464
        2025 | 4,404
        2026 | 801
      `),
    },
  },
  {
    question: {
      en: "Which airlines rank highest for value for money each year?",
      vi: "Những hãng nào đứng đầu về mức đáng tiền theo từng năm?",
    },
    table: {
      headers: [
        { en: "Year", vi: "Năm" },
        { en: "Airline", vi: "Tên hãng" },
        { en: "Average value score", vi: "Điểm đáng tiền trung bình" },
        { en: "Rank", vi: "Thứ hạng" },
      ],
      rows: tableRows(`
        2011 | Asiana Airlines | 3.950819 | 1
        2011 | Aer Lingus | 3.857142 | 2
        2011 | EVA Air | 3.631578 | 3
        2011 | Aeroflot Russian Airlines | 3.603773 | 4
        2011 | Southwest Airlines | 3.578947 | 5
        2012 | Royal Brunei Airlines | 4.540000 | 1
        2012 | Garuda Indonesia | 4.534883 | 2
        2012 | Korean Air | 4.428571 | 3
        2012 | Asiana Airlines | 4.312500 | 4
        2012 | EVA Air | 4.147540 | 5
        2013 | Asiana Airlines | 4.488888 | 1
        2013 | Garuda Indonesia | 4.278350 | 2
        2013 | Qatar Airways | 4.276315 | 3
        2013 | Royal Brunei Airlines | 4.181818 | 4
        2013 | Korean Air | 4.161764 | 5
        2014 | Royal Brunei Airlines | 4.490909 | 1
        2014 | AirAsia X | 4.262295 | 2
        2014 | Garuda Indonesia | 4.200000 | 3
        2014 | EVA Air | 4.180722 | 4
        2014 | China Southern Airlines | 4.137931 | 5
        2015 | EVA Air | 4.550724 | 1
        2015 | Garuda Indonesia | 4.450980 | 2
        2015 | Qatar Airways | 4.320512 | 3
        2015 | Aegean Airlines | 4.175000 | 4
        2015 | China Southern Airlines | 4.159817 | 5
        2016 | Garuda Indonesia | 4.549180 | 1
        2016 | China Southern Airlines | 4.505102 | 2
        2016 | Aegean Airlines | 4.418918 | 3
        2016 | EVA Air | 4.188679 | 4
        2016 | Japan Airlines | 4.166666 | 5
        2017 | EVA Air | 4.515151 | 1
        2017 | Hainan Airlines | 4.470588 | 2
        2017 | ANA All Nippon Airways | 4.435483 | 3
        2017 | Garuda Indonesia | 4.267241 | 4
        2017 | China Southern Airlines | 4.262295 | 5
        2018 | Hainan Airlines | 4.602941 | 1
        2018 | China Southern Airlines | 4.416438 | 2
        2018 | EVA Air | 4.290322 | 3
        2018 | Garuda Indonesia | 4.036144 | 4
        2018 | Qatar Airways | 3.798122 | 5
        2019 | China Southern Airlines | 4.245283 | 1
        2019 | ANA All Nippon Airways | 3.920000 | 2
        2019 | Garuda Indonesia | 3.688073 | 3
        2019 | Qatar Airways | 3.595833 | 4
        2019 | Singapore Airlines | 3.500000 | 5
        2020 | Thai Smile Airways | 4.311475 | 1
        2020 | Qatar Airways | 4.127659 | 2
        2020 | Singapore Airlines | 3.214285 | 3
        2020 | SpiceJet | 2.845238 | 4
        2020 | Flair Airlines | 2.722222 | 5
        2021 | China Southern Airlines | 4.623529 | 1
        2021 | Qatar Airways | 4.203252 | 2
        2021 | Volotea | 4.076923 | 3
        2021 | SpiceJet | 2.852941 | 4
        2021 | British Airways | 2.586206 | 5
        2022 | Thai Smile Airways | 3.986111 | 1
        2022 | Qatar Airways | 3.554263 | 2
        2022 | Volotea | 3.125000 | 3
        2022 | PLAY | 2.970588 | 4
        2022 | Singapore Airlines | 2.750000 | 5
        2023 | Volotea | 4.250000 | 1
        2023 | Thai Smile Airways | 3.797101 | 2
        2023 | Qatar Airways | 3.462616 | 3
        2023 | Vistara | 3.389830 | 4
        2023 | Singapore Airlines | 3.280000 | 5
        2024 | Volotea | 4.528301 | 1
        2024 | Singapore Airlines | 3.404040 | 2
        2024 | Qatar Airways | 3.070754 | 3
        2024 | Malaysia Airlines | 3.042857 | 4
        2024 | Thai Airways | 3.039215 | 5
        2025 | Volotea | 4.668341 | 1
        2025 | Qatar Airways | 3.710937 | 2
        2025 | Singapore Airlines | 3.177419 | 3
        2025 | Air France | 2.666666 | 4
        2025 | Cathay Pacific Airways | 2.634615 | 5
      `),
    },
  },
  {
    question: {
      en: "How has average seat comfort changed year over year?",
      vi: "Điểm thoải mái ghế trung bình thay đổi thế nào qua từng năm?",
    },
    warning: {
      en: "Years without answered seat-comfort ratings are shown as —; their year-over-year change cannot be calculated.",
      vi: "Các năm không có rating ghế được hiển thị là —; không thể tính chênh lệch so với năm trước cho các năm này.",
    },
    table: {
      headers: [
        { en: "Year", vi: "Năm" },
        { en: "Average score", vi: "Điểm trung bình" },
        { en: "Previous year", vi: "Điểm năm trước" },
        { en: "YoY change", vi: "Chênh lệch YoY" },
      ],
      rows: tableRows(`
        2002 | — | — | —
        2003 | — | — | —
        2004 | — | — | —
        2005 | 3.000000 | — | —
        2006 | — | 3.000000 | —
        2007 | 2.666666 | — | —
        2008 | 2.000000 | 2.666666 | -0.666666
        2009 | 3.000000 | 2.000000 | +1.000000
        2010 | 4.000000 | 3.000000 | +1.000000
        2011 | 3.376543 | 4.000000 | -0.623457
        2012 | 3.340915 | 3.376543 | -0.035628
        2013 | 3.261754 | 3.340915 | -0.079161
        2014 | 3.078840 | 3.261754 | -0.182914
        2015 | 2.992542 | 3.078840 | -0.086298
        2016 | 3.038651 | 2.992542 | +0.046109
        2017 | 2.861369 | 3.038651 | -0.177282
        2018 | 2.567760 | 2.861369 | -0.293609
        2019 | 2.482943 | 2.567760 | -0.084817
        2020 | 2.577701 | 2.482943 | +0.094758
        2021 | 2.190789 | 2.577701 | -0.386912
        2022 | 2.206971 | 2.190789 | +0.016182
        2023 | 2.281221 | 2.206971 | +0.074250
        2024 | 2.458489 | 2.281221 | +0.177268
        2025 | 2.677961 | 2.458489 | +0.219472
        2026 | 2.835180 | 2.677961 | +0.157219
      `),
    },
  },
  {
    question: {
      en: "How are airlines distributed across value-for-money quartiles?",
      vi: "Các hãng bay được phân bố thế nào theo bốn nhóm đáng tiền?",
    },
    table: {
      headers: [
        { en: "Quartile", vi: "Nhóm" },
        { en: "Airlines", vi: "Số hãng" },
        { en: "Group average", vi: "Điểm trung bình nhóm" },
      ],
      rows: tableRows(`
        Leader | 45 | 3.519688
        Good | 44 | 2.860729
        Average | 44 | 2.463352
        Lagging | 44 | 1.947667
      `),
    },
  },
  {
    question: {
      en: "Which routes have the lowest recommendation rates?",
      vi: "Những chặng bay nào có tỷ lệ giới thiệu thấp nhất?",
    },
    table: {
      headers: [
        { en: "Origin", vi: "Điểm đi" },
        { en: "Destination", vi: "Điểm đến" },
        { en: "Reviews", vi: "Số lượt" },
        { en: "Recommendation rate", vi: "Tỷ lệ giới thiệu" },
      ],
      rows: tableRows(`
        ATL | MIA | 33 | 0.00%
        MCO | ORD | 35 | 2.86%
        DEN | IAH | 31 | 3.23%
        IAH | EWR | 30 | 3.33%
        LAS | DEN | 47 | 4.26%
        DEN | ORD | 38 | 5.26%
        MCO | LAS | 38 | 5.26%
        DEN | PHX | 37 | 5.41%
        DEN | ATL | 37 | 5.41%
        EWR | MCO | 53 | 5.66%
        MCO | BOS | 34 | 5.88%
        DEN | SEA | 32 | 6.25%
        EWR | SFO | 30 | 6.67%
        MCO | DEN | 44 | 6.82%
        BOS | MCO | 43 | 6.98%
        LAX | DEN | 38 | 7.89%
        ORD | LAS | 50 | 8.00%
        LAS | ORD | 50 | 8.00%
        DFW | LAS | 59 | 8.47%
        MCO | EWR | 70 | 8.57%
      `),
    },
  },
  {
    question: {
      en: "Which airlines perform strongly across both lounge and seat experience?",
      vi: "Những hãng nào có trải nghiệm tốt ở cả phòng chờ và ghế ngồi?",
    },
    table: {
      headers: [
        { en: "Airline", vi: "Tên hãng" },
        { en: "Lounge reviews", vi: "Review phòng chờ" },
        { en: "Lounge score", vi: "Điểm phòng chờ" },
        { en: "Seat reviews", vi: "Review ghế" },
        { en: "Seat score", vi: "Điểm ghế" },
        { en: "Premium score", vi: "Điểm premium" },
      ],
      rows: tableRows(`
        Qatar Airways | 200 | 4.03 | 119 | 4.01 | 4.02
        Asiana Airlines | 47 | 3.88 | 31 | 3.99 | 3.93
        EVA Air | 37 | 3.97 | 41 | 3.89 | 3.93
        Japan Airlines | 37 | 3.68 | 23 | 3.90 | 3.79
        ANA All Nippon Airways | 37 | 4.08 | 26 | 3.21 | 3.65
        China Southern Airlines | 30 | 3.53 | 26 | 3.75 | 3.64
        Cathay Pacific Airways | 133 | 4.00 | 144 | 3.18 | 3.59
        Philippine Airlines | 28 | 3.54 | 23 | 3.52 | 3.53
        Qantas Airways | 254 | 3.69 | 102 | 3.34 | 3.52
        Vietnam Airlines | 32 | 3.41 | 12 | 3.57 | 3.49
        Alaska Airlines | 15 | 4.16 | 10 | 2.79 | 3.47
        Aegean Airlines | 16 | 3.65 | 17 | 3.29 | 3.47
        Thai Airways | 131 | 3.37 | 29 | 3.56 | 3.46
        Singapore Airlines | 139 | 3.58 | 118 | 3.31 | 3.45
        Saudi Arabian Airlines | 13 | 3.30 | 12 | 3.60 | 3.45
        Korean Air | 41 | 3.12 | 16 | 3.72 | 3.42
        Turkish Airlines | 133 | 3.88 | 39 | 2.89 | 3.39
        Garuda Indonesia | 58 | 2.69 | 24 | 4.05 | 3.37
        Malaysia Airlines | 128 | 3.22 | 51 | 3.50 | 3.36
        Aeroflot Russian Airlines | 19 | 3.33 | 20 | 3.36 | 3.34
      `),
    },
  },
];

const copy = {
  en: {
    nav: ["Context", "Data", "Cleaning", "Fields", "Ad-hoc", "Marts"],
    status: "Foundation complete",
    heroEyebrow: "AVIATION CX / DATA CASE STUDY",
    heroTitle: "The analyst for better aviation decisions.",
    heroText:
      "214,681 passenger reviews transformed into a validated analytical layer with Python and SQL Server.",
    heroLink: "View the data foundation",
    heroMetrics: [
      ["Reviews", "214,681"],
      ["Tables", "06"],
      ["Quality checks", "15 / 15"],
      ["Data loss", "0%"],
    ],
    contextEyebrow: "ANALYSIS CONTEXT",
    contextTitle:
      "Where does the passenger experience create value—or friction?",
    contextLead:
      "Aviation experience spans the airport, flight, lounge and seat. This project creates a reliable base to compare those touchpoints and identify where deeper analysis should focus.",
    coreQuestions: "Core questions",
    questions: [
      "Which airlines and airports perform best?",
      "Which services align with recommendation?",
      "Where do customer and premium experience gaps appear?",
    ],
    contextNote:
      "Voluntary reviews describe patterns in this dataset; they do not represent every passenger or prove causality.",
    dataEyebrow: "DATASET OVERVIEW",
    dataTitle: "Four review types across the passenger journey.",
    reviewSuffix: "reviews",
    ofTotal: "of total",
    dataSummary: [
      ["Source", "SQL Server 2019"],
      ["Structure", "6 tables · 97 source fields"],
      ["Grain", "One row per review"],
      ["Rating", "1–5 · NULL preserved"],
    ],
    cleaningEyebrow: "CLEANING OUTCOMES",
    cleaningTitle: "Row-preserving cleaning with explicit quality flags.",
    qualityMetrics: [
      ["214,681", "reviews retained"],
      ["0", "PK violations"],
      ["0", "FK orphans"],
      ["PASS", "15 acceptance checks"],
    ],
    cleaningItems: [
      ["41", "Invalid experience dates", "Date cleared; rating and text retained."],
      ["346", "Potential duplicate excess", "Flagged, not automatically removed."],
      ["106,712", "Incomplete routes", "Retained outside route-level analysis."],
      ["8,599", "Incomplete transit pairs", "Flagged for eligibility control."],
    ],
    ratingCoverage: "Rating coverage",
    coverageNote:
      "Performance must always be read together with answered coverage.",
    fieldsEyebrow: "KEY ANALYTICAL FIELDS",
    fieldsTitle: "The minimum field set for reliable evaluation.",
    tableHeaders: ["Group", "Key fields", "Analytical use"],
    evaluationStandard: "Evaluation standard",
    evaluationRule:
      "Publish rankings only when sample thresholds are met. Show score, answered reviews and coverage together.",
    adHocEyebrow: "AD-HOC RESULTS",
    adHocTitle: "Fifteen questions used to explore the validated data.",
    adHocIntro:
      "All fifteen recorded SQL outputs are published below for direct exploration.",
    resultLabel: "Result",
    viewResult: "View result",
    hideResult: "Hide result",
    pendingResult: "Executed successfully; result not yet exported to the website source.",
    martsEyebrow: "MART VISUALS",
    martsTitle: "Business-ready views of the validated experience data.",
    martsIntro:
      "Charts are generated from the latest JSON export of the SQL mart layer. Only results meeting the reporting thresholds are presented.",
    footer: "Data foundation complete · Findings and visuals follow next.",
    backToTop: "Back to top",
  },
  vi: {
    nav: ["Bối cảnh", "Dữ liệu", "Làm sạch", "Trường chính", "Ad-hoc", "Mart"],
    status: "Nền tảng dữ liệu hoàn tất",
    heroEyebrow: "TRẢI NGHIỆM HÀNG KHÔNG / DATA CASE STUDY",
    heroTitle: "Phân tích dữ liệu hỗ trợ dịch vụ hàng không.",
    heroText:
      "214.681 đánh giá hành khách được chuyển thành lớp dữ liệu đã kiểm chứng bằng Python và SQL Server.",
    heroLink: "Khám phá nền tảng dữ liệu",
    heroMetrics: [
      ["Đánh giá", "214.681"],
      ["Bảng dữ liệu", "06"],
      ["Kiểm tra chất lượng", "15 / 15"],
      ["Dữ liệu thất thoát", "0%"],
    ],
    contextEyebrow: "BỐI CẢNH PHÂN TÍCH",
    contextTitle:
      "Trải nghiệm hành khách tạo ra giá trị hoặc điểm nghẽn ở đâu?",
    contextLead:
      "Trải nghiệm hàng không trải dài từ sân bay, chuyến bay, phòng chờ đến ghế ngồi. Dự án tạo nền tảng đáng tin cậy để so sánh các điểm chạm và xác định nơi cần phân tích sâu hơn.",
    coreQuestions: "Câu hỏi trọng tâm",
    questions: [
      "Hãng bay và sân bay nào đang có hiệu suất tốt nhất?",
      "Tiêu chí dịch vụ nào liên hệ với khả năng giới thiệu?",
      "Khoảng cách trải nghiệm khách hàng và premium xuất hiện ở đâu?",
    ],
    contextNote:
      "Review tự nguyện phản ánh các mẫu hình trong bộ dữ liệu; chúng không đại diện cho mọi hành khách và không chứng minh quan hệ nhân quả.",
    dataEyebrow: "TỔNG QUAN DỮ LIỆU",
    dataTitle: "Bốn nhóm review trên toàn bộ hành trình hành khách.",
    reviewSuffix: "review",
    ofTotal: "trên tổng số",
    dataSummary: [
      ["Nguồn", "SQL Server 2019"],
      ["Cấu trúc", "6 bảng · 97 trường nguồn"],
      ["Độ chi tiết", "Một dòng cho mỗi review"],
      ["Điểm đánh giá", "1–5 · giữ nguyên NULL"],
    ],
    cleaningEyebrow: "KẾT QUẢ LÀM SẠCH",
    cleaningTitle:
      "Giữ nguyên số dòng và kiểm soát chất lượng bằng các trường cờ.",
    qualityMetrics: [
      ["214.681", "review được giữ lại"],
      ["0", "lỗi khóa chính"],
      ["0", "khóa ngoại mồ côi"],
      ["PASS", "15 tiêu chí nghiệm thu"],
    ],
    cleaningItems: [
      ["41", "Ngày trải nghiệm không hợp lệ", "Xóa ngày; giữ lại rating và nội dung."],
      ["346", "Bản ghi trùng tiềm năng", "Chỉ gắn cờ, không tự động xóa."],
      ["106.712", "Tuyến bay chưa đầy đủ", "Giữ lại ngoài phân tích cấp tuyến."],
      ["8.599", "Cặp transit chưa đầy đủ", "Gắn cờ để kiểm soát điều kiện sử dụng."],
    ],
    ratingCoverage: "Độ phủ rating",
    coverageNote:
      "Luôn đọc điểm hiệu suất cùng với tỷ lệ người thực sự trả lời.",
    fieldsEyebrow: "CÁC TRƯỜNG PHÂN TÍCH CHÍNH",
    fieldsTitle: "Bộ trường tối thiểu để đánh giá đáng tin cậy.",
    tableHeaders: ["Nhóm", "Trường chính", "Mục đích phân tích"],
    evaluationStandard: "Tiêu chuẩn đánh giá",
    evaluationRule:
      "Chỉ công bố xếp hạng khi đạt ngưỡng mẫu. Luôn hiển thị đồng thời điểm số, số lượt trả lời và độ phủ.",
    adHocEyebrow: "KẾT QUẢ AD-HOC",
    adHocTitle: "Mười lăm câu hỏi dùng để khám phá lớp dữ liệu đã kiểm chứng.",
    adHocIntro:
      "Toàn bộ mười lăm kết quả SQL đã được công bố bên dưới để khám phá trực tiếp.",
    resultLabel: "Kết quả",
    viewResult: "Xem kết quả",
    hideResult: "Ẩn kết quả",
    pendingResult: "Đã thực thi thành công; kết quả chưa được xuất vào source website.",
    martsEyebrow: "TRỰC QUAN HÓA MART",
    martsTitle: "Các góc nhìn sẵn sàng phục vụ quyết định kinh doanh.",
    martsIntro:
      "Biểu đồ được tạo từ lần xuất JSON gần nhất của lớp SQL mart. Chỉ những kết quả đạt ngưỡng báo cáo mới được trình bày.",
    footer:
      "Nền tảng dữ liệu đã hoàn tất · Kết quả và biểu đồ sẽ được bổ sung tiếp.",
    backToTop: "Về đầu trang",
  },
} as const;

const storyCopy = {
  en: {
    nav: ["Overview", "Problem", "Data", "Pipeline", "Analysis", "Source"],
    overviewEyebrow: "PROJECT OVERVIEW",
    overviewTitle: "From raw passenger feedback to a decision-ready evidence base.",
    overviewText:
      "This end-to-end analytics project turns fragmented aviation reviews into a governed layer for benchmarking airlines, airports and premium touchpoints.",
    overviewFacts: [
      ["Scope", "Airline · Airport · Lounge · Seat"],
      ["Workflow", "Python · SQL Server · Analytical marts"],
      ["Output", "Validated data · Reusable analysis · Dashboard"],
    ],
    problemEyebrow: "BUSINESS PROBLEM",
    problemTitle: "Passenger feedback is abundant; priorities are not obvious.",
    problemText:
      "Leaders need to distinguish isolated complaints from repeatable experience gaps, compare performance fairly and direct attention to improvements most likely to matter.",
    pipelineEyebrow: "DATA PIPELINE",
    pipelineTitle: "A traceable path from source tables to published analysis.",
    pipelineIntro:
      "Each stage preserves lineage and separates raw inputs, validation rules and reporting outputs.",
    pipelineSteps: [
      ["01", "Extract", "Read six source tables from SQL Server and preserve immutable raw CSV files."],
      ["02", "Profile", "Measure schema, missingness, ranges, duplicates and relationship integrity."],
      ["03", "Clean", "Standardize dates and ratings while retaining rows and adding explicit quality flags."],
      ["04", "Validate", "Run 15 acceptance checks across row counts, keys, ranges and eligibility rules."],
      ["05", "Publish", "Build analytical marts and export compact JSON datasets for the web experience."],
    ],
    metricsEyebrow: "KEY METRICS",
    metricsTitle: "Definitions and coverage travel with every result.",
    metricsIntro:
      "A score without its sample size and answered coverage can mislead. These fields form the reporting contract.",
    analysisEyebrow: "INTERACTIVE ANALYSIS",
    analysisTitle: "Explore validated results from summary charts to detailed questions.",
    insightsEyebrow: "KEY INSIGHTS",
    insightsTitle: "Three signals that should shape the improvement agenda.",
    insights: [
      ["37.46%", "Recommendation is structurally low", "Only 37.46% of 156,323 airline reviews recommend the airline."],
      ["10.67 pp", "Traveller segments diverge", "Solo leisure recommendation is 37.71%, versus 27.04% for family leisure."],
      ["0.92 pts", "Economy service trails", "Economy has 124,737 reviews, while its average cabin-staff score is 2.82 versus 3.74 in business."],
    ],
    recommendationsEyebrow: "BUSINESS RECOMMENDATIONS",
    recommendationsTitle: "Three actions mapped directly to the key insights.",
    recommendations: [
      ["01", "Lift the recommendation baseline", "Because fewer than four in ten reviews recommend the airline, identify the service attributes most associated with recommendation and set measurable recovery targets for them."],
      ["02", "Redesign the family-leisure journey", "The 10.67-point gap indicates segment-specific friction; analyze family review text and routes, then prioritize support for baggage, seating and disrupted journeys."],
      ["03", "Close the economy cabin-service gap", "Economy combines the largest review volume with a 0.92-point service deficit, so focus cabin-crew coaching and service consistency checks on this segment first."],
    ],
    sourceEyebrow: "GITHUB / VIEW SOURCE",
    sourceTitle: "Inspect the full analytical workflow.",
    sourceText:
      "Review the Python pipeline, SQL models, validation tests, data documentation and web implementation in the public repository.",
    sourceButton: "View source on GitHub",
    documentationButton: "Read project documentation",
  },
  vi: {
    nav: ["Tổng quan", "Bài toán", "Dữ liệu", "Pipeline", "Phân tích", "Source"],
    overviewEyebrow: "TỔNG QUAN DỰ ÁN",
    overviewTitle: "Từ phản hồi thô của hành khách đến nền tảng dữ liệu sẵn sàng ra quyết định.",
    overviewText:
      "Dự án analytics end-to-end chuyển các review hàng không rời rạc thành lớp dữ liệu có kiểm soát để so sánh hãng bay, sân bay và các điểm chạm premium.",
    overviewFacts: [
      ["Phạm vi", "Hãng bay · Sân bay · Phòng chờ · Ghế"],
      ["Quy trình", "Python · SQL Server · Analytical marts"],
      ["Đầu ra", "Dữ liệu chuẩn hóa · Phân tích tái sử dụng · Dashboard"],
    ],
    problemEyebrow: "BÀI TOÁN KINH DOANH",
    problemTitle: "Phản hồi rất nhiều, nhưng ưu tiên cải thiện chưa rõ ràng.",
    problemText:
      "Nhà quản lý cần phân biệt phàn nàn đơn lẻ với điểm nghẽn lặp lại, so sánh hiệu suất công bằng và tập trung vào những cải thiện có khả năng tạo tác động lớn nhất.",
    pipelineEyebrow: "DATA PIPELINE",
    pipelineTitle: "Luồng dữ liệu có thể truy vết từ bảng nguồn đến kết quả công bố.",
    pipelineIntro:
      "Mỗi giai đoạn duy trì lineage và tách biệt đầu vào thô, quy tắc kiểm định và đầu ra báo cáo.",
    pipelineSteps: [
      ["01", "Trích xuất", "Đọc sáu bảng nguồn từ SQL Server và lưu CSV raw bất biến."],
      ["02", "Profiling", "Đo schema, missing, miền giá trị, trùng lặp và tính toàn vẹn quan hệ."],
      ["03", "Làm sạch", "Chuẩn hóa ngày và rating, giữ nguyên dòng và bổ sung cờ chất lượng."],
      ["04", "Kiểm định", "Chạy 15 tiêu chí nghiệm thu về số dòng, khóa, miền giá trị và điều kiện sử dụng."],
      ["05", "Công bố", "Tạo analytical marts và xuất JSON gọn nhẹ cho trải nghiệm web."],
    ],
    metricsEyebrow: "CHỈ SỐ CHÍNH",
    metricsTitle: "Định nghĩa và độ phủ luôn đi cùng mỗi kết quả.",
    metricsIntro:
      "Điểm số thiếu cỡ mẫu và độ phủ trả lời có thể gây hiểu nhầm. Các trường này tạo thành quy ước báo cáo.",
    analysisEyebrow: "PHÂN TÍCH TƯƠNG TÁC",
    analysisTitle: "Khám phá kết quả đã kiểm định từ biểu đồ tổng quan đến câu hỏi chi tiết.",
    insightsEyebrow: "PHÁT HIỆN CHÍNH",
    insightsTitle: "Ba tín hiệu quan trọng nhất để định hướng ưu tiên cải thiện.",
    insights: [
      ["37,46%", "Tỷ lệ giới thiệu ở mức thấp", "Chỉ 37,46% trong 156.323 review hãng bay sẵn sàng giới thiệu hãng."],
      ["10,67 đpt", "Khác biệt giữa nhóm khách", "Tỷ lệ giới thiệu của solo leisure là 37,71%, so với 27,04% ở family leisure."],
      ["0,92 điểm", "Dịch vụ economy thấp hơn", "Economy có 124.737 review nhưng điểm cabin staff trung bình chỉ 2,82, so với 3,74 ở business."],
    ],
    recommendationsEyebrow: "ĐỀ XUẤT KINH DOANH",
    recommendationsTitle: "Ba hành động gắn trực tiếp với ba phát hiện chính.",
    recommendations: [
      ["01", "Nâng tỷ lệ giới thiệu", "Cần xác định các tiêu chí dịch vụ liên hệ mạnh nhất với recommendation và đặt mục tiêu phục hồi"],
      ["02", "Hổ trợ tốt hơn cho family leisure", "Phân tích review text và tuyến bay của nhóm gia đình, rồi ưu tiên cải thiện các dịch vụ được đánh giá thấp."],
      ["03", "Thu hẹp khoảng cách dịch vụ economy", "Economy vừa có lượng review lớn nhất vừa thấp hơn 0,92 điểm, vì vậy nên ưu tiên đào tạo dịch vụ ở phân khúc này."],
    ],
    sourceEyebrow: "GITHUB / XEM SOURCE",
    sourceTitle: "Khám phá toàn bộ quy trình phân tích.",
    sourceText:
      "Xem Python pipeline, SQL models, validation tests, tài liệu dữ liệu và phần triển khai website trong repository công khai.",
    sourceButton: "Xem source trên GitHub",
    documentationButton: "Đọc tài liệu dự án",
  },
} as const;

function PlaneMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M7 34 57 14 39 36l-2 17-9-12-10 6 2-12Z" />
      <path d="m20 35 19 1" />
    </svg>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const t = copy[language];
  const s = storyCopy[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("xom-air-language");
    if (savedLanguage === "en" || savedLanguage === "vi") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }

    document.documentElement.classList.add("js");
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.localStorage.setItem("xom-air-language", nextLanguage);
  }

  return (
    <main>
      <header>
        <a className="brand" href="#top" aria-label="Xóm Air">
          <span className="brand-mark">
            <PlaneMark />
          </span>
          <span>XÓM AIR</span>
        </a>

        <nav aria-label="Page navigation">
          <a href="#overview">{s.nav[0]}</a>
          <a href="#problem">{s.nav[1]}</a>
          <a href="#dataset">{s.nav[2]}</a>
          <a href="#pipeline">{s.nav[3]}</a>
          <a href="#analysis">{s.nav[4]}</a>
          <a href="#source">{s.nav[5]}</a>
        </nav>

        <div className="header-actions">
          <span className="status">
            <i />
            {t.status}
          </span>
          <div className="language-switch" aria-label="Language">
            <button
              type="button"
              className={language === "en" ? "active" : ""}
              aria-pressed={language === "en"}
              onClick={() => changeLanguage("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={language === "vi" ? "active" : ""}
              aria-pressed={language === "vi"}
              onClick={() => changeLanguage("vi")}
            >
              VI
            </button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy" data-reveal>
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-text">{t.heroText}</p>
          <a className="hero-link" href="#overview">
            {t.heroLink} <span>↓</span>
          </a>
        </div>

        <div className="hero-meta" data-reveal>
          {t.heroMetrics.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section" id="overview">
        <div className="section-heading" data-reveal>
          <span>02</span>
          <div>
            <p className="eyebrow">{s.overviewEyebrow}</p>
            <h2>{s.overviewTitle}</h2>
          </div>
        </div>

        <div className="overview-grid" data-reveal>
          <p className="overview-lead">{s.overviewText}</p>
          <div className="overview-facts">
            {s.overviewFacts.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section" id="problem">
        <div className="section-heading" data-reveal>
          <span>03</span>
          <div>
            <p className="eyebrow">{s.problemEyebrow}</p>
            <h2>{s.problemTitle}</h2>
          </div>
        </div>

        <div className="context-grid" data-reveal>
          <article className="panel panel-feature">
            <p>{s.problemText}</p>
          </article>
          <article className="panel">
            <span className="panel-label">{t.coreQuestions}</span>
            <ul>
              {t.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </article>
        </div>
        <p className="note" data-reveal>
          {t.contextNote}
        </p>
      </section>

      <section className="content-section" id="dataset">
        <div className="section-heading" data-reveal>
          <span>04</span>
          <div>
            <p className="eyebrow">{t.dataEyebrow}</p>
            <h2>{t.dataTitle}</h2>
          </div>
        </div>

        <div className="dataset-grid" data-reveal>
          {datasets.map((dataset) => (
            <article className="dataset-card" key={dataset.en}>
              <div>
                <span>
                  {dataset[language]} {t.reviewSuffix}
                </span>
                <strong>{dataset.rows}</strong>
              </div>
              <div className="bar" aria-label={`${dataset.share} ${t.ofTotal}`}>
                <i style={{ width: dataset.share }} />
              </div>
              <small>
                {dataset.share} {t.ofTotal}
              </small>
            </article>
          ))}
        </div>

        <div className="data-summary" data-reveal>
          {t.dataSummary.map(([label, value]) => (
            <div className="summary-pair" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section" id="pipeline">
        <div className="section-heading" data-reveal>
          <span>05</span>
          <div>
            <p className="eyebrow">{s.pipelineEyebrow}</p>
            <h2>{s.pipelineTitle}</h2>
            <p className="section-intro">{s.pipelineIntro}</p>
          </div>
        </div>

        <div className="pipeline-list" data-reveal>
          {s.pipelineSteps.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="quality">
        <div className="section-heading" data-reveal>
          <span>06</span>
          <div>
            <p className="eyebrow">{t.cleaningEyebrow}</p>
            <h2>{t.cleaningTitle}</h2>
          </div>
        </div>

        <div className="quality-grid" data-reveal>
          {t.qualityMetrics.map(([value, label], index) => (
            <article className={index === 3 ? "quality-pass" : ""} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>

        <div className="cleaning-list" data-reveal>
          {t.cleaningItems.map(([value, title, note]) => (
            <article key={title}>
              <strong>{value}</strong>
              <div>
                <h3>{title}</h3>
                <p>{note}</p>
              </div>
            </article>
          ))}
        </div>

      </section>

      <section className="content-section" id="metrics">
        <div className="section-heading" data-reveal>
          <span>07</span>
          <div>
            <p className="eyebrow">{s.metricsEyebrow}</p>
            <h2>{s.metricsTitle}</h2>
            <p className="section-intro">{s.metricsIntro}</p>
          </div>
        </div>

        <div className="field-table" data-reveal>
          <div className="field-row field-head">
            {t.tableHeaders.map((header) => (
              <span key={header}>{header}</span>
            ))}
          </div>
          {keyFields.map((item) => (
            <div className="field-row" key={item.group.en}>
              <strong>{item.group[language]}</strong>
              <code>{item.fields}</code>
              <p>{item.use[language]}</p>
            </div>
          ))}
        </div>

        <div className="rule" data-reveal>
          <span>{t.evaluationStandard}</span>
          <p>{t.evaluationRule}</p>
        </div>

        <div className="coverage" data-reveal>
          <div>
            <span className="panel-label">{t.ratingCoverage}</span>
            <p>{t.coverageNote}</p>
          </div>
          {[
            [language === "en" ? "Lounge" : "Phòng chờ", "95.85%"],
            [language === "en" ? "Airline" : "Hãng bay", "72.25%"],
            [language === "en" ? "Airport" : "Sân bay", "65.62%"],
            [language === "en" ? "Seat" : "Ghế ngồi", "48.45%"],
          ].map(([name, value]) => (
            <div className="coverage-item" key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section" id="analysis">
        <div className="section-heading" data-reveal>
          <span>08</span>
          <div>
            <p className="eyebrow">{s.analysisEyebrow}</p>
            <h2>{s.analysisTitle}</h2>
            <p className="section-intro">{t.martsIntro}</p>
          </div>
        </div>

        <AnalyticsDashboard language={language} />

        <div className="analysis-subheading" data-reveal>
          <p className="eyebrow">{t.adHocEyebrow}</p>
          <h3>{t.adHocTitle}</h3>
          <p>{t.adHocIntro}</p>
        </div>

        <div className="adhoc-list" data-reveal>
          {adHocItems.map((item, index) => (
            <article className="adhoc-item" key={item.question.en}>
              <div className="adhoc-question">
                <span className="adhoc-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.question[language]}</h3>
              </div>

              <details className="adhoc-details">
                <summary>
                  <span className="view-label">{t.viewResult}</span>
                  <span className="hide-label">{t.hideResult}</span>
                  <i aria-hidden="true">+</i>
                </summary>

                <div className="adhoc-result">
                  {"warning" in item && item.warning ? (
                    <p className="result-warning">{item.warning[language]}</p>
                  ) : null}

                  {"table" in item && item.table ? (
                    <div className="result-table-wrap">
                      <table className="result-table">
                        <caption>{t.resultLabel}</caption>
                        <thead>
                          <tr>
                            {item.table.headers.map((header) => (
                              <th key={header.en} scope="col">
                                {header[language]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.table.rows.map((row, rowIndex) => (
                            <tr key={`${item.question.en}-${rowIndex}`}>
                              {row.map((cell, cellIndex) => (
                                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="pending-result">{t.pendingResult}</p>
                  )}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="insights">
        <div className="section-heading" data-reveal>
          <span>09</span>
          <div>
            <p className="eyebrow">{s.insightsEyebrow}</p>
            <h2>{s.insightsTitle}</h2>
          </div>
        </div>

        <div className="insight-grid" data-reveal>
          {s.insights.map(([value, title, description]) => (
            <article key={title}>
              <strong>{value}</strong>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" id="recommendations">
        <div className="section-heading" data-reveal>
          <span>10</span>
          <div>
            <p className="eyebrow">{s.recommendationsEyebrow}</p>
            <h2>{s.recommendationsTitle}</h2>
          </div>
        </div>

        <div className="recommendation-list" data-reveal>
          {s.recommendations.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section source-section" id="source">
        <div className="section-heading" data-reveal>
          <span>11</span>
          <div>
            <p className="eyebrow">{s.sourceEyebrow}</p>
            <h2>{s.sourceTitle}</h2>
            <p className="section-intro">{s.sourceText}</p>
          </div>
        </div>

        <div className="source-actions" data-reveal>
          <a
            className="source-button source-button-primary"
            href="https://github.com/phathaigithub/air-aviation-analytics"
            target="_blank"
            rel="noreferrer"
          >
            {s.sourceButton} <span aria-hidden="true">↗</span>
          </a>
          <a
            className="source-button"
            href="https://github.com/phathaigithub/air-aviation-analytics/tree/main/docs"
            target="_blank"
            rel="noreferrer"
          >
            {s.documentationButton} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <PlaneMark />
          <span>XÓM AIR · AVIATION ANALYTICS</span>
        </div>
        <p>{t.footer}</p>
        <a href="#top" aria-label={t.backToTop}>
          ↑
        </a>
      </footer>
    </main>
  );
}
