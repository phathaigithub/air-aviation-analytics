# Báo cáo dữ liệu sau cleaning

- Thời điểm chạy (UTC): `2026-07-29T08:23:14.476739+00:00`
- Ngày chốt kiểm tra: `2026-07-29`
- Luồng xử lý: `data/raw → Python staging → data/processed`
- Chính sách: giữ nguyên số dòng, không tự động xóa duplicate.

## Đối soát dữ liệu

| Dataset | Raw rows | Clean rows | Chênh lệch | PK lỗi | FK orphan |
|---|---:|---:|---:|---:|---:|
| `airlines` | 595 | 595 | 0 | 0 | 0 |
| `airports` | 1,004 | 1,004 | 0 | 0 | 0 |
| `airline_reviews` | 156,323 | 156,323 | 0 | 0 | 0 |
| `airport_reviews` | 49,505 | 49,505 | 0 | 0 | 0 |
| `lounge_reviews` | 5,087 | 5,087 | 0 | 0 | 0 |
| `seat_reviews` | 3,766 | 3,766 | 0 | 0 | 0 |

Tổng cộng **214,681 review** được giữ lại sau cleaning.

## Kết quả cleaning chính

| Quy tắc | Số record | Cách xử lý |
|---|---:|---|
| Airline `date_flown > date_submitted` | 41 | `experience_date_clean = NULL`, giữ rating và text |
| Seat submission-date outlier | 6 | `date_submitted_clean = NULL`, loại khỏi time-series |
| Airline route thiếu hai đầu | 106,712 | Giữ review, không đủ điều kiện route analysis |
| Origin bằng destination | 20 | Gắn cờ và loại khỏi route ranking |
| Transit thiếu city hoặc airport | 8,599 | Gắn cờ, không dùng cho transit analysis |
| `World Traveller Plus` | 8 | Map thành `Premium Economy`, giữ raw value |
| Airport review thiếu text | 1 | Giữ cho rating, loại khỏi NLP |

## Potential duplicate

| Dataset | Duplicate groups | Flagged rows | Excess rows |
|---|---:|---:|---:|
| `airline_reviews` | 246 | 492 | 246 |
| `airport_reviews` | 95 | 190 | 95 |
| `lounge_reviews` | 2 | 4 | 2 |
| `seat_reviews` | 3 | 6 | 3 |

Các dòng này chỉ được gắn cờ; `duplicate_rank > 1` chưa bị xóa.

## Rating sau cleaning

| Dataset | Rating fields | Answered | Source NULL | Invalid | Coverage |
|---|---:|---:|---:|---:|---:|
| `airline_reviews` | 7 | 790,562 | 303,699 | 0 | 72.25% |
| `airport_reviews` | 8 | 259,878 | 136,162 | 0 | 65.62% |
| `lounge_reviews` | 7 | 34,131 | 1,478 | 0 | 95.85% |
| `seat_reviews` | 12 | 21,895 | 23,297 | 0 | 48.45% |

Rating `NULL` được giữ nguyên; không điền 0, mean hoặc median.

## Acceptance checks

| Kiểm tra | Expected | Actual | Status |
|---|---:|---:|---|
| All source rows retained | 0 | 0 | **PASS** |
| Primary-key violations | 0 | 0 | **PASS** |
| Foreign-key orphan rows | 0 | 0 | **PASS** |
| Invalid airline experience dates | 41 | 41 | **PASS** |
| Seat submission-date outliers | 6 | 6 | **PASS** |
| Incomplete airline routes | 106,712 | 106,712 | **PASS** |
| Suspicious same-origin/destination routes | 20 | 20 | **PASS** |
| Incomplete transit pairs | 8,599 | 8,599 | **PASS** |
| World Traveller Plus mappings | 8 | 8 | **PASS** |
| Airport reviews excluded from NLP | 1 | 1 | **PASS** |
| Flagged airline duplicate records | 492 | 492 | **PASS** |
| Flagged airport duplicate records | 190 | 190 | **PASS** |
| Flagged lounge duplicate records | 4 | 4 | **PASS** |
| Flagged seat duplicate records | 6 | 6 | **PASS** |
| Invalid rating rows | 0 | 0 | **PASS** |

## Output

- `airlines` → `data/processed/validated_airlines.csv`
- `airports` → `data/processed/validated_airports.csv`
- `airline_reviews` → `data/processed/validated_airline_reviews.csv`
- `airport_reviews` → `data/processed/validated_airport_reviews.csv`
- `lounge_reviews` → `data/processed/validated_lounge_reviews.csv`
- `seat_reviews` → `data/processed/validated_seat_reviews.csv`
- Machine-readable summary → `data/processed/cleaning_summary.json`

## Lưu ý

- Raw CSV biểu diễn cả database `NULL` và blank dưới dạng ô trống; pipeline xử lý cả hai là missing nhưng giữ nguyên file raw để audit.
- Nationality chỉ được trim và uppercase; chưa suy đoán hoặc gộp country alias.
- Dữ liệu clean là staging, chưa phải analytical mart.
