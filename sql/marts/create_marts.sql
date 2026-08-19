USE AirReviews;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF SCHEMA_ID(N'mart') IS NULL
    EXEC(N'CREATE SCHEMA mart AUTHORIZATION dbo;');
GO

/* Grain: airline x year. Executive scorecard and YoY comparison. */
CREATE OR ALTER VIEW mart.airline_yearly_performance
AS
SELECT
    ar.airline_id,
    a.airline_name,
    ar.review_year,
    COUNT(*) AS review_count,
    SUM(CAST(ar.is_verified AS bigint)) AS verified_review_count,
    CAST(100.0 * AVG(CAST(ar.is_verified AS decimal(10, 4)))
        AS decimal(6, 2)) AS verified_review_rate_pct,
    CAST(100.0 * AVG(CAST(ar.is_recommended AS decimal(10, 4)))
        AS decimal(6, 2)) AS recommendation_rate_pct,
    COUNT(ar.value_for_money_clean) AS value_for_money_answered_count,
    CAST(AVG(CAST(ar.value_for_money_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_value_for_money,
    COUNT(ar.seat_comfort_clean) AS seat_comfort_answered_count,
    CAST(AVG(CAST(ar.seat_comfort_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_seat_comfort,
    COUNT(ar.cabin_staff_service_clean) AS cabin_staff_answered_count,
    CAST(AVG(CAST(ar.cabin_staff_service_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_cabin_staff_service,
    COUNT(ar.ground_service_clean) AS ground_service_answered_count,
    CAST(AVG(CAST(ar.ground_service_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_ground_service,
    COUNT(ar.food_and_beverages_clean) AS food_and_beverages_answered_count,
    CAST(AVG(CAST(ar.food_and_beverages_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_food_and_beverages,
    COUNT(ar.inflight_entertainment_clean) AS entertainment_answered_count,
    CAST(AVG(CAST(ar.inflight_entertainment_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_inflight_entertainment,
    COUNT(ar.wifi_and_connectivity_clean) AS wifi_answered_count,
    CAST(AVG(CAST(ar.wifi_and_connectivity_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_wifi_and_connectivity,
    CAST(CASE WHEN COUNT(*) >= 50 THEN 1 ELSE 0 END AS bit)
        AS meets_reporting_threshold
FROM validated.airline_reviews AS ar
INNER JOIN validated.airlines AS a ON a.airline_id = ar.airline_id
WHERE ar.duplicate_rank = 1
  AND ar.review_year IS NOT NULL
GROUP BY ar.airline_id, a.airline_name, ar.review_year;
GO

/* Grain: airline x year x purpose x traveller type x seat type. */
CREATE OR ALTER VIEW mart.airline_segment_performance
AS
SELECT
    ar.airline_id,
    a.airline_name,
    ar.review_year,
    ar.travel_purpose,
    ar.type_of_traveller_normalized AS traveller_type,
    ar.seat_type_normalized AS seat_type,
    COUNT(*) AS review_count,
    CAST(100.0 * AVG(CAST(ar.is_recommended AS decimal(10, 4)))
        AS decimal(6, 2)) AS recommendation_rate_pct,
    COUNT(ar.value_for_money_clean) AS value_for_money_answered_count,
    CAST(AVG(CAST(ar.value_for_money_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_value_for_money,
    COUNT(ar.seat_comfort_clean) AS seat_comfort_answered_count,
    CAST(AVG(CAST(ar.seat_comfort_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_seat_comfort,
    COUNT(ar.cabin_staff_service_clean) AS cabin_staff_answered_count,
    CAST(AVG(CAST(ar.cabin_staff_service_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_cabin_staff_service,
    COUNT(ar.ground_service_clean) AS ground_service_answered_count,
    CAST(AVG(CAST(ar.ground_service_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_ground_service,
    CAST(CASE WHEN COUNT(*) >= 30 THEN 1 ELSE 0 END AS bit)
        AS meets_reporting_threshold
FROM validated.airline_reviews AS ar
INNER JOIN validated.airlines AS a ON a.airline_id = ar.airline_id
WHERE ar.duplicate_rank = 1
  AND ar.review_year IS NOT NULL
GROUP BY
    ar.airline_id,
    a.airline_name,
    ar.review_year,
    ar.travel_purpose,
    ar.type_of_traveller_normalized,
    ar.seat_type_normalized;
GO

/* Grain: airport x year. Operational airport scorecard. */
CREATE OR ALTER VIEW mart.airport_yearly_performance
AS
SELECT
    apr.airport_id,
    ap.airport_name,
    apr.review_year,
    COUNT(*) AS review_count,
    SUM(CAST(apr.is_verified AS bigint)) AS verified_review_count,
    CAST(100.0 * AVG(CAST(apr.is_verified AS decimal(10, 4)))
        AS decimal(6, 2)) AS verified_review_rate_pct,
    CAST(100.0 * AVG(CAST(apr.is_recommended AS decimal(10, 4)))
        AS decimal(6, 2)) AS recommendation_rate_pct,
    COUNT(apr.queuing_times_clean) AS queuing_answered_count,
    CAST(AVG(CAST(apr.queuing_times_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_queuing_times,
    COUNT(apr.terminal_cleanliness_clean) AS cleanliness_answered_count,
    CAST(AVG(CAST(apr.terminal_cleanliness_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_terminal_cleanliness,
    COUNT(apr.terminal_seating_clean) AS seating_answered_count,
    CAST(AVG(CAST(apr.terminal_seating_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_terminal_seating,
    COUNT(apr.terminal_signs_clean) AS signs_answered_count,
    CAST(AVG(CAST(apr.terminal_signs_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_terminal_signs,
    COUNT(apr.airport_staff_clean) AS staff_answered_count,
    CAST(AVG(CAST(apr.airport_staff_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_airport_staff,
    COUNT(apr.food_beverages_clean) AS food_answered_count,
    CAST(AVG(CAST(apr.food_beverages_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_food_beverages,
    COUNT(apr.airport_shopping_clean) AS shopping_answered_count,
    CAST(AVG(CAST(apr.airport_shopping_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_airport_shopping,
    COUNT(apr.wifi_connectivity_clean) AS wifi_answered_count,
    CAST(AVG(CAST(apr.wifi_connectivity_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_wifi_connectivity,
    CAST(CASE WHEN COUNT(*) >= 50 THEN 1 ELSE 0 END AS bit)
        AS meets_reporting_threshold
FROM validated.airport_reviews AS apr
INNER JOIN validated.airports AS ap ON ap.airport_id = apr.airport_id
WHERE apr.duplicate_rank = 1
  AND apr.review_year IS NOT NULL
GROUP BY apr.airport_id, ap.airport_name, apr.review_year;
GO

/* Grain: airline x origin-destination pair. */
CREATE OR ALTER VIEW mart.route_performance
AS
SELECT
    ar.airline_id,
    a.airline_name,
    ar.route_key,
    ar.origin_airport_clean AS origin_airport,
    ar.destination_airport_clean AS destination_airport,
    MIN(ar.experience_date_clean) AS first_experience_date,
    MAX(ar.experience_date_clean) AS latest_experience_date,
    COUNT(*) AS review_count,
    CAST(100.0 * AVG(CAST(ar.is_recommended AS decimal(10, 4)))
        AS decimal(6, 2)) AS recommendation_rate_pct,
    COUNT(ar.value_for_money_clean) AS value_for_money_answered_count,
    CAST(AVG(CAST(ar.value_for_money_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_value_for_money,
    COUNT(ar.seat_comfort_clean) AS seat_comfort_answered_count,
    CAST(AVG(CAST(ar.seat_comfort_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_seat_comfort,
    COUNT(ar.cabin_staff_service_clean) AS cabin_staff_answered_count,
    CAST(AVG(CAST(ar.cabin_staff_service_clean AS decimal(10, 4)))
        AS decimal(5, 2)) AS avg_cabin_staff_service,
    CAST(CASE WHEN COUNT(*) >= 30 THEN 1 ELSE 0 END AS bit)
        AS meets_reporting_threshold
FROM validated.airline_reviews AS ar
INNER JOIN validated.airlines AS a ON a.airline_id = ar.airline_id
WHERE ar.duplicate_rank = 1
  AND ar.is_route_analysis_eligible = 1
  AND ar.is_suspicious_route = 0
GROUP BY
    ar.airline_id,
    a.airline_name,
    ar.route_key,
    ar.origin_airport_clean,
    ar.destination_airport_clean;
GO

/* Grain: airline. Sources are aggregated separately to avoid fan-out. */
CREATE OR ALTER VIEW mart.premium_experience
AS
WITH lounge_review_scores AS
(
    SELECT
        lr.airline_id,
        lr.review_id,
        AVG(CAST(r.rating AS decimal(10, 4))) AS lounge_review_score
    FROM validated.lounge_reviews AS lr
    CROSS APPLY
    (
        VALUES
            (lr.comfort_clean),
            (lr.cleanliness_clean),
            (lr.bar_and_beverages_clean),
            (lr.catering_clean),
            (lr.washrooms_clean),
            (lr.wifi_connectivity_clean),
            (lr.staff_service_clean)
    ) AS r(rating)
    WHERE lr.duplicate_rank = 1
    GROUP BY lr.airline_id, lr.review_id
    HAVING COUNT(r.rating) > 0
),
lounge_airline_scores AS
(
    SELECT
        airline_id,
        COUNT(*) AS lounge_review_count,
        AVG(lounge_review_score) AS avg_lounge_score
    FROM lounge_review_scores
    GROUP BY airline_id
),
seat_review_scores AS
(
    SELECT
        sr.airline_id,
        sr.review_id,
        AVG(CAST(r.rating AS decimal(10, 4))) AS seat_review_score
    FROM validated.seat_reviews AS sr
    CROSS APPLY
    (
        VALUES
            (sr.seat_legroom_clean),
            (sr.seat_recline_clean),
            (sr.seat_width_clean),
            (sr.aisle_space_clean),
            (sr.seat_storage_clean),
            (sr.power_supply_clean),
            (sr.viewing_tv_screen_clean),
            (sr.sleep_comfort_clean),
            (sr.sitting_comfort_clean),
            (sr.seat_bed_width_clean),
            (sr.seat_bed_length_clean),
            (sr.seat_privacy_clean)
    ) AS r(rating)
    WHERE sr.duplicate_rank = 1
    GROUP BY sr.airline_id, sr.review_id
    HAVING COUNT(r.rating) > 0
),
seat_airline_scores AS
(
    SELECT
        airline_id,
        COUNT(*) AS seat_review_count,
        AVG(seat_review_score) AS avg_seat_score
    FROM seat_review_scores
    GROUP BY airline_id
)
SELECT
    a.airline_id,
    a.airline_name,
    l.lounge_review_count,
    CAST(l.avg_lounge_score AS decimal(5, 2)) AS avg_lounge_score,
    s.seat_review_count,
    CAST(s.avg_seat_score AS decimal(5, 2)) AS avg_seat_score,
    CAST((l.avg_lounge_score + s.avg_seat_score) / 2.0
        AS decimal(5, 2)) AS premium_overall_score,
    CAST(CASE
        WHEN l.lounge_review_count >= 10 AND s.seat_review_count >= 10
        THEN 1 ELSE 0 END AS bit) AS meets_reporting_threshold
FROM validated.airlines AS a
INNER JOIN lounge_airline_scores AS l ON l.airline_id = a.airline_id
INNER JOIN seat_airline_scores AS s ON s.airline_id = a.airline_id;
GO

/* Grain: review type x month. Common volume and sentiment trend. */
CREATE OR ALTER VIEW mart.review_monthly_trend
AS
SELECT
    N'Airline' AS review_type,
    review_month,
    COUNT(*) AS review_count,
    SUM(CAST(is_verified AS bigint)) AS verified_review_count,
    CAST(100.0 * AVG(CAST(is_verified AS decimal(10, 4)))
        AS decimal(6, 2)) AS verified_review_rate_pct,
    CAST(100.0 * AVG(CAST(is_recommended AS decimal(10, 4)))
        AS decimal(6, 2)) AS recommendation_rate_pct
FROM validated.airline_reviews
WHERE duplicate_rank = 1 AND review_month IS NOT NULL
GROUP BY review_month
UNION ALL
SELECT
    N'Airport', review_month, COUNT(*),
    SUM(CAST(is_verified AS bigint)),
    CAST(100.0 * AVG(CAST(is_verified AS decimal(10, 4))) AS decimal(6, 2)),
    CAST(100.0 * AVG(CAST(is_recommended AS decimal(10, 4))) AS decimal(6, 2))
FROM validated.airport_reviews
WHERE duplicate_rank = 1 AND review_month IS NOT NULL
GROUP BY review_month
UNION ALL
SELECT
    N'Lounge', review_month, COUNT(*),
    SUM(CAST(is_verified AS bigint)),
    CAST(100.0 * AVG(CAST(is_verified AS decimal(10, 4))) AS decimal(6, 2)),
    CAST(100.0 * AVG(CAST(is_recommended AS decimal(10, 4))) AS decimal(6, 2))
FROM validated.lounge_reviews
WHERE duplicate_rank = 1 AND review_month IS NOT NULL
GROUP BY review_month
UNION ALL
SELECT
    N'Seat', review_month, COUNT(*),
    SUM(CAST(is_verified AS bigint)),
    CAST(100.0 * AVG(CAST(is_verified AS decimal(10, 4))) AS decimal(6, 2)),
    CAST(100.0 * AVG(CAST(is_recommended AS decimal(10, 4))) AS decimal(6, 2))
FROM validated.seat_reviews
WHERE duplicate_rank = 1 AND review_month IS NOT NULL
GROUP BY review_month;
GO
