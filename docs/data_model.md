# Xóm Air Data Model

## 1. Mô hình nguồn

```mermaid
erDiagram
    AIRLINES ||--o{ AIRLINE_REVIEWS : "airline_id"
    AIRLINES ||--o{ LOUNGE_REVIEWS : "airline_id"
    AIRLINES ||--o{ SEAT_REVIEWS : "airline_id"
    AIRPORTS ||--o{ AIRPORT_REVIEWS : "airport_id"

    AIRLINES {
        int airline_id PK
        nvarchar airline_name
    }

    AIRPORTS {
        int airport_id PK
        nvarchar airport_name
    }

    AIRLINE_REVIEWS {
        int review_id PK
        int airline_id FK
        bit verify
        date date_submitted
        date date_flown
        nvarchar customer_name
        nvarchar nationality
        nvarchar type_of_traveller
        nvarchar seat_type
        nvarchar aircraft
        nvarchar origin_city
        nvarchar origin_airport
        nvarchar destination_city
        nvarchar destination_airport
        nvarchar transit_city
        nvarchar transit_airport
        tinyint seat_comfort
        tinyint cabin_staff_service
        tinyint food_and_beverages
        tinyint inflight_entertainment
        tinyint ground_service
        tinyint wifi_and_connectivity
        tinyint value_for_money
        bit recommended
        nvarchar review
        datetime2 updated_at
    }

    AIRPORT_REVIEWS {
        int review_id PK
        int airport_id FK
        bit verify
        date date_submitted
        date date_visit
        nvarchar customer_name
        nvarchar nationality
        nvarchar experience_at_airport
        nvarchar type_of_traveller
        tinyint queuing_times
        tinyint terminal_cleanliness
        tinyint terminal_seating
        tinyint terminal_signs
        tinyint food_beverages
        tinyint airport_shopping
        tinyint airport_staff
        tinyint wifi_connectivity
        bit recommended
        nvarchar review
        datetime2 updated_at
    }

    LOUNGE_REVIEWS {
        int review_id PK
        int airline_id FK
        nvarchar lounge_name
        nvarchar airport
        nvarchar type_of_lounge
        nvarchar type_of_traveller
        bit verify
        date date_submitted
        date date_visit
        nvarchar customer_name
        nvarchar nationality
        tinyint comfort
        tinyint cleanliness
        tinyint bar_and_beverages
        tinyint catering
        tinyint washrooms
        tinyint wifi_connectivity
        tinyint staff_service
        bit recommended
        nvarchar review
        datetime2 updated_at
    }

    SEAT_REVIEWS {
        int review_id PK
        int airline_id FK
        nvarchar type_of_traveller
        nvarchar seat_type
        nvarchar aircraft_type
        nvarchar seat_layout
        bit verify
        date date_submitted
        date date_flown
        nvarchar customer_name
        nvarchar nationality
        tinyint seat_legroom
        tinyint seat_recline
        tinyint seat_width
        tinyint aisle_space
        tinyint seat_storage
        tinyint power_supply
        tinyint viewing_tv_screen
        tinyint sleep_comfort
        tinyint sitting_comfort
        tinyint seat_bed_width
        tinyint seat_bed_length
        tinyint seat_privacy
        bit recommended
        nvarchar review
        datetime2 updated_at
    }
```

## 2. Quan hệ

| Bảng con | Foreign key | Bảng cha | Cardinality | Orphan |
|---|---|---|---|---:|
| `airline_reviews` | `airline_id` | `airlines.airline_id` | N:1 | 0 |
| `lounge_reviews` | `airline_id` | `airlines.airline_id` | N:1 | 0 |
| `seat_reviews` | `airline_id` | `airlines.airline_id` | N:1 | 0 |
| `airport_reviews` | `airport_id` | `airports.airport_id` | N:1 | 0 |

