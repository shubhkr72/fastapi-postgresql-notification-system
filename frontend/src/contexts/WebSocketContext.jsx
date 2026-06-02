import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createWebSocket } from '../services/websocketService';
const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [status, setStatus] = useState('disconnected');
  const wsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, []);

  const connect = (userId, onMessage) => {
    if (!userId) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
       wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus('connecting');

    wsRef.current = createWebSocket(
      userId,
      onMessage,
      () => setStatus('connected'),
      () => setStatus('disconnected')
    );
  };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  return (
    <WebSocketContext.Provider value={{ status, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }

  return context;
};
