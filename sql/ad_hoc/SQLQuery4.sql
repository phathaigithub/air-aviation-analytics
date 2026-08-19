USE [AirReviews];
GO

SELECT DB_NAME() AS current_database;

SELECT
    s.name AS schema_name,
    t.name AS table_name
FROM sys.tables AS t
JOIN sys.schemas AS s
    ON s.schema_id = t.schema_id
WHERE s.name = N'validated'
ORDER BY t.name;