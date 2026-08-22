import math
import logging
from typing import Tuple, Dict, Any

from config import settings

logger = logging.getLogger(__name__)

# Predefined Error Taxonomies
CLUSTER_PATTERNS = [
    ("Database Connection Timeout", ["db", "database", "connection pool", "postgres", "sql", "hikari", "timeout waiting for connection"]),
    ("Authentication & Token Failure", ["auth", "login", "jwt", "token", "unauthorized", "credential", "password mismatch", "401"]),
    ("DDoS & Rate Limit Exceeded", ["rate limit", "429", "flood", "ddos", "too many requests", "mitigation"]),
    ("Out of Memory Exception", ["memory", "heap", "oom", "outofmemory", "kernel panic", "killed"]),
    ("Network & Socket Error", ["econnreset", "connection refused", "socket", "network", "unreachable"]),
    ("Service Degradation & Timeout", ["504", "gateway timeout", "degradation", "upstream", "service unavailable", "503"]),
    ("Resource Access & Permission Error", ["permission denied", "403", "forbidden", "enoent", "not found", "404"])
]

class AIEngine:
    def __init__(self):
        logger.info("Initializing Lightweight Statistical Anomaly Engine (Z-Score & Keyword Taxonomy)...")
        # Rolling baseline metrics for latency Z-score
        self.latency_mean = 45.0
        self.latency_std = 35.0
        self.alpha = 0.05 # Exponential smoothing factor

    def _update_baseline(self, latency: float):
        """Update exponential moving average for latency baseline."""
        if latency <= 0:
            return
        diff = abs(latency - self.latency_mean)
        self.latency_mean = (1 - self.alpha) * self.latency_mean + self.alpha * latency
        self.latency_std = (1 - self.alpha) * self.latency_std + self.alpha * diff

    def predict_anomaly(self, log: Dict[str, Any]) -> Tuple[float, int]:
        """
        Fast Z-score statistical anomaly scoring + domain heuristics.
        Returns (anomaly_score, is_anomaly) where score is in [0.0, 1.0].
        """
        latency = float(log.get("latency_ms", 0.0))
        status_code = int(log.get("status_code", 200))
        level = str(log.get("level", "INFO")).upper()

        self._update_baseline(latency)

        # 1. Z-Score calculation on latency
        z_score = (latency - self.latency_mean) / max(self.latency_std, 1.0)
        # Sigmoid transform Z-score centered at z=2.0
        base_score = 1.0 / (1.0 + math.exp(-0.8 * (z_score - 2.0)))

        # 2. Status code and severity heuristics adjustments
        severity_boost = 0.0
        if status_code >= 500:
            severity_boost = max(severity_boost, 0.45)
        elif status_code == 429:
            severity_boost = max(severity_boost, 0.40)
        elif status_code in (401, 403) and level in ("ERROR", "WARN"):
            severity_boost = max(severity_boost, 0.35)

        if level in ("FATAL", "CRITICAL"):
            severity_boost = max(severity_boost, 0.50)
        elif level == "ERROR":
            severity_boost = max(severity_boost, 0.30)

        anomaly_score = min(max(base_score + severity_boost, 0.0), 1.0)
        anomaly_score = round(anomaly_score, 3)

        is_anomaly = 1 if anomaly_score >= settings.ANOMALY_THRESHOLD else 0
        return anomaly_score, is_anomaly

    def predict_cluster(self, log: Dict[str, Any], anomaly_score: float = 0.0) -> str:
        """Fast microsecond pattern taxonomy matching."""
        level = str(log.get("level", "INFO")).upper()
        status_code = int(log.get("status_code", 200))
        message = str(log.get("message", "")).lower()

        if level in ("INFO", "DEBUG") and status_code < 400 and anomaly_score < 0.6:
            return "Normal Operation"

        for tag, keywords in CLUSTER_PATTERNS:
            if any(kw in message for kw in keywords):
                return tag

        return "Uncategorized System Incident"

# Singleton instance
ai_engine = AIEngine()
