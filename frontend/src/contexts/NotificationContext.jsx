import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getNotifications } from '../services/apiService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await getNotifications(userId);
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  const value = useMemo(() => ({
    notifications,
    loading,
    error,
    loadNotifications,
    addNotification
  }), [notifications, loading, error, loadNotifications, addNotification]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
