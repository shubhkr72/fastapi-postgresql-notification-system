const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || (() => {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
  } catch (error) {
    return 'ws://localhost:8000';
  }
})();

export const createWebSocket = (userId, onMessage, onOpen, onClose) => {
  const ws = new WebSocket(`${WS_BASE_URL}/ws/${userId}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  ws.onclose = (event) => {
    console.log('WebSocket disconnected', event.code, event.reason);
    if (onClose) onClose();
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};
