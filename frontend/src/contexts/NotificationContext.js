import React, { createContext, useContext } from 'react';

export const NOTIFICATION_TYPES = {
  COMMENT: 'COMMENT',
  REPLY: 'REPLY',
  REPORT_RESULT: 'REPORT_RESULT',
  APPROVAL: 'APPROVAL',
  MENTION: 'MENTION',
  SYSTEM: 'SYSTEM',
};

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      deleteNotification: () => {},
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const value = {
    notifications: [],
    unreadCount: 0,
    markAsRead: () => {},
    markAllAsRead: () => {},
    deleteNotification: () => {},
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
