import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from collections import deque
import numpy as np

from config import settings

logger = logging.getLogger(__name__)

# ClickHouse Client global
_ch_client = None

# In-memory fallback buffer (max 10000 logs)
_memory_logs: deque = deque(maxlen=10000)

def get_clickhouse_client():
    global _ch_client
    if _ch_client is not None:
        try:
            _ch_client.command("SELECT 1")
            return _ch_client
        except Exception:
            _ch_client = None

    try:
        import clickhouse_connect
        client = clickhouse_connect.get_client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            username=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
            connect_timeout=3,
            send_receive_timeout=5
        )
        _ch_client = client
        logger.info("Successfully connected to ClickHouse at %s:%d", settings.CLICKHOUSE_HOST, settings.CLICKHOUSE_PORT)
        return _ch_client
    except Exception as e:
        logger.warning("ClickHouse connection unavailable (%s). Operating with in-memory fallback mode.", e)
        _ch_client = None
        return None

def init_db():
    client = get_clickhouse_client()
    if client:
        try:
            client.command(f"CREATE DATABASE IF NOT EXISTS {settings.CLICKHOUSE_DB}")
            create_table_sql = f"""
            CREATE TABLE IF NOT EXISTS {settings.CLICKHOUSE_DB}.system_logs
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
            """
            client.command(create_table_sql)
            logger.info("ClickHouse database and table initialized successfully.")
        except Exception as e:
            logger.error("Failed to initialize ClickHouse tables: %s", e)

def insert_logs(logs: List[Dict[str, Any]]) -> None:
    if not logs:
        return

    # Standardize logs
    formatted_rows = []
    for log in logs:
        log_id = log.get("id")
        if not log_id:
            log_id = str(uuid.uuid4())
        
        ts = log.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
        elif not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
            
        service = str(log.get("service", "unknown-service"))
        level = str(log.get("level", "INFO")).upper()
        message = str(log.get("message", ""))
        host_ip = str(log.get("host_ip", "127.0.0.1"))
        status_code = int(log.get("status_code", 200))
        latency_ms = float(log.get("latency_ms", 0.0))
        anomaly_score = float(log.get("anomaly_score", 0.0))
        is_anomaly = int(log.get("is_anomaly", 0))
        cluster_tag = str(log.get("cluster_tag", "Normal Operation"))

        log_item = {
            "id": str(log_id),
            "timestamp": ts,
            "service": service,
            "level": level,
            "message": message,
            "host_ip": host_ip,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "anomaly_score": anomaly_score,
            "is_anomaly": is_anomaly,
            "cluster_tag": cluster_tag
        }

        # Keep in in-memory fallback buffer
        _memory_logs.appendleft(log_item)

        # Prepare tuple for ClickHouse bulk insert
        # id UUID column can accept string or UUID object
        try:
            uuid_obj = uuid.UUID(str(log_id))
        except Exception:
            uuid_obj = uuid.uuid4()

        formatted_rows.append((
            uuid_obj,
            ts,
            service,
            level,
            message,
            host_ip,
            status_code,
            latency_ms,
            anomaly_score,
            is_anomaly,
            cluster_tag
        ))

    client = get_clickhouse_client()
    if client:
        try:
            column_names = [
                "id", "timestamp", "service", "level", "message",
                "host_ip", "status_code", "latency_ms", "anomaly_score",
                "is_anomaly", "cluster_tag"
            ]
            client.insert(
                table="system_logs",
                database=settings.CLICKHOUSE_DB,
                data=formatted_rows,
                column_names=column_names
            )
        except Exception as e:
            logger.error("Error inserting logs into ClickHouse: %s", e)

