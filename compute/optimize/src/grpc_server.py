"""gRPC server for Optimization compute service."""

import asyncio
import os
import signal
from concurrent import futures
import grpc
import structlog

logger = structlog.get_logger()
SERVICE_NAME = "optimize"
DEFAULT_PORT = 9103


async def serve() -> None:
    port = int(os.getenv("SERVICE_PORT", DEFAULT_PORT))
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))
    server.add_insecure_port(f"[::]:{port}")
    logger.info("starting_grpc_server", service=SERVICE_NAME, port=port)
    await server.start()
    loop = asyncio.get_event_loop()

    async def shutdown():
        logger.info("shutting_down_server")
        await server.stop(grace=5)

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown()))
    await server.wait_for_termination()


def main() -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ]
    )
    asyncio.run(serve())


if __name__ == "__main__":
    main()
