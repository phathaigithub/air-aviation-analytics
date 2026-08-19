"""Unit tests for core cleaning rules."""

from datetime import date
from unittest import TestCase

from src.cleaning import (
    SEAT_TYPE_MAP,
    clean_experience_date,
    clean_rating,
    clean_submission_date,
    clean_text,
    normalize_category,
)


class CleaningTests(TestCase):
    def test_blank_and_internal_whitespace_are_cleaned(self) -> None:
        self.assertIsNone(clean_text("   "))
        self.assertEqual(clean_text("  a\n b  "), "a b")

    def test_invalid_experience_date_is_nulled(self) -> None:
        clean, invalid = clean_experience_date("2025-02-02", "2025-02-01")
        self.assertIsNone(clean)
        self.assertTrue(invalid)

    def test_submission_outlier_is_nulled(self) -> None:
        clean, outlier = clean_submission_date(
            "1970-01-01",
            as_of_date=date(2026, 7, 29),
        )
        self.assertIsNone(clean)
        self.assertTrue(outlier)

    def test_missing_rating_stays_missing(self) -> None:
        self.assertEqual(clean_rating(""), (None, False))

    def test_out_of_range_rating_is_invalid(self) -> None:
        self.assertEqual(clean_rating("6"), (None, True))

    def test_world_traveller_plus_mapping(self) -> None:
        self.assertEqual(
            normalize_category("World Traveller Plus", SEAT_TYPE_MAP),
            ("Premium Economy", False),
        )
