/*
Run after src.load_sql commits successfully.
Every result must be PASS; THROW stops downstream mart deployment on failure.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @row_counts TABLE
(
    table_name sysname NOT NULL,
    expected_rows bigint NOT NULL,
    actual_rows bigint NOT NULL
);

INSERT INTO @row_counts (table_name, expected_rows, actual_rows)
VALUES
    (N'airlines', 595, (SELECT COUNT_BIG(*) FROM validated.airlines)),
    (N'airports', 1004, (SELECT COUNT_BIG(*) FROM validated.airports)),
    (
        N'airline_reviews',
        156323,
        (SELECT COUNT_BIG(*) FROM validated.airline_reviews)
    ),
    (
        N'airport_reviews',
        49505,
        (SELECT COUNT_BIG(*) FROM validated.airport_reviews)
    ),
    (
        N'lounge_reviews',
        5087,
        (SELECT COUNT_BIG(*) FROM validated.lounge_reviews)
    ),
    (
        N'seat_reviews',
        3766,
        (SELECT COUNT_BIG(*) FROM validated.seat_reviews)
    );

SELECT
    table_name,
    expected_rows,
    actual_rows,
    CASE WHEN expected_rows = actual_rows THEN 'PASS' ELSE 'FAIL' END AS status
FROM @row_counts
ORDER BY table_name;

IF EXISTS (
    SELECT 1
    FROM @row_counts
    WHERE expected_rows <> actual_rows
)
    THROW 51001, 'Post-load row-count reconciliation failed.', 1;

DECLARE @review_rows bigint =
(
    SELECT COUNT_BIG(*) FROM validated.airline_reviews
)
+ (
    SELECT COUNT_BIG(*) FROM validated.airport_reviews
)
+ (
    SELECT COUNT_BIG(*) FROM validated.lounge_reviews
)
+ (
    SELECT COUNT_BIG(*) FROM validated.seat_reviews
);

IF @review_rows <> 214681
    THROW 51002, 'Total review count is not 214681.', 1;

DECLARE @orphan_rows bigint =
(
    SELECT COUNT_BIG(*)
    FROM validated.airline_reviews AS r
    LEFT JOIN validated.airlines AS d ON d.airline_id = r.airline_id
    WHERE d.airline_id IS NULL
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.airport_reviews AS r
    LEFT JOIN validated.airports AS d ON d.airport_id = r.airport_id
    WHERE d.airport_id IS NULL
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.lounge_reviews AS r
    LEFT JOIN validated.airlines AS d ON d.airline_id = r.airline_id
    WHERE d.airline_id IS NULL
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.seat_reviews AS r
    LEFT JOIN validated.airlines AS d ON d.airline_id = r.airline_id
    WHERE d.airline_id IS NULL
);

IF @orphan_rows <> 0
    THROW 51003, 'Foreign-key orphan rows were found.', 1;

DECLARE @invalid_rating_rows bigint =
(
    SELECT COUNT_BIG(*)
    FROM validated.airline_reviews
    WHERE has_invalid_rating = 1
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.airport_reviews
    WHERE has_invalid_rating = 1
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.lounge_reviews
    WHERE has_invalid_rating = 1
)
+ (
    SELECT COUNT_BIG(*)
    FROM validated.seat_reviews
    WHERE has_invalid_rating = 1
);

IF @invalid_rating_rows <> 0
    THROW 51004, 'Rows with invalid ratings were loaded.', 1;

DECLARE @out_of_range_ratings bigint = 0;

SELECT @out_of_range_ratings += COUNT_BIG(*)
FROM validated.airline_reviews AS r
CROSS APPLY
(
    VALUES
        (r.seat_comfort_clean),
        (r.cabin_staff_service_clean),
        (r.food_and_beverages_clean),
        (r.inflight_entertainment_clean),
        (r.ground_service_clean),
        (r.wifi_and_connectivity_clean),
        (r.value_for_money_clean)
) AS rating(value)
WHERE rating.value NOT BETWEEN 1 AND 5;

SELECT @out_of_range_ratings += COUNT_BIG(*)
FROM validated.airport_reviews AS r
CROSS APPLY
(
    VALUES
        (r.queuing_times_clean),
        (r.terminal_cleanliness_clean),
        (r.terminal_seating_clean),
        (r.terminal_signs_clean),
        (r.food_beverages_clean),
        (r.airport_shopping_clean),
        (r.airport_staff_clean),
        (r.wifi_connectivity_clean)
) AS rating(value)
WHERE rating.value NOT BETWEEN 1 AND 5;

SELECT @out_of_range_ratings += COUNT_BIG(*)
FROM validated.lounge_reviews AS r
CROSS APPLY
(
    VALUES
        (r.comfort_clean),
        (r.cleanliness_clean),
        (r.bar_and_beverages_clean),
        (r.catering_clean),
        (r.washrooms_clean),
        (r.wifi_connectivity_clean),
        (r.staff_service_clean)
) AS rating(value)
WHERE rating.value NOT BETWEEN 1 AND 5;

SELECT @out_of_range_ratings += COUNT_BIG(*)
FROM validated.seat_reviews AS r
CROSS APPLY
(
    VALUES
        (r.seat_legroom_clean),
        (r.seat_recline_clean),
        (r.seat_width_clean),
        (r.aisle_space_clean),
        (r.seat_storage_clean),
        (r.power_supply_clean),
        (r.viewing_tv_screen_clean),
        (r.sleep_comfort_clean),
        (r.sitting_comfort_clean),
        (r.seat_bed_width_clean),
        (r.seat_bed_length_clean),
        (r.seat_privacy_clean)
) AS rating(value)
WHERE rating.value NOT BETWEEN 1 AND 5;

IF @out_of_range_ratings <> 0
    THROW 51005, 'Clean ratings outside the 1-5 range were found.', 1;

DECLARE @baseline_checks TABLE
(
    check_name nvarchar(100) NOT NULL,
    expected_value bigint NOT NULL,
    actual_value bigint NOT NULL
);

INSERT INTO @baseline_checks (check_name, expected_value, actual_value)
VALUES
    (
        N'Invalid airline experience dates',
        41,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airline_reviews
            WHERE is_invalid_experience_date = 1
        )
    ),
    (
        N'Seat submission-date outliers',
        6,
        (
            SELECT COUNT_BIG(*)
            FROM validated.seat_reviews
            WHERE is_submission_date_outlier = 1
        )
    ),
    (
        N'Incomplete airline routes',
        106712,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airline_reviews
            WHERE has_complete_route = 0
        )
    ),
    (
        N'Suspicious airline routes',
        20,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airline_reviews
            WHERE is_suspicious_route = 1
        )
    ),
    (
        N'Incomplete transit pairs',
        8599,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airline_reviews
            WHERE is_incomplete_transit = 1
        )
    ),
    (
        N'World Traveller Plus mappings',
        8,
        (
            SELECT COUNT_BIG(*)
            FROM validated.seat_reviews
            WHERE LOWER(LTRIM(RTRIM(seat_type))) = N'world traveller plus'
              AND seat_type_normalized = N'Premium Economy'
        )
    ),
    (
        N'Airport reviews excluded from NLP',
        1,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airport_reviews
            WHERE is_nlp_eligible = 0
        )
    ),
    (
        N'Flagged airline duplicate records',
        492,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airline_reviews
            WHERE is_potential_duplicate = 1
        )
    ),
    (
        N'Flagged airport duplicate records',
        190,
        (
            SELECT COUNT_BIG(*)
            FROM validated.airport_reviews
            WHERE is_potential_duplicate = 1
        )
    ),
    (
        N'Flagged lounge duplicate records',
        4,
        (
            SELECT COUNT_BIG(*)
            FROM validated.lounge_reviews
            WHERE is_potential_duplicate = 1
        )
    ),
    (
        N'Flagged seat duplicate records',
        6,
        (
            SELECT COUNT_BIG(*)
            FROM validated.seat_reviews
            WHERE is_potential_duplicate = 1
        )
    );

SELECT
    check_name,
    expected_value,
    actual_value,
    CASE
        WHEN expected_value = actual_value THEN 'PASS'
        ELSE 'FAIL'
    END AS status
FROM @baseline_checks
ORDER BY check_name;

IF EXISTS (
    SELECT 1
    FROM @baseline_checks
    WHERE expected_value <> actual_value
)
    THROW 51006, 'Post-load profiling baseline checks failed.', 1;

SELECT
    CAST('PASS' AS varchar(4)) AS load_validation_status,
    @review_rows AS total_review_rows,
    @orphan_rows AS orphan_rows,
    @invalid_rating_rows AS invalid_rating_rows,
    @out_of_range_ratings AS out_of_range_ratings;

