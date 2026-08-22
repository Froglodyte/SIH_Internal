import time
import requests
import random

BACKEND_URL = "http://localhost:8080/api/v1/logs"

def send_logs(logs):
    try:
        res = requests.post(BACKEND_URL, json=logs)
        print(f"Sent {len(logs)} logs. Status: {res.status_code}")
    except Exception as e:
        print(f"Failed to send logs: {e}")

# 1. Normal Logs
print("Sending normal logs...")
normal_logs = [
    {
        "host": f"web-node-0{random.randint(1,5)}",
        "service": "auth-service",
        "level": "INFO",
        "message": f"User successfully authenticated via OAuth",
        "metadata": {"user_id": random.randint(100, 900)},
        "ip": f"192.168.1.{random.randint(1,255)}"
    }
    for _ in range(5)
]
send_logs(normal_logs)
time.sleep(1)

# 2. AI Anomaly: Unusual Message Length & Severity (should trigger Isolation Forest)
print("\nSending simulated anomaly...")
anomaly_logs = [
    {
        "host": "db-node-01",
        "service": "postgres-cluster",
        "level": "CRITICAL",
        "message": "FATAL EXCEPTION: " + ("MEMORY_CORRUPTION_DETECTED_AT_0x" + "FF00"*20),
        "metadata": {"stack_trace": "A"*500, "code": "OOM"},
        "ip": "10.0.0.5"
    }
]
send_logs(anomaly_logs)

print("\nDone! Check your React Dashboard Live Tail.")
