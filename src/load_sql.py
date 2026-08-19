"""Load validated CSV artifacts into the local SQL Server database."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, Iterator, Sequence

try:
    import pyodbc
except ImportError as exc:  # pragma: no cover - depends on local ODBC setup
    raise SystemExit(
        "pyodbc is required. Install the project dependencies before loading: "
        "python -m pip install -r requirements.txt"
    ) from exc


csv.field_size_limit(min(sys.maxsize, 2_147_483_647))

SCHEMA = "validated"
LOAD_ORDER = (
    "airlines",
    "airports",
    "airline_reviews",
    "airport_reviews",
    "lounge_reviews",
    "seat_reviews",
)
DELETE_ORDER = tuple(reversed(LOAD_ORDER))
LEGACY_NAME_CLEAN_COLUMNS = {
    "airlines": {"airline_name_clean"},
    "airports": {"airport_name_clean"},
    "lounge_reviews": {"lounge_name_clean", "airport_name_clean"},
}
INTEGER_TYPES = {"bigint", "int", "smallint", "tinyint"}
DECIMAL_TYPES = {"decimal", "numeric", "money", "smallmoney", "float", "real"}
DATETIME_TYPES = {
    "datetime",
    "datetime2",
    "smalldatetime",
    "datetimeoffset",
}


def load_env_file(path: Path) -> None:
    """Load simple KEY=VALUE entries without overwriting process variables."""
    if not path.exists():
        return
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8-sig").splitlines(),
        start=1,
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise RuntimeError(
                f"Invalid environment entry at {path}:{line_number}"
            )
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {"'", '"'}
        ):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def read_summary(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        summary = json.load(handle)
    failed_checks = [
        check["check"]
        for check in summary.get("acceptance_checks", [])
        if check.get("status") != "PASS"
    ]
    if summary.get("status") != "PASS" or failed_checks:
        raise RuntimeError(
            "Refusing to load artifacts that did not pass validation. "
            f"Failed checks: {failed_checks}"
        )
    missing_tables = set(LOAD_ORDER) - set(summary.get("tables", {}))
    if missing_tables:
        raise RuntimeError(
            f"Cleaning summary is missing tables: {sorted(missing_tables)}"
        )
    return summary


def quote_identifier(identifier: str) -> str:
    return f"[{identifier.replace(']', ']]')}]"


def qualified_table(table: str) -> str:
    return f"{quote_identifier(SCHEMA)}.{quote_identifier(table)}"


def destination_columns(cursor: pyodbc.Cursor, table: str) -> list[tuple[str, str]]:
    cursor.execute(
        """
        SELECT c.name, TYPE_NAME(c.user_type_id) AS type_name
        FROM sys.columns AS c
        WHERE c.object_id = OBJECT_ID(?)
        ORDER BY c.column_id;
        """,
        f"{SCHEMA}.{table}",
    )
    columns = [(str(row[0]), str(row[1]).lower()) for row in cursor.fetchall()]
    if not columns:
        raise RuntimeError(
            f"Destination table {SCHEMA}.{table} does not exist. "
            "Run sql/load/02_create_validated_tables.sql first."
        )
    return columns


def csv_header(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        try:
            return next(reader)
        except StopIteration as exc:
            raise RuntimeError(f"CSV file is empty: {path}") from exc


def validate_csv_columns(
    table: str,
    csv_names: list[str] | None,
    sql_names: list[str],
) -> None:
    if csv_names is None:
        raise RuntimeError(f"CSV header is missing for {table}")
    allowed_legacy = LEGACY_NAME_CLEAN_COLUMNS.get(table, set())
    extra_names = set(csv_names) - set(sql_names)
    projected_names = [name for name in csv_names if name not in extra_names]
    if not extra_names.issubset(allowed_legacy) or projected_names != sql_names:
        raise RuntimeError(
            f"Schema mismatch for {table}.\n"
            f"CSV: {csv_names}\nSQL: {sql_names}"
        )


def converter_for(sql_type: str) -> Callable[[str], object]:
    if sql_type in INTEGER_TYPES:
        return int
    if sql_type == "bit":
        return lambda value: bool(int(value))
    if sql_type in DECIMAL_TYPES:
        return float
    if sql_type == "date":
        return date.fromisoformat
    if sql_type == "time":
        return lambda value: datetime.fromisoformat(
            f"2000-01-01T{value}"
        ).time()
    if sql_type in DATETIME_TYPES:
        return parse_datetime
    return lambda value: value


def parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def convert_value(
    value: str | None,
    converter: Callable[[str], object],
) -> object:
    if value is None or value == "":
        return None
    return converter(value)


def iter_batches(
    table: str,
    path: Path,
    columns: Sequence[tuple[str, str]],
    batch_size: int,
) -> Iterator[list[tuple[object, ...]]]:
    names = [name for name, _sql_type in columns]
    converters = [converter_for(sql_type) for _name, sql_type in columns]
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        validate_csv_columns(table, reader.fieldnames, names)
        batch: list[tuple[object, ...]] = []
        for row_number, row in enumerate(reader, start=2):
            if None in row:
                raise RuntimeError(
                    f"Malformed CSV row {row_number} in {path.name}"
                )
            try:
                values = tuple(
                    convert_value(row[name], converter)
                    for name, converter in zip(names, converters)
                )
            except (TypeError, ValueError) as exc:
                raise RuntimeError(
                    f"Type conversion failed at {path.name}:{row_number}: {exc}"
                ) from exc
            batch.append(values)
            if len(batch) >= batch_size:
                yield batch
                batch = []
        if batch:
            yield batch


def validate_inputs(
    cursor: pyodbc.Cursor,
    input_dir: Path,
    summary: dict,
) -> dict[str, tuple[Path, list[tuple[str, str]], int]]:
    inputs: dict[str, tuple[Path, list[tuple[str, str]], int]] = {}
    for table in LOAD_ORDER:
        table_summary = summary["tables"][table]
        expected_file = f"validated_{table}.csv"
        if table_summary.get("output_file") != expected_file:
            raise RuntimeError(
                f"Unexpected output file for {table}: "
                f"{table_summary.get('output_file')!r}"
            )
        path = (input_dir / expected_file).resolve()
        try:
            path.relative_to(input_dir)
        except ValueError as exc:
            raise RuntimeError(f"Input file is outside input directory: {path}") from exc
        if not path.is_file():
            raise RuntimeError(f"Missing input file: {path}")
        columns = destination_columns(cursor, table)
        sql_names = [name for name, _sql_type in columns]
        file_names = csv_header(path)
        validate_csv_columns(table, file_names, sql_names)
        inputs[table] = (
            path,
            columns,
            int(table_summary["output_rows"]),
        )
    return inputs


def prepare_destination(cursor: pyodbc.Cursor, mode: str) -> None:
    counts: dict[str, int] = {}
    for table in LOAD_ORDER:
        cursor.execute(f"SELECT COUNT_BIG(*) FROM {qualified_table(table)};")
        counts[table] = int(cursor.fetchone()[0])
    populated = {name: count for name, count in counts.items() if count}
    if mode == "fail" and populated:
        raise RuntimeError(
            "Destination is not empty. Use --mode replace for a full reload: "
            f"{populated}"
        )
    if mode == "replace":
        for table in DELETE_ORDER:
            cursor.execute(f"DELETE FROM {qualified_table(table)};")


def insert_table(
    cursor: pyodbc.Cursor,
    table: str,
    path: Path,
    columns: list[tuple[str, str]],
    batch_size: int,
) -> int:
    names = [name for name, _sql_type in columns]
    column_sql = ", ".join(quote_identifier(name) for name in names)
    placeholders = ", ".join("?" for _name in names)
    insert_sql = (
        f"INSERT INTO {qualified_table(table)} ({column_sql}) "
        f"VALUES ({placeholders});"
    )
    inserted = 0
    for batch in iter_batches(table, path, columns, batch_size):
        cursor.executemany(insert_sql, batch)
        inserted += len(batch)
        print(f"{table}: prepared {inserted:,} rows", flush=True)
    return inserted


def verify_row_counts(
    cursor: pyodbc.Cursor,
    expected: dict[str, int],
) -> None:
    errors: list[str] = []
    for table in LOAD_ORDER:
        cursor.execute(f"SELECT COUNT_BIG(*) FROM {qualified_table(table)};")
        actual = int(cursor.fetchone()[0])
        if actual != expected[table]:
            errors.append(f"{table}: expected {expected[table]}, actual {actual}")
    if errors:
        raise RuntimeError("Post-load row-count mismatch: " + "; ".join(errors))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Load validated CSV files into SQL Server."
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=Path("data/processed"),
    )
    parser.add_argument(
        "--summary",
        type=Path,
        default=Path("data/processed/cleaning_summary.json"),
    )
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument(
        "--connection-env",
        default="SQLSERVER_CONNECTION_STRING",
        help="Environment variable containing the ODBC connection string.",
    )
    parser.add_argument(
        "--mode",
        choices=("fail", "replace"),
        default="fail",
        help="Fail on populated tables or replace all six tables.",
    )
    parser.add_argument("--batch-size", type=int, default=1_000)
    parser.add_argument(
        "--no-fast-executemany",
        action="store_true",
        help="Disable pyodbc fast_executemany for driver troubleshooting.",
    )
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be greater than zero")
    return args


def main() -> int:
    args = parse_args()
    load_env_file(args.env_file)
    connection_string = os.environ.get(args.connection_env)
    if not connection_string:
        raise RuntimeError(
            f"Missing {args.connection_env}. Add it to {args.env_file} "
            "or define it in the process environment."
        )

    input_dir = args.input_dir.resolve()
    summary_path = args.summary.resolve()
    summary = read_summary(summary_path)
    connection = pyodbc.connect(connection_string, autocommit=False)
    try:
        cursor = connection.cursor()
        cursor.fast_executemany = not args.no_fast_executemany
        cursor.execute("SET XACT_ABORT ON;")

        inputs = validate_inputs(cursor, input_dir, summary)
        prepare_destination(cursor, args.mode)
        expected_counts = {
            table: expected
            for table, (_path, _columns, expected) in inputs.items()
        }

        for table in LOAD_ORDER:
            path, columns, expected = inputs[table]
            inserted = insert_table(
                cursor,
                table,
                path,
                columns,
                args.batch_size,
            )
            if inserted != expected:
                raise RuntimeError(
                    f"{table}: expected {expected} CSV rows, read {inserted}"
                )

        verify_row_counts(cursor, expected_counts)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    total_reviews = sum(
        int(summary["tables"][table]["output_rows"])
        for table in LOAD_ORDER
        if table.endswith("_reviews")
    )
    print(
        f"Load committed: {len(LOAD_ORDER)} tables, "
        f"{total_reviews:,} review rows."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
