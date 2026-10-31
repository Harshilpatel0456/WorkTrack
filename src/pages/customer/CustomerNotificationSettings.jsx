import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sliders,
  Bell,
  Mail,
  Smartphone,
  Clock,
  Save,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const CustomerNotificationSettings = () => {
  const { notificationSettings, updateNotificationSettings, showToast } = useApp();

  // User requirement: "once in hour or at 6 hrs or at the day end"
  const [frequency, setFrequency] = useState(notificationSettings.frequency || 'hourly');
  const [immediateAlertOnSuspicious, setImmediateAlertOnSuspicious] = useState(
    notificationSettings.immediateAlertOnSuspicious !== false
  );

  const [channels, setChannels] = useState({
    inApp: notificationSettings.channels?.inApp ?? true,
    email: notificationSettings.channels?.email ?? true,
    push: notificationSettings.channels?.push ?? true,
  });

  const [events, setEvents] = useState({
    hourlyReportSubmitted: notificationSettings.events?.hourlyReportSubmitted ?? true,
    suspiciousIncidentFlagged: notificationSettings.events?.suspiciousIncidentFlagged ?? true,
    reportUpdated: notificationSettings.events?.reportUpdated ?? true,
    customerFeedback: notificationSettings.events?.customerFeedback ?? true,
    shiftChange: notificationSettings.events?.shiftChange ?? true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateNotificationSettings({
      frequency,
      immediateAlertOnSuspicious,
      channels,
      events,
    });
    showToast(`Notification settings updated! Cadence set to: ${
      frequency === 'hourly'
        ? 'Once in an hour'
        : frequency === '6hours'
        ? 'Every 6 hours'
        : 'At the day end'
    }`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-[#245CE2]" />
          Store Security Notification & Cadence Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure when and how you receive hourly CCTV surveillance audits, AI human detections, and critical store robbery alerts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Cadence / Frequency Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#245CE2]" />
              Surveillance Report Notification Frequency
            </h3>
            <span className="text-[10px] bg-blue-50 text-[#245CE2] font-bold px-2 py-0.5 rounded">
              Store Owner Preference
            </span>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Select how often you wish to be notified when the remote surveillance operator verifies camera snapshots and submits hourly store reports:
          </p>

          <div className="space-y-3">
            {/* Option 1: Once in an Hour */}
            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                frequency === 'hourly'
                  ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value="hourly"
                checked={frequency === 'hourly'}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Once in an hour (Every 1 Hour)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed text-xs">
                  Receive an instant notification immediately every hour as soon as the surveillance operator reviews the 10 camera snapshots and submits the hourly audit.
                </p>
              </div>
            </label>

            {/* Option 2: At 6 Hours */}
            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                frequency === '6hours'
                  ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value="6hours"
                checked={frequency === '6hours'}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-900 text-sm">Every 6 Hours (6-Hour Security Digest)</span>
                <p className="text-slate-600 mt-1 leading-relaxed text-xs">
                  Aggregate all 6 hourly snapshot reports into a single consolidated 6-hour shift digest (06:00–12:00, 12:00–18:00, 18:00–24:00).
                </p>
              </div>
            </label>

            {/* Option 3: At Day End */}
            <label
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                frequency === 'dayEnd'
                  ? 'border-[#245CE2] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value="dayEnd"
                checked={frequency === 'dayEnd'}
                onChange={(e) => setFrequency(e.target.value)}
                className="mt-1 text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-900 text-sm">At the Day End (Daily Closeout Summary)</span>
                <p className="text-slate-600 mt-1 leading-relaxed text-xs">
                  Receive one comprehensive store security summary at the conclusion of the day, detailing all 24 hourly audit batches and total camera verifications.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Critical Robbery Emergency Override */}
        <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200/80 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-rose-950 text-xs block">
                    Instant Override Alert on Suspicious Robbery / Safe Area Anomaly
                  </span>
                  <span className="text-[11px] text-rose-800 mt-0.5 block leading-relaxed">
                    Even if you choose a <strong>6-Hour</strong> or <strong>Day End</strong> digest, automatically send an immediate emergency alert whenever an operator or AI flags a suspicious human detection in high-risk zones (Cash Registers or Safe Room).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={immediateAlertOnSuspicious}
                  onChange={(e) => setImmediateAlertOnSuspicious(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 ml-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Notification Delivery Channels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-[#245CE2]" />
            Active Delivery Channels
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-[#245CE2]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">In-App Notification Center</span>
                  <span className="text-[11px] text-slate-500">Live unread badges, top header dropdown, and customer portal feed</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.inApp}
                onChange={(e) => setChannels({ ...channels, inApp: e.target.checked })}
                className="w-4 h-4 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Email Alerts (customer@worktrack.demo)</span>
                  <span className="text-[11px] text-slate-500">Dispatches HTML email summary with camera snapshot previews</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.email}
                onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                className="w-4 h-4 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block">Push / SMS Notifications</span>
                  <span className="text-[11px] text-slate-500">Instant mobile push notification for on-the-go store owners</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.push}
                onChange={(e) => setChannels({ ...channels, push: e.target.checked })}
                className="w-4 h-4 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <Save className="w-4 h-4" />
            Save Notification Cadence
          </button>
        </div>
      </form>
    </div>
  );
};
