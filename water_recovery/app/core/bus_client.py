"""NATS event bus client for the Water Recovery module.

Publishes water tank levels and telemetry, requests 2000W of power,
and listens for power allocation responses.
"""

import asyncio
import json
import os
import logging
from nats.aio.client import Client as NATS

logger = logging.getLogger("water_recovery.bus_client")

NATS_URL = os.environ.get("NATS_URL", "nats://localhost:4222")
MODULE_NAME = "water_recovery"
POWER_REQUEST_W = 2000
PRIORITY = 2  # High priority but can be paused safely


class BusClient:
    def __init__(self):
        self.nc = NATS()
        self.connected = False
        self.power_allocated = 0.0
        self.shed = False

    async def connect(self):
        """Connect to NATS with retry logic."""
        for attempt in range(30):
            try:
                await self.nc.connect(NATS_URL)
                self.connected = True
                logger.info(f"Connected to NATS at {NATS_URL}")
                break
            except Exception as e:
                logger.warning(f"NATS connection attempt {attempt+1}/30 failed: {e}")
                await asyncio.sleep(2)
        if not self.connected:
            raise ConnectionError(f"Failed to connect to NATS at {NATS_URL}")

        await self.nc.subscribe(
            f"eclss.power.allocation.{MODULE_NAME}",
            cb=self._on_power_allocation,
        )

    async def _on_power_allocation(self, msg):
        data = json.loads(msg.data.decode())
        self.power_allocated = data.get("allocated", 0)
        self.shed = data.get("shed", False)
        logger.info(f"Power allocation: {self.power_allocated}W shed={self.shed}")

    async def request_power(self):
        if not self.connected:
            return
        payload = json.dumps({
            "module": MODULE_NAME,
            "watts": POWER_REQUEST_W,
            "priority": PRIORITY,
        }).encode()
        await self.nc.publish("eclss.power.request", payload)

    async def publish_telemetry(self, condenser_data: dict, processor_data: dict):
        if not self.connected:
            return
        payload = json.dumps({
            "module": MODULE_NAME,
            "humidity_condenser": condenser_data,
            "urine_processor": processor_data,
            "power_allocated": self.power_allocated,
        }).encode()
        await self.nc.publish("eclss.telemetry.water", payload)

    async def publish_event(self, event_type: str, message: str):
        if not self.connected:
            return
        payload = json.dumps({
            "type": event_type,
            "module": MODULE_NAME,
            "message": message,
        }).encode()
        await self.nc.publish("eclss.events", payload)

    def has_power(self) -> bool:
        return self.power_allocated > 0 and not self.shed

    async def close(self):
        if self.connected:
            await self.nc.close()
