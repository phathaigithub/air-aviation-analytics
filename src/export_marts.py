"""Export SQL Server reporting marts to website-ready JSON files."""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Iterable

try:
    import pyodbc
except ImportError as exc:  # pragma: no cover - local ODBC dependency
    raise SystemExit(
        "Install dependencies first: python -m pip install -r requirements.txt"
    ) from exc


@dataclass(frozen=True)
class MartExport:
    name: str
    description: str
    grain: str
    query: str


MART_EXPORTS = (
    MartExport(
        "airline_yearly_performance",
        "Annual airline scorecard and service-driver metrics.",
        "airline_id + review_year",
        """SELECT * FROM mart.airline_yearly_performance
           WHERE LOWER(LTRIM(RTRIM(airline_name))) <> N'read more'
           ORDER BY review_year, airline_name;""",
    ),
    MartExport(
        "airline_segment_performance",
        "Reliable airline performance by customer and cabin segment.",
        "airline_id + review_year + travel_purpose + traveller_type + seat_type",
        """SELECT * FROM mart.airline_segment_performance
           WHERE meets_reporting_threshold = 1
             AND LOWER(LTRIM(RTRIM(airline_name))) <> N'read more'
           ORDER BY review_year, airline_name, traveller_type, seat_type;""",
    ),
    MartExport(
        "airport_yearly_performance",
        "Reliable annual airport operational scorecard.",
        "airport_id + review_year",
        """SELECT * FROM mart.airport_yearly_performance
           WHERE meets_reporting_threshold = 1
             AND LOWER(LTRIM(RTRIM(airport_name))) <> N'read more'
           ORDER BY review_year, airport_name;""",
    ),
    MartExport(
        "route_performance",
        "Lowest-recommendation eligible routes with sufficient sample.",
        "airline_id + route_key",
        """SELECT TOP (200) * FROM mart.route_performance
           WHERE meets_reporting_threshold = 1
             AND LOWER(LTRIM(RTRIM(airline_name))) <> N'read more'
           ORDER BY recommendation_rate_pct, review_count DESC, airline_name;""",
    ),
    MartExport(
        "premium_experience",
        "Airlines with reliable lounge and seat experience scores.",
        "airline_id",
        """SELECT * FROM mart.premium_experience
           WHERE meets_reporting_threshold = 1
             AND LOWER(LTRIM(RTRIM(airline_name))) <> N'read more'
           ORDER BY premium_overall_score DESC, airline_name;""",
    ),
    MartExport(
        "review_monthly_trend",
        "Monthly volume, verification and recommendation trend.",
        "review_type + review_month",
        """SELECT * FROM mart.review_monthly_trend
           ORDER BY review_month, review_type;""",
    ),
)


def load_env_file(path: Path) -> None:
    """Load KEY=VALUE entries without replacing process variables."""
    if not path.exists():
        return
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8-sig").splitlines(), start=1
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise RuntimeError(f"Invalid environment entry at {path}:{line_number}")
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)


def json_value(value: Any) -> Any:
    """Convert pyodbc values to types understood by JSON and JavaScript."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date, datetime, time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.hex()
    return str(value)


def rows_as_dicts(cursor: pyodbc.Cursor) -> tuple[list[str], list[dict[str, Any]]]:
    columns = [str(column[0]) for column in cursor.description]
    rows = [
        {column: json_value(value) for column, value in zip(columns, row)}
        for row in cursor.fetchall()
    ]
    return columns, rows


def write_json_atomic(path: Path, payload: dict[str, Any], indent: int | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(
            payload,
            handle,
            ensure_ascii=False,
            allow_nan=False,
            indent=indent,
            separators=None if indent else (",", ":"),
        )
        handle.write("\n")
    temporary_path.replace(path)


def validate_marts(cursor: pyodbc.Cursor, exports: Iterable[MartExport]) -> None:
    expected = {export.name for export in exports}
    placeholders = ", ".join("?" for _ in expected)
    cursor.execute(
        f"""SELECT v.name
            FROM sys.views AS v
            INNER JOIN sys.schemas AS s ON s.schema_id = v.schema_id
            WHERE s.name = N'mart' AND v.name IN ({placeholders});""",
        *sorted(expected),
    )
    available = {str(row[0]) for row in cursor.fetchall()}
    missing = sorted(expected - available)
    if missing:
        raise RuntimeError(
            "Missing mart views: "
            + ", ".join(f"mart.{name}" for name in missing)
            + ". Run sql/marts/create_marts.sql first."
        )


def export_marts(
    connection: pyodbc.Connection, output_dir: Path, indent: int | None
) -> dict[str, Any]:
    cursor = connection.cursor()
    validate_marts(cursor, MART_EXPORTS)
    generated_at = datetime.now(timezone.utc).isoformat()
    datasets: list[dict[str, Any]] = []

    for mart in MART_EXPORTS:
        cursor.execute(mart.query)
        columns, rows = rows_as_dicts(cursor)
        file_name = f"{mart.name}.json"
        write_json_atomic(
            output_dir / file_name,
            {
                "meta": {
                    "mart": f"mart.{mart.name}",
                    "description": mart.description,
                    "grain": mart.grain,
                    "generated_at_utc": generated_at,
                    "row_count": len(rows),
                    "columns": columns,
                },
                "rows": rows,
            },
            indent,
        )
        datasets.append(
            {
                "name": mart.name,
                "url": f"/data/marts/{file_name}",
                "description": mart.description,
                "grain": mart.grain,
                "row_count": len(rows),
                "columns": columns,
            }
        )
        print(f"Exported mart.{mart.name}: {len(rows):,} rows")

    manifest = {
        "schema_version": 1,
        "generated_at_utc": generated_at,
        "dataset_count": len(datasets),
        "datasets": datasets,
    }
    write_json_atomic(output_dir / "manifest.json", manifest, indent)
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export SQL Server mart views to website-ready JSON."
    )
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--connection-env", default="SQLSERVER_CONNECTION_STRING")
    parser.add_argument(
        "--output-dir", type=Path, default=Path("public/data/marts")
    )
    parser.add_argument("--compact", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_env_file(args.env_file)
    connection_string = os.environ.get(args.connection_env)
    if not connection_string:
        raise RuntimeError(
            f"Missing {args.connection_env}. Add it to {args.env_file} "
            "or define it in the process environment."
        )

    output_dir = args.output_dir.resolve()
    connection = pyodbc.connect(connection_string, autocommit=False)
    try:
        manifest = export_marts(
            connection,
            output_dir,
            None if args.compact else 2,
        )
    finally:
        connection.close()

    print(f"Export complete: {manifest['dataset_count']} datasets -> {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
