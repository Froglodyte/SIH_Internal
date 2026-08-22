import time
import requests
from concurrent.futures import ThreadPoolExecutor
import psutil
import json

URL = "http://127.0.0.1:8080/api/v1/logs"
NUM_REQUESTS = 2000
CONCURRENCY = 50

payload = {
    "host": "benchmark-node",
    "service": "load-test",
    "level": "INFO",
    "message": "Benchmark test log",
    "metadata": {"test": "benchmark"},
    "ip": "127.0.0.1"
}

latencies = []

# FIX: Use a Session to enable HTTP Keep-Alive (Connection Pooling)
session = requests.Session()

def send_req(_):
    start = time.time()
    try:
        res = session.post(URL, json=payload, timeout=2)
        if res.status_code == 202:
            latencies.append(time.time() - start)
    except Exception:
        pass

if __name__ == "__main__":
    print(f"Starting benchmark: {NUM_REQUESTS} requests, {CONCURRENCY} concurrency...")
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        executor.map(send_req, range(NUM_REQUESTS))

    total_time = time.time() - start_time
    
    if len(latencies) == 0:
        print("ERROR: All requests failed. Is the backend running?")
        exit(1)
        
    rps = len(latencies) / total_time
    avg_latency = (sum(latencies) / len(latencies)) * 1000
    max_latency = max(latencies) * 1000
    min_latency = min(latencies) * 1000

    # Get RAM of backend (look for uvicorn process)
    ram_mb = 0
    uvicorn_found = False
    for p in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = ' '.join(p.info['cmdline'] or [])
            if 'python' in p.info['name'].lower() and 'uvicorn' in cmd:
                ram_mb += p.memory_info().rss / (1024 * 1024)
                uvicorn_found = True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    print(f"\n--- Benchmark Results ---")
    print(f"Total Requests  : {len(latencies)} successful / {NUM_REQUESTS} attempted")
    print(f"Concurrency     : {CONCURRENCY} simultaneous threads")
    print(f"Total Time      : {total_time:.2f} seconds")
    print(f"Throughput      : {rps:.2f} Requests / second")
    print(f"Avg Latency     : {avg_latency:.2f} ms")
    print(f"Min Latency     : {min_latency:.2f} ms")
    print(f"Max Latency     : {max_latency:.2f} ms")
    
    if uvicorn_found:
        print(f"Backend RAM     : {ram_mb:.2f} MB")
    else:
        print("Backend RAM     : Could not determine (Uvicorn process not found)")
