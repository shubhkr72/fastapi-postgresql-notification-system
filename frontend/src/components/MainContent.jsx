import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import NotificationList from './notifications/NotificationList';
import SendNotificationForm from './notifications/SendNotificationForm';
import Modal from './ui/Modal';
import ConnectionStatus from './layout/ConnectionStatus';

const MainContent = () => {
  const { userId } = useAuthContext();

  const {
    notifications,
    loading,
    error,
    loadNotifications,
  } = useNotificationContext();

  const {
    status,
    connect,
    disconnect,
  } = useWebSocketContext();

  const [wsConnected, setWsConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Load notifications when user changes
  useEffect(() => {
    if (userId) {
      loadNotifications(userId);
    }
  }, [userId, loadNotifications]);

  // Connect websocket only when userId changes
  useEffect(() => {
    if (!userId) {
      disconnect();
      return;
    }

    connect(userId, () => {
      loadNotifications(userId);
    });

    return () => {
      disconnect();
    };
  }, [userId]);

  // Update UI connection status
  useEffect(() => {
    setWsConnected(status === 'connected');
  }, [status]);

  if (!userId) {
    return (
      <div className="min-h-[calc(100vh-16px)] flex flex-col items-center justify-center py-4">
        <p className="text-gray-500 italic">
          Please select a user ID to view notifications
        </p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <ConnectionStatus
          status={status}
          wsConnected={wsConnected}
        />

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 focus:outline-none"
        >
          New Notification
        </button>
      </div>

      <NotificationList
        notifications={notifications}
        loading={loading}
        error={error}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Send Notification"
      >
        <SendNotificationForm
          onClose={() => setShowModal(false)}
        />
      </Modal>
    </main>
  );
};

export default MainContent;
