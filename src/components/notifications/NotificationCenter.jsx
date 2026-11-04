import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Clock, Settings2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationPreferences } from './NotificationPreferences';

const CATEGORIES = ['ATTENDANCE', 'REPORTS', 'FEEDBACK', 'SHIFTS', 'SYSTEM'];

export const NotificationCenter = () => {
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const [readFilter, setReadFilter] = useState('');
  const [category, setCategory] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const filters = {};
    if (readFilter) filters.read = readFilter;
    if (category) filters.category = category;
    refresh(filters);
  }, [readFilter, category, refresh]);

  return (
    <div className="max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Bell className="h-5 w-5 text-blue-600" /> Notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">Unread: {unreadCount}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreferences((visible) => !visible)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <Settings2 className="h-4 w-4" /> {showPreferences ? 'View notifications' : 'Preferences'}
          </button>
          {!showPreferences && unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
      </header>

      {showPreferences ? <NotificationPreferences /> : (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-slate-600">
              Status
              <select
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value)}
                className="ml-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2"
              >
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="ml-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2"
              >
                <option value="">All categories</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
          <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500" role="status">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No notifications match these filters.</p>
            ) : notifications.map((notification) => (
              <article
                key={notification.id}
                className={`flex items-start gap-3 p-4 ${notification.read_at ? '' : 'bg-blue-50/50'}`}
              >
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${notification.read_at ? 'bg-slate-200' : 'bg-blue-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
                    <span className="text-xs text-slate-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span>{notification.category}</span><span>·</span><Clock className="h-3 w-3" />
                    <span>Email: {notification.email_delivery_status.toLowerCase()}</span>
                  </div>
                </div>
                {!notification.read_at && (
                  <button
                    type="button"
                    onClick={() => markRead(notification.id)}
                    className="flex-none rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    aria-label={`Mark ${notification.title} as read`}
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
};
