# Xóm Air — Aviation Customer Experience Analytics

Portfolio project phân tích **214.681 review** về trải nghiệm hãng bay, sân bay,
phòng chờ và ghế ngồi.

Mục tiêu là giúp stakeholder hiểu khách hàng đang hài lòng hoặc thất vọng ở đâu,
yếu tố nào liên hệ mạnh với khả năng giới thiệu và hạng mục nào nên được ưu tiên
cải thiện.

## Câu hỏi kinh doanh

- Hãng bay và sân bay nào đang dẫn đầu hoặc mất điểm?
- Tiêu chí dịch vụ nào liên hệ mạnh nhất với Recommendation Rate?
- Business và leisure traveller có trải nghiệm khác nhau như thế nào?
- Chất lượng dịch vụ thay đổi ra sao theo thời gian?
- Hãng nào mang lại trải nghiệm premium nhất quán ở cả lounge và ghế?

## Phạm vi

- Nguồn: Microsoft SQL Server chỉ đọc, schema `skytrax`; dữ liệu được trích xuất
  thành CSV và làm sạch bằng Python.
- 6 bảng, 97 trường.
- 4 nhóm review: airline, airport, lounge và seat.
- Rating theo thang 1–5; `recommended` là biến nhị phân.
- Dữ liệu bao phủ nhiều năm và có review text phục vụ phân tích định tính.

Chi tiết cấu trúc nằm trong [Data Dictionary](docs/data_dictionary.md) và
[Data Model](docs/data_model.md).

## Trọng tâm phân tích

| Phân tích | Giá trị kinh doanh |
|---|---|
| Recommendation drivers | Xác định tiêu chí liên hệ mạnh nhất với khả năng giới thiệu |
| Importance–performance matrix | Chọn dịch vụ cần ưu tiên cải thiện |
| Airline benchmarking | So sánh hãng với market benchmark có kiểm soát cỡ mẫu |
| Customer segment gaps | Xác định nhóm khách đang được phục vụ tốt hoặc chưa tốt |
| Airport pain points | Tìm điểm nghẽn về queue, staff, vệ sinh và Wi-Fi |
| Premium consistency | So sánh trải nghiệm lounge và ghế theo hãng |

Visual trung tâm được đề xuất:

```text
Importance–Performance Opportunity Matrix

X = Điểm dịch vụ hiện tại
Y = Mức liên hệ với Recommendation Rate
```

Phân tích này giúp chuyển từ “dịch vụ nào có điểm thấp” sang “dịch vụ nào nên
được ưu tiên đầu tư”.

## Dashboard đề xuất

| Trang | Nội dung |
|---|---|
| Executive Overview | KPI, xu hướng, airline benchmark và opportunity matrix |
| Airline & Segments | Recommendation drivers, cabin và traveller gaps |
| Airport & Route | Airport pain points và route complaints |
| Lounge & Seat | Premium consistency và seat-feature performance |

Mọi ranking phải đạt minimum sample threshold và hiển thị số review/coverage.

## Tiến độ

```text
Profiling → Staging → Validation → Marts → EDA → Dashboard → Recommendations
```

| Giai đoạn | Trạng thái |
|---|---|
| Data model, dictionary và profiling | Hoàn thành |
| Data Quality Report | Hoàn thành |
| Staging và cleaning | Hoàn thành bằng Python; giữ đủ 214.681 review |
| Validation Python | Hoàn thành; 15/15 acceptance checks PASS |
| Nạp validated data vào SQL | Chưa thực thi; đã chuẩn bị DDL, loader và post-load checks |
| Marts và EDA | Chưa thực hiện |
| Power BI và recommendations | Chưa thực hiện |

Các hướng phân tích trong README là giả thuyết cần kiểm chứng sau khi hoàn thành
staging và marts, chưa phải insight cuối cùng.

## Tài liệu

- [Dataset description](dataset_description.md)
- [Data dictionary](docs/data_dictionary.md)
- [Data model](docs/data_model.md)
- [Data Quality Report](docs/data_quality_report.md)
- [Cleaning Report](docs/cleaning_report.md)
- [Python staging pipeline](src/staging.py)
- [Quy trình staging](sql/staging/README.md)
- [Load validated data vào SQL Server](sql/load/README.md)
- [Ad-hoc questions](ad-hoc.md)

## Chạy và deploy dashboard

Dashboard sử dụng Apache ECharts và đọc các mart JSON trực tiếp từ
`public/data/marts`. Không cần API hoặc database khi chạy trên GitHub Pages.

```powershell
npm install
npm run dev
```

Workflow `.github/workflows/deploy-pages.yml` tự động build và publish khi có
commit mới trên nhánh `main`. Trong repository GitHub, chỉ cần chọn **Settings →
Pages → Source → GitHub Actions** trước lần deploy đầu tiên.

## Giới hạn

- Review tự nguyện không đại diện ngẫu nhiên cho toàn bộ hành khách.
- Không có doanh thu, chi phí, delay, cancellation hoặc số hành khách.
- Không thể theo dõi cùng một khách qua bốn nhóm review.
