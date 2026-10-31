import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const CustomerNotifications = () => {
  const { selectedCustomerId } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead, customers } = useApp();
  const navigate = useNavigate();

  const currentCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const custNotifs = notifications.filter(
    (n) => n.targetRole === 'customer' && (!n.targetCustomerId || n.targetCustomerId === currentCust.id)
  );
  const unreadCount = custNotifs.filter((n) => !n.isRead).length;

  const handleItemClick = (notif) => {
    markNotificationRead(notif.id);
    if (notif.link && notif.link !== '#') {
      navigate(notif.link);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#245CE2]" />
            Client Alert & Notification Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time notifications whenever on-site staff submit daily shift handovers, revise reports, or respond to feedback.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsRead('customer', currentCust.id)}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#245CE2]" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle divide-y divide-slate-100 overflow-hidden">
        {custNotifs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No notifications available for your client portal.
          </div>
        ) : (
          custNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                !n.isRead ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex-shrink-0 mt-0.5">
                {n.type.includes('report') ? (
                  <FileText className="w-4 h-4 text-[#245CE2]" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                )}
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
                    View in Client Portal <ExternalLink className="w-3 h-3" />
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
