# Analytical marts

Các view tổng hợp phục vụ phân tích lặp lại, dashboard và website.

## Các mart

| View | Grain | Mục đích |
|---|---|---|
| `mart.airline_yearly_performance` | Hãng bay × năm | Scorecard hãng bay và so sánh theo thời gian |
| `mart.airline_segment_performance` | Hãng × năm × mục đích × nhóm khách × hạng ghế | Phát hiện khác biệt giữa các phân khúc |
| `mart.airport_yearly_performance` | Sân bay × năm | Theo dõi chất lượng vận hành sân bay |
| `mart.route_performance` | Hãng × chặng bay | Xác định chặng có rủi ro trải nghiệm |
| `mart.premium_experience` | Hãng bay | So sánh đồng thời phòng chờ và ghế ngồi |
| `mart.review_monthly_trend` | Loại review × tháng | Theo dõi volume, recommendation và verified rate |

Các mart dùng `duplicate_rank = 1`, chỉ sử dụng rating đã làm sạch và
giữ cả điểm trung bình lẫn số lượt trả lời. Trường
`meets_reporting_threshold` giúp dashboard áp dụng ngưỡng mẫu mà không làm
mất các nhóm dữ liệu nhỏ khỏi lớp mart.

## Thứ tự chạy

Chạy trong database `AirReviews`:

1. `sql/marts/create_marts.sql`
2. Kiểm tra nhanh các view trong SSMS.
3. `python -m src.export_marts`

Các object được tạo bằng `CREATE OR ALTER VIEW`, vì vậy có thể chạy lại script
an toàn sau khi thay đổi logic.

## Xuất dữ liệu cho website

Sau khi tạo và kiểm tra các view, xuất dữ liệu thật từ SQL Server bằng:

```powershell
python -m src.export_marts
```

Exporter chỉ đọc schema `mart` và ghi JSON vào `public/data/marts`. Website có
thể tải manifest tại `/data/marts/manifest.json`, sau đó tải từng dataset từ
URL được khai báo trong manifest.

Hai mart nhiều dòng được giới hạn cho mục đích trình bày:

- `airline_segment_performance` chỉ xuất nhóm đạt ngưỡng mẫu.
- `route_performance` chỉ xuất 200 chặng có tỷ lệ giới thiệu thấp nhất trong
  số các chặng đạt ngưỡng mẫu.

Mỗi file chứa `meta` và `rows`. Metadata bao gồm grain, danh sách cột, số dòng
và thời điểm xuất UTC. File được thay thế atomically để dev server không đọc
phải JSON đang được ghi dở.
