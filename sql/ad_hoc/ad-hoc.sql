-- Tổng số lượt đánh giá chuyến bay
use AirReviews
select count(*)  as N'Tổng số đánh giá' from validated.airline_reviews;
-- result 156323

-- Số hãng bay được nhắc tới nhiều nhất
select TOP 20 a.airline_name as N'Tên hãng', count(*) as N'Tổng số lượt nhắc' 
from validated.airline_reviews ar
inner join validated.airlines a
on ar.airline_id = a.airline_id
group by airline_name
order by count(*) desc
/*
Result
Read more	6724
American Airlines	6357
Spirit Airlines	5289
United Airlines	5139
British Airways	4025
Frontier Airlines	3833
Delta Air Lines	3215
Turkish Airlines	2834
Qatar Airways	2694
Lufthansa	2601
Air Canada	2515
Emirates	2500
Ryanair	2357
China Southern Airlines	2058
Allegiant Air	2004
Qantas Airways	1995
Etihad Airways	1960
Southwest Airlines	1912
KLM Royal Dutch Airlines	1730
Jetblue Airways	1701
*/
-- Tỉ lệ khách hàng sẳn sáng giới thiệu
SELECT
    count(*) as total_reviews,
    ROUND(100.0 * AVG(CAST(is_recommended AS decimal)),2)
        AS recommendation_rate_pct
FROM validated.airline_reviews;
-- RESULT:  156323	37.460000

-- 10 Quốc tịch để lại đánh giá nhiều nhất
select top 10 nationality as N'quốc tịch', count(*) as N'Tổng số đánh giá'
from validated.airline_reviews
where duplicate_rank = 1
group by nationality
ORDER BY COUNT(*) DESC;
/*
Result
United States	51208
United Kingdom	24934
Australia	13414
Canada	12756
Germany	4240
India	3702
Singapore	2420
Netherlands	2298
France	2125
New Zealand	1781
*/
-- Điểm trung bình độ hài lòng của ghế ngồi
select count(seat_comfort) as total_review, cast(avg(cast(seat_comfort as decimal(10,2))) as decimal(10,2)) as N'Điểm trung bình độ hài lòng'
from validated.airline_reviews;
--RESULT: 140098	2.71
-- Top 10 hãng đáng tiền nhất (điểm trung bình tiêu chí đáng tiền và có hơn 100 lượt đánh giá)
SELECT TOP (10)
    a.airline_name AS N'Tên hãng',
    COUNT_BIG(*) AS N'Tổng số review',
    CAST(
        AVG(CAST(ar.value_for_money_clean AS decimal(10, 2)))
        AS decimal(10, 2)
    ) AS N'Điểm trung bình'
FROM validated.airline_reviews AS ar
INNER JOIN validated.airlines AS a
    ON a.airline_id = ar.airline_id
WHERE ar.duplicate_rank = 1
GROUP BY
    a.airline_name
HAVING COUNT_BIG(ar.value_for_money_clean) >= 100
ORDER BY
    AVG(CAST(ar.value_for_money_clean AS decimal(10, 2))) DESC,
    COUNT_BIG(ar.value_for_money_clean) DESC,
    a.airline_name;
    /*
Hainan Airlines	426	4.40
China Southern Airlines	2058	4.28
Garuda Indonesia	977	4.22
Asiana Airlines	527	4.11
EVA Air	673	4.06
Royal Brunei Airlines	376	4.02
Volotea	718	3.98
Thai Smile Airways	274	3.93
ANA All Nippon Airways	626	3.90
Qatar Airways	2694	3.86
    */

-- So sánh thiện cảm theo nhóm khách hàng
select  [type_of_traveller_normalized] as 'Nhóm khách hàng',
count(*) as 'Số lượt đánh giá',round( 100.0 * avg(cast([is_recommended] as decimal(10,2))),2) as 'Tỉ lệ phần trăm'
from validated.airline_reviews
where duplicate_rank = 1
group by type_of_traveller_normalized
/*
result
Business	17844	31.090000
Couple Leisure	30371	29.360000
Family Leisure	26322	27.040000
Solo Leisure	42340	37.710000
Unknown	39446	53.270000
*/

