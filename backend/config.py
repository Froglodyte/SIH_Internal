import os

class Settings:
    CLICKHOUSE_HOST: str = os.getenv("CLICKHOUSE_HOST", "clickhouse")
    CLICKHOUSE_PORT: int = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    CLICKHOUSE_USER: str = os.getenv("CLICKHOUSE_USER", "default")
    CLICKHOUSE_PASSWORD: str = os.getenv("CLICKHOUSE_PASSWORD", "log_analyzer_pass")
    CLICKHOUSE_DB: str = os.getenv("CLICKHOUSE_DB", "logs_db")
    ANOMALY_THRESHOLD: float = float(os.getenv("ANOMALY_THRESHOLD", "0.75"))
    SIMULATOR_ENABLED: bool = os.getenv("SIMULATOR_ENABLED", "true").lower() in ("true", "1", "yes")
    SIMULATOR_INTERVAL_SEC: float = float(os.getenv("SIMULATOR_INTERVAL_SEC", "1.5"))

settings = Settings()
