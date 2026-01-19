"""gRPC server for Risk compute service."""

import asyncio
import os
import signal
from concurrent import futures

import grpc
import structlog

logger = structlog.get_logger()

SERVICE_NAME = "risk"
DEFAULT_PORT = 9101


async def serve() -> None:
    """Start the gRPC server."""
    port = int(os.getenv("SERVICE_PORT", DEFAULT_PORT))

    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.max_send_message_length", 50 * 1024 * 1024),
            ("grpc.max_receive_message_length", 50 * 1024 * 1024),
        ],
    )

    # TODO: Add service implementations
    # risk_pb2_grpc.add_RiskServiceServicer_to_server(RiskService(), server)

    server.add_insecure_port(f"[::]:{port}")

    logger.info("starting_grpc_server", service=SERVICE_NAME, port=port)
    await server.start()

    # Handle shutdown signals
    loop = asyncio.get_event_loop()

    async def shutdown():
        logger.info("shutting_down_server")
        await server.stop(grace=5)

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown()))

    await server.wait_for_termination()
    logger.info("server_stopped")


def main() -> None:
    """Entry point."""
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )
    asyncio.run(serve())


if __name__ == "__main__":
    main()
