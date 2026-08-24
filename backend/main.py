import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from collections import deque
from typing import List, Union, Dict, Any, Optional
import joblib

from fastapi import FastAPI, BackgroundTasks, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import dateutil.parser
import clickhouse_connect
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("log_analyzer_backend")

# Configuration from Environment Variables
DB_HOST = os.getenv("DB_HOST", "database")
DB_PORT = int(os.getenv("DB_PORT", "8123"))
DB_USER = os.getenv("DB_USER", "analyzer")
DB_PASSWORD = os.getenv("DB_PASSWORD", "analyzer_secret")
DB_NAME = os.getenv("DB_NAME", "log_analytics")
PORT = int(os.getenv("PORT", "8080"))

app = FastAPI(title="Centralized Log Analyzer Backend", version="1.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global ClickHouse Client & In-Memory Storage
ch_client = None
log_queue: asyncio.Queue = asyncio.Queue()
ring_buffer: deque = deque(maxlen=100)
sse_subscribers: List[asyncio.Queue] = []
flush_worker_task = None
ai_model = None

# --- AI Feature Extraction Config ---
SEVERITY_WEIGHTS = {
    "TRACE": 0, "DEBUG": 1, "INFO": 2, "NOTICE": 3, "WARN": 4, "WARNING": 4,
    "ERROR": 6, "ERR": 6, "CRITICAL": 8, "CRIT": 8, "FATAL": 10, "ALERT": 10
}

SUSPICIOUS_KEYWORDS = [
    "error", "failed", "failure", "denied", "unauthorized", "attack",
    "exploit", "malicious", "overflow", "injection", "exception",
    "critical", "fatal", "corrupt", "timeout"
]

def get_severity_weight(log_str: str) -> int:
    log_upper = log_str.upper()
    for level, weight in SEVERITY_WEIGHTS.items():
        if re.search(rf"\b{level}\b", log_upper):
            return weight
    return 2

def estimate_payload_size(log_str: str) -> int:
    if ":" in log_str:
        return len(log_str.split(":", 1)[1])
    return 0

def extract_log_features(log_str: str) -> list:
    log_str = str(log_str)
    message_length = len(log_str)
    severity_weight = get_severity_weight(log_str)
    payload_size = estimate_payload_size(log_str)
    digit_count = sum(c.isdigit() for c in log_str)
    special_char_count = sum(not c.isalnum() and not c.isspace() for c in log_str)
    token_count = len(log_str.split())
    
    ip_pattern = r"\b(?:\d{1,3}\.){3}\d{1,3}\b"
    ip_count = len(re.findall(ip_pattern, log_str))
    
    hex_pattern = r"\b(?:0x)?[0-9a-fA-F]{8,}\b"
    hex_count = len(re.findall(hex_pattern, log_str))
    
    lower_log = log_str.lower()
    error_keyword_count = sum(keyword in lower_log for keyword in SUSPICIOUS_KEYWORDS)
    
    return [
        message_length, severity_weight, payload_size, digit_count,
        special_char_count, token_count, ip_count, hex_count, error_keyword_count
    ]
# ------------------------------------

class LogItem(BaseModel):
    timestamp: Optional[str] = None
    host: str = Field(default="unknown-host")
    service: str = Field(default="unknown-service")
    level: str = Field(default="INFO")
    message: str = Field(default="")
    metadata: Optional[Union[Dict[str, Any], str]] = Field(default="{}")
    ip: str = Field(default="127.0.0.1")


def get_clickhouse_client():
    """Initializes and returns ClickHouse client with retries and fallback."""
    global ch_client
    if ch_client is not None:
        try:
            ch_client.ping()
            return ch_client
        except Exception:
            ch_client = None

    # Try connecting with configured DB_USER
    users_to_try = [
        (DB_USER, DB_PASSWORD),
        ("default", ""),
        ("default", "analyzer_secret"),
    ]

    for user, pwd in users_to_try:
        try:
            client = clickhouse_connect.get_client(
                host=DB_HOST,
                port=DB_PORT,
                username=user,
                password=pwd,
                database=DB_NAME,
                connect_timeout=5,
                send_receive_timeout=10,
            )
            logger.info(f"Connected to ClickHouse at {DB_HOST}:{DB_PORT} as user '{user}'")
            ch_client = client
            return ch_client
        except Exception as e:
            logger.warning(f"ClickHouse connection attempt failed for user '{user}' database '{DB_NAME}': {e}")
            try:
                # Try connecting without specifying database to create it
                client = clickhouse_connect.get_client(
                    host=DB_HOST,
                    port=DB_PORT,
                    username=user,
                    password=pwd,
                    connect_timeout=5,
                )
                client.command(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
                client.command(
                    f"""
                    CREATE TABLE IF NOT EXISTS {DB_NAME}.logs (
                        timestamp DateTime64(3, 'UTC') DEFAULT now64(3),
                        host LowCardinality(String),
                        service LowCardinality(String),
                        level LowCardinality(String),
                        message String,
                        metadata String,
                        ip String
                    ) ENGINE = MergeTree()
                    ORDER BY (level, service, timestamp)
                    SETTINGS index_granularity = 8192
                """
                )
                logger.info(f"Initialized database {DB_NAME} and table logs successfully!")
                ch_client = client
                return ch_client
            except Exception as inner_e:
                logger.debug(f"Failed init attempt: {inner_e}")

    logger.error("Could not establish connection to ClickHouse after trying all fallbacks.")
    return None


def parse_datetime(ts_val: Any) -> datetime:
    """Parses timestamp into UTC datetime object."""
    if not ts_val:
        return datetime.now(timezone.utc)
    if isinstance(ts_val, datetime):
        return ts_val if ts_val.tzinfo else ts_val.replace(tzinfo=timezone.utc)
    try:
        dt = dateutil.parser.parse(str(ts_val))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def normalize_log(log_data: dict) -> dict:
    """Normalizes log fields for consistent ClickHouse insertion and SSE emission."""
    ts_dt = parse_datetime(log_data.get("timestamp"))
    ts_iso = ts_dt.isoformat()
    
    level = str(log_data.get("level", "INFO")).upper()
    host = str(log_data.get("host", "unknown-host"))
    service = str(log_data.get("service", "unknown-service"))
    message = str(log_data.get("message", ""))
    ip = str(log_data.get("ip", "127.0.0.1"))

    raw_meta = log_data.get("metadata", "{}")
    if isinstance(raw_meta, (dict, list)):
        meta_str = json.dumps(raw_meta)
    else:
        meta_str = str(raw_meta) if raw_meta else "{}"

    return {
        "timestamp": ts_iso,
        "dt": ts_dt,
        "host": host,
        "service": service,
        "level": level,
        "message": message,
        "metadata": meta_str,
        "ip": ip,
    }


async def background_flush_worker():
    """Background task flushing log queue to ClickHouse every 250ms or when batch >= 500."""
    logger.info("Micro-batch flush worker started.")
    while True:
        try:
            batch = []
            # Wait until at least 1 item is available or timeout 0.25s
            try:
                item = await asyncio.wait_for(log_queue.get(), timeout=0.25)
                batch.append(item)
                log_queue.task_done()
            except asyncio.TimeoutError:
                pass

            # Gather up to 500 total items if queue has more
            while len(batch) < 500 and not log_queue.empty():
                try:
                    item = log_queue.get_nowait()
                    batch.append(item)
                    log_queue.task_done()
                except asyncio.QueueEmpty:
                    break

            if batch:
                rows = [
                    [
                        b["dt"],
                        b["host"],
                        b["service"],
                        b["level"],
                        b["message"],
                        b["metadata"],
                        b["ip"],
                    ]
                    for b in batch
                ]

                client = get_clickhouse_client()
                if client:
                    try:
                        client.insert(
                            f"{DB_NAME}.logs",
                            rows,
                            column_names=[
                                "timestamp",
                                "host",
                                "service",
                                "level",
                                "message",
                                "metadata",
                                "ip",
                            ],
                        )
                        logger.debug(f"Flushed micro-batch of {len(rows)} logs to ClickHouse.")
                    except Exception as e:
                        logger.error(f"Error inserting micro-batch to ClickHouse: {e}")
                else:
                    logger.warning(f"ClickHouse client unavailable. Dropped batch of {len(rows)} logs.")

        except asyncio.CancelledError:
            logger.info("Flush worker task cancelled.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in flush worker: {e}")
            await asyncio.sleep(0.5)


@app.on_event("startup")
async def startup_event():
    global flush_worker_task, ai_model
    # Attempt initial ClickHouse connection
    get_clickhouse_client()
    # Attempt to load AI Model inline
    try:
        model_path = os.path.join(os.path.dirname(__file__), "isolation_forest_model.joblib")
        ai_model = joblib.load(model_path)
        logger.info(f"Loaded inline AI Model from {model_path} successfully!")
    except Exception as e:
        logger.warning(f"Could not load inline AI model (expected at {model_path}): {e}")
        
    # Start micro-batch flush worker
    flush_worker_task = asyncio.create_task(background_flush_worker())


@app.on_event("shutdown")
async def shutdown_event():
    global flush_worker_task
    if flush_worker_task:
        flush_worker_task.cancel()


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    client = get_clickhouse_client()
    db_status = "healthy" if client is not None else "disconnected"
    return {
        "status": "ok",
        "database": db_status,
        "buffered_logs_count": log_queue.qsize(),
        "ring_buffer_size": len(ring_buffer),
        "active_sse_clients": len(sse_subscribers),
    }


@app.post("/api/v1/logs", status_code=202)
async def ingest_logs(request: Request):
    """Micro-batch ingest endpoint supporting single object or list of objects."""
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    if isinstance(body, dict):
        raw_items = [body]
    elif isinstance(body, list):
        raw_items = body
    else:
        raise HTTPException(status_code=400, detail="Payload must be a JSON object or array of objects")

    normalized_logs = []
    features_batch = []
    
    for item in raw_items:
        norm = normalize_log(item)
        normalized_logs.append(norm)
        if ai_model:
            # Reconstruct a raw log string that looks like HDFS/syslog format for the feature extractor
            raw_log_string = f"{norm.get('timestamp', '')} {norm.get('level', '')} {norm.get('service', '')}: {norm.get('message', '')} {norm.get('metadata', '')} {norm.get('ip', '')}"
            features_batch.append(extract_log_features(raw_log_string))

    # Run AI evaluation natively if model is loaded
    if ai_model and features_batch:
        try:
            model_to_use = ai_model.get("model", ai_model) if isinstance(ai_model, dict) else ai_model
            predictions = await asyncio.to_thread(model_to_use.predict, features_batch)
            for i, pred in enumerate(predictions):
                if pred == -1:
                    normalized_logs[i]["is_ai_anomaly"] = True
                    logger.info(f"Inline AI detected anomaly: {normalized_logs[i]['message']}")
        except Exception as e:
            logger.error(f"Error during AI batch prediction: {e}")

    for norm in normalized_logs:
        # Push to queue for ClickHouse batching
        await log_queue.put(norm)
        # Store in ring buffer (last 100)
        ring_buffer.append(norm)

    # Broadcast to SSE subscribers
    dead_subscribers = []
    for sub_queue in list(sse_subscribers):
        for norm in normalized_logs:
            try:
                sub_queue.put_nowait(norm)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead_subscribers.append(sub_queue)

    for dead in set(dead_subscribers):
        if dead in sse_subscribers:
            sse_subscribers.remove(dead)

    return {
        "status": "accepted",
        "ingested_count": len(normalized_logs),
        "queue_size": log_queue.qsize(),
    }


@app.post("/api/v1/anomalies", status_code=202)
async def report_ai_anomaly(request: Request):
    """Receives detected anomalies from the out-of-band AI Watcher."""
    anomaly_data = await request.json()
    anomaly_data["is_ai_anomaly"] = True
    
    dead_subscribers = []
    for sub_queue in list(sse_subscribers):
        try:
            sub_queue.put_nowait(anomaly_data)
        except asyncio.QueueFull:
            pass
        except Exception:
            dead_subscribers.append(sub_queue)
            
    for dead in set(dead_subscribers):
        if dead in sse_subscribers:
            sse_subscribers.remove(dead)
            
    return {"status": "anomaly_broadcasted"}


@app.get("/api/v1/logs/live-tail")
async def live_tail_sse(request: Request):
    """Server-Sent Events endpoint streaming real-time logs to clients."""
    client_queue: asyncio.Queue = asyncio.Queue(maxsize=200)
    sse_subscribers.append(client_queue)

    async def event_generator():
        try:
            # First send recent ring buffer logs
            for log_entry in list(ring_buffer):
                data = json.dumps(
                    {
                        "timestamp": log_entry["timestamp"],
                        "host": log_entry["host"],
                        "service": log_entry["service"],
                        "level": log_entry["level"],
                        "message": log_entry["message"],
                        "metadata": log_entry["metadata"],
                        "ip": log_entry["ip"],
                    }
                )
                yield f"data: {data}\n\n"

            # Stream continuous live logs
            while True:
                if await request.is_disconnected():
                    break
                try:
                    log_entry = await asyncio.wait_for(client_queue.get(), timeout=10.0)
                    data = json.dumps(
                        {
                            "timestamp": log_entry.get("timestamp"),
                            "host": log_entry.get("host"),
                            "service": log_entry.get("service"),
                            "level": log_entry.get("level"),
                            "message": log_entry.get("message"),
                            "metadata": log_entry.get("metadata"),
                            "ip": log_entry.get("ip"),
                            "is_ai_anomaly": log_entry.get("is_ai_anomaly", False),
                        }
                    )
                    if log_entry.get("is_ai_anomaly"):
                        yield f"event: ai_anomaly\ndata: {data}\n\n"
                    else:
                        yield f"data: {data}\n\n"
                    client_queue.task_done()
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if client_queue in sse_subscribers:
                sse_subscribers.remove(client_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/v1/analytics/overview")
async def get_analytics_overview(range: str = Query(default="15m")):
    """Calculates time-series analytics, level breakdown, top failing services, and active hosts."""
    client = get_clickhouse_client()

    # Parse range parameter
    minutes_map = {"15m": 15, "1h": 60, "6h": 360, "24h": 1440}
    minutes = minutes_map.get(range, 15)

    if not client:
        # Return fallback mock/empty structure if DB is connecting
        return {
            "range": range,
            "system_status": "DEGRADED",
            "total_logs": len(ring_buffer),
            "active_hosts_count": 0,
            "error_rate_percent": 0.0,
            "time_series": [],
            "level_counts": {"INFO": 0, "WARN": 0, "ERROR": 0, "CRITICAL": 0},
            "top_failing_services": [],
            "top_active_hosts": [],
            "anomalies": ["Database connection initializing..."],
        }

    try:
        # 1. Time-series query bucketed by 10 seconds
        ts_query = f"""
            SELECT 
                toStartOfInterval(timestamp, INTERVAL 10 SECOND) as time_bucket,
                count() as total,
                countIf(level IN ('ERROR', 'CRITICAL')) as errors,
                countIf(level IN ('INFO', 'WARN')) as normal
            FROM {DB_NAME}.logs
            WHERE timestamp >= now() - INTERVAL {minutes} MINUTE
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        """
        ts_res = client.query(ts_query)
        time_series = [
            {
                "timestamp": row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0]),
                "total": int(row[1]),
                "errors": int(row[2]),
                "normal": int(row[3]),
            }
            for row in ts_res.result_rows
        ]

        # 2. Count by level
        level_query = f"""
            SELECT level, count() as cnt
            FROM {DB_NAME}.logs
            WHERE timestamp >= now() - INTERVAL {minutes} MINUTE
            GROUP BY level
        """
        level_res = client.query(level_query)
        level_counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "CRITICAL": 0}
        for r in level_res.result_rows:
            level_counts[str(r[0]).upper()] = int(r[1])

        # 3. Top 5 failing services
        fail_query = f"""
            SELECT service, count() as err_cnt
            FROM {DB_NAME}.logs
            WHERE level IN ('ERROR', 'CRITICAL') AND timestamp >= now() - INTERVAL {minutes} MINUTE
            GROUP BY service
            ORDER BY err_cnt DESC
            LIMIT 5
        """
        fail_res = client.query(fail_query)
        top_failing_services = [
            {"service": str(r[0]), "error_count": int(r[1])} for r in fail_res.result_rows
        ]

        # 4. Top 5 active hosts
        hosts_query = f"""
            SELECT host, count() as total_cnt
            FROM {DB_NAME}.logs
            WHERE timestamp >= now() - INTERVAL {minutes} MINUTE
            GROUP BY host
            ORDER BY total_cnt DESC
            LIMIT 5
        """
        hosts_res = client.query(hosts_query)
        top_active_hosts = [
            {"host": str(r[0]), "count": int(r[1])} for r in hosts_res.result_rows
        ]

        # Overall summary
        total_logs = sum(level_counts.values())
        error_logs = level_counts.get("ERROR", 0) + level_counts.get("CRITICAL", 0)
        error_rate = round((error_logs / total_logs * 100), 2) if total_logs > 0 else 0.0

        # System Status determination
        if error_rate > 10.0 or level_counts.get("CRITICAL", 0) > 15:
            system_status = "CRITICAL"
        elif error_rate > 3.0 or level_counts.get("CRITICAL", 0) > 2:
            system_status = "DEGRADED"
        else:
            system_status = "HEALTHY"

        # Detect Anomalies
        anomalies = []
        if error_rate > 8.0:
            anomalies.append(f"High Error Rate Detected ({error_rate}% of logs are failing)")
        if level_counts.get("CRITICAL", 0) > 5:
            anomalies.append(f"Spike in CRITICAL events: {level_counts['CRITICAL']} critical logs recorded")
        for fservice in top_failing_services:
            if fservice["error_count"] > 10:
                anomalies.append(f"Service Failure Spike: '{fservice['service']}' logged {fservice['error_count']} errors")

        return {
            "range": range,
            "system_status": system_status,
            "total_logs": total_logs,
            "active_hosts_count": len(top_active_hosts),
            "error_rate_percent": error_rate,
            "time_series": time_series,
            "level_counts": level_counts,
            "top_failing_services": top_failing_services,
            "top_active_hosts": top_active_hosts,
            "anomalies": anomalies,
        }

    except Exception as e:
        logger.error(f"Error executing ClickHouse analytics query: {e}")
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")


@app.get("/api/v1/logs")
async def explore_logs(
    limit: int = Query(default=50, ge=1, le=500),
    level: Optional[str] = Query(default=None),
    service: Optional[str] = Query(default=None),
    host: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    """Filters logs from ClickHouse storage with limit, exact match, and search queries."""
    client = get_clickhouse_client()

    if not client:
        # Fallback to ring buffer if database is unavailable
        filtered = list(ring_buffer)
        if level:
            filtered = [l for l in filtered if l["level"].upper() == level.upper()]
        if service:
            filtered = [l for l in filtered if l["service"].lower() == service.lower()]
        if host:
            filtered = [l for l in filtered if l["host"].lower() == host.lower()]
        if search:
            s = search.lower()
            filtered = [l for l in filtered if s in l["message"].lower() or s in l["metadata"].lower()]
        return {"logs": filtered[:limit], "count": len(filtered), "source": "in-memory-fallback"}

    try:
        where_conditions = []
        if level and level.upper() != "ALL":
            where_conditions.append(f"level = '{level.upper()}'")
        if service and service.strip():
            safe_serv = service.replace("'", "''")
            where_conditions.append(f"service = '{safe_serv}'")
        if host and host.strip():
            safe_host = host.replace("'", "''")
            where_conditions.append(f"host = '{safe_host}'")
        if search and search.strip():
            safe_search = search.replace("'", "''")
            where_conditions.append(
                f"(message ILIKE '%{safe_search}%' OR metadata ILIKE '%{safe_search}%')"
            )

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

        query = f"""
            SELECT timestamp, host, service, level, message, metadata, ip
            FROM {DB_NAME}.logs
            {where_clause}
            ORDER BY timestamp DESC
            LIMIT {limit}
        """

        res = client.query(query)
        result_logs = []
        for r in res.result_rows:
            ts_str = r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0])
            result_logs.append(
                {
                    "timestamp": ts_str,
                    "host": str(r[1]),
                    "service": str(r[2]),
                    "level": str(r[3]),
                    "message": str(r[4]),
                    "metadata": str(r[5]),
                    "ip": str(r[6]),
                }
            )

        return {"logs": result_logs, "count": len(result_logs), "source": "clickhouse"}

    except Exception as e:
        logger.error(f"Error querying logs from ClickHouse: {e}")
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
