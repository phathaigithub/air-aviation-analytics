"""Reusable, dependency-free cleaning functions for the staging pipeline."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import date, datetime
from typing import Iterable, Mapping


NULL_MARKERS = {"", r"\N"}
WHITESPACE_RE = re.compile(r"\s+")

TRAVELLER_TYPE_MAP = {
    "business": "Business",
    "solo leisure": "Solo Leisure",
    "couple leisure": "Couple Leisure",
    "family leisure": "Family Leisure",
    "leisure": "Leisure (Unspecified)",
}

SEAT_TYPE_MAP = {
    "economy": "Economy",
    "economy class": "Economy",
    "premium economy": "Premium Economy",
    "world traveller plus": "Premium Economy",
    "business": "Business",
    "business class": "Business",
    "first": "First",
    "first class": "First",
}

AIRPORT_EXPERIENCE_MAP = {
    "departure only": "Departure Only",
    "arrival only": "Arrival Only",
    "arrival and departure": "Arrival and Departure",
    "transit": "Transit",
}

LOUNGE_TYPE_MAP = {
    "business": "Business",
    "business class": "Business",
    "first": "First",
    "first class": "First",
    "frequent flyer": "Frequent Flyer",
    "members": "Members",
    "pay to use": "Pay to Use",
}


def null_if_blank(value: object) -> str | None:
    """Trim a scalar and return None for blank or exported NULL markers."""
    if value is None:
        return None
    cleaned = str(value).strip()
    return None if cleaned in NULL_MARKERS else cleaned


def clean_text(value: object) -> str | None:
    """Trim text and collapse internal whitespace for downstream text analysis."""
    cleaned = null_if_blank(value)
    return None if cleaned is None else WHITESPACE_RE.sub(" ", cleaned)


def parse_date(value: object) -> date | None:
    """Parse the ISO date values used by the raw CSV extracts."""
    cleaned = null_if_blank(value)
    if cleaned is None:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def clean_submission_date(
    value: object,
    *,
    as_of_date: date,
    lower_bound: date = date(2000, 1, 1),
) -> tuple[str | None, bool]:
    """Return an analysis-safe submission date and an outlier flag."""
    parsed = parse_date(value)
    is_outlier = parsed is not None and not (lower_bound <= parsed <= as_of_date)
    return (None if parsed is None or is_outlier else parsed.isoformat(), is_outlier)


def clean_experience_date(
    experience_value: object,
    submission_value: object,
) -> tuple[str | None, bool]:
    """Null an experience date that occurs after its submission date."""
    experience = parse_date(experience_value)
    submission = parse_date(submission_value)
    is_invalid = (
        experience is not None
        and submission is not None
        and experience > submission
    )
    return (None if experience is None or is_invalid else experience.isoformat(), is_invalid)


def normalize_category(
    value: object,
    mapping: Mapping[str, str],
) -> tuple[str, bool]:
    """Map a category, retaining explicit Unknown and needs-review states."""
    cleaned = null_if_blank(value)
    if cleaned is None:
        return "Unknown", False
    canonical = mapping.get(cleaned.casefold())
    return (canonical, False) if canonical is not None else ("Other/Unknown", True)


def normalize_nationality(value: object) -> str:
    """Apply a conservative normalization without guessing country aliases."""
    cleaned = null_if_blank(value)
    return "UNKNOWN" if cleaned is None else cleaned.upper()


def travel_purpose(traveller_type: str) -> str:
    """Collapse traveller types into a stable business/leisure grouping."""
    if traveller_type == "Business":
        return "Business"
    if traveller_type in {
        "Solo Leisure",
        "Couple Leisure",
        "Family Leisure",
        "Leisure (Unspecified)",
    }:
        return "Leisure"
    return traveller_type


def clean_rating(value: object) -> tuple[str | None, bool]:
    """Keep integer ratings in 1–5; preserve missing values as None."""
    cleaned = null_if_blank(value)
    if cleaned is None:
        return None, False
    try:
        numeric = int(cleaned)
    except ValueError:
        return None, True
    if 1 <= numeric <= 5:
        return str(numeric), False
    return None, True


def parse_bit(value: object) -> tuple[str | None, bool]:
    """Normalize common boolean encodings to 0/1."""
    cleaned = null_if_blank(value)
    if cleaned is None:
        return None, False
    normalized = cleaned.casefold()
    if normalized in {"1", "true", "yes", "y"}:
        return "1", False
    if normalized in {"0", "false", "no", "n"}:
        return "0", False
    return None, True


def review_fingerprint(
    row: Mapping[str, str],
    *,
    entity_column: str,
) -> str:
    """Create the approved potential-duplicate fingerprint."""
    parts = (
        null_if_blank(row.get(entity_column)) or "",
        null_if_blank(row.get("date_submitted")) or "",
        (null_if_blank(row.get("customer_name")) or "").casefold(),
        null_if_blank(row.get("review")) or "",
    )
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def source_row_hash(row: Mapping[str, str], fieldnames: Iterable[str]) -> str:
    """Hash the exact extracted source values for lineage verification."""
    payload = {name: row.get(name, "") for name in fieldnames}
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