-- TOP 10 sân bay bị chê xếp hàng lâu ( điểm trung bình thấp, có từ 50 đánh giá)
select top (10) ap.airport_name, round(avg(cast([queuing_times_clean] as decimal(10,2))) ,2) as [Điểm trung bình thời gian xếp hàng] , count(*) as 'Số lượt đánh giá'
from validated.airport_reviews apr
inner join validated.airports ap
on apr.airport_id = ap.airport_id
where duplicate_rank = 1
group by airport_name
having count(*) >= 50
order by [Điểm trung bình thời gian xếp hàng] asc
/*
result
Grenoble	1.110000	77
Berlin Brandenburg	1.460000	210
Lyon	1.570000	144
Montego Bay	1.580000	60
Beauvais	1.610000	105
London Stansted	1.620000	938
Bordeaux	1.640000	194
Heraklion	1.640000	168
Luton	1.660000	805
Geneva	1.660000	311
*/

-- Điểm phục vụ tiếp viên theo hạng ghế
select [seat_type_normalized], count(*) as [Lượt đánh giá], round(avg(cast([cabin_staff_service_clean] as decimal(10,2))),2) as [Điểm phục vụ trung bình]
from validated.airline_reviews
where [seat_type_normalized] <> 'Unknown' and duplicate_rank = 1
group by [seat_type_normalized]
order by [Điểm phục vụ trung bình] desc
/*
    result
Business	19180	3.740000
First	3208	3.530000
Premium Economy	6096	3.060000
Economy	124737	2.820000
*/

-- Số lượt đánh giá theo từng năm
select YEAR([date_submitted_clean]) as [Năm], count(*) as [Lượt đánh giá]
from validated.airline_reviews
where duplicate_rank = 1
group by YEAR([date_submitted_clean])
order by [Năm] asc 

/* result
2002	13
2003	41
2004	120
2005	160
2006	187
2007	308
2008	426
2009	592
2010	1488
2011	3081
2012	4622
2013	8603
2014	14365
2015	14663
2016	12775
2017	12168
2018	14935
2019	16251
2020	6155
2021	6780
2022	12896
2023	12779
2024	7464
2025	4404
2026	801
*/

-- Xếp hạng hãng theo điểm từng năm
with airline_money_year as(
select [airline_name] as [Tên hãng], year([date_submitted_clean]) as [Năm], count(*) as [Lượt đánh giá], avg(cast(value_for_money as decimal(10,2))) as [Điểm trung bình đáng tiền]
from validated.airline_reviews ar
inner join validated.airlines a
on ar.airline_id = a.airline_id
where ar.duplicate_rank = 1
group by [airline_name], year([date_submitted_clean])
having count(ar.value_for_money) >= 50
),
rank_airline_money as(
select [Năm], [Tên hãng], [Điểm trung bình đáng tiền],
        dense_rank() over(partition by [Năm] order by [Điểm trung bình đáng tiền] desc) as [Thứ hạng trong năm]
from airline_money_year
)
select [Năm], [Tên hãng], [Điểm trung bình đáng tiền], [Thứ hạng trong năm]
from rank_airline_money
where [Thứ hạng trong năm] <=5
order by [Năm] asc, [Thứ hạng trong năm] asc

/* result
Asiana Airlines	3.950819	1
Aer Lingus	3.857142	2
EVA Air	3.631578	3
Aeroflot Russian Airlines	3.603773	4
Southwest Airlines	3.578947	5
Royal Brunei Airlines	4.540000	1
Garuda Indonesia	4.534883	2
Korean Air	4.428571	3
Asiana Airlines	4.312500	4
EVA Air	4.147540	5
Asiana Airlines	4.488888	1
Garuda Indonesia	4.278350	2
Qatar Airways	4.276315	3
Royal Brunei Airlines	4.181818	4
Korean Air	4.161764	5
Royal Brunei Airlines	4.490909	1
AirAsia X	4.262295	2
Garuda Indonesia	4.200000	3
EVA Air	4.180722	4
China Southern Airlines	4.137931	5
EVA Air	4.550724	1
Garuda Indonesia	4.450980	2
Qatar Airways	4.320512	3
Aegean Airlines	4.175000	4
China Southern Airlines	4.159817	5
Garuda Indonesia	4.549180	1
China Southern Airlines	4.505102	2
Aegean Airlines	4.418918	3
EVA Air	4.188679	4
Japan Airlines	4.166666	5
EVA Air	4.515151	1
Hainan Airlines	4.470588	2
ANA All Nippon Airways	4.435483	3
Garuda Indonesia	4.267241	4
China Southern Airlines	4.262295	5
Hainan Airlines	4.602941	1
China Southern Airlines	4.416438	2
EVA Air	4.290322	3
Garuda Indonesia	4.036144	4
Qatar Airways	3.798122	5
China Southern Airlines	4.245283	1
ANA All Nippon Airways	3.920000	2
Garuda Indonesia	3.688073	3
Qatar Airways	3.595833	4
Singapore Airlines	3.500000	5
Thai Smile Airways	4.311475	1
Qatar Airways	4.127659	2
Singapore Airlines	3.214285	3
SpiceJet	2.845238	4
Flair Airlines	2.722222	5
China Southern Airlines	4.623529	1
Qatar Airways	4.203252	2
Volotea	4.076923	3
SpiceJet	2.852941	4
British Airways	2.586206	5
Thai Smile Airways	3.986111	1
Qatar Airways	3.554263	2
Volotea	3.125000	3
PLAY	2.970588	4
Singapore Airlines	2.750000	5
Volotea	4.250000	1
Thai Smile Airways	3.797101	2
Qatar Airways	3.462616	3
Vistara	3.389830	4
Singapore Airlines	3.280000	5
Volotea	4.528301	1
Singapore Airlines	3.404040	2
Qatar Airways	3.070754	3
Malaysia Airlines	3.042857	4
Thai Airways	3.039215	5
Volotea	4.668341	1
Qatar Airways	3.710937	2
Singapore Airlines	3.177419	3
Air France	2.666666	4
Cathay Pacific Airways	2.634615	5
*/

