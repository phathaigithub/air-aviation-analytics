# Xóm Air Data Dictionary

Tài liệu này định nghĩa cấu trúc và ý nghĩa nghiệp vụ của dữ liệu nguồn. Kết quả
profiling, vấn đề chất lượng và cleaning rules được trình bày riêng trong
[Data Quality Report](data_quality_report.md).

## 1. Thông tin nguồn

| Thuộc tính | Giá trị |
|---|---|
| Database engine | Microsoft SQL Server 2019 |
| Database | `xomdata_dataset` |
| Schema | `skytrax` |
| Số bảng | 6 |
| Số trường | 97 |

## 2. Quy ước dữ liệu

- Mỗi bảng review có grain là một lượt đánh giá.
- `review_id` chỉ duy nhất trong bảng chứa nó, không phải khóa dùng chung giữa
  các bảng review.
- Rating sử dụng thang 1–5, trong đó 5 là tốt nhất.
- Rating `NULL` nghĩa là khách không chấm hoặc tiêu chí không áp dụng.
- `verify = 1` nghĩa là review đã được xác minh.
- `recommended = 1` nghĩa là khách sẵn sàng giới thiệu.
- `recommended` dùng để tính Recommendation Rate, không phải NPS.
- `date_submitted` là ngày gửi review.
- `date_flown` và `date_visit` là ngày trải nghiệm nếu được cung cấp.
- `customer_name` là bí danh, không phải customer key.
- `updated_at` là thời điểm cập nhật bản ghi trong hệ thống nguồn.

## 3. Tổng quan bảng

| Bảng | Grain | Primary key | Foreign key |
|---|---|---|---|
| `skytrax.airlines` | Một hãng hàng không | `airline_id` | — |
| `skytrax.airports` | Một sân bay | `airport_id` | — |
| `skytrax.airline_reviews` | Một review chuyến bay | `review_id` | `airline_id → airlines.airline_id` |
| `skytrax.airport_reviews` | Một review sân bay | `review_id` | `airport_id → airports.airport_id` | as N'Tổng số đánh giá'
| `skytrax.lounge_reviews` | Một review phòng chờ | `review_id` | `airline_id → airlines.airline_id` |
| `skytrax.seat_reviews` | Một review chuyên biệt về ghế | `review_id` | `airline_id → airlines.airline_id` |

## 4. `skytrax.airlines`

Danh mục hãng hàng không dùng chung cho review chuyến bay, phòng chờ và ghế.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `airline_id` | `int` | Không | PK | Mã định danh hãng hàng không |
| `airline_name` | `nvarchar(100)` | Không | Label | Tên hãng hàng không |

## 5. `skytrax.airports`

Danh mục sân bay dùng cho bảng `airport_reviews`.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `airport_id` | `int` | Không | PK | Mã định danh sân bay |
| `airport_name` | `nvarchar(150)` | Không | Label | Tên sân bay |

## 6. `skytrax.airline_reviews`

Đánh giá toàn bộ trải nghiệm chuyến bay. Mỗi dòng gắn với một hãng hàng không.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `review_id` | `int` | Không | PK | Mã review, duy nhất trong bảng |
| `airline_id` | `int` | Không | FK | Hãng hàng không được đánh giá |
| `verify` | `bit` | Không | Flag | Review đã được xác minh |
| `date_submitted` | `date` | Có | Date | Ngày gửi review |
| `date_flown` | `date` | Có | Date | Ngày thực hiện chuyến bay |
| `customer_name` | `nvarchar(100)` | Có | Pseudonym | Bí danh người đánh giá |
| `nationality` | `nvarchar(100)` | Có | Dimension | Quốc tịch do người dùng nhập |
| `type_of_traveller` | `nvarchar(30)` | Có | Dimension | Nhóm hành khách |
| `seat_type` | `nvarchar(30)` | Có | Dimension | Hạng ghế |
| `aircraft` | `nvarchar(100)` | Có | Dimension | Loại máy bay dạng text |
| `origin_city` | `nvarchar(100)` | Có | Route | Thành phố khởi hành |
| `origin_airport` | `nvarchar(10)` | Có | Route | Mã sân bay khởi hành dạng text |
| `destination_city` | `nvarchar(100)` | Có | Route | Thành phố đến |
| `destination_airport` | `nvarchar(10)` | Có | Route | Mã sân bay đến dạng text |
| `transit_city` | `nvarchar(100)` | Có | Route | Thành phố transit |
| `transit_airport` | `nvarchar(10)` | Có | Route | Mã sân bay transit dạng text |
| `seat_comfort` | `tinyint` | Có | Rating | Độ thoải mái của ghế, thang 1–5 |
| `cabin_staff_service` | `tinyint` | Có | Rating | Dịch vụ tiếp viên, thang 1–5 |
| `food_and_beverages` | `tinyint` | Có | Rating | Đồ ăn và thức uống, thang 1–5 |
| `inflight_entertainment` | `tinyint` | Có | Rating | Giải trí trên chuyến bay, thang 1–5 |
| `ground_service` | `tinyint` | Có | Rating | Dịch vụ mặt đất, thang 1–5 |
| `wifi_and_connectivity` | `tinyint` | Có | Rating | Wi-Fi và kết nối, thang 1–5 |
| `value_for_money` | `tinyint` | Có | Rating | Mức đáng đồng tiền, thang 1–5 |
| `recommended` | `bit` | Không | Outcome | Khách có sẵn sàng giới thiệu hay không |
| `review` | `nvarchar(max)` | Có | Text | Nội dung review |
| `updated_at` | `datetime2` | Có | Audit | Thời điểm cập nhật bản ghi |

