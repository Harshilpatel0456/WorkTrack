import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, tokenStorage } from '../services/apiClient';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (filters = {}) => {
    if (!isAuthenticated || !tokenStorage.getAccessToken()) {
      setNotifications([]);
      setUnreadCount(0);
      setError(isAuthenticated ? 'Sign in with a backend account to load notifications.' : '');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page_size: '100', ...filters });
      const [list, count] = await Promise.all([
        apiClient(`/notifications/?${query.toString()}`),
        apiClient('/notifications/unread_count/'),
      ]);
      setNotifications(Array.isArray(list) ? list : (list.results || []));
      setUnreadCount(count.unread_count);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
    if (!isAuthenticated || !tokenStorage.getAccessToken()) return undefined;
    const timer = window.setInterval(() => refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markRead = async (id) => {
    try {
      await apiClient(`/notifications/${id}/mark_as_read/`, { method: 'POST' });
      setNotifications((items) => items.map((item) => (
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark the notification as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient('/notifications/mark_all_read/', { method: 'POST' });
      setNotifications((items) => items.map((item) => (
        { ...item, read_at: item.read_at || new Date().toISOString() }
      )));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message || 'Unable to mark notifications as read.');
    }
  };

  const updatePreferences = async (preferences) => {
    const saved = await apiClient('/notifications/preferences/my_preference/', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
    await refresh();
    return saved;
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      updatePreferences,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return context;
};
