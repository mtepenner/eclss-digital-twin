"""Water Recovery Module - Priority 2 Life Support.

Manages humidity condensation and urine processing.
Requests 2000W from the power grid.
Can be safely paused for up to 48 hours during power shortages.
"""

import asyncio
import logging
import signal

from app.systems.humidity_condenser import HumidityCondenser
from app.systems.urine_processor import UrineProcessor
from app.core.bus_client import BusClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("water_recovery")


async def main():
    bus = BusClient()
    condenser = HumidityCondenser()
    processor = UrineProcessor()

    await bus.connect()
    logger.info("Water Recovery module starting...")

    shutdown = asyncio.Event()
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown.set)
        except NotImplementedError:
            pass  # Windows

    while not shutdown.is_set():
        await bus.request_power()

        has_power = bus.has_power()
        condenser.set_power(has_power)
        processor.set_power(has_power)

        if not has_power:
            hours = processor.hours_paused()
            if hours > 48:
                await bus.publish_event("critical", f"Urine processor paused {hours:.1f}h - exceeds 48h safe limit!")
            elif hours > 24:
                await bus.publish_event("warning", f"Urine processor paused {hours:.1f}h - approaching limit")

        cond_status = condenser.tick()
        proc_status = processor.tick()

        await bus.publish_telemetry(cond_status, proc_status)

        # Alerts
        if cond_status["cabin_humidity_pct"] > 80:
            await bus.publish_event("warning", f"Cabin humidity high: {cond_status['cabin_humidity_pct']}%")

        if proc_status["urine_tank_l"] > 40:
            await bus.publish_event("warning", f"Urine tank near capacity: {proc_status['urine_tank_l']}L")

        total_water = cond_status["water_collected_l"] + proc_status["clean_water_l"]
        logger.info(
            f"Humidity={cond_status['cabin_humidity_pct']}% "
            f"Water={total_water:.1f}L Power={'ON' if has_power else 'OFF'}"
        )

        try:
            await asyncio.wait_for(shutdown.wait(), timeout=2.0)
        except asyncio.TimeoutError:
            pass

    await bus.close()
    logger.info("Water Recovery module shut down.")


if __name__ == "__main__":
    asyncio.run(main())
