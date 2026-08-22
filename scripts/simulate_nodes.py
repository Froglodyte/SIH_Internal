#!/usr/bin/env python3
"""
Realistic Stochastic Node Traffic Simulator for Hackathon Demo.
Generates organic baseline traffic with natural variance, background noise,
and randomized realistic anomaly bursts across nodes.
"""

import sys
import time
import json
import random
import urllib.request
import urllib.error
from datetime import datetime, timezone

TARGET_URL = "http://localhost:8080/api/v1/logs"

HOSTS = ["web-node-01", "auth-node-02", "db-node-03"]

SERVICES_MAP = {
    "web-node-01": ["web-gateway", "frontend-api", "static-cdn"],
    "auth-node-02": ["auth-service", "jwt-verifier", "oauth-provider"],
    "db-node-03": ["postgres-primary", "redis-cache", "clickhouse-worker"],
}

IP_POOL = ["192.168.1.10", "192.168.1.25", "10.0.4.15", "172.16.0.42", "192.168.1.104"]

NORMAL_LOG_TEMPLATES = [
    ("INFO", "GET /api/v1/users 200 OK - {latency}ms", {"http_status": 200, "method": "GET", "path": "/api/v1/users"}),
    ("INFO", "POST /api/v1/checkout 200 Order Processed successfully", {"http_status": 200, "order_id": "ORD-9482"}),
    ("INFO", "GET /static/bundle.js 304 Not Modified", {"http_status": 304, "cache": "HIT"}),
    ("INFO", "GET /api/v1/telemetry 200 Status Healthy", {"http_status": 200, "latency_ms": 14}),
    ("WARN", "POST /api/v1/auth/login 401 Invalid JWT signature", {"http_status": 401, "reason": "expired_token"}),
    ("WARN", "HTTP 429: Bucket limit exceeded for IP {ip}", {"http_status": 429, "rate_limit": "exceeded"}),
]

BACKGROUND_ERROR_TEMPLATES = [
    ("ERROR", "502 Bad Gateway: Upstream server unresponsive on {host}", {"http_status": 502, "subsystem": "proxy"}),
    ("ERROR", "504 Gateway Timeout connecting to service {service}", {"http_status": 504, "timeout_ms": 5000}),
    ("WARN", "High Memory Consumption Warning: Node memory above 82%", {"memory_used_pct": 84.5}),
]

BURST_ERROR_TEMPLATES = [
    ("ERROR", "500 Internal Server Error: Connection pool exhausted on {host}", {"http_status": 500, "subsystem": "db_pool"}),
    ("CRITICAL", "FATAL: Postgres pool exhausted, timeout after 5000ms connecting to db-primary.internal", {"severity": "FATAL", "pool_active": 100}),
    ("CRITICAL", "Out of Memory: Killed process 4120 (node) score 850 or sacrifice child", {"exit_code": 137, "signal": "SIGKILL"}),
    ("ERROR", "Unhandled Promise Rejection: Connection failure on port 5432", {"stack": "Error: Connect ECONNREFUSED 127.0.0.1:5432"}),
    ("CRITICAL", "Storage I/O Stall: Disk write latency exceeded 4500ms on volume /var/lib/clickhouse", {"disk_latency_ms": 4620}),
]


def generate_single_log(mode="normal", target_host=None):
    host = target_host or random.choice(HOSTS)
    service = random.choice(SERVICES_MAP[host])
    ip = random.choice(IP_POOL)
    now_iso = datetime.now(timezone.utc).isoformat()

    if mode == "burst":
        level, msg_tmpl, meta_dict = random.choice(BURST_ERROR_TEMPLATES)
    elif mode == "bg_error":
        level, msg_tmpl, meta_dict = random.choice(BACKGROUND_ERROR_TEMPLATES)
    else:
        level, msg_tmpl, meta_dict = random.choice(NORMAL_LOG_TEMPLATES)

    latency = random.randint(12, 280)
    message = msg_tmpl.format(latency=latency, ip=ip, host=host, service=service)

    metadata = dict(meta_dict)
    metadata["environment"] = "production"
    metadata["datacenter"] = "us-east-1"

    return {
        "timestamp": now_iso,
        "host": host,
        "service": service,
        "level": level,
        "message": message,
        "metadata": metadata,
        "ip": ip,
    }


def send_batch(url, batch):
    data_bytes = json.dumps(batch).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status
    except Exception as e:
        print(f"[!] Failed to send log batch to {url}: {e}", file=sys.stderr)
        return None


def main():
    print(f"[*] Starting Organic Node Traffic Simulator -> Target: {TARGET_URL}")
    print(f"[*] Simulating realistic stochastic traffic across: {', '.join(HOSTS)}")
    print("[*] Press Ctrl+C to terminate.")

    counter = 0
    start_time = time.time()

    # Burst scheduling state
    next_burst_time = time.time() + random.randint(12, 25)
    burst_end_time = 0
    current_burst_target_host = "db-node-03"

    while True:
        try:
            now = time.time()
            is_in_burst = now < burst_end_time

            # Schedule new burst when cooldown expires
            if now >= next_burst_time and not is_in_burst:
                burst_duration = random.uniform(2.5, 6.0)
                burst_end_time = now + burst_duration
                next_burst_time = now + burst_duration + random.randint(18, 40)
                current_burst_target_host = random.choice(HOSTS)
                print(
                    f"[⚡ ORGANIC ANOMALY BURST STARTED] Duration: {burst_duration:.1f}s | Target: {current_burst_target_host}"
                )

            batch = []
            if is_in_burst:
                # During an active incident burst, generate a variable heavy volume of errors
                burst_count = random.randint(15, 45)
                for _ in range(burst_count):
                    batch.append(generate_single_log(mode="burst", target_host=current_burst_target_host))
                # Add background normal noise
                for _ in range(random.randint(2, 6)):
                    batch.append(generate_single_log(mode="normal"))
            else:
                # Baseline traffic with organic volume fluctuation
                normal_count = random.randint(8, 22)
                for _ in range(normal_count):
                    # 4% chance of background transient error
                    if random.random() < 0.04:
                        batch.append(generate_single_log(mode="bg_error"))
                    else:
                        batch.append(generate_single_log(mode="normal"))

            status = send_batch(TARGET_URL, batch)
            if status == 202:
                counter += len(batch)
                burst_indicator = "⚡ INCIDENT BURST" if is_in_burst else "NORMAL"
                print(f"[+] [{burst_indicator}] Sent batch of {len(batch)} logs (Total: {counter} logs)")

            time.sleep(1.0)

        except KeyboardInterrupt:
            print("\n[*] Stopping simulator.")
            break
        except Exception as e:
            print(f"[!] Error in simulation loop: {e}")
            time.sleep(2.0)


if __name__ == "__main__":
    main()
