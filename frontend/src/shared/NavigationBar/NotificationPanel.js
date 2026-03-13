import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NOTIFICATION_TYPES } from '../../contexts/NotificationContext';

/**
 * 알림 패널 컴포넌트
 * Tailwind CSS 클래스 사용
 */
const NotificationPanel = ({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  notificationRef
}) => {
  const { t } = useTranslation();

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.COMMENT: return '💬';
      case NOTIFICATION_TYPES.REPLY: return '↩️';
      case NOTIFICATION_TYPES.REPORT_RESULT: return '📋';
      case NOTIFICATION_TYPES.APPROVAL: return '✅';
      case NOTIFICATION_TYPES.MENTION: return '@';
      case NOTIFICATION_TYPES.SYSTEM: return '🔔';
      default: return '🔔';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return t('notification.time.justNow');
    if (diff < 3600) return t('notification.time.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('notification.time.hoursAgo', { count: Math.floor(diff / 3600) });
    if (diff < 604800) return t('notification.time.daysAgo', { count: Math.floor(diff / 86400) });
    return date.toLocaleDateString('ko-KR');
  };

  const handleNotificationClick = (notification) => {
    onMarkAsRead(notification.id);
    if (notification.link) {
      onClose();
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'}`}
        onClick={onToggle}
        aria-label={t('notification.title')}
      >
        <svg className="w-5 h-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bg-white rounded-xl shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden z-50" style={{ top: '60px', right: '20px' }}>
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{t('notification.title')}</h3>
            {unreadCount > 0 && (
              <button
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={onMarkAllAsRead}
              >
                {t('notification.markAllRead')}
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-3xl block mb-2">🔔</span>
                <p>{t('notification.empty')}</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer flex items-start gap-3 ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="text-lg flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{notification.title}</p>
                    <p className="text-gray-600 text-sm line-clamp-2">{notification.message}</p>
                    <span className="text-xs text-gray-400 mt-1 block">{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                  <button
                    className="text-gray-400 hover:text-red-500 text-xl leading-none flex-shrink-0 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <Link
                to="/profile"
                onClick={onClose}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('notification.settings')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
