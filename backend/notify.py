import asyncio
import json
import logging
from typing import Callable
import asyncpg

logger = logging.getLogger(__name__)

class PostgresNotifier:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        self.listeners = []

    async def connect(self):
        self.connection = await asyncpg.connect(self.database_url)
        logger.info("Connected to PostgreSQL for notifications")

    async def disconnect(self):
        if self.connection:
            await self.connection.close()

    def add_listener(self, callback: Callable):
        self.listeners.append(callback)

    async def listen_to_channel(self, channel: str):
        if not self.connection:
            await self.connect()
        await self.connection.add_listener(channel, self._handle_notification)
        logger.info(f"Listening to channel: {channel}")

    async def _handle_notification(self, connection, pid, channel, payload):
        try:
            data = json.loads(payload)
            for listener in self.listeners:
                await listener(data)
        except Exception as e:
            logger.error(f"Error handling notification: {e}")

    async def start_listening(self):
        if not self.connection:
            await self.connect()
        try:
            while True:
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info("Listening cancelled")
        finally:
            await self.disconnect()