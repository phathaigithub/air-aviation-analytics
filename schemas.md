airline_reviews
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
review_id	int	NO
airline_id	int	NO
verify	bit	NO
date_submitted	date	YES
date_flown	date	YES
customer_name	nvarchar(100)	YES
nationality	nvarchar(100)	YES
type_of_traveller	nvarchar(30)	YES
seat_type	nvarchar(30)	YES
aircraft	nvarchar(100)	YES
origin_city	nvarchar(100)	YES
origin_airport	nvarchar(10)	YES
destination_city	nvarchar(100)	YES
destination_airport	nvarchar(10)	YES
transit_city	nvarchar(100)	YES
transit_airport	nvarchar(10)	YES
seat_comfort	tinyint	YES
cabin_staff_service	tinyint	YES
food_and_beverages	tinyint	YES
inflight_entertainment	tinyint	YES
ground_service	tinyint	YES
wifi_and_connectivity	tinyint	YES
value_for_money	tinyint	YES
recommended	bit	NO
review	nvarchar	YES
updated_at	datetime2	YES

airlines
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
airline_id	int	NO
airline_name	nvarchar(100)	NO

lounge_reviews
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
review_id	int	NO
airline_id	int	NO
lounge_name	nvarchar(150)	YES
airport	nvarchar(150)	YES
type_of_lounge	nvarchar(40)	YES
type_of_traveller	nvarchar(30)	YES
verify	bit	NO
date_submitted	date	YES
date_visit	date	YES
customer_name	nvarchar(100)	YES
nationality	nvarchar(100)	YES
comfort	tinyint	YES
cleanliness	tinyint	YES
bar_and_beverages	tinyint	YES
catering	tinyint	YES
washrooms	tinyint	YES
wifi_connectivity	tinyint	YES
staff_service	tinyint	YES
recommended	bit	NO
review	nvarchar	YES
updated_at	datetime2	YES

seat_reviews
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
review_id	int	NO
airline_id	int	NO
type_of_traveller	nvarchar(30)	YES
seat_type	nvarchar(30)	YES
aircraft_type	nvarchar(100)	YES
seat_layout	nvarchar(20)	YES
verify	bit	NO
date_submitted	date	YES
date_flown	date	YES
customer_name	nvarchar(100)	YES
nationality	nvarchar(100)	YES
seat_legroom	tinyint	YES
seat_recline	tinyint	YES
seat_width	tinyint	YES
aisle_space	tinyint	YES
seat_storage	tinyint	YES
power_supply	tinyint	YES
viewing_tv_screen	tinyint	YES
sleep_comfort	tinyint	YES
sitting_comfort	tinyint	YES
seat_bed_width	tinyint	YES
seat_bed_length	tinyint	YES
seat_privacy	tinyint	YES
recommended	bit	NO
review	nvarchar	YES
updated_at	datetime2	YES

airports
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
airport_id	int	NO
airport_name	nvarchar(150)	NO

airport_reviews
Schema
Cột	Kiểu dữ liệu	Cho phép NULL
review_id	int	NO
airport_id	int	NO
verify	bit	NO
date_submitted	date	YES
date_visit	date	YES
customer_name	nvarchar(100)	YES
nationality	nvarchar(100)	YES
experience_at_airport	nvarchar(40)	YES
type_of_traveller	nvarchar(30)	YES
queuing_times	tinyint	YES
terminal_cleanliness	tinyint	YES
terminal_seating	tinyint	YES
terminal_signs	tinyint	YES
food_beverages	tinyint	YES
airport_shopping	tinyint	YES
airport_staff	tinyint	YES
wifi_connectivity	tinyint	YES
recommended	bit	NO
review	nvarchar	YES
updated_at	datetime2	YES
