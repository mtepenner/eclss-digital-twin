"""Electrolysis system simulation.

Splits water into oxygen and hydrogen:
    2H2O -> 2H2 + O2

The produced O2 is fed to the cabin; H2 is recycled to the Sabatier reactor.
"""

import random


class Electrolysis:
    def __init__(self):
        self.water_input_l = 100.0   # Available water for electrolysis (liters)
        self.o2_produced_kg = 0.0
        self.h2_produced_kg = 0.0
        self.o2_cabin_pct = 21.0     # Cabin O2 percentage
        self.cell_voltage = 1.8      # Operating voltage per cell
        self.running = False
        self.power_available = False

    def set_power(self, available: bool):
        self.power_available = available
        if not available:
            self.running = False

    def add_water(self, liters: float):
        """Add recovered water from Sabatier or water recovery."""
        self.water_input_l += liters

    def tick(self, dt_seconds: float = 2.0) -> dict:
        """Advance simulation by dt_seconds."""
        # O2 naturally consumed by crew (~0.84 kg/person/day for 4 crew)
        o2_consumption = (0.84 * 4 / 86400.0) * dt_seconds  # kg consumed
        self.o2_cabin_pct -= (o2_consumption * 0.1) + random.uniform(-0.01, 0.01)
        self.o2_cabin_pct = max(15.0, self.o2_cabin_pct)

        if not self.power_available:
            return self._status("offline")

        if self.o2_cabin_pct < 20.5 and self.water_input_l > 0.1:
            self.running = True
        elif self.o2_cabin_pct > 21.5:
            self.running = False

        if self.running and self.water_input_l > 0:
            # Rate: ~1 kg O2/hour at full power (approx 1500W)
            rate_kg_h = 1.0
            water_consumed = (rate_kg_h / 3600.0) * dt_seconds * (18.0 * 2 / 32.0)
            o2_produced = (rate_kg_h / 3600.0) * dt_seconds
            h2_produced = o2_produced * (4.0 / 32.0)

            if self.water_input_l >= water_consumed:
                self.water_input_l -= water_consumed
                self.o2_produced_kg += o2_produced
                self.h2_produced_kg += h2_produced
                self.o2_cabin_pct = min(23.0, self.o2_cabin_pct + o2_produced * 0.1)

        status = "active" if self.running else "standby"
        return self._status(status)

    def _status(self, status: str) -> dict:
        return {
            "system": "electrolysis",
            "status": status,
            "o2_cabin_pct": round(self.o2_cabin_pct, 2),
            "water_available_l": round(self.water_input_l, 2),
            "o2_produced_kg": round(self.o2_produced_kg, 3),
            "h2_produced_kg": round(self.h2_produced_kg, 3),
            "cell_voltage": self.cell_voltage,
        }
