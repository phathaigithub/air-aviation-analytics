# Load validated data vào SQL Server

Thư mục này chứa các script tạo database, tạo bảng đích và đối soát sau khi nạp
6 file `data/processed/validated_*.csv`.

## Đích dữ liệu

```text
data/processed/validated_*.csv
        ↓ python -m src.load_sql
SQL Server: xom_air_analytics.validated.*
        ↓ post-load checks PASS
SQL Server: mart.* (bước tiếp theo)
```

Các bảng được nạp:

| Thứ tự | Bảng | Số dòng kỳ vọng |
|---:|---|---:|
| 1 | `validated.airlines` | 595 |
| 2 | `validated.airports` | 1.004 |
| 3 | `validated.airline_reviews` | 156.323 |
| 4 | `validated.airport_reviews` | 49.505 |
| 5 | `validated.lounge_reviews` | 5.087 |
| 6 | `validated.seat_reviews` | 3.766 |

Tổng số review kỳ vọng là **214.681**.

## Chuẩn bị

1. Cài SQL Server và Microsoft ODBC Driver 18 for SQL Server.
2. Cài dependency Python:

   ```powershell
   python -m pip install -r requirements.txt
   ```

3. Sao chép `.env.example` thành `.env` và chỉnh chuỗi kết nối local:

   ```env
   SQLSERVER_CONNECTION_STRING=DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost\SQLEXPRESS;DATABASE=xom_air_analytics;Trusted_Connection=yes;TrustServerCertificate=yes
   ```

Không commit `.env` hoặc thông tin đăng nhập thật.

## Thứ tự chạy

### 1. Tạo database

Chạy [`01_create_database.sql`](01_create_database.sql) bằng `sqlcmd` hoặc bật
SQLCMD Mode trong SSMS. Giá trị mặc định là `xom_air_analytics`.

### 2. Tạo schema và bảng

Kết nối vào database `xom_air_analytics`, sau đó chạy
[`02_create_validated_tables.sql`](02_create_validated_tables.sql).

Script tạo schema `validated`, primary key, foreign key và các index phục vụ phân
tích. Loader kiểm tra các cột SQL với header CSV. Bốn cột `*_name_clean` cũ trong
CSV hiện tại được bỏ qua vì dữ liệu tên đã hoàn tất validation.

### 3. Nạp dữ liệu

Lần nạp đầu tiên:

```powershell
python -m src.load_sql
```

Loader mặc định dùng chế độ `fail`: nếu một trong sáu bảng đã có dữ liệu, quá
trình dừng mà không xóa dữ liệu.

Để nạp lại toàn bộ sáu bảng:

```powershell
python -m src.load_sql --mode replace
```

Chế độ `replace` xóa bảng review trước dimension, nạp lại theo đúng thứ tự foreign
key và chỉ commit khi tất cả bảng khớp `cleaning_summary.json`. Mọi thay đổi được
rollback nếu một bảng hoặc một batch lỗi.

Có thể điều chỉnh batch:

```powershell
python -m src.load_sql --batch-size 500
```

Nếu ODBC driver gặp vấn đề với `fast_executemany`:

```powershell
python -m src.load_sql --no-fast-executemany
```

### 4. Đối soát

Sau khi loader commit thành công, chạy
[`03_post_load_checks.sql`](03_post_load_checks.sql).

Script kiểm tra:

- row count của sáu bảng;
- tổng số review;
- foreign-key orphan;
- rating ngoài khoảng 1–5;
- các cờ date, route, duplicate, NLP và category so với baseline Python.

Chỉ bắt đầu xây dựng `mart.*` khi kết quả cuối cùng là `PASS`.
