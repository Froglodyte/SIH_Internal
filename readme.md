# SentinelLog: Centralized IT Log Analyzer & AI Anomaly Triage

SentinelLog is a high-throughput, centralized log analytics platform designed for real-time incident detection and root-cause analysis. It pairs a ClickHouse columnar storage engine with an inline Python AI inference pipeline to detect statistical anomalies, group recurring errors semantically, and render live telemetry via a dedicated React dashboard.

---

## Architecture Overview

```
[ Edge Log Shippers / Fleet ] (Fluent Bit / OTel Standard)
             |
             | (HTTP POST Batches)
             v
+-------------------------------------------------------------+
|               FastAPI Ingestion & AI Engine                 |
|  * Log Normalization & Parsing                              |
|  * Anomaly Scoring (Isolation Forest on rate/latency)       |
|  * Semantic Clustering (all-MiniLM-L6-v2 Embeddings)        |
+------------------------------+------------------------------+
                               |
                               | (Batch Insert)
                               v
+-------------------------------------------------------------+
|                     ClickHouse Storage                      |
|  * Columnar MergeTree Engine                                |
|  * Sub-10ms Time-Bucket & Filter Aggregations               |
+-------------------------------------------------------------+
                               ^
                               | (REST Polling / SSE)
+------------------------------+------------------------------+
|                    React + Vite Dashboard                   |
|  * Live Ingestion & Anomaly KPI Cards                       |
|  * Time-Series Traffic vs. Anomaly Charts                   |
|  * Live Tailing Log Table with Anomaly Highlights           |
|  * Semantic Error Cluster Root-Cause Explorer               |
+-------------------------------------------------------------+

```

---

## Key Features

* **High-Throughput Columnar Storage:** Powered by ClickHouse for sub-millisecond aggregations across millions of log records.
* **Inline AI Anomaly Scoring:** Uses an Isolation Forest model to evaluate log latency, status code distributions, and burst rates in real time, assigning a confidence score (0.0 to 1.0) to every ingested log.
* **Semantic Error Clustering:** Vectorizes error messages using `all-MiniLM-L6-v2` embeddings, automatically grouping disparate syntax into unified root-cause incident clusters (e.g., Database Connection Timeouts, Authentication Token Failures).
* **Interactive Incident Triage:** Single-pane React interface with live-tailing log feeds, interactive attack injection buttons for demoing, and drill-downs by service and severity.
* **Production-Ready Ingest Interface:** Exposes a standard HTTP endpoint (`POST /api/logs/ingest`) fully compatible with Fluent Bit, OpenTelemetry Collector, Vector, and Logstash JSON payloads.

---

## Tech Stack

* **Storage Engine:** ClickHouse 24+
* **Backend API & Ingestion:** Python 3.11, FastAPI, Uvicorn, ClickHouse Connect
* **AI & Machine Learning:** Scikit-Learn (Isolation Forest), Sentence-Transformers / ONNX (`all-MiniLM-L6-v2`)
* **Frontend Dashboard:** React 18, Vite, TypeScript, Tailwind CSS, Chart.js / Recharts, Lucide Icons
* **Deployment:** Docker, Docker Compose, Nginx

---

## Project Structure

```
log-analyzer/
|-- docker-compose.yml          # Container orchestration (ClickHouse, Backend, Frontend)
|-- init-clickhouse.sql         # Table schemas and primary index definitions
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- main.py                 # FastAPI routing and lifecycle management
|   |-- config.py               # Environment variables and thresholds
|   |-- db.py                   # ClickHouse connection pool and batch inserter
|   |-- ai_engine.py            # Anomaly detection and semantic clustering models
|   `-- simulator.py            # Multi-service log traffic and anomaly generator
`-- frontend/
    |-- Dockerfile
    |-- nginx.conf
    |-- package.json
    |-- vite.config.ts
    |-- tailwind.config.js
    `-- src/
        |-- App.tsx             # Main dashboard layout
        |-- api.ts              # Backend API client
        |-- types.ts            # TypeScript interfaces
        `-- components/
            |-- Header.tsx
            |-- MetricCards.tsx # Real-time telemetry summary KPIs
            |-- AnomalyChart.tsx# Ingestion volume and anomaly rate graphs
            |-- LogTable.tsx    # Live tailing table with severity filters
            `-- ClusterView.tsx # Semantic error grouping panels

```

---

## Getting Started

### Prerequisites

* Docker (v24.0+)
* Docker Compose (v2.20+)

### Quick Start (Single Command)

1. Clone the repository:
```bash
git clone https://github.com/your-org/log-analyzer.git
cd log-analyzer

```


2. Spin up the entire stack using Docker Compose:
```bash
docker compose up --build

```


3. Access the interfaces:
* **Frontend Dashboard:** `http://localhost:3000`
* **FastAPI Swagger Docs:** `http://localhost:8000/docs`
* **ClickHouse HTTP Interface:** `http://localhost:8123`



---

## API Reference

### Ingest Logs

* **Endpoint:** `POST /api/logs/ingest`
* **Description:** Ingests, scores, and stores a batch of raw structured logs.
* **Payload Example:**
```json
[
  {
    "timestamp": "2026-08-22T03:00:00.000Z",
    "service": "auth-service",
    "level": "ERROR",
    "message": "Failed login attempt for user admin: invalid token signature",
    "host_ip": "10.0.4.12",
    "status_code": 401,
    "latency_ms": 12.4
  }
]

```



### Query Logs

* **Endpoint:** `GET /api/logs`
* **Query Parameters:** `service`, `level`, `is_anomaly`, `limit` (default: 100), `offset` (default: 0)

### Real-Time Metrics & Timeseries

* **Endpoint:** `GET /api/metrics`
* Returns: Total log count, error rates, average latency, p95 latency, and active anomaly counts for the last 60 minutes.


* **Endpoint:** `GET /api/metrics/timeseries`
* Returns: 1-minute bucketed aggregations of normal vs. anomalous traffic.



### Semantic Clusters

* **Endpoint:** `GET /api/clusters`
* Returns: Top recurring error clusters categorized by semantic similarity.



### Trigger Demo Anomaly

* **Endpoint:** `POST /api/simulator/trigger`
* **Query Parameter:** `scenario` (`ddos_attack`, `db_pool_exhaustion`, `auth_bruteforce`)
* **Description:** Simulates an immediate operational failure for demo verification.

---

## Hackathon Demo Script

1. **Baseline Traffic:** On boot, the embedded simulator generates normal operational traffic across `auth-service`, `payment-gateway`, `frontend-proxy`, and `postgres-db`.
2. **Inject Incident:** From the top-right header in the UI, click **Simulate DB Exhaustion** or trigger via API:
```bash
curl -X POST "http://localhost:8000/api/simulator/trigger?scenario=db_pool_exhaustion"

```


3. **Observe AI Detection:**
* The **Anomaly Rate** metric card spikes.
* The **Time-Series Chart** highlights an anomalous volume surge in red.
* The **Live Log Table** flags incoming 500-level logs with elevated anomaly scores (`> 0.75`).
* The **Semantic Clusters** panel automatically groups varied error traces under the `Database Connection Timeout` cluster card.