"""WebSocket bridge: proxies NATS messages to browser WebSocket clients.

This lightweight server subscribes to all eclss.> NATS subjects and
forwards them to connected WebSocket clients. It also accepts override
commands from the dashboard and publishes them to NATS.
"""

import asyncio
import json
import os
import logging
from aiohttp import web
from nats.aio.client import Client as NATS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [ws-bridge] %(message)s")
logger = logging.getLogger("ws-bridge")

NATS_URL = os.environ.get("NATS_URL", "nats://localhost:4222")
PORT = int(os.environ.get("WS_PORT", "9090"))

clients: set[web.WebSocketResponse] = set()
nc = NATS()


async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    clients.add(ws)
    logger.info(f"Client connected ({len(clients)} total)")

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    subject = data.get("subject", "")
                    payload = data.get("payload", {})
                    if subject and nc.is_connected:
                        await nc.publish(subject, json.dumps(payload).encode())
                except json.JSONDecodeError:
                    pass
            elif msg.type == web.WSMsgType.ERROR:
                logger.error(f"WebSocket error: {ws.exception()}")
    finally:
        clients.discard(ws)
        logger.info(f"Client disconnected ({len(clients)} total)")

    return ws


async def on_nats_message(msg):
    """Forward NATS messages to all connected WebSocket clients."""
    payload_str = msg.data.decode()
    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        payload = payload_str

    envelope = json.dumps({"subject": msg.subject, "payload": payload})

    disconnected = set()
    for ws in clients:
        try:
            await ws.send_str(envelope)
        except Exception:
            disconnected.add(ws)
    clients.difference_update(disconnected)


async def start_nats():
    for attempt in range(30):
        try:
            await nc.connect(NATS_URL)
            logger.info(f"Connected to NATS at {NATS_URL}")
            break
        except Exception as e:
            logger.warning(f"NATS attempt {attempt+1}/30: {e}")
            await asyncio.sleep(2)

    # Subscribe to all ECLSS subjects
    await nc.subscribe("eclss.>", cb=on_nats_message)


async def health_handler(request: web.Request) -> web.Response:
    return web.Response(text="ok")


async def on_startup(app: web.Application):
    await start_nats()


async def on_cleanup(app: web.Application):
    if nc.is_connected:
        await nc.close()


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/ws", websocket_handler)
    app.router.add_get("/healthz", health_handler)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


if __name__ == "__main__":
    app = create_app()
    web.run_app(app, port=PORT)
