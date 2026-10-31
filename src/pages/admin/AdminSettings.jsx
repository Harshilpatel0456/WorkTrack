import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Shield,
  RotateCcw,
  Bell,
  Clock,
  Save,
  CheckCircle2,
  Database,
  Building,
} from 'lucide-react';

export const AdminSettings = () => {
  const { resetDemoData, showToast } = useApp();
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  const [settings, setSettings] = useState({
    platformName: 'WorkTrack Enterprise SaaS',
    tagline: 'Smart Workforce. Transparent Reporting.',
    enableAutoApproval: true,
    strictOneReportPerShift: true,
    requireCheckInForReport: false,
    retentionDays: 365,
    inAppAlerts: true,
    emailSimulation: true,
    pushSimulation: false,
  });

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Platform configuration saved successfully');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#245CE2]" />
          Enterprise Platform Settings & System Governance
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure business rules, reporting policies, notification dispatch channels, and evaluator demo controls.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Logic & Workforce Policies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-[#245CE2]" />
            Workforce Allocation & Reporting Policies
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.strictOneReportPerShift}
                onChange={(e) => setSettings({ ...settings, strictOneReportPerShift: e.target.checked })}
                className="mt-0.5 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  Strict "One Report Per Employee Per Shift" Rule
                </span>
                <span className="text-slate-500">
                  Prevents multiple report submissions for the same shift window. Submissions after the first automatically route to revision mode with immutable version histories.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.enableAutoApproval}
                onChange={(e) => setSettings({ ...settings, enableAutoApproval: e.target.checked })}
                className="mt-0.5 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  Automatic Admin Approval for Created Allocations
                </span>
                <span className="text-slate-500">
                  Instantly activates employee-customer assignments upon creation by administrators.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                checked={settings.requireCheckInForReport}
                onChange={(e) => setSettings({ ...settings, requireCheckInForReport: e.target.checked })}
                className="mt-0.5 rounded text-[#245CE2] focus:ring-[#245CE2]"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  Require Active Check-In Before Report Submission
                </span>
                <span className="text-slate-500">
                  Enforces biometric check-in timestamp verification prior to accessing the daily reporting form.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Notification Channels Simulation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-[#245CE2]" />
            Simulated Notification Delivery Channels
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="font-bold text-slate-900 block">In-App Notifications</span>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Live badges & dropdown tray</p>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Always Active
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="font-bold text-slate-900 block">Email Dispatch</span>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Simulated instant customer delivery</p>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Simulated (Enabled)
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="font-bold text-slate-900 block">Push Notifications</span>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Mobile and desktop prompts</p>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                Prototype Mode
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Configuration Changes
          </button>
        </div>
      </form>

      {/* Danger Zone: Evaluator Demo Reset */}
      <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-200/80 space-y-3">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
          <Database className="w-4 h-4 text-rose-600" />
          Prototype Data Reset Control
        </div>
        <p className="text-xs text-rose-900 leading-relaxed">
          Need a fresh start for a new faculty presentation? Resetting will re-initialize all LocalStorage demo datasets back to default initial records (sample employees, customers, shifts, attendance, and versions).
        </p>

        <div className="pt-2">
          {isConfirmResetOpen ? (
            <div className="flex items-center gap-3">
              <button
                onClick={resetDemoData}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
              >
                Yes, Reset All Demo Data Now
              </button>
              <button
                onClick={() => setIsConfirmResetOpen(false)}
                className="text-xs font-semibold text-slate-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmResetOpen(true)}
              className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-100/60 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo Records to Pristine State
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
