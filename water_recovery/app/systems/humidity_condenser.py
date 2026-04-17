"""Humidity Condenser simulation.

Pulls moisture from the cabin air and converts it to clean water.
This is a relatively low-power process compared to urine processing.
"""

import random


class HumidityCondenser:
    def __init__(self):
        self.cabin_humidity_pct = 55.0  # Relative humidity
        self.water_collected_l = 0.0
        self.condenser_temp_c = 5.0     # Cooling coil temperature
        self.running = False
        self.power_available = False

    def set_power(self, available: bool):
        self.power_available = available
        if not available:
            self.running = False

    def tick(self, dt_seconds: float = 2.0) -> dict:
        """Advance simulation by dt_seconds."""
        # Humidity naturally rises from crew respiration and perspiration
        humidity_rise = (5.0 / 3600.0) * dt_seconds  # ~5% per hour
        self.cabin_humidity_pct += humidity_rise + random.uniform(-0.1, 0.1)
        self.cabin_humidity_pct = min(95.0, self.cabin_humidity_pct)

        if not self.power_available:
            return self._status("offline")

        # Auto-start when humidity is too high
        if self.cabin_humidity_pct > 60.0:
            self.running = True
        elif self.cabin_humidity_pct < 40.0:
            self.running = False

        if self.running:
            # Condensation rate depends on humidity and temperature delta
            efficiency = min(1.0, (self.cabin_humidity_pct - 30) / 50.0)
            rate_l_h = 0.5 * efficiency  # Up to 0.5 L/hour

            water_collected = (rate_l_h / 3600.0) * dt_seconds
            self.water_collected_l += water_collected

            # Reduce cabin humidity
            humidity_drop = water_collected * 8.0  # Approximate
            self.cabin_humidity_pct = max(30.0, self.cabin_humidity_pct - humidity_drop)

            # Cooling management
            self.condenser_temp_c = max(2.0, self.condenser_temp_c - 0.1)
        else:
            self.condenser_temp_c = min(15.0, self.condenser_temp_c + 0.2)

        status = "active" if self.running else "standby"
        return self._status(status)

    def _status(self, status: str) -> dict:
        return {
            "system": "humidity_condenser",
            "status": status,
            "cabin_humidity_pct": round(self.cabin_humidity_pct, 1),
            "water_collected_l": round(self.water_collected_l, 3),
            "condenser_temp_c": round(self.condenser_temp_c, 1),
        }