def get_logs(
    service: Optional[str] = None,
    level: Optional[str] = None,
    is_anomaly: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    client = get_clickhouse_client()
    if client:
        try:
            where_clauses = ["1=1"]
            params = {}

            if service:
                where_clauses.append("service = {service:String}")
                params["service"] = service
            if level:
                where_clauses.append("level = {level:String}")
                params["level"] = level.upper()
            if is_anomaly is not None:
                where_clauses.append("is_anomaly = {is_anomaly:UInt8}")
                params["is_anomaly"] = 1 if is_anomaly else 0

            where_str = " AND ".join(where_clauses)

            count_query = f"SELECT count() FROM {settings.CLICKHOUSE_DB}.system_logs WHERE {where_str}"
            total_res = client.query(count_query, parameters=params)
            total_count = total_res.first_row[0] if total_res.first_row else 0

            params["limit"] = limit
            params["offset"] = offset

            query = f"""
            SELECT id, timestamp, service, level, message, host_ip, status_code, latency_ms, anomaly_score, is_anomaly, cluster_tag
            FROM {settings.CLICKHOUSE_DB}.system_logs
            WHERE {where_str}
            ORDER BY timestamp DESC
            LIMIT {{limit:UInt32}} OFFSET {{offset:UInt32}}
            """
            result = client.query(query, parameters=params)

            logs = []
            for row in result.result_rows:
                ts = row[1]
                if isinstance(ts, datetime):
                    ts_str = ts.isoformat()
                else:
                    ts_str = str(ts)

                logs.append({
                    "id": str(row[0]),
                    "timestamp": ts_str,
                    "service": row[2],
                    "level": row[3],
                    "message": row[4],
                    "host_ip": row[5],
                    "status_code": int(row[6]),
                    "latency_ms": float(row[7]),
                    "anomaly_score": float(row[8]),
                    "is_anomaly": int(row[9]),
                    "cluster_tag": row[10]
                })

            return {
                "logs": logs,
                "total": total_count,
                "limit": limit,
                "offset": offset
            }
        except Exception as e:
            logger.error("ClickHouse query error, falling back to memory: %s", e)

    # In-memory fallback querying
    filtered = list(_memory_logs)
    if service:
        filtered = [l for l in filtered if l["service"] == service]
    if level:
        filtered = [l for l in filtered if l["level"] == level.upper()]
    if is_anomaly is not None:
        target_val = 1 if is_anomaly else 0
        filtered = [l for l in filtered if l["is_anomaly"] == target_val]

    total_count = len(filtered)
    paged = filtered[offset : offset + limit]

    logs = []
    for item in paged:
        item_copy = dict(item)
        if isinstance(item_copy["timestamp"], datetime):
            item_copy["timestamp"] = item_copy["timestamp"].isoformat()
        logs.append(item_copy)

    return {
        "logs": logs,
        "total": total_count,
        "limit": limit,
        "offset": offset
    }

def get_metrics() -> Dict[str, Any]:
    client = get_clickhouse_client()
    if client:
        try:
            query = f"""
            SELECT
                count() as total_logs,
                countIf(level IN ('ERROR', 'FATAL', 'CRITICAL') OR status_code >= 400) / greatest(count(), 1) as error_rate,
                avg(latency_ms) as avg_latency_ms,
                quantile(0.95)(latency_ms) as p95_latency_ms,
                countIf(is_anomaly = 1) as active_anomalies
            FROM {settings.CLICKHOUSE_DB}.system_logs
            WHERE timestamp >= now() - INTERVAL 60 MINUTE
            """
            res = client.query(query)
            if res.first_row and res.first_row[0] > 0:
                row = res.first_row
                return {
                    "total_logs": int(row[0]),
                    "error_rate": round(float(row[1]), 4),
                    "avg_latency_ms": round(float(row[2]), 2),
                    "p95_latency_ms": round(float(row[3]), 2),
                    "active_anomalies": int(row[4])
                }
        except Exception as e:
            logger.error("ClickHouse metrics query error, falling back to memory: %s", e)

    # Memory fallback metrics calculation
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(minutes=60)
    recent_logs = [l for l in _memory_logs if l["timestamp"] >= one_hour_ago]

    if not recent_logs:
        recent_logs = list(_memory_logs)

    if not recent_logs:
        return {
            "total_logs": 0,
            "error_rate": 0.0,
            "avg_latency_ms": 0.0,
            "p95_latency_ms": 0.0,
            "active_anomalies": 0
        }

    total_logs = len(recent_logs)
    error_count = sum(1 for l in recent_logs if l["level"] in ("ERROR", "FATAL", "CRITICAL") or l["status_code"] >= 400)
    latencies = [l["latency_ms"] for l in recent_logs]
    active_anomalies = sum(1 for l in recent_logs if l["is_anomaly"] == 1)

    error_rate = round(error_count / total_logs, 4) if total_logs > 0 else 0.0
    avg_latency = round(float(np.mean(latencies)), 2) if latencies else 0.0
    p95_latency = round(float(np.percentile(latencies, 95)), 2) if latencies else 0.0

    return {
        "total_logs": total_logs,
        "error_rate": error_rate,
        "avg_latency_ms": avg_latency,
        "p95_latency_ms": p95_latency,
        "active_anomalies": active_anomalies
    }

def get_timeseries() -> List[Dict[str, Any]]:
    client = get_clickhouse_client()
    if client:
        try:
            query = f"""
            SELECT
                toStartOfMinute(timestamp) as time_bucket,
                count() as total_count,
                countIf(is_anomaly = 0) as normal_count,
                countIf(is_anomaly = 1) as anomaly_count,
                avg(latency_ms) as avg_latency_ms
            FROM {settings.CLICKHOUSE_DB}.system_logs
            WHERE timestamp >= now() - INTERVAL 60 MINUTE
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
            """
            res = client.query(query)
            series = []
            for row in res.result_rows:
                tb = row[0]
                tb_str = tb.isoformat() if isinstance(tb, datetime) else str(tb)
                series.append({
                    "timestamp": tb_str,
                    "total_count": int(row[1]),
                    "normal_count": int(row[2]),
                    "anomaly_count": int(row[3]),
                    "avg_latency_ms": round(float(row[4]), 2)
                })
            if series:
                return series
        except Exception as e:
            logger.error("ClickHouse timeseries query error, falling back to memory: %s", e)

    # Memory fallback timeseries
    now = datetime.now(timezone.utc)
    one_hour_ago = now - timedelta(minutes=60)
    recent = [l for l in _memory_logs if l["timestamp"] >= one_hour_ago]
    if not recent:
        recent = list(_memory_logs)

    buckets: Dict[str, Dict[str, Any]] = {}
    for l in recent:
        ts = l["timestamp"]
        bucket_key = ts.strftime("%Y-%m-%d %H:%M:00")
        if bucket_key not in buckets:
            buckets[bucket_key] = {
                "timestamp": bucket_key,
                "total_count": 0,
                "normal_count": 0,
                "anomaly_count": 0,
                "latencies": []
            }
        b = buckets[bucket_key]
        b["total_count"] += 1
        if l["is_anomaly"] == 1:
            b["anomaly_count"] += 1
        else:
            b["normal_count"] += 1
        b["latencies"].append(l["latency_ms"])

    res = []
    for k in sorted(buckets.keys()):
        b = buckets[k]
        avg_lat = round(float(np.mean(b["latencies"])), 2) if b["latencies"] else 0.0
        res.append({
            "timestamp": b["timestamp"],
            "total_count": b["total_count"],
            "normal_count": b["normal_count"],
            "anomaly_count": b["anomaly_count"],
            "avg_latency_ms": avg_lat
        })

    return res

def get_clusters() -> List[Dict[str, Any]]:
    client = get_clickhouse_client()
    if client:
        try:
            query = f"""
            SELECT
                cluster_tag,
                count() as total_count,
                max(timestamp) as latest_timestamp,
                any(level) as severity,
                any(message) as sample_message,
                groupUniqArray(service) as services,
                countIf(is_anomaly = 1) / greatest(count(), 1) as anomaly_rate
            FROM {settings.CLICKHOUSE_DB}.system_logs
            WHERE cluster_tag NOT IN ('Normal Operation', 'Info')
            GROUP BY cluster_tag
            ORDER BY total_count DESC
            LIMIT 10
            """
            res = client.query(query)
            clusters = []
            for row in res.result_rows:
                ts = row[2]
                ts_str = ts.isoformat() if isinstance(ts, datetime) else str(ts)
                clusters.append({
                    "cluster_tag": row[0],
                    "count": int(row[1]),
                    "latest_timestamp": ts_str,
                    "severity": row[3],
                    "sample_message": row[4],
                    "services": list(row[5]),
                    "anomaly_rate": round(float(row[6]), 2)
                })
            if clusters:
                return clusters
        except Exception as e:
            logger.error("ClickHouse clusters query error, falling back to memory: %s", e)

    # Memory fallback clusters
    error_logs = [l for l in _memory_logs if l["cluster_tag"] not in ("Normal Operation", "Info")]
    cluster_groups: Dict[str, List[Dict[str, Any]]] = {}

    for l in error_logs:
        tag = l["cluster_tag"]
        if tag not in cluster_groups:
            cluster_groups[tag] = []
        cluster_groups[tag].append(l)

    clusters = []
    for tag, group in cluster_groups.items():
        sorted_group = sorted(group, key=lambda x: x["timestamp"], reverse=True)
        latest_ts = sorted_group[0]["timestamp"]
        ts_str = latest_ts.isoformat() if isinstance(latest_ts, datetime) else str(latest_ts)
        services = list(set(l["service"] for l in group))
        sample_msg = sorted_group[0]["message"]
        severity = sorted_group[0]["level"]
        anomalies = sum(1 for l in group if l["is_anomaly"] == 1)
        anomaly_rate = round(anomalies / len(group), 2) if group else 0.0

        clusters.append({
            "cluster_tag": tag,
            "count": len(group),
            "latest_timestamp": ts_str,
            "severity": severity,
            "sample_message": sample_msg,
            "services": services,
            "anomaly_rate": anomaly_rate
        })

    clusters.sort(key=lambda x: x["count"], reverse=True)
    return clusters[:10]
