"""Sabatier Reactor simulation.

Combines CO2 and H2 into Water (H2O) and Methane (CH4):
    CO2 + 4H2 -> CH4 + 2H2O

This is a critical process for removing CO2 from cabin air
and recovering water.
"""

import time
import random


class SabatierReactor:
    def __init__(self):
        self.co2_ppm = 400.0       # Cabin CO2 level (ppm)
        self.h2_kg = 50.0          # Available hydrogen (kg)
        self.water_produced_l = 0.0 # Water produced this cycle (liters)
        self.methane_produced_kg = 0.0
        self.reactor_temp_c = 300.0 # Operating temp (optimal: 300-400°C)
        self.efficiency = 0.95
        self.running = False
        self.power_available = False

    def set_power(self, available: bool):
        self.power_available = available
        if not available:
            self.running = False

    def tick(self, dt_seconds: float = 2.0) -> dict:
        """Advance simulation by dt_seconds."""
        # CO2 naturally rises from crew respiration (~200 ppm/hour for 4 crew)
        co2_rise = (200.0 / 3600.0) * dt_seconds
        self.co2_ppm += co2_rise + random.uniform(-1, 1)

        if not self.power_available:
            return self._status("offline")

        if self.co2_ppm > 600 and self.h2_kg > 0.1:
            self.running = True
        elif self.co2_ppm < 350:
            self.running = False

        if self.running:
            # Reaction rate depends on temperature efficiency
            temp_factor = min(1.0, self.reactor_temp_c / 400.0)
            rate = 0.5 * temp_factor * self.efficiency  # kg CO2/hour processed

            co2_processed_kg = (rate / 3600.0) * dt_seconds
            # Stoichiometry: 1 mol CO2 (44g) + 4 mol H2 (8g) -> 1 mol CH4 (16g) + 2 mol H2O (36g)
            h2_consumed = co2_processed_kg * (8.0 / 44.0)
            water_produced = co2_processed_kg * (36.0 / 44.0)
            methane_produced = co2_processed_kg * (16.0 / 44.0)

            if self.h2_kg >= h2_consumed:
                self.h2_kg -= h2_consumed
                self.water_produced_l += water_produced  # ~1 kg/L for water
                self.methane_produced_kg += methane_produced
                # CO2 reduction in ppm (approx: 1 ppm ≈ 1.8 mg/m³ in ~100m³ cabin)
                co2_reduction = (co2_processed_kg * 1e6) / (100 * 1.8)
                self.co2_ppm = max(300, self.co2_ppm - co2_reduction)

            # Reactor temperature management
            self.reactor_temp_c = min(400, self.reactor_temp_c + 0.5)
        else:
            self.reactor_temp_c = max(200, self.reactor_temp_c - 1.0)

        status = "active" if self.running else "standby"
        return self._status(status)

    def _status(self, status: str) -> dict:
        return {
            "system": "sabatier_reactor",
            "status": status,
            "co2_ppm": round(self.co2_ppm, 1),
            "h2_remaining_kg": round(self.h2_kg, 2),
            "water_produced_l": round(self.water_produced_l, 3),
            "methane_produced_kg": round(self.methane_produced_kg, 3),
            "reactor_temp_c": round(self.reactor_temp_c, 1),
        }
