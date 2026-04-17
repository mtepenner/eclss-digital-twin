"""Air Revitalization Module - Priority 1 Life Support.

Manages O2 generation (electrolysis) and CO2 scrubbing (Sabatier reactor).
Requests 1500W from the power grid.
"""

import asyncio
import logging
import signal

from app.systems.sabatier_reactor import SabatierReactor
from app.systems.electrolysis import Electrolysis
from app.core.bus_client import BusClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("air_revitalization")


async def main():
    bus = BusClient()
    sabatier = SabatierReactor()
    electrolyzer = Electrolysis()

    await bus.connect()
    logger.info("Air Revitalization module starting...")

    shutdown = asyncio.Event()
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown.set)
        except NotImplementedError:
            pass  # Windows doesn't support add_signal_handler

    while not shutdown.is_set():
        # Request power every cycle
        await bus.request_power()

        # Set power state based on allocation
        has_power = bus.has_power()
        sabatier.set_power(has_power)
        electrolyzer.set_power(has_power)

        if not has_power:
            await bus.publish_event("warning", "Air module has no power allocation!")

        # Run simulation tick
        sab_status = sabatier.tick()
        elec_status = electrolyzer.tick()

        # Transfer water from Sabatier to electrolysis
        if sabatier.water_produced_l > 0.01:
            transfer = sabatier.water_produced_l * 0.5  # 50% goes to electrolysis
            electrolyzer.add_water(transfer)
            sabatier.water_produced_l -= transfer

        # Publish telemetry
        await bus.publish_telemetry(sab_status, elec_status)

        # Critical alerts
        if sab_status["co2_ppm"] > 5000:
            await bus.publish_event("critical", f"CO2 at dangerous level: {sab_status['co2_ppm']} ppm!")
        elif sab_status["co2_ppm"] > 2000:
            await bus.publish_event("warning", f"CO2 elevated: {sab_status['co2_ppm']} ppm")

        if elec_status["o2_cabin_pct"] < 19.0:
            await bus.publish_event("critical", f"O2 critically low: {elec_status['o2_cabin_pct']}%!")
        elif elec_status["o2_cabin_pct"] < 20.0:
            await bus.publish_event("warning", f"O2 below normal: {elec_status['o2_cabin_pct']}%")

        logger.info(
            f"CO2={sab_status['co2_ppm']}ppm O2={elec_status['o2_cabin_pct']}% "
            f"Power={'ON' if has_power else 'OFF'}"
        )

        try:
            await asyncio.wait_for(shutdown.wait(), timeout=2.0)
        except asyncio.TimeoutError:
            pass

    await bus.close()
    logger.info("Air Revitalization module shut down.")


if __name__ == "__main__":
    asyncio.run(main())