## 7. `skytrax.airport_reviews`

Đánh giá trải nghiệm tại sân bay. Mỗi dòng gắn với một sân Zbay.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `review_id` | `int` | Không | PK | Mã review, duy nhất trong bảng |
| `airport_id` | `int` | Không | FK | Sân bay được đánh giá |
| `verify` | `bit` | Không | Flag | Review đã được xác minh |
| `date_submitted` | `date` | Có | Date | Ngày gửi review |
| `date_visit` | `date` | Có | Date | Ngày đến sân bay |
| `customer_name` | `nvarchar(100)` | Có | Pseudonym | Bí danh người đánh giá |
| `nationality` | `nvarchar(100)` | Có | Dimension | Quốc tịch do người dùng nhập |
| `experience_at_airport` | `nvarchar(40)` | Có | Dimension | Loại trải nghiệm tại sân bay |
| `type_of_traveller` | `nvarchar(30)` | Có | Dimension | Nhóm hành khách |
| `queuing_times` | `tinyint` | Có | Rating | Trải nghiệm xếp hàng, thang 1–5 |
| `terminal_cleanliness` | `tinyint` | Có | Rating | Độ sạch nhà ga, thang 1–5 |
| `terminal_seating` | `tinyint` | Có | Rating | Ghế chờ nhà ga, thang 1–5 |
| `terminal_signs` | `tinyint` | Có | Rating | Biển chỉ dẫn, thang 1–5 |
| `food_beverages` | `tinyint` | Có | Rating | Ẩm thực tại sân bay, thang 1–5 |
| `airport_shopping` | `tinyint` | Có | Rating | Trải nghiệm mua sắm, thang 1–5 |
| `airport_staff` | `tinyint` | Có | Rating | Nhân viên sân bay, thang 1–5 |
| `wifi_connectivity` | `tinyint` | Có | Rating | Wi-Fi và kết nối, thang 1–5 |
| `recommended` | `bit` | Không | Outcome | Khách có sẵn sàng giới thiệu hay không |
| `review` | `nvarchar(max)` | Có | Text | Nội dung review |
| `updated_at` | `datetime2` | Có | Audit | Thời điểm cập nhật bản ghi |

## 8. `skytrax.lounge_reviews`

