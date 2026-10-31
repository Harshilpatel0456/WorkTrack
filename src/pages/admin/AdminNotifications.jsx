import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  Filter,
  FileText,
  UserCheck,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const AdminNotifications = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  const adminNotifs = notifications.filter((n) => n.targetRole === 'admin');
  const unreadCount = adminNotifs.filter((n) => !n.isRead).length;

  const filtered = adminNotifs.filter((n) => {
    if (filterType === 'unread') return !n.isRead;
    return true;
  });

  const getNotifIcon = (type) => {
    if (type.includes('report')) return <FileText className="w-4 h-4 text-[#245CE2]" />;
    if (type.includes('attendance')) return <UserCheck className="w-4 h-4 text-emerald-600" />;
    if (type.includes('feedback')) return <MessageSquare className="w-4 h-4 text-purple-600" />;
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  };

  const handleItemClick = (notif) => {
    markNotificationRead(notif.id);
    if (notif.link && notif.link !== '#') {
      navigate(notif.link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#245CE2]" />
            Administrative Notification Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time automated alerts generated from employee shift activity, report submissions, revisions, and client feedback.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsRead('admin')}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#245CE2]" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-[#245CE2] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Activity ({adminNotifs.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'unread'
                ? 'bg-[#245CE2] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Unread Alerts ({unreadCount})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          In-App notification channel active
        </span>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No notifications in this folder.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                !n.isRead ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex-shrink-0 mt-0.5">
                {getNotifIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#245CE2]"></span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(n.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {n.message}
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#245CE2] inline-flex items-center gap-1 hover:underline">
                    View Associated Record <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
