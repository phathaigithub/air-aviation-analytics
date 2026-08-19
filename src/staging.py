"""Build row-preserving cleaned CSV staging files from DBeaver raw extracts."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterator

from .cleaning import (
    AIRPORT_EXPERIENCE_MAP,
    LOUNGE_TYPE_MAP,
    SEAT_TYPE_MAP,
    TRAVELLER_TYPE_MAP,
    clean_experience_date,
    clean_rating,
    clean_submission_date,
    clean_text,
    normalize_category,
    normalize_nationality,
    null_if_blank,
    parse_bit,
    review_fingerprint,
    source_row_hash,
    travel_purpose,
)


csv.field_size_limit(min(sys.maxsize, 2_147_483_647))


@dataclass(frozen=True)
class ReviewConfig:
    table: str
    entity_column: str
    experience_date_column: str
    columns: tuple[str, ...]
    ratings: tuple[str, ...]
    category_columns: tuple[tuple[str, dict[str, str], str], ...]


DIMENSION_COLUMNS = {
    "airlines": ("airline_id", "airline_name"),
    "airports": ("airport_id", "airport_name"),
}

REVIEW_CONFIGS = (
    ReviewConfig(
        table="airline_reviews",
        entity_column="airline_id",
        experience_date_column="date_flown",
        columns=(
            "review_id", "airline_id", "verify", "date_submitted", "date_flown",
            "customer_name", "nationality", "type_of_traveller", "seat_type",
            "aircraft", "origin_city", "origin_airport", "destination_city",
            "destination_airport", "transit_city", "transit_airport",
            "seat_comfort", "cabin_staff_service", "food_and_beverages",
            "inflight_entertainment", "ground_service", "wifi_and_connectivity",
            "value_for_money", "recommended", "review", "updated_at",
        ),
        ratings=(
            "seat_comfort", "cabin_staff_service", "food_and_beverages",
            "inflight_entertainment", "ground_service", "wifi_and_connectivity",
            "value_for_money",
        ),
        category_columns=(
            ("type_of_traveller", TRAVELLER_TYPE_MAP, "type_of_traveller"),
            ("seat_type", SEAT_TYPE_MAP, "seat_type"),
        ),
    ),
    ReviewConfig(
        table="airport_reviews",
        entity_column="airport_id",
        experience_date_column="date_visit",
        columns=(
            "review_id", "airport_id", "verify", "date_submitted", "date_visit",
            "customer_name", "nationality", "experience_at_airport",
            "type_of_traveller", "queuing_times", "terminal_cleanliness",
            "terminal_seating", "terminal_signs", "food_beverages",
            "airport_shopping", "airport_staff", "wifi_connectivity",
            "recommended", "review", "updated_at",
        ),
        ratings=(
            "queuing_times", "terminal_cleanliness", "terminal_seating",
            "terminal_signs", "food_beverages", "airport_shopping",
            "airport_staff", "wifi_connectivity",
        ),
        category_columns=(
            ("experience_at_airport", AIRPORT_EXPERIENCE_MAP, "airport_experience"),
            ("type_of_traveller", TRAVELLER_TYPE_MAP, "type_of_traveller"),
        ),
    ),
    ReviewConfig(
        table="lounge_reviews",
        entity_column="airline_id",
        experience_date_column="date_visit",
        columns=(
            "review_id", "airline_id", "lounge_name", "airport",
            "type_of_lounge", "type_of_traveller", "verify", "date_submitted",
            "date_visit", "customer_name", "nationality", "comfort",
            "cleanliness", "bar_and_beverages", "catering", "washrooms",
            "wifi_connectivity", "staff_service", "recommended", "review",
            "updated_at",
        ),
        ratings=(
            "comfort", "cleanliness", "bar_and_beverages", "catering",
            "washrooms", "wifi_connectivity", "staff_service",
        ),
        category_columns=(
            ("type_of_lounge", LOUNGE_TYPE_MAP, "lounge_type"),
            ("type_of_traveller", TRAVELLER_TYPE_MAP, "type_of_traveller"),
        ),
    ),
    ReviewConfig(
        table="seat_reviews",
        entity_column="airline_id",
        experience_date_column="date_flown",
        columns=(
            "review_id", "airline_id", "type_of_traveller", "seat_type",
            "aircraft_type", "seat_layout", "verify", "date_submitted",
            "date_flown", "customer_name", "nationality", "seat_legroom",
            "seat_recline", "seat_width", "aisle_space", "seat_storage",
            "power_supply", "viewing_tv_screen", "sleep_comfort",
            "sitting_comfort", "seat_bed_width", "seat_bed_length",
            "seat_privacy", "recommended", "review", "updated_at",
        ),
        ratings=(
            "seat_legroom", "seat_recline", "seat_width", "aisle_space",
            "seat_storage", "power_supply", "viewing_tv_screen",
            "sleep_comfort", "sitting_comfort", "seat_bed_width",
            "seat_bed_length", "seat_privacy",
        ),
        category_columns=(
            ("type_of_traveller", TRAVELLER_TYPE_MAP, "type_of_traveller"),
            ("seat_type", SEAT_TYPE_MAP, "seat_type"),
        ),
    ),
)

LINEAGE_COLUMNS = (
    "_source_file",
    "_source_row_number",
    "_source_sha256",
)

COMMON_CLEAN_COLUMNS = (
    "is_verified",
    "is_recommended",
    "date_submitted_clean",
    "experience_date_clean",
    "is_invalid_experience_date",
    "is_submission_date_outlier",
    "review_year",
    "review_month",
    "nationality_normalized",
    "travel_purpose",
    "has_invalid_boolean",
    "has_invalid_rating",
    "review_clean",
    "is_nlp_eligible",
    "review_fingerprint",
    "duplicate_group_size",
    "duplicate_rank",
    "is_potential_duplicate",
)

TABLE_SPECIFIC_CLEAN_COLUMNS = {
    "airline_reviews": (
        "aircraft_clean",
        "origin_city_clean",
        "origin_airport_clean",
        "destination_city_clean",
        "destination_airport_clean",
        "transit_city_clean",
        "transit_airport_clean",
        "has_complete_route",
        "route_key",
        "is_suspicious_route",
        "is_incomplete_transit",
        "is_route_analysis_eligible",
    ),
    "airport_reviews": (),
    "lounge_reviews": (),
    "seat_reviews": ("aircraft_type_clean", "seat_layout_clean"),
}


def locate_extract(raw_dir: Path, table: str) -> Path:
    candidates = sorted(raw_dir.glob(f"{table}_*.csv"))
    exact = raw_dir / f"{table}.csv"
    if exact.exists():
        candidates.append(exact)
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected exactly one CSV for {table}, found {len(candidates)}: "
            f"{[p.name for p in candidates]}"
        )
    return candidates[0]


def rows_from(path: Path) -> tuple[list[str], Iterator[tuple[int, dict[str, str]]]]:
    handle = path.open("r", encoding="utf-8-sig", newline="")
    reader = csv.DictReader(handle)
    fieldnames = reader.fieldnames or []

    def iterator() -> Iterator[tuple[int, dict[str, str]]]:
        try:
            for row_number, row in enumerate(reader, start=1):
                if None in row:
                    raise RuntimeError(
                        f"Malformed CSV row {row_number} in {path.name}"
                    )
                yield row_number, row
        finally:
            handle.close()

    return fieldnames, iterator()


def validate_columns(
    path: Path,
    actual: list[str],
    expected: tuple[str, ...],
) -> None:
    if actual != list(expected):
        raise RuntimeError(
            f"Schema mismatch in {path.name}.\n"
            f"Expected: {list(expected)}\nActual: {actual}"
        )


def atomic_csv_writer(
    output_path: Path,
    fieldnames: list[str],
) -> tuple[Path, object, csv.DictWriter]:
    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    handle = temp_path.open("w", encoding="utf-8", newline="")
    writer = csv.DictWriter(
        handle,
        fieldnames=fieldnames,
        extrasaction="raise",
        quoting=csv.QUOTE_MINIMAL,
        lineterminator="\n",
    )
    writer.writeheader()
    return temp_path, handle, writer


def finalize_atomic_file(temp_path: Path, output_path: Path) -> None:
    os.replace(temp_path, output_path)


def process_dimension(
    table: str,
    raw_path: Path,
    output_dir: Path,
) -> tuple[dict, set[str]]:
    expected = DIMENSION_COLUMNS[table]
    fieldnames, rows = rows_from(raw_path)
    validate_columns(raw_path, fieldnames, expected)
    key_column, _name_column = expected
    output_fields = [
        *fieldnames,
        *LINEAGE_COLUMNS,
    ]
    output_path = output_dir / f"validated_{table}.csv"
    temp_path, handle, writer = atomic_csv_writer(output_path, output_fields)
    keys: set[str] = set()
    null_keys = 0
    rows_written = 0
    try:
        for row_number, row in rows:
            key = null_if_blank(row[key_column])
            if key is None:
                null_keys += 1
            else:
                keys.add(key)
            output = dict(row)
            output["_source_file"] = raw_path.name
            output["_source_row_number"] = row_number
            output["_source_sha256"] = source_row_hash(row, fieldnames)
            writer.writerow(output)
            rows_written += 1
    except Exception:
        handle.close()
        temp_path.unlink(missing_ok=True)
        raise
    else:
        handle.close()
        finalize_atomic_file(temp_path, output_path)

    summary = {
        "source_file": raw_path.name,
        "output_file": output_path.name,
        "source_rows": rows_written,
        "output_rows": rows_written,
        "distinct_keys": len(keys),
        "null_keys": null_keys,
        "duplicate_keys": rows_written - len(keys) - null_keys,
        "source_columns": len(fieldnames),
        "output_columns": len(output_fields),
    }
    return summary, keys


def category_output_columns(config: ReviewConfig) -> list[str]:
    columns: list[str] = []
    for _source, _mapping, alias in config.category_columns:
        columns.extend((f"{alias}_normalized", f"{alias}_needs_review"))
    return columns


def review_output_fields(config: ReviewConfig) -> list[str]:
    rating_columns = [f"{name}_clean" for name in config.ratings]
    return [
        *config.columns,
        *COMMON_CLEAN_COLUMNS,
        *category_output_columns(config),
        *TABLE_SPECIFIC_CLEAN_COLUMNS[config.table],
        *rating_columns,
        *LINEAGE_COLUMNS,
    ]


def profile_review(
    config: ReviewConfig,
    raw_path: Path,
) -> tuple[Counter[str], dict]:
    fieldnames, rows = rows_from(raw_path)
    validate_columns(raw_path, fieldnames, config.columns)
    duplicate_counts: Counter[str] = Counter()
    keys: set[str] = set()
    null_keys = 0
    source_rows = 0
    for _row_number, row in rows:
        source_rows += 1
        key = null_if_blank(row["review_id"])
        if key is None:
            null_keys += 1
        else:
            keys.add(key)
        duplicate_counts[
            review_fingerprint(row, entity_column=config.entity_column)
        ] += 1
    duplicate_keys = source_rows - len(keys) - null_keys
    return duplicate_counts, {
        "source_file": raw_path.name,
        "source_rows": source_rows,
        "distinct_keys": len(keys),
        "null_keys": null_keys,
        "duplicate_keys": duplicate_keys,
        "source_columns": len(fieldnames),
    }


def add_route_fields(output: dict[str, object], row: dict[str, str]) -> None:
    origin_city = null_if_blank(row["origin_city"])
    origin_airport_value = null_if_blank(row["origin_airport"])
    destination_city = null_if_blank(row["destination_city"])
    destination_airport_value = null_if_blank(row["destination_airport"])
    transit_city = null_if_blank(row["transit_city"])
    transit_airport_value = null_if_blank(row["transit_airport"])
    origin_airport = (
        None if origin_airport_value is None else origin_airport_value.upper()
    )
    destination_airport = (
        None
        if destination_airport_value is None
        else destination_airport_value.upper()
    )
    transit_airport = (
        None if transit_airport_value is None else transit_airport_value.upper()
    )
    complete = origin_airport is not None and destination_airport is not None
    suspicious = complete and origin_airport == destination_airport
    incomplete_transit = (transit_city is None) != (transit_airport is None)
    output.update(
        {
            "origin_city_clean": origin_city,
            "origin_airport_clean": origin_airport,
            "destination_city_clean": destination_city,
            "destination_airport_clean": destination_airport,
            "transit_city_clean": transit_city,
            "transit_airport_clean": transit_airport,
            "has_complete_route": int(complete),
            "route_key": (
                f"{origin_airport}->{destination_airport}" if complete else None
            ),
            "is_suspicious_route": int(suspicious),
            "is_incomplete_transit": int(incomplete_transit),
            "is_route_analysis_eligible": int(complete and not suspicious),
        }
    )


def transform_review(
    row: dict[str, str],
    *,
    row_number: int,
    raw_path: Path,
    config: ReviewConfig,
    duplicate_counts: Counter[str],
    duplicate_ranks: defaultdict[str, int],
    as_of_date: date,
) -> tuple[dict[str, object], dict[str, object]]:
    output: dict[str, object] = dict(row)
    is_verified, invalid_verify = parse_bit(row["verify"])
    is_recommended, invalid_recommended = parse_bit(row["recommended"])
    submitted_clean, submission_outlier = clean_submission_date(
        row["date_submitted"],
        as_of_date=as_of_date,
    )
    experience_clean, invalid_experience = clean_experience_date(
        row[config.experience_date_column],
        row["date_submitted"],
    )
    review_clean = clean_text(row["review"])
    fingerprint = review_fingerprint(row, entity_column=config.entity_column)
    duplicate_ranks[fingerprint] += 1
    group_size = duplicate_counts[fingerprint]

    output.update(
        {
            "is_verified": is_verified,
            "is_recommended": is_recommended,
            "date_submitted_clean": submitted_clean,
            "experience_date_clean": experience_clean,
            "is_invalid_experience_date": int(invalid_experience),
            "is_submission_date_outlier": int(submission_outlier),
            "review_year": submitted_clean[:4] if submitted_clean else None,
            "review_month": (
                f"{submitted_clean[:7]}-01" if submitted_clean else None
            ),
            "nationality_normalized": normalize_nationality(row["nationality"]),
            "has_invalid_boolean": int(invalid_verify or invalid_recommended),
            "review_clean": review_clean,
            "is_nlp_eligible": int(review_clean is not None),
            "review_fingerprint": fingerprint,
            "duplicate_group_size": group_size,
            "duplicate_rank": duplicate_ranks[fingerprint],
            "is_potential_duplicate": int(group_size > 1),
        }
    )

    category_flags: dict[str, int] = {}
    normalized_traveller = "Unknown"
    for source_column, mapping, alias in config.category_columns:
        normalized, needs_review = normalize_category(row[source_column], mapping)
        output[f"{alias}_normalized"] = normalized
        output[f"{alias}_needs_review"] = int(needs_review)
        category_flags[f"{alias}_needs_review"] = int(needs_review)
        if source_column == "type_of_traveller":
            normalized_traveller = normalized
    output["travel_purpose"] = travel_purpose(normalized_traveller)

    invalid_rating = False
    rating_state: dict[str, tuple[bool, bool]] = {}
    for rating in config.ratings:
        clean_value, is_invalid = clean_rating(row[rating])
        output[f"{rating}_clean"] = clean_value
        invalid_rating = invalid_rating or is_invalid
        rating_state[rating] = (
            null_if_blank(row[rating]) is None,
            is_invalid,
        )
    output["has_invalid_rating"] = int(invalid_rating)

    if config.table == "airline_reviews":
        output["aircraft_clean"] = null_if_blank(row["aircraft"])
        add_route_fields(output, row)
    elif config.table == "seat_reviews":
        output["aircraft_type_clean"] = null_if_blank(row["aircraft_type"])
        output["seat_layout_clean"] = null_if_blank(row["seat_layout"])

    output["_source_file"] = raw_path.name
    output["_source_row_number"] = row_number
    output["_source_sha256"] = source_row_hash(row, list(config.columns))

    observations: dict[str, object] = {
        "invalid_experience_date": int(invalid_experience),
        "submission_date_outlier": int(submission_outlier),
        "invalid_boolean": int(invalid_verify or invalid_recommended),
        "invalid_rating_row": int(invalid_rating),
        "nlp_ineligible": int(review_clean is None),
        "potential_duplicate": int(group_size > 1),
        "duplicate_excess": int(group_size > 1 and duplicate_ranks[fingerprint] > 1),
        "rating_state": rating_state,
        "category_flags": category_flags,
    }
    if config.table == "airline_reviews":
        observations.update(
            {
                "incomplete_route": int(not output["has_complete_route"]),
                "suspicious_route": output["is_suspicious_route"],
                "incomplete_transit": output["is_incomplete_transit"],
            }
        )
    if config.table == "seat_reviews":
        observations["world_traveller_plus_mapped"] = int(
            (null_if_blank(row["seat_type"]) or "").casefold()
            == "world traveller plus"
            and output["seat_type_normalized"] == "Premium Economy"
        )
    return output, observations


def process_review(
    config: ReviewConfig,
    raw_path: Path,
    output_dir: Path,
    entity_keys: set[str],
    as_of_date: date,
) -> dict:
    duplicate_counts, summary = profile_review(config, raw_path)
    output_fields = review_output_fields(config)
    output_path = output_dir / f"validated_{config.table}.csv"
    temp_path, handle, writer = atomic_csv_writer(output_path, output_fields)
    duplicate_ranks: defaultdict[str, int] = defaultdict(int)
    flags: Counter[str] = Counter()
    rating_stats = {
        rating: Counter(
            source_null=0,
            invalid=0,
            clean_null=0,
            answered=0,
        )
        for rating in config.ratings
    }
    category_review_counts: Counter[str] = Counter()
    orphan_rows = 0
    rows_written = 0
    fieldnames, rows = rows_from(raw_path)
    try:
        for row_number, row in rows:
            if null_if_blank(row[config.entity_column]) not in entity_keys:
                orphan_rows += 1
            output, observations = transform_review(
                row,
                row_number=row_number,
                raw_path=raw_path,
                config=config,
                duplicate_counts=duplicate_counts,
                duplicate_ranks=duplicate_ranks,
                as_of_date=as_of_date,
            )
            writer.writerow(output)
            rows_written += 1
            for key, value in observations.items():
                if key not in {"rating_state", "category_flags"}:
                    flags[key] += int(value)
            for key, value in observations["category_flags"].items():
                category_review_counts[key] += int(value)
            for rating, (source_null, invalid) in observations[
                "rating_state"
            ].items():
                rating_stats[rating]["source_null"] += int(source_null)
                rating_stats[rating]["invalid"] += int(invalid)
                clean_null = source_null or invalid
                rating_stats[rating]["clean_null"] += int(clean_null)
                rating_stats[rating]["answered"] += int(not clean_null)
    except Exception:
        handle.close()
        temp_path.unlink(missing_ok=True)
        raise
    else:
        handle.close()
        finalize_atomic_file(temp_path, output_path)

    summary.update(
        {
            "output_file": output_path.name,
            "output_rows": rows_written,
            "output_columns": len(output_fields),
            "orphan_rows": orphan_rows,
            "duplicate_groups": sum(
                count > 1 for count in duplicate_counts.values()
            ),
            "flags": dict(flags),
            "category_needs_review": dict(category_review_counts),
            "ratings": {name: dict(values) for name, values in rating_stats.items()},
        }
    )
    return summary


def build_acceptance_checks(summary: dict) -> list[dict]:
    tables = summary["tables"]
    checks = [
        {
            "check": "All source rows retained",
            "expected": 0,
            "actual": sum(
                item["output_rows"] - item["source_rows"]
                for item in tables.values()
            ),
        },
        {
            "check": "Primary-key violations",
            "expected": 0,
            "actual": sum(
                item["null_keys"] + item["duplicate_keys"]
                for item in tables.values()
            ),
        },
        {
            "check": "Foreign-key orphan rows",
            "expected": 0,
            "actual": sum(
                item.get("orphan_rows", 0) for item in tables.values()
            ),
        },
        {
            "check": "Invalid airline experience dates",
            "expected": 41,
            "actual": tables["airline_reviews"]["flags"][
                "invalid_experience_date"
            ],
        },
        {
            "check": "Seat submission-date outliers",
            "expected": 6,
            "actual": tables["seat_reviews"]["flags"]["submission_date_outlier"],
        },
        {
            "check": "Incomplete airline routes",
            "expected": 106_712,
            "actual": tables["airline_reviews"]["flags"]["incomplete_route"],
        },
        {
            "check": "Suspicious same-origin/destination routes",
            "expected": 20,
            "actual": tables["airline_reviews"]["flags"]["suspicious_route"],
        },
        {
            "check": "Incomplete transit pairs",
            "expected": 8_599,
            "actual": tables["airline_reviews"]["flags"]["incomplete_transit"],
        },
        {
            "check": "World Traveller Plus mappings",
            "expected": 8,
            "actual": tables["seat_reviews"]["flags"][
                "world_traveller_plus_mapped"
            ],
        },
        {
            "check": "Airport reviews excluded from NLP",
            "expected": 1,
            "actual": tables["airport_reviews"]["flags"]["nlp_ineligible"],
        },
        {
            "check": "Flagged airline duplicate records",
            "expected": 492,
            "actual": tables["airline_reviews"]["flags"]["potential_duplicate"],
        },
        {
            "check": "Flagged airport duplicate records",
            "expected": 190,
            "actual": tables["airport_reviews"]["flags"]["potential_duplicate"],
        },
        {
            "check": "Flagged lounge duplicate records",
            "expected": 4,
            "actual": tables["lounge_reviews"]["flags"]["potential_duplicate"],
        },
        {
            "check": "Flagged seat duplicate records",
            "expected": 6,
            "actual": tables["seat_reviews"]["flags"]["potential_duplicate"],
        },
        {
            "check": "Invalid rating rows",
            "expected": 0,
            "actual": sum(
                tables[name]["flags"]["invalid_rating_row"]
                for name in (
                    "airline_reviews",
                    "airport_reviews",
                    "lounge_reviews",
                    "seat_reviews",
                )
            ),
        },
    ]
    for check in checks:
        check["status"] = (
            "PASS" if check["actual"] == check["expected"] else "FAIL"
        )
    return checks


def weighted_rating_summary(table_summary: dict) -> dict:
    ratings = table_summary["ratings"]
    total_cells = sum(
        table_summary["source_rows"] for _criterion in ratings
    )
    source_null = sum(item["source_null"] for item in ratings.values())
    invalid = sum(item["invalid"] for item in ratings.values())
    answered = sum(item["answered"] for item in ratings.values())
    return {
        "criteria": len(ratings),
        "total_cells": total_cells,
        "source_null": source_null,
        "invalid": invalid,
        "answered": answered,
        "coverage_pct": round(answered / total_cells * 100, 2),
    }


def render_report(summary: dict) -> str:
    tables = summary["tables"]
    lines = [
        "# Báo cáo dữ liệu sau cleaning",
        "",
        f"- Thời điểm chạy (UTC): `{summary['generated_at_utc']}`",
        f"- Ngày chốt kiểm tra: `{summary['as_of_date']}`",
        "- Luồng xử lý: `data/raw → Python staging → data/processed`",
        "- Chính sách: giữ nguyên số dòng, không tự động xóa duplicate.",
        "",
        "## Đối soát dữ liệu",
        "",
        "| Dataset | Raw rows | Clean rows | Chênh lệch | PK lỗi | FK orphan |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for name, item in tables.items():
        lines.append(
            f"| `{name}` | {item['source_rows']:,} | {item['output_rows']:,} "
            f"| {item['output_rows'] - item['source_rows']:,} "
            f"| {item['null_keys'] + item['duplicate_keys']:,} "
            f"| {item.get('orphan_rows', 0):,} |"
        )

    review_names = (
        "airline_reviews",
        "airport_reviews",
        "lounge_reviews",
        "seat_reviews",
    )
    total_reviews = sum(tables[name]["source_rows"] for name in review_names)
    lines.extend(
        [
            "",
            f"Tổng cộng **{total_reviews:,} review** được giữ lại sau cleaning.",
            "",
            "## Kết quả cleaning chính",
            "",
            "| Quy tắc | Số record | Cách xử lý |",
            "|---|---:|---|",
            f"| Airline `date_flown > date_submitted` "
            f"| {tables['airline_reviews']['flags']['invalid_experience_date']:,} "
            "| `experience_date_clean = NULL`, giữ rating và text |",
            f"| Seat submission-date outlier "
            f"| {tables['seat_reviews']['flags']['submission_date_outlier']:,} "
            "| `date_submitted_clean = NULL`, loại khỏi time-series |",
            f"| Airline route thiếu hai đầu "
            f"| {tables['airline_reviews']['flags']['incomplete_route']:,} "
            "| Giữ review, không đủ điều kiện route analysis |",
            f"| Origin bằng destination "
            f"| {tables['airline_reviews']['flags']['suspicious_route']:,} "
            "| Gắn cờ và loại khỏi route ranking |",
            f"| Transit thiếu city hoặc airport "
            f"| {tables['airline_reviews']['flags']['incomplete_transit']:,} "
            "| Gắn cờ, không dùng cho transit analysis |",
            f"| `World Traveller Plus` "
            f"| {tables['seat_reviews']['flags']['world_traveller_plus_mapped']:,} "
            "| Map thành `Premium Economy`, giữ raw value |",
            f"| Airport review thiếu text "
            f"| {tables['airport_reviews']['flags']['nlp_ineligible']:,} "
            "| Giữ cho rating, loại khỏi NLP |",
        ]
    )

    lines.extend(
        [
            "",
            "## Potential duplicate",
            "",
            "| Dataset | Duplicate groups | Flagged rows | Excess rows |",
            "|---|---:|---:|---:|",
        ]
    )
    for name in review_names:
        item = tables[name]
        lines.append(
            f"| `{name}` | {item['duplicate_groups']:,} "
            f"| {item['flags']['potential_duplicate']:,} "
            f"| {item['flags']['duplicate_excess']:,} |"
        )
    lines.extend(
        [
            "",
            "Các dòng này chỉ được gắn cờ; `duplicate_rank > 1` chưa bị xóa.",
            "",
            "## Rating sau cleaning",
            "",
            "| Dataset | Rating fields | Answered | Source NULL | Invalid | Coverage |",
            "|---|---:|---:|---:|---:|---:|",
        ]
    )
    for name in review_names:
        rating = weighted_rating_summary(tables[name])
        lines.append(
            f"| `{name}` | {rating['criteria']} | {rating['answered']:,} "
            f"| {rating['source_null']:,} | {rating['invalid']:,} "
            f"| {rating['coverage_pct']:.2f}% |"
        )

    lines.extend(
        [
            "",
            "Rating `NULL` được giữ nguyên; không điền 0, mean hoặc median.",
            "",
            "## Acceptance checks",
            "",
            "| Kiểm tra | Expected | Actual | Status |",
            "|---|---:|---:|---|",
        ]
    )
    for check in summary["acceptance_checks"]:
        lines.append(
            f"| {check['check']} | {check['expected']:,} "
            f"| {check['actual']:,} | **{check['status']}** |"
        )
    lines.extend(
        [
            "",
            "## Output",
            "",
        ]
    )
    for name, item in tables.items():
        lines.append(f"- `{name}` → `data/processed/{item['output_file']}`")
    lines.extend(
        [
            "- Machine-readable summary → `data/processed/cleaning_summary.json`",
            "",
            "## Lưu ý",
            "",
            "- Raw CSV biểu diễn cả database `NULL` và blank dưới dạng ô trống; "
            "pipeline xử lý cả hai là missing nhưng giữ nguyên file raw để audit.",
            "- Nationality chỉ được trim và uppercase; chưa suy đoán hoặc gộp country alias.",
            "- Dữ liệu clean là staging, chưa phải analytical mart.",
            "",
        ]
    )
    return "\n".join(lines)


def run_pipeline(
    *,
    raw_dir: Path,
    output_dir: Path,
    report_path: Path,
    as_of_date: date,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    tables: dict[str, dict] = {}
    entity_keys: dict[str, set[str]] = {}

    for table in ("airlines", "airports"):
        raw_path = locate_extract(raw_dir, table)
        table_summary, keys = process_dimension(table, raw_path, output_dir)
        tables[table] = table_summary
        entity_keys[table] = keys

    for config in REVIEW_CONFIGS:
        raw_path = locate_extract(raw_dir, config.table)
        parent = "airports" if config.entity_column == "airport_id" else "airlines"
        tables[config.table] = process_review(
            config,
            raw_path,
            output_dir,
            entity_keys[parent],
            as_of_date,
        )

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "as_of_date": as_of_date.isoformat(),
        "tables": tables,
    }
    summary["acceptance_checks"] = build_acceptance_checks(summary)
    summary["status"] = (
        "PASS"
        if all(
            check["status"] == "PASS"
            for check in summary["acceptance_checks"]
        )
        else "FAIL"
    )

    summary_path = output_dir / "cleaning_summary.json"
    temp_summary = summary_path.with_suffix(".json.tmp")
    temp_summary.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    os.replace(temp_summary, summary_path)

    temp_report = report_path.with_suffix(report_path.suffix + ".tmp")
    temp_report.write_text(render_report(summary), encoding="utf-8")
    os.replace(temp_report, report_path)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build cleaned, row-preserving staging CSV files."
    )
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/processed"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("docs/cleaning_report.md"),
    )
    parser.add_argument(
        "--as-of-date",
        type=date.fromisoformat,
        default=date.today(),
        help="Upper bound for submission dates (YYYY-MM-DD).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        summary = run_pipeline(
            raw_dir=args.raw_dir,
            output_dir=args.output_dir,
            report_path=args.report,
            as_of_date=args.as_of_date,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Staging status: {summary['status']}")
    for table, item in summary["tables"].items():
        print(
            f"{table}: {item['source_rows']} raw -> "
            f"{item['output_rows']} clean rows"
        )
    return 0 if summary["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
