import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CameraSnapshotCard } from '../../components/surveillance/CameraSnapshotCard';
import { Badge } from '../../components/common/Badge';
import { INITIAL_HOURLY_SURVEILLANCE_BATCHES } from '../../data/initialData';
import {
  Camera,
  ShieldAlert,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';

export const HourlySurveillance = () => {
  const { selectedEmployeeId } = useAuth();
  const {
    surveillanceBatches = [],
    updateSnapshotVerification,
    submitHourlySurveillanceBatch,
    employees = [],
    customers = [],
    resetDemoData,
  } = useApp();

  const currentEmp = employees?.find((e) => e.id === selectedEmployeeId) || employees?.[0] || { id: 'emp-1', name: 'Aarav Shah' };
  const primaryCustomer = customers?.[0] || { id: 'cust-1', companyName: 'Acme Retail Store #104 (US Flagship)' };

  // Guarantee valid list of batches
  const rawBatches = Array.isArray(surveillanceBatches) && surveillanceBatches.length > 0
    ? surveillanceBatches
    : INITIAL_HOURLY_SURVEILLANCE_BATCHES;

  // Filter batches for this store or fallback to all batches
  const batches = rawBatches.filter((b) => b?.customerId === primaryCustomer?.id).length > 0
    ? rawBatches.filter((b) => b?.customerId === primaryCustomer?.id)
    : rawBatches;

  const [selectedBatchId, setSelectedBatchId] = useState(() => batches[0]?.id || 'cctv-batch-14');

  const activeBatch = batches.find((b) => b?.id === selectedBatchId) || batches[0] || null;

  const [assessmentText, setAssessmentText] = useState(activeBatch?.overallAssessment || '');
  const [actionsText, setActionsText] = useState(activeBatch?.actionsTaken || '');

  // Keep text updated when switching batches
  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    const b = batches.find((x) => x?.id === batchId);
    if (b) {
      setAssessmentText(b?.overallAssessment || '');
      setActionsText(b?.actionsTaken || '');
    }
  };

  const handleVerify = (bId, snapshotId, verifiedStatus, employeeNotes) => {
    if (updateSnapshotVerification) {
      updateSnapshotVerification(bId, snapshotId, verifiedStatus, employeeNotes);
    }
  };

  const handleSubmitBatch = (e) => {
    e.preventDefault();
    if (!activeBatch?.id) return;

    if (submitHourlySurveillanceBatch) {
      submitHourlySurveillanceBatch(
        activeBatch.id,
        assessmentText,
        actionsText
      );
    }
  };

  const isSubmitted = activeBatch?.status === 'Submitted';
  const snapshots = activeBatch?.snapshots || [];
  const suspiciousCount = snapshots.filter((s) => s?.employeeVerification === 'Flagged Suspicious').length;

  if (!activeBatch) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#245CE2] flex items-center justify-center mx-auto">
          <Camera className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Surveillance Batches Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          There are currently no active CCTV surveillance batches loaded. Click below to load the verified demo store feeds.
        </p>
        {resetDemoData && (
          <button
            onClick={resetDemoData}
            className="px-4 py-2 bg-[#245CE2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Demo Surveillance Batches
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#245CE2]" />
            Hourly CCTV Surveillance & Human Detection Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store #104 periodic verification. Inspect hourly snapshot feeds, confirm AI human detections, flag cash/safe robbery risks, and submit hourly audits.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-500">Store:</span>
          <span className="font-bold text-slate-800 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
            {primaryCustomer?.companyName || 'Store #104'}
          </span>
        </div>
      </div>

      {/* Hourly Batches Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Today's Hourly Batches:
          </span>
          {batches.map((batch) => {
            const isSelected = batch.id === selectedBatchId;
            const hasSuspicious = (batch?.flaggedSuspiciousCount || 0) > 0;

            return (
              <button
                key={batch.id}
                onClick={() => handleSelectBatch(batch.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#245CE2] text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{batch.hourSlot || 'Batch'}</span>
                {batch.status === 'Submitted' ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${hasSuspicious ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Batch Status:</span>
          <Badge status={activeBatch.status} />
        </div>
      </div>

      {/* Operational Workflow Context Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3.5 text-xs text-blue-950">
        <Sparkles className="w-5 h-5 text-[#245CE2] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Hourly Operational Protocol:</span>
          <p className="text-blue-800 leading-relaxed">
            Store cameras capture periodic snapshot sets every 1 hour across all 10 cameras (including high-risk robbery areas: Cash Register #1, Register #2, and the Safe Room). As the assigned surveillance operator, verify each image, confirm or override the AI pre-analysis, and submit the hourly report. The store client receives automated notifications per their preferred alert frequency.
          </p>
        </div>
      </div>

      {/* Active Batch Summary & Quick Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px] block">Hour Window</span>
          <span className="font-bold text-slate-900 text-sm mt-0.5 block">{activeBatch.hourSlot || 'Current Hour'} Today</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px] block">Cameras Captured</span>
          <span className="font-bold text-[#245CE2] text-sm mt-0.5 block">{activeBatch.totalCameras || snapshots.length} Cameras Online</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px] block">High-Risk Robbery Zones</span>
          <span className="font-bold text-rose-700 text-sm mt-0.5 block">5 Hotspots Active</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-bold text-[10px] block">Flagged Suspicious</span>
          <span className={`font-bold text-sm mt-0.5 block ${suspiciousCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {suspiciousCount > 0 ? `${suspiciousCount} Anomaly Flagged` : '0 (All Clear)'}
          </span>
        </div>
      </div>

      {/* Grid of Camera Snapshots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#245CE2]" />
            Camera Snapshots for {activeBatch.hourSlot} ({snapshots.length} Feeds)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            AI Human Detection Telemetry Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {snapshots.map((snap) => (
            <CameraSnapshotCard
              key={snap.id}
              snapshot={snap}
              batchId={activeBatch.id}
              onVerify={handleVerify}
              isReadOnly={isSubmitted}
            />
          ))}
        </div>
      </div>

      {/* Hourly Summary Submission Form */}
      <form onSubmit={handleSubmitBatch} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#245CE2]" />
          Operator Overall Shift Assessment & Client Notification ({activeBatch.hourSlot})
        </h3>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Overall Security Summary for this Hour *
          </label>
          <textarea
            required
            rows={2}
            value={assessmentText}
            onChange={(e) => setAssessmentText(e.target.value)}
            placeholder="e.g. Store security operating normally. Front cash registers active. Safe room empty and secured..."
            disabled={isSubmitted}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:opacity-70 leading-relaxed font-sans"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
            Operational Actions Taken
          </label>
          <textarea
            rows={2}
            value={actionsText}
            onChange={(e) => setActionsText(e.target.value)}
            placeholder="e.g. Radioed floor supervisor regarding register drawer. Verified cash count intact..."
            disabled={isSubmitted}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] disabled:opacity-70 leading-relaxed font-sans"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Submitting dispatches a notification to the store owner per their chosen notification frequency.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitted}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
              isSubmitted
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-[#245CE2] hover:bg-[#1A45B0] text-white shadow-blue-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitted ? `Report Submitted (${activeBatch.hourSlot})` : `Submit Hourly Report (${activeBatch.hourSlot})`}
          </button>
        </div>
      </form>
    </div>
  );
};