-- XU hướng và mức thay đổi của điểm hài lòng trung bình ghế ngồi qua từng năm
select 
    year([date_submitted_clean]) as [Năm], 
    avg(cast([seat_comfort_clean] as decimal(10,2))) as [Điểm trung bình ghế ngồi],
    lag(avg(cast([seat_comfort_clean] as decimal(10,2)))) over(order by year([date_submitted_clean])) as [Điểm trung bình ghế ngồi năm trước],
    ( avg(cast([seat_comfort_clean] as decimal(10,2))) - lag(avg(cast([seat_comfort_clean] as decimal(10,2)))) over(order by year([date_submitted_clean]))) as [Chênh lệch so với năm trước]
from validated.airline_reviews
where duplicate_rank = 1
 -- and date_submitted_clean IS NOT NULL and  seat_comfort_clean IS NOT NULL
group by year([date_submitted_clean])
order by [Năm]
/*
RESULT:
2002	NULL	NULL	NULL
2003	NULL	NULL	NULL
2004	NULL	NULL	NULL
2005	3.000000	NULL	NULL
2006	NULL	3.000000	NULL
2007	2.666666	NULL	NULL
2008	2.000000	2.666666	-0.666666
2009	3.000000	2.000000	1.000000
2010	4.000000	3.000000	1.000000
2011	3.376543	4.000000	-0.623457
2012	3.340915	3.376543	-0.035628
2013	3.261754	3.340915	-0.079161
2014	3.078840	3.261754	-0.182914
2015	2.992542	3.078840	-0.086298
2016	3.038651	2.992542	0.046109
2017	2.861369	3.038651	-0.177282
2018	2.567760	2.861369	-0.293609
2019	2.482943	2.567760	-0.084817
2020	2.577701	2.482943	0.094758
2021	2.190789	2.577701	-0.386912
2022	2.206971	2.190789	0.016182
2023	2.281221	2.206971	0.074250
2024	2.458489	2.281221	0.177268
2025	2.677961	2.458489	0.219472
2026	2.835180	2.677961	0.157219
*/
-- Phân nhóm hãng theo mức đáng đồng tiền
with airlines_money_reviews as (
select airline_name as [Tên hãng], avg(cast(value_for_money_clean as decimal(10,2))) as [Điểm trung bình đáng tiền]
from validated.airlines a
inner join validated.airline_reviews ar
on a.airline_id = ar.airline_id
where duplicate_rank = 1 and value_for_money IS NOT NULL
group by airline_name 
having count(*) >= 100
)
, ranking_money_airline_review as (
select [Tên hãng], [Điểm trung bình đáng tiền], NTILE(4) over(order by [Điểm trung bình đáng tiền] desc) as [Nhóm]
from airlines_money_reviews
)
select count(*) as [Số hãng], AVG([Điểm trung bình đáng tiền]) as [Điểm trung bình của nhóm],
case
    when [Nhóm] = 1 THEN N'Dẫn đầu'
    when [Nhóm] = 2 THEN N'Khá'
    when [Nhóm] = 3 THEN N'Trung bình'
    when [Nhóm] = 4 THEN N'Đuối'
end as [Nhóm]
from ranking_money_airline_review
group by [Nhóm]
order by [Điểm trung bình của nhóm] desc
/*
RESULT
45	3.519688	Dẫn đầu
44	2.860729	Khá
44	2.463352	Trung bình
44	1.947667	Đuối
*/

