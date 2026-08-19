# Staging

Database nguồn chỉ cho phép đọc, vì vậy staging và cleaning được thực hiện bằng
Python trước khi nạp vào SQL:

```text
data/raw/*.csv
        ↓ python -m src.staging
data/processed/validated_*.csv
        ↓ python -m src.load_sql
SQL Server local: validated.*
```

Pipeline nằm tại [`../../src/staging.py`](../../src/staging.py), các hàm cleaning
dùng chung nằm tại [`../../src/cleaning.py`](../../src/cleaning.py). Báo cáo kết
quả nằm tại
[`../../docs/cleaning_report.md`](../../docs/cleaning_report.md).

Chạy lại từ thư mục gốc:

```powershell
python -m src.staging `
  --raw-dir data/raw `
  --output-dir data/processed `
  --report docs/cleaning_report.md `
  --as-of-date 2026-07-29
```

Máy hiện tại có thể cần gọi trực tiếp Python 3.13 nếu Windows launcher chưa được
đăng ký.

## Quy ước

- Giữ toàn bộ raw columns và toàn bộ record.
- Trường làm sạch dùng hậu tố `_clean` hoặc `_normalized`.
- Không tự động xóa potential duplicate; dùng `duplicate_rank` khi cần lọc ở
  intermediate/mart.
- Rating `NULL` không được impute.
- Các trường `_source_*` cung cấp lineage về file và dòng CSV nguồn.
- CSV clean trong `data/processed` là artifact local và không được commit.

DDL, loader và post-load checks nằm tại [`../load/`](../load/README.md).
