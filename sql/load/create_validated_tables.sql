
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF SCHEMA_ID(N'validated') IS NULL
    EXEC(N'CREATE SCHEMA validated AUTHORIZATION dbo;');
GO

IF OBJECT_ID(N'validated.airlines', N'U') IS NULL
BEGIN
    CREATE TABLE validated.airlines
    (
        airline_id int NOT NULL,
        airline_name nvarchar(100) NOT NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_airlines PRIMARY KEY CLUSTERED (airline_id)
    );
END;
GO

IF OBJECT_ID(N'validated.airports', N'U') IS NULL
BEGIN
    CREATE TABLE validated.airports
    (
        airport_id int NOT NULL,
        airport_name nvarchar(150) NOT NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_airports PRIMARY KEY CLUSTERED (airport_id)
    );
END;
GO

IF OBJECT_ID(N'validated.airline_reviews', N'U') IS NULL
BEGIN
    CREATE TABLE validated.airline_reviews
    (
        review_id int NOT NULL,
        airline_id int NOT NULL,
        verify bit NOT NULL,
        date_submitted date NULL,
        date_flown date NULL,
        customer_name nvarchar(100) NULL,
        nationality nvarchar(100) NULL,
        type_of_traveller nvarchar(40) NULL,
        seat_type nvarchar(40) NULL,
        aircraft nvarchar(100) NULL,
        origin_city nvarchar(100) NULL,
        origin_airport nvarchar(20) NULL,
        destination_city nvarchar(100) NULL,
        destination_airport nvarchar(20) NULL,
        transit_city nvarchar(100) NULL,
        transit_airport nvarchar(20) NULL,
        seat_comfort tinyint NULL,
        cabin_staff_service tinyint NULL,
        food_and_beverages tinyint NULL,
        inflight_entertainment tinyint NULL,
        ground_service tinyint NULL,
        wifi_and_connectivity tinyint NULL,
        value_for_money tinyint NULL,
        recommended bit NOT NULL,
        review nvarchar(max) NULL,
        updated_at datetime2(3) NULL,
        is_verified bit NOT NULL,
        is_recommended bit NOT NULL,
        date_submitted_clean date NULL,
        experience_date_clean date NULL,
        is_invalid_experience_date bit NOT NULL,
        is_submission_date_outlier bit NOT NULL,
        review_year smallint NULL,
        review_month date NULL,
        nationality_normalized nvarchar(100) NOT NULL,
        travel_purpose nvarchar(30) NOT NULL,
        has_invalid_boolean bit NOT NULL,
        has_invalid_rating bit NOT NULL,
        review_clean nvarchar(max) NULL,
        is_nlp_eligible bit NOT NULL,
        review_fingerprint char(64) NOT NULL,
        duplicate_group_size int NOT NULL,
        duplicate_rank int NOT NULL,
        is_potential_duplicate bit NOT NULL,
        type_of_traveller_normalized nvarchar(40) NOT NULL,
        type_of_traveller_needs_review bit NOT NULL,
        seat_type_normalized nvarchar(40) NOT NULL,
        seat_type_needs_review bit NOT NULL,
        aircraft_clean nvarchar(100) NULL,
        origin_city_clean nvarchar(100) NULL,
        origin_airport_clean nvarchar(20) NULL,
        destination_city_clean nvarchar(100) NULL,
        destination_airport_clean nvarchar(20) NULL,
        transit_city_clean nvarchar(100) NULL,
        transit_airport_clean nvarchar(20) NULL,
        has_complete_route bit NOT NULL,
        route_key nvarchar(50) NULL,
        is_suspicious_route bit NOT NULL,
        is_incomplete_transit bit NOT NULL,
        is_route_analysis_eligible bit NOT NULL,
        seat_comfort_clean tinyint NULL,
        cabin_staff_service_clean tinyint NULL,
        food_and_beverages_clean tinyint NULL,
        inflight_entertainment_clean tinyint NULL,
        ground_service_clean tinyint NULL,
        wifi_and_connectivity_clean tinyint NULL,
        value_for_money_clean tinyint NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_airline_reviews
            PRIMARY KEY CLUSTERED (review_id),
        CONSTRAINT FK_validated_airline_reviews_airlines
            FOREIGN KEY (airline_id) REFERENCES validated.airlines (airline_id)
    );
END;
GO

