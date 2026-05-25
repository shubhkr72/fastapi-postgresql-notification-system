import asyncio
import logging
import json
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db, engine, Base, ASYNC_DATABASE_URL
from models import Notification, NotificationCreate, NotificationResponse
from notify import PostgresNotifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[user_id] = websocket
        logger.info(f"User {user_id} connected. Total: {len(self.connections)}")

    def disconnect(self, user_id: int):
        self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                self.disconnect(user_id)

manager = ConnectionManager()
notifier = None

async def handle_postgres_notification(data: dict):
    user_id = data.get("userId")
    if user_id:
        await manager.send_to_user(user_id, data)

async def start_postgres_listener():
    try:
        await notifier.listen_to_channel("user_notification")
        await notifier.start_listening()
    except Exception as e:
        logger.error(f"Listener error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global notifier
    Base.metadata.create_all(bind=engine)
    notifier = PostgresNotifier(ASYNC_DATABASE_URL.replace("+asyncpg", ""))
    notifier.add_listener(handle_postgres_notification)
    task = asyncio.create_task(start_postgres_listener())
    yield
    task.cancel()
    if notifier:
        await notifier.disconnect()

app = FastAPI(title="Realtime Notification System", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    with open("static/index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.post("/api/notifications/send", response_model=NotificationResponse)
async def send_notification(
    payload: NotificationCreate,
    db: AsyncSession = Depends(get_async_db)
):
    notif = Notification(user_id=payload.user_id, message=payload.message)
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif

@app.get("/api/notifications/{user_id}", response_model=List[NotificationResponse])
async def get_notifications(user_id: int, db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    )
    return result.scalars().all()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)