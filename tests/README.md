# Tests

Chạy unit test cho các cleaning rule:

```powershell
python -m unittest discover -s tests -v
```

Đối soát toàn bộ dataset được thực hiện trong pipeline và ghi vào
[`../docs/cleaning_report.md`](../docs/cleaning_report.md).