IF OBJECT_ID(N'validated.airport_reviews', N'U') IS NULL
BEGIN
    CREATE TABLE validated.airport_reviews
    (
        review_id int NOT NULL,
        airport_id int NOT NULL,
        verify bit NOT NULL,
        date_submitted date NULL,
        date_visit date NULL,
        customer_name nvarchar(100) NULL,
        nationality nvarchar(100) NULL,
        experience_at_airport nvarchar(40) NULL,
        type_of_traveller nvarchar(40) NULL,
        queuing_times tinyint NULL,
        terminal_cleanliness tinyint NULL,
        terminal_seating tinyint NULL,
        terminal_signs tinyint NULL,
        food_beverages tinyint NULL,
        airport_shopping tinyint NULL,
        airport_staff tinyint NULL,
        wifi_connectivity tinyint NULL,
        recommended bit NOT NULL,
        review nvarchar(max) NULL,
        updated_at datetime2(3) NULL,
        is_verified bit NOT NULL,
        is_recommended bit NOT NULL,
        date_submitted_clean date NULL,
        experience_date_clean date NULL,
        is_invalid_experience_date bit NOT NULL,
        is_submission_date_outlier bit NOT NULL,
        review_year smallint NULL,
        review_month date NULL,
        nationality_normalized nvarchar(100) NOT NULL,
        travel_purpose nvarchar(30) NOT NULL,
        has_invalid_boolean bit NOT NULL,
        has_invalid_rating bit NOT NULL,
        review_clean nvarchar(max) NULL,
        is_nlp_eligible bit NOT NULL,
        review_fingerprint char(64) NOT NULL,
        duplicate_group_size int NOT NULL,
        duplicate_rank int NOT NULL,
        is_potential_duplicate bit NOT NULL,
        airport_experience_normalized nvarchar(40) NOT NULL,
        airport_experience_needs_review bit NOT NULL,
        type_of_traveller_normalized nvarchar(40) NOT NULL,
        type_of_traveller_needs_review bit NOT NULL,
        queuing_times_clean tinyint NULL,
        terminal_cleanliness_clean tinyint NULL,
        terminal_seating_clean tinyint NULL,
        terminal_signs_clean tinyint NULL,
        food_beverages_clean tinyint NULL,
        airport_shopping_clean tinyint NULL,
        airport_staff_clean tinyint NULL,
        wifi_connectivity_clean tinyint NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_airport_reviews
            PRIMARY KEY CLUSTERED (review_id),
        CONSTRAINT FK_validated_airport_reviews_airports
            FOREIGN KEY (airport_id) REFERENCES validated.airports (airport_id)
    );
END;
GO

IF OBJECT_ID(N'validated.lounge_reviews', N'U') IS NULL
BEGIN
    CREATE TABLE validated.lounge_reviews
    (
        review_id int NOT NULL,
        airline_id int NOT NULL,
        lounge_name nvarchar(150) NULL,
        airport nvarchar(150) NULL,
        type_of_lounge nvarchar(40) NULL,
        type_of_traveller nvarchar(40) NULL,
        verify bit NOT NULL,
        date_submitted date NULL,
        date_visit date NULL,
        customer_name nvarchar(100) NULL,
        nationality nvarchar(100) NULL,
        comfort tinyint NULL,
        cleanliness tinyint NULL,
        bar_and_beverages tinyint NULL,
        catering tinyint NULL,
        washrooms tinyint NULL,
        wifi_connectivity tinyint NULL,
        staff_service tinyint NULL,
        recommended bit NOT NULL,
        review nvarchar(max) NULL,
        updated_at datetime2(3) NULL,
        is_verified bit NOT NULL,
        is_recommended bit NOT NULL,
        date_submitted_clean date NULL,
        experience_date_clean date NULL,
        is_invalid_experience_date bit NOT NULL,
        is_submission_date_outlier bit NOT NULL,
        review_year smallint NULL,
        review_month date NULL,
        nationality_normalized nvarchar(100) NOT NULL,
        travel_purpose nvarchar(30) NOT NULL,
        has_invalid_boolean bit NOT NULL,
        has_invalid_rating bit NOT NULL,
        review_clean nvarchar(max) NULL,
        is_nlp_eligible bit NOT NULL,
        review_fingerprint char(64) NOT NULL,
        duplicate_group_size int NOT NULL,
        duplicate_rank int NOT NULL,
        is_potential_duplicate bit NOT NULL,
        lounge_type_normalized nvarchar(40) NOT NULL,
        lounge_type_needs_review bit NOT NULL,
        type_of_traveller_normalized nvarchar(40) NOT NULL,
        type_of_traveller_needs_review bit NOT NULL,
        comfort_clean tinyint NULL,
        cleanliness_clean tinyint NULL,
        bar_and_beverages_clean tinyint NULL,
        catering_clean tinyint NULL,
        washrooms_clean tinyint NULL,
        wifi_connectivity_clean tinyint NULL,
        staff_service_clean tinyint NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_lounge_reviews
            PRIMARY KEY CLUSTERED (review_id),
        CONSTRAINT FK_validated_lounge_reviews_airlines
            FOREIGN KEY (airline_id) REFERENCES validated.airlines (airline_id)
    );
