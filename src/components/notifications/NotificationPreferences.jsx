import React, { useEffect, useState } from 'react';
import { Bell, Clock, Mail, Save } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useNotifications } from '../../context/NotificationContext';

const CATEGORIES = [
  ['ATTENDANCE', 'Attendance'],
  ['REPORTS', 'Daily reports'],
  ['FEEDBACK', 'Feedback and replies'],
  ['SHIFTS', 'Shifts and assignments'],
  ['SYSTEM', 'System alerts'],
];

const DEFAULT_PREFERENCES = {
  frequency: 'INSTANT',
  enabled_categories: CATEGORIES.map(([value]) => value),
  in_app_enabled: true,
  email_enabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

export const NotificationPreferences = () => {
  const { updatePreferences } = useNotifications();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient('/notifications/preferences/my_preference/')
      .then((data) => {
        if (active) setPreferences({ ...DEFAULT_PREFERENCES, ...data });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load preferences.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const toggleCategory = (category) => {
    setPreferences((current) => ({
      ...current,
      enabled_categories: current.enabled_categories.includes(category)
        ? current.enabled_categories.filter((item) => item !== category)
        : [...current.enabled_categories, category],
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updatePreferences(preferences);
      setPreferences({ ...DEFAULT_PREFERENCES, ...updated });
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || 'Unable to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-slate-500" role="status">Loading notification preferences…</p>;
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
      {saved && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">Preferences saved.</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-blue-600" /> Email delivery frequency
        </h3>
        <select
          value={preferences.frequency}
          onChange={(event) => setPreferences({ ...preferences, frequency: event.target.value })}
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
          aria-label="Email delivery frequency"
        >
          <option value="INSTANT">Instant</option>
          <option value="HOURLY">Hourly digest</option>
          <option value="DAILY">Daily digest</option>
          <option value="WEEKLY">Weekly digest</option>
        </select>
        <label className="block text-xs text-slate-600">
          Digest timezone
          <input
            value={preferences.timezone}
            onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            placeholder="America/Chicago"
            required
          />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Delivery channels</h3>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={preferences.in_app_enabled}
            onChange={(event) => setPreferences({ ...preferences, in_app_enabled: event.target.checked })}
          />
          <Bell className="h-4 w-4" /> In-app notifications
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={preferences.email_enabled}
            onChange={(event) => setPreferences({ ...preferences, email_enabled: event.target.checked })}
          />
          <Mail className="h-4 w-4" /> Email notifications
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Notification categories</h3>
        {CATEGORIES.map(([value, label]) => (
          <label key={value} className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={preferences.enabled_categories.includes(value)}
              onChange={() => toggleCategory(value)}
            />
            {label}
          </label>
        ))}
      </section>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save preferences'}
      </button>
    </form>
  );
};
