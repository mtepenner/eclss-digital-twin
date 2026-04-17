"""Urine Processor Assembly (UPA) simulation.

High power draw system that processes urine into clean water.
Can be safely paused for up to 48 hours during power shortages.
"""

import random
import time


class UrineProcessor:
    def __init__(self):
        self.urine_tank_l = 20.0       # Incoming urine tank (liters)
        self.clean_water_l = 0.0        # Produced clean water
        self.brine_l = 0.0              # Waste brine
        self.recovery_rate = 0.85       # 85% water recovery from urine
        self.running = False
        self.power_available = False
        self.paused_since = None        # Track how long we've been paused
        self.distiller_temp_c = 60.0

    def set_power(self, available: bool):
        self.power_available = available
        if not available:
            if self.running:
                self.paused_since = time.time()
            self.running = False

    def tick(self, dt_seconds: float = 2.0) -> dict:
        """Advance simulation by dt_seconds."""
        # Urine production: ~1.5 L/person/day for 4 crew
        urine_rate = (1.5 * 4 / 86400.0) * dt_seconds
        self.urine_tank_l += urine_rate + random.uniform(-0.001, 0.001)

        if not self.power_available:
            return self._status("offline")

        # Start processing when tank is getting full
        if self.urine_tank_l > 5.0:
            self.running = True
            self.paused_since = None
        elif self.urine_tank_l < 1.0:
            self.running = False

        if self.running:
            # Processing rate: ~6L/day capacity
            rate_l_h = 0.25  # L/hour
            processed = (rate_l_h / 3600.0) * dt_seconds

            if self.urine_tank_l >= processed:
                self.urine_tank_l -= processed
                self.clean_water_l += processed * self.recovery_rate
                self.brine_l += processed * (1 - self.recovery_rate)

            self.distiller_temp_c = min(80.0, self.distiller_temp_c + 0.3)
        else:
            self.distiller_temp_c = max(25.0, self.distiller_temp_c - 0.5)

        status = "active" if self.running else "standby"
        return self._status(status)

    def hours_paused(self) -> float:
        """Return how many hours the processor has been paused."""
        if self.paused_since is None:
            return 0.0
        return (time.time() - self.paused_since) / 3600.0

    def _status(self, status: str) -> dict:
        return {
            "system": "urine_processor",
            "status": status,
            "urine_tank_l": round(self.urine_tank_l, 2),
            "clean_water_l": round(self.clean_water_l, 3),
            "brine_l": round(self.brine_l, 3),
            "recovery_rate": self.recovery_rate,
            "distiller_temp_c": round(self.distiller_temp_c, 1),
            "hours_paused": round(self.hours_paused(), 2),
        }