-- Chặng bay bị phàn nàn nhiều nhất ( 20 chặng có tỉ lệ khách hàng giới thiệu thấp)
select TOP (20) origin_airport_clean as [Điểm đi],
       destination_airport_clean as [Điểm đến],
       count(*) as [Số lượt],
       100.0 * avg(cast([is_recommended] as decimal(10,2))) as [Tỉ lệ giới thiệu]
from validated.airline_reviews
where duplicate_rank = 1 and [is_recommended] is not null and origin_airport_clean is not null and destination_airport_clean is not null
group by origin_airport_clean, destination_airport_clean
having count(*) >= 30
order by [Tỉ lệ giới thiệu] asc
/*
RESULT:
ATL	MIA	33	0.000000
MCO	ORD	35	2.857100
DEN	IAH	31	3.225800
IAH	EWR	30	3.333300
LAS	DEN	47	4.255300
DEN	ORD	38	5.263100
MCO	LAS	38	5.263100
DEN	PHX	37	5.405400
DEN	ATL	37	5.405400
EWR	MCO	53	5.660300
MCO	BOS	34	5.882300
DEN	SEA	32	6.250000
EWR	SFO	30	6.666600
MCO	DEN	44	6.818100
BOS	MCO	43	6.976700
LAX	DEN	38	7.894700
ORD	LAS	50	8.000000
LAS	ORD	50	8.000000
DFW	LAS	59	8.474500
MCO	EWR	70	8.571400
*/
-- Hãng mạnh cả phòng chở lẫn ghế ngồi
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
    GROUP BY
        lr.airline_id,
        lr.review_id
    HAVING COUNT(r.rating) > 0
),
lounge_airline_scores AS
(
    SELECT
        airline_id,
        COUNT_BIG(*) AS lounge_review_count,
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
    GROUP BY
        sr.airline_id,
        sr.review_id
    HAVING COUNT(r.rating) > 0
),
seat_airline_scores AS
(
    SELECT
        airline_id,
        COUNT_BIG(*) AS seat_review_count,
        AVG(seat_review_score) AS avg_seat_score
    FROM seat_review_scores
    GROUP BY airline_id
),
premium_airline_scores AS
(
    SELECT
        a.airline_name,
        l.lounge_review_count,
        s.seat_review_count,
        l.avg_lounge_score,
        s.avg_seat_score,
        (l.avg_lounge_score + s.avg_seat_score) / 2.0
            AS premium_overall_score
    FROM validated.airlines AS a
    INNER JOIN lounge_airline_scores AS l
        ON l.airline_id = a.airline_id
    INNER JOIN seat_airline_scores AS s
        ON s.airline_id = a.airline_id
    WHERE l.lounge_review_count >= 10
      AND s.seat_review_count >= 10
)
SELECT TOP 20
    airline_name AS N'Tên hãng',
    lounge_review_count AS N'Số review phòng chờ',
    CAST(avg_lounge_score AS decimal(10, 2))
        AS N'Điểm phòng chờ trung bình',
    seat_review_count AS N'Số review ghế',
    CAST(avg_seat_score AS decimal(10, 2))
        AS N'Điểm ghế trung bình',
    CAST(premium_overall_score AS decimal(10, 2))
        AS N'Điểm premium tổng thể'
FROM premium_airline_scores
ORDER BY premium_overall_score DESC
/*
RESULT:
Qatar Airways	200	4.03	119	4.01	4.02
Asiana Airlines	47	3.88	31	3.99	3.93
EVA Air	37	3.97	41	3.89	3.93
Japan Airlines	37	3.68	23	3.90	3.79
ANA All Nippon Airways	37	4.08	26	3.21	3.65
China Southern Airlines	30	3.53	26	3.75	3.64
Cathay Pacific Airways	133	4.00	144	3.18	3.59
Philippine Airlines	28	3.54	23	3.52	3.53
Qantas Airways	254	3.69	102	3.34	3.52
Vietnam Airlines	32	3.41	12	3.57	3.49
Alaska Airlines	15	4.16	10	2.79	3.47
Aegean Airlines	16	3.65	17	3.29	3.47
Thai Airways	131	3.37	29	3.56	3.46
Singapore Airlines	139	3.58	118	3.31	3.45
Saudi Arabian Airlines	13	3.30	12	3.60	3.45
Korean Air	41	3.12	16	3.72	3.42
Turkish Airlines	133	3.88	39	2.89	3.39
Garuda Indonesia	58	2.69	24	4.05	3.37
Malaysia Airlines	128	3.22	51	3.50	3.36
Aeroflot Russian Airlines	19	3.33	20	3.36	3.34
*/