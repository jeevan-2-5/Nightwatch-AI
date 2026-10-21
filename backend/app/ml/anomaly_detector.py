"""
Nightwatch AI - Scikit-Learn Isolation Forest Anomaly Detection Pipeline
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List

class SREAnomalyDetector:
    def __init__(self, n_estimators: int = 100, contamination: float = 0.05):
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42
        )
        self.is_fitted = False
        self.feature_names = [
            "error_rate",
            "p95_latency",
            "timeout_count",
            "cpu_utilization",
            "memory_utilization",
            "db_connection_failures"
        ]

    def fit_synthetic(self, n_samples: int = 1000):
        # Generate baseline normal operational features
        normal = np.column_stack([
            np.random.normal(0.5, 0.2, n_samples),     # error rate %
            np.random.normal(200, 30, n_samples),      # p95 latency ms
            np.random.poisson(0.1, n_samples),         # timeout count
            np.random.normal(35, 5, n_samples),        # CPU %
            np.random.normal(45, 5, n_samples),        # Memory %
            np.random.poisson(0.05, n_samples),        # DB failures
        ])
        self.model.fit(normal)
        self.is_fitted = True

    def score_sample(self, features: List[float]) -> Dict[str, Any]:
        if not self.is_fitted:
            self.fit_synthetic()
        
        arr = np.array([features])
        raw_score = self.model.decision_function(arr)[0]
        # Invert and scale to 0-100 anomaly scale
        scaled_score = max(5.0, min(99.0, (0.5 - raw_score) * 120.0))
        is_anomaly = self.model.predict(arr)[0] == -1
        
        return {
            "anomaly_score": round(float(scaled_score), 1),
            "is_anomaly": bool(is_anomaly),
            "algorithm": "IsolationForest",
            "features_evaluated": self.feature_names
        }
