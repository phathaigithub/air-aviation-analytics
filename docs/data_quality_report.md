# Xóm Air Data Quality Report

## 1. Phạm vi

| Thuộc tính | Giá trị |
|---|---|
| Database | `xomdata_dataset` |
| Schema | `skytrax` |
| Phạm vi | 6 bảng, 97 trường |
| Tổng số review | 214.681 |
| Ngày profiling | 2026-07-27 |

Báo cáo xác định dữ liệu nào cần làm sạch, dữ liệu thiếu nào phải giữ nguyên và
điều kiện để một kết quả phân tích được xem là đáng tin cậy.

## 2. Kết luận chất lượng

| Kiểm tra | Kết quả |
|---|---|
| Primary keys | 6/6 khóa duy nhất và không NULL |
| Foreign keys | 4/4 quan hệ không có orphan |
| Dimension names | Không trùng sau khi trim và lowercase |
| Rating range | 34 trường rating đều nằm trong 1–5 |
| Dữ liệu cần xử lý | Date, potential duplicate, route và category |
| Rủi ro phân tích chính | Rating coverage và cỡ mẫu entity không đồng đều |

Dataset đủ điều kiện để chuyển sang staging. Không sửa trực tiếp bảng nguồn và
không xóa hàng loạt review.

## 3. Vấn đề và quyết định xử lý

| Vấn đề | Affected | Mức độ | Quyết định áp dụng | Lý do |
|---|---:|---|---|---|
| Airline review có `date_flown > date_submitted` | 41 | Error | Đặt `experience_date_clean = NULL` và thêm invalid-date flag | Ngày trải nghiệm không thể sau ngày gửi, nhưng rating và text vẫn sử dụng được |
| Seat review có ngày gửi `1970-01-01` | 6 | Error | Thêm date-outlier flag và loại khỏi time-series | Đây có dấu hiệu là ngày mặc định, không phải thời điểm review thực |
| Potential logical duplicate | 346 excess | Warning | Thêm duplicate flag, không tự động xóa | Fingerprint giống nhau chưa đủ chứng minh hai review là bản sao |
| Thiếu origin hoặc destination | 106.712 | Warning | Giữ review nhưng không đưa vào route mart | Review vẫn hợp lệ cho airline/rating; route analysis cần đủ hai đầu |
| Origin bằng destination | 20 | Warning | Thêm suspicious-route flag và loại khỏi route ranking | Chặng bay cùng điểm đi–đến có khả năng là dữ liệu nhập sai |
| Transit city và airport không đi cùng nhau | 8.599 | Warning | Thêm incomplete-transit flag và không dùng cho transit analysis | Thiếu một phần khóa mô tả nên không thể xác định transit đầy đủ |
| `World Traveller Plus` khác taxonomy chung | 8 | Info | Map `seat_type_normalized` thành `Premium Economy`, giữ raw value | Đây là tên thương mại của cùng nhóm cabin và cần thống nhất khi so sánh |
| Airport review thiếu text | 1 | Warning | Loại khỏi NLP nhưng giữ cho rating analysis | Thiếu text không làm mất giá trị của các điểm đánh giá |
| Recommendation trái chiều với average rating | 949 | Info | Giữ nguyên, không cleaning | Recommendation là lựa chọn chủ quan và không bắt buộc đồng nhất với rating |

## 4. Quy tắc missing và độ tin cậy

### Missing-value policy

| Dữ liệu thiếu | Quyết định |
|---|---|
| Rating | Giữ `NULL`; không điền 0, mean hoặc median |
| Experience date | Giữ `NULL`; dùng `date_submitted` cho trend mặc định |
| Category | Blank thành `NULL`; normalized value thành `Unknown` |
| Route | Giữ review; chỉ loại khỏi route mart |
| Review text | Giữ review; chỉ loại khỏi NLP |

Mỗi rating sử dụng số review thực sự trả lời tiêu chí làm mẫu số. Dashboard phải
hiển thị `answered_reviews` hoặc coverage.

### Rating coverage

| Coverage | Quyết định sử dụng |
|---:|---|
| ≥ 70% | Có thể dùng trong phân tích chính |
| 30–69,99% | Dùng kèm cảnh báo coverage |
| < 30% | Chỉ dùng cho phân tích thăm dò |

Các nhóm cần lưu ý:

- Airline Wi-Fi: 26,36%.
- Seat bed/privacy/sleep/sitting: 5,84–5,92%.
- Airport Wi-Fi, food, seating, staff và signs: 43,99–63,80%.
- Lounge ratings: 87,69–99,53%, nhưng vẫn cần kiểm tra cỡ mẫu từng hãng.

### Cỡ mẫu ranking

| Entity | Ngưỡng tối thiểu | Đủ mẫu | Thiếu mẫu |
|---|---:|---:|---:|
| Airline | 100 | 185 | 395 |
| Airport | 50 | 209 | 795 |
| Lounge–airline | 30 | 45 | 114 |
| Seat–airline | 20 | 42 | 163 |
| Directed route | 30 | 288 | 8.114 |
| Airline–year | 30 | 1.161 | 4.199 |

Entity dưới ngưỡng được giữ cho drill-through nhưng không xuất hiện trong ranking
mặc định. Ranking theo rating cụ thể còn phải đạt ngưỡng `answered_reviews` của
chính rating đó.

## 5. Yêu cầu cho staging

**Trạng thái:** đã triển khai bằng Python trên CSV raw và đạt toàn bộ acceptance
criteria. Kết quả thực tế xem tại
[Cleaning Report](cleaning_report.md).

Staging giữ nguyên các raw columns và bổ sung:

```text
experience_date_clean
is_invalid_experience_date
is_submission_date_outlier
is_potential_duplicate
origin_airport_clean
destination_airport_clean
has_complete_route
route_key
is_suspicious_route
is_incomplete_transit
nationality_normalized
seat_type_normalized
```

Nguyên tắc:

- Không cập nhật bảng nguồn `skytrax`.
- Không thay rating `NULL`.
- Không xóa potential duplicate trong lần cleaning đầu tiên.
- Chỉ loại record khỏi phân tích không đủ điều kiện, không loại khỏi staging.
- Mọi normalized value phải giữ lại raw value để audit.

## 6. Acceptance criteria

Staging đạt yêu cầu khi:

1. Số dòng mỗi staging view bằng source tương ứng.
2. Primary key vẫn duy nhất và foreign key không phát sinh orphan.
3. Raw columns được giữ nguyên; rating `NULL` vẫn là `NULL`.
4. Date, duplicate, route và transit flags khớp kết quả profiling.
5. 8 `World Traveller Plus` được map thành `Premium Economy`.
6. Không có cleaning rule làm mất record ngoài dự kiến.

## 7. Giới hạn và tái lập

- Dữ liệu review tự nguyện không đại diện ngẫu nhiên cho mọi hành khách.
- Không có doanh thu, chi phí, delay, cancellation hoặc số hành khách.
- Không thể nối cùng một khách qua bốn bảng review.
- Quan hệ giữa rating và recommendation không mặc định là nhân quả.

Chi tiết triển khai và kết quả kiểm tra nằm tại
[Python staging pipeline](../src/staging.py) và [Cleaning Report](cleaning_report.md).