END;
GO

IF OBJECT_ID(N'validated.seat_reviews', N'U') IS NULL
BEGIN
    CREATE TABLE validated.seat_reviews
    (
        review_id int NOT NULL,
        airline_id int NOT NULL,
        type_of_traveller nvarchar(40) NULL,
        seat_type nvarchar(40) NULL,
        aircraft_type nvarchar(100) NULL,
        seat_layout nvarchar(30) NULL,
        verify bit NOT NULL,
        date_submitted date NULL,
        date_flown date NULL,
        customer_name nvarchar(100) NULL,
        nationality nvarchar(100) NULL,
        seat_legroom tinyint NULL,
        seat_recline tinyint NULL,
        seat_width tinyint NULL,
        aisle_space tinyint NULL,
        seat_storage tinyint NULL,
        power_supply tinyint NULL,
        viewing_tv_screen tinyint NULL,
        sleep_comfort tinyint NULL,
        sitting_comfort tinyint NULL,
        seat_bed_width tinyint NULL,
        seat_bed_length tinyint NULL,
        seat_privacy tinyint NULL,
        recommended bit NOT NULL,
        review nvarchar(max) NULL,
        updated_at datetime2(3) NULL,
        is_verified bit NOT NULL,
        is_recommended bit NOT NULL,
        date_submitted_clean date NULL,
        experience_date_clean date NULL,
        is_invalid_experience_date bit NOT NULL,
        is_submission_date_outlier bit NOT NULL,
        review_year smallint NULL,
        review_month date NULL,
        nationality_normalized nvarchar(100) NOT NULL,
        travel_purpose nvarchar(30) NOT NULL,
        has_invalid_boolean bit NOT NULL,
        has_invalid_rating bit NOT NULL,
        review_clean nvarchar(max) NULL,
        is_nlp_eligible bit NOT NULL,
        review_fingerprint char(64) NOT NULL,
        duplicate_group_size int NOT NULL,
        duplicate_rank int NOT NULL,
        is_potential_duplicate bit NOT NULL,
        type_of_traveller_normalized nvarchar(40) NOT NULL,
        type_of_traveller_needs_review bit NOT NULL,
        seat_type_normalized nvarchar(40) NOT NULL,
        seat_type_needs_review bit NOT NULL,
        aircraft_type_clean nvarchar(100) NULL,
        seat_layout_clean nvarchar(30) NULL,
        seat_legroom_clean tinyint NULL,
        seat_recline_clean tinyint NULL,
        seat_width_clean tinyint NULL,
        aisle_space_clean tinyint NULL,
        seat_storage_clean tinyint NULL,
        power_supply_clean tinyint NULL,
        viewing_tv_screen_clean tinyint NULL,
        sleep_comfort_clean tinyint NULL,
        sitting_comfort_clean tinyint NULL,
        seat_bed_width_clean tinyint NULL,
        seat_bed_length_clean tinyint NULL,
        seat_privacy_clean tinyint NULL,
        _source_file nvarchar(260) NOT NULL,
        _source_row_number int NOT NULL,
        _source_sha256 char(64) NOT NULL,
        CONSTRAINT PK_validated_seat_reviews
            PRIMARY KEY CLUSTERED (review_id),
        CONSTRAINT FK_validated_seat_reviews_airlines
            FOREIGN KEY (airline_id) REFERENCES validated.airlines (airline_id)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'validated.airline_reviews')
      AND name = N'IX_airline_reviews_airline_year'
)
    CREATE INDEX IX_airline_reviews_airline_year
        ON validated.airline_reviews (airline_id, review_year)
        INCLUDE (is_recommended);
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'validated.airport_reviews')
      AND name = N'IX_airport_reviews_airport_year'
)
    CREATE INDEX IX_airport_reviews_airport_year
        ON validated.airport_reviews (airport_id, review_year)
        INCLUDE (is_recommended);
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'validated.lounge_reviews')
      AND name = N'IX_lounge_reviews_airline_year'
)
    CREATE INDEX IX_lounge_reviews_airline_year
        ON validated.lounge_reviews (airline_id, review_year)
        INCLUDE (is_recommended);
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'validated.seat_reviews')
      AND name = N'IX_seat_reviews_airline_year'
)
    CREATE INDEX IX_seat_reviews_airline_year
        ON validated.seat_reviews (airline_id, review_year)
        INCLUDE (is_recommended);
GO
