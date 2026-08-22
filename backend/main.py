import asyncio
import logging
from typing import List, Union, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from db import init_db, insert_logs, get_logs, get_metrics, get_timeseries, get_clusters
from ai_engine import ai_engine
from simulator import run_simulator_loop, trigger_scenario, SCENARIOS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sentinel_log_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SentinelLog FastAPI Backend...")
    init_db()

    simulator_task = None
    if settings.SIMULATOR_ENABLED:
        simulator_task = asyncio.create_task(run_simulator_loop())
        logger.info("Log simulator background task spawned.")

    yield

    if simulator_task:
        simulator_task.cancel()
        try:
            await simulator_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="SentinelLog API",
    description="Centralized IT Log Analytics & AI Anomaly Triage",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LogItemInput(BaseModel):
    timestamp: Optional[str] = None
    service: str = Field(default="unknown-service")
    level: str = Field(default="INFO")
    message: str
    host_ip: str = Field(default="127.0.0.1")
    status_code: int = Field(default=200)
    latency_ms: float = Field(default=0.0)

@app.get("/")
def read_root():
    return {
        "service": "SentinelLog API",
        "status": "online",
        "clickhouse_host": settings.CLICKHOUSE_HOST
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/logs/ingest")
def ingest_logs_endpoint(payload: Union[List[LogItemInput], LogItemInput] = Body(...)):
    if isinstance(payload, LogItemInput):
        items = [payload]
    else:
        items = payload

    if not items:
        return {"status": "success", "ingested_count": 0, "data": []}

    scored_logs = []
    for item in items:
        log_dict = item.model_dump()
        anomaly_score, is_anomaly = ai_engine.predict_anomaly(log_dict)
        cluster_tag = ai_engine.predict_cluster(log_dict, anomaly_score)

        log_dict["anomaly_score"] = anomaly_score
        log_dict["is_anomaly"] = is_anomaly
        log_dict["cluster_tag"] = cluster_tag

        scored_logs.append(log_dict)

    insert_logs(scored_logs)

    return {
        "status": "success",
        "ingested_count": len(scored_logs),
        "data": scored_logs
    }

@app.get("/api/logs")
def query_logs_endpoint(
    service: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    is_anomaly: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    return get_logs(service=service, level=level, is_anomaly=is_anomaly, limit=limit, offset=offset)

@app.get("/api/metrics")
def get_metrics_endpoint():
    return get_metrics()

@app.get("/api/metrics/timeseries")
def get_timeseries_endpoint():
    return get_timeseries()

@app.get("/api/clusters")
def get_clusters_endpoint():
    return get_clusters()

@app.post("/api/simulator/trigger")
def trigger_simulator_scenario(scenario: str = Query(...)):
    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Invalid scenario: {scenario}")
    success = trigger_scenario(scenario)
    if success:
        return {"status": "success", "message": f"Triggered scenario: {scenario}", "scenario": scenario}
    raise HTTPException(status_code=500, detail="Failed to trigger scenario")
