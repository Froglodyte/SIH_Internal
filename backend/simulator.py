import time
import random
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from config import settings
from db import insert_logs
from ai_engine import ai_engine

logger = logging.getLogger(__name__)

# Simulator state
active_scenario: str = ""
scenario_end_time: float = 0.0

SERVICES = {
    "auth-service": "10.0.1.15",
    "payment-gateway": "10.0.2.22",
    "frontend-proxy": "10.0.3.10",
    "postgres-db": "10.0.4.50"
}

NORMAL_MESSAGES = [
    "GET /api/v1/health HTTP/1.1 200 OK - health check successful",
    "POST /api/v1/auth/verify HTTP/1.1 200 OK - token verified",
    "GET /api/v1/dashboard/telemetry HTTP/1.1 200 OK - data retrieved",
    "Database query SELECT * FROM accounts WHERE id = %s executed in 2.4ms",
    "Payment gateway transaction tx_{rand_id} status: SUCCESS",
    "Cache hit for session key sess_{rand_id}",
    "GET /static/js/app.bundle.js HTTP/1.1 304 Not Modified",
    "User session renewed successfully for user_id={rand_user}"
]

SCENARIOS = {
    "ddos_attack": {
        "services": ["frontend-proxy", "auth-service"],
        "levels": ["ERROR", "WARNING"],
        "status_codes": [429, 503],
        "latency_range": (450.0, 2800.0),
        "messages": [
            "HTTP 429 Too Many Requests: Rate limit exceeded for IP {attacker_ip} (1500 req/s)",
            "DDoS mitigation active: Dropping flood packet payload from host {attacker_ip}",
            "HTTP 503 Service Unavailable: Ingress request buffer queue overloaded",
            "Rate limit threshold (1000 req/s) breached on endpoint /api/v1/login from {attacker_ip}"
        ]
    },
    "db_pool_exhaustion": {
        "services": ["postgres-db", "payment-gateway"],
        "levels": ["ERROR", "CRITICAL"],
        "status_codes": [500, 504],
        "latency_range": (2200.0, 5800.0),
        "messages": [
            "Connection pool exhausted: timeout waiting for database connection after 5000ms",
            "FATAL: remaining connection slots are reserved for non-replication superuser connections",
            "PostgreSQL pool size 50 reached: connection pool timeout waiting for idle thread",
            "SQL execution failed: Query timed out waiting for connection slot in pool"
        ]
    },
    "auth_bruteforce": {
        "services": ["auth-service"],
        "levels": ["ERROR", "WARNING"],
        "status_codes": [401, 403],
        "latency_range": (12.0, 65.0),
        "messages": [
            "Failed login attempt for user admin: invalid token signature",
            "Authentication failure: password mismatch for account root from IP {attacker_ip}",
            "JWT signature verification failed: token expired or tampered",
            "User authorization failed: invalid session state for admin"
        ]
    }
}

def trigger_scenario(scenario_name: str) -> bool:
    global active_scenario, scenario_end_time
    if scenario_name in SCENARIOS:
        active_scenario = scenario_name
        scenario_end_time = time.time() + 25.0 # Active for 25 seconds
        logger.info("Triggered scenario: %s for 25 seconds", scenario_name)
        return True
    return False

def generate_log_entry() -> Dict[str, Any]:
    global active_scenario, scenario_end_time

    is_in_scenario = (time.time() < scenario_end_time) and (active_scenario in SCENARIOS)
    
    # 80% chance of generating scenario logs if scenario active, else normal
    if is_in_scenario and random.random() < 0.85:
        scenario_data = SCENARIOS[active_scenario]
        service = random.choice(scenario_data["services"])
        host_ip = SERVICES.get(service, "10.0.0.1")
        level = random.choice(scenario_data["levels"])
        status_code = random.choice(scenario_data["status_codes"])
        latency_ms = round(random.uniform(*scenario_data["latency_range"]), 2)
        attacker_ip = f"198.51.100.{random.randint(1, 254)}"
        msg_template = random.choice(scenario_data["messages"])
        message = msg_template.format(attacker_ip=attacker_ip)
    else:
        service = random.choice(list(SERVICES.keys()))
        host_ip = SERVICES[service]
        level = random.choices(["INFO", "WARNING", "ERROR"], weights=[0.92, 0.06, 0.02])[0]
        if level == "INFO":
            status_code = random.choice([200, 201, 304])
            latency_ms = round(random.uniform(4.0, 95.0), 2)
        elif level == "WARNING":
            status_code = random.choice([404, 301, 400])
            latency_ms = round(random.uniform(50.0, 300.0), 2)
        else:
            status_code = 500
            latency_ms = round(random.uniform(300.0, 1200.0), 2)

        rand_id = str(random.randint(10000, 99999))
        rand_user = str(random.randint(100, 999))
        msg_template = random.choice(NORMAL_MESSAGES)
        message = msg_template.format(rand_id=rand_id, rand_user=rand_user)

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": service,
        "level": level,
        "message": message,
        "host_ip": host_ip,
        "status_code": status_code,
        "latency_ms": latency_ms
    }

    # Run AI inference
    anomaly_score, is_anomaly = ai_engine.predict_anomaly(log_entry)
    cluster_tag = ai_engine.predict_cluster(log_entry, anomaly_score)

    log_entry["anomaly_score"] = anomaly_score
    log_entry["is_anomaly"] = is_anomaly
    log_entry["cluster_tag"] = cluster_tag

    return log_entry

async def run_simulator_loop():
    logger.info("Starting background Log Simulator loop...")
    while True:
        try:
            if settings.SIMULATOR_ENABLED:
                batch_size = random.randint(3, 8)
                logs_batch = [generate_log_entry() for _ in range(batch_size)]
                insert_logs(logs_batch)
        except Exception as e:
            logger.error("Error in simulator loop: %s", e)

        await asyncio.sleep(settings.SIMULATOR_INTERVAL_SEC)