Đánh giá phòng chờ. Mỗi dòng gắn với một hãng hàng không.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `review_id` | `int` | Không | PK | Mã review, duy nhất trong bảng |
| `airline_id` | `int` | Không | FK | Hãng hàng không gắn với phòng chờ |
| `lounge_name` | `nvarchar(150)` | Có | Dimension | Tên phòng chờ dạng text |
| `airport` | `nvarchar(150)` | Có | Free text | Tên sân bay dạng text, không phải FK |
| `type_of_lounge` | `nvarchar(40)` | Có | Dimension | Loại phòng chờ |
| `type_of_traveller` | `nvarchar(30)` | Có | Dimension | Nhóm hành khách |
| `verify` | `bit` | Không | Flag | Review đã được xác minh |
| `date_submitted` | `date` | Có | Date | Ngày gửi review |
| `date_visit` | `date` | Có | Date | Ngày sử dụng phòng chờ |
| `customer_name` | `nvarchar(100)` | Có | Pseudonym | Bí danh người đánh giá |
| `nationality` | `nvarchar(100)` | Có | Dimension | Quốc tịch do người dùng nhập |
| `comfort` | `tinyint` | Có | Rating | Tiện nghi, thang 1–5 |
| `cleanliness` | `tinyint` | Có | Rating | Độ sạch, thang 1–5 |
| `bar_and_beverages` | `tinyint` | Có | Rating | Quầy bar và đồ uống, thang 1–5 |
| `catering` | `tinyint` | Có | Rating | Đồ ăn, thang 1–5 |
| `washrooms` | `tinyint` | Có | Rating | Nhà vệ sinh, thang 1–5 |
| `wifi_connectivity` | `tinyint` | Có | Rating | Wi-Fi và kết nối, thang 1–5 |
| `staff_service` | `tinyint` | Có | Rating | Nhân viên phục vụ, thang 1–5 |
| `recommended` | `bit` | Không | Outcome | Khách có sẵn sàng giới thiệu hay không |
| `review` | `nvarchar(max)` | Có | Text | Nội dung review |
| `updated_at` | `datetime2` | Có | Audit | Thời điểm cập nhật bản ghi |

## 9. `skytrax.seat_reviews`

Đánh giá chuyên sâu về ghế. Mỗi dòng gắn với một hãng hàng không.

| Cột | Kiểu dữ liệu | NULL | Vai trò | Định nghĩa |
|---|---|---|---|---|
| `review_id` | `int` | Không | PK | Mã review, duy nhất trong bảng |
| `airline_id` | `int` | Không | FK | Hãng hàng không được đánh giá |
| `type_of_traveller` | `nvarchar(30)` | Có | Dimension | Nhóm hành khách |
| `seat_type` | `nvarchar(30)` | Có | Dimension | Hạng ghế |
| `aircraft_type` | `nvarchar(100)` | Có | Dimension | Loại máy bay dạng text |
| `seat_layout` | `nvarchar(20)` | Có | Dimension | Cấu hình hoặc bố cục ghế |
| `verify` | `bit` | Không | Flag | Review đã được xác minh |
| `date_submitted` | `date` | Có | Date | Ngày gửi review |
| `date_flown` | `date` | Có | Date | Ngày thực hiện chuyến bay |
| `customer_name` | `nvarchar(100)` | Có | Pseudonym | Bí danh người đánh giá |
| `nationality` | `nvarchar(100)` | Có | Dimension | Quốc tịch do người dùng nhập |
| `seat_legroom` | `tinyint` | Có | Rating | Khoảng để chân, thang 1–5 |
| `seat_recline` | `tinyint` | Có | Rating | Độ ngả ghế, thang 1–5 |
| `seat_width` | `tinyint` | Có | Rating | Độ rộng ghế, thang 1–5 |
| `aisle_space` | `tinyint` | Có | Rating | Không gian lối đi, thang 1–5 |
| `seat_storage` | `tinyint` | Có | Rating | Chỗ để đồ, thang 1–5 |
| `power_supply` | `tinyint` | Có | Rating | Ổ điện, thang 1–5 |
| `viewing_tv_screen` | `tinyint` | Có | Rating | Trải nghiệm màn hình, thang 1–5 |
| `sleep_comfort` | `tinyint` | Có | Rating | Độ thoải mái khi ngủ, thang 1–5 |
| `sitting_comfort` | `tinyint` | Có | Rating | Độ thoải mái khi ngồi, thang 1–5 |
| `seat_bed_width` | `tinyint` | Có | Rating | Độ rộng giường, thang 1–5 |
| `seat_bed_length` | `tinyint` | Có | Rating | Độ dài giường, thang 1–5 |
| `seat_privacy` | `tinyint` | Có | Rating | Mức riêng tư, thang 1–5 |
| `recommended` | `bit` | Không | Outcome | Khách có sẵn sàng giới thiệu hay không |
| `review` | `nvarchar(max)` | Có | Text | Nội dung review |
| `updated_at` | `datetime2` | Có | Audit | Thời điểm cập nhật bản ghi |

