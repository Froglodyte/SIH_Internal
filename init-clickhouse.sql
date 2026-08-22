CREATE DATABASE IF NOT EXISTS logs_db;

CREATE TABLE IF NOT EXISTS logs_db.system_logs
(
    id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3, 'UTC'),
    service LowCardinality(String),
    level LowCardinality(String),
    message String,
    host_ip String,
    status_code UInt16,
    latency_ms Float32,
    anomaly_score Float32,
    is_anomaly UInt8,
    cluster_tag LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
PRIMARY KEY (service, level, timestamp)
ORDER BY (service, level, timestamp);
