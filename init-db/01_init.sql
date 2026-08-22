CREATE DATABASE IF NOT EXISTS log_analytics;

CREATE TABLE IF NOT EXISTS log_analytics.logs (
    timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
    host LowCardinality(String),
    service LowCardinality(String),
    level LowCardinality(String),
    message String,
    metadata String, -- Raw JSON string
    ip String
) ENGINE = MergeTree()
ORDER BY (level, service, timestamp)
SETTINGS index_granularity = 8192;
