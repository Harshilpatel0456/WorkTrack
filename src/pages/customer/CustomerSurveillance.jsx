import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CameraSnapshotCard } from '../../components/surveillance/CameraSnapshotCard';
import { Badge } from '../../components/common/Badge';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

import { INITIAL_HOURLY_SURVEILLANCE_BATCHES } from '../../data/initialData';

export const CustomerSurveillance = () => {
  const { selectedCustomerId } = useAuth();
  const { surveillanceBatches = [], customers = [], notificationSettings = {} } = useApp();
  const navigate = useNavigate();

  const currentCust = customers?.find((c) => c.id === selectedCustomerId) || customers?.[0] || { id: 'cust-1', companyName: 'Acme Retail Store #104' };

  const rawBatches = Array.isArray(surveillanceBatches) && surveillanceBatches.length > 0
    ? surveillanceBatches
    : INITIAL_HOURLY_SURVEILLANCE_BATCHES;

  const batches = rawBatches.filter((b) => b?.customerId === currentCust?.id).length > 0
    ? rawBatches.filter((b) => b?.customerId === currentCust?.id)
    : rawBatches;

  const [expandedBatchId, setExpandedBatchId] = useState(() => batches[0]?.id || 'cctv-batch-14');

  const toggleExpand = (batchId) => {
    setExpandedBatchId(prev => prev === batchId ? null : batchId);
  };

  const getFrequencyLabel = (freq) => {
    if (freq === 'hourly') return 'Once every hour (Hourly Alerts)';
    if (freq === '6hours') return 'Every 6 hours (6-Hour Digest)';
    return 'At day end (Daily Closeout Summary)';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#245CE2]" />
            CCTV Hourly Surveillance & Human Detection Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store #104 continuous security audit. Periodic 1-hour camera snapshots, automated AI human detection, and verified operator reports.
          </p>
        </div>

        {/* Current Notification Cadence Pill */}
        <div
          onClick={() => navigate('/customer/settings')}
          className="bg-white border border-slate-200 hover:border-[#245CE2] p-2.5 rounded-xl shadow-sm text-xs cursor-pointer transition-all self-start sm:self-auto flex items-center gap-2"
          title="Click to change notification cadence"
        >
          <Sliders className="w-4 h-4 text-[#245CE2]" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Alert Cadence:</span>
            <span className="font-bold text-slate-800 text-[11px] leading-tight">
              {getFrequencyLabel(notificationSettings.frequency)}
            </span>
          </div>
        </div>
      </div>

      {/* Store Hotspots Security Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Designated High-Risk Robbery & Cash Vulnerability Hotspots
          </span>
          <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
            Priority AI Detection Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-800 block text-xs">Zone A: Cash Registers #1 & #2</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              High robbery likelihood area. AI detects human presence, cash drawer left open, and cashier loitering.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-800 block text-xs">Zone B: Safe Room Vault</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Restricted access cash storage. Any human presence outside scheduled cash drop triggers priority alert.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-800 block text-xs">Zone D: Emergency Fire Exit Door</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rear blind spot escape alleyway. Magnetic sensor paired with low-light camera.
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Surveillance Batches Feed */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Hourly Surveillance Reports ({batches.length} Batches Today)
        </h3>

        {batches.map((batch) => {
          const isExpanded = expandedBatchId === batch.id;
          const hasSuspicious = batch.flaggedSuspiciousCount > 0;

          return (
            <div
              key={batch.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                hasSuspicious
                  ? 'border-amber-300 shadow-md ring-1 ring-amber-400/20'
                  : 'border-slate-200/80 shadow-subtle'
              }`}
            >
              {/* Batch Header Row */}
              <div
                onClick={() => toggleExpand(batch.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`p-3 rounded-xl font-bold text-xs ${
                    hasSuspicious
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-[#245CE2]'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {batch.hourSlot} CCTV Surveillance Audit
                      </h4>
                      <Badge status={batch.status} />
                      {hasSuspicious && (
                        <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                          1 Suspicious Anomaly
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Monitored by <span className="font-semibold text-slate-800">{batch.employeeName}</span> • {batch.totalCameras} cameras verified
                      {batch.submittedAt && ` • Submitted at ${new Date(batch.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    type="button"
                    className="text-xs font-bold text-[#245CE2] flex items-center gap-1 hover:underline"
                  >
                    <span>{isExpanded ? 'Hide Camera Feeds' : 'View 10 Camera Snapshots'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Assessment Preview Box */}
              <div className="px-5 pb-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Operator Assessment:
                  </span>
                  <p className="text-slate-800 font-sans leading-relaxed">
                    {batch.overallAssessment}
                  </p>
                  {batch.actionsTaken && (
                    <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/50">
                      <strong>Action:</strong> {batch.actionsTaken}
                    </p>
                  )}
                </div>
              </div>

              {/* Expanded 10 Camera Snapshots Grid */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      10 Camera Snapshots & AI Detections ({batch.hourSlot}):
                    </span>
                    <button
                      onClick={() => navigate('/customer/feedback')}
                      className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Inquire on this Report
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {batch.snapshots.map((snap) => (
                      <CameraSnapshotCard
                        key={snap.id}
                        snapshot={snap}
                        batchId={batch.id}
                        isReadOnly={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
