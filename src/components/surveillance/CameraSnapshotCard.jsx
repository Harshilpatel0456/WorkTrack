import React, { useState } from 'react';
import {
  Camera,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Eye,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const CameraSnapshotCard = ({ snapshot, batchId, onVerify, isReadOnly = false }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(snapshot.employeeNotes || '');

  const handleStatusChange = (newStatus) => {
    if (isReadOnly) return;
    onVerify(batchId, snapshot.id, newStatus, notesText);
  };

  const handleSaveNotes = () => {
    onVerify(batchId, snapshot.id, snapshot.employeeVerification, notesText);
    setIsEditingNotes(false);
  };

  const isSuspicious = snapshot.employeeVerification === 'Flagged Suspicious' || snapshot.aiStatus === 'Suspicious';

  // Realistic visual mockup for each camera angle
  const getCameraVisual = (type = '', isAnomaly) => {
    let bgColor = 'from-slate-900 to-slate-950';
    let label = 'CAMERA LIVE SNAPSHOT';
    const safeType = String(type || '').toLowerCase();

    if (safeType.includes('register')) {
      label = isAnomaly ? 'UNATTENDED CASH DRAWER DETECTED' : 'FRONT CASH REGISTER #1 & #2';
    } else if (safeType.includes('safe')) {
      label = isAnomaly ? 'HUMAN DETECTED AT SAFE VAULT' : 'SAFE ROOM - RESTRICTED ACCESS';
    } else if (safeType.includes('jewelry')) {
      label = 'LOCKED DISPLAY CABINET - HIGH VALUE';
    } else if (safeType.includes('exit')) {
      label = 'EMERGENCY REAR ALLEYWAY EXIT';
    } else if (safeType.includes('loading')) {
      label = 'FREIGHT RECEIVING DOCK';
    } else if (safeType.includes('entrance')) {
      label = 'FRONT ENTRANCE & TURNSTILES';
    }

    return (
      <div className={`relative h-44 rounded-xl overflow-hidden bg-gradient-to-b ${bgColor} border border-slate-800 p-3 flex flex-col justify-between select-none`}>
        {/* Subtle grid pattern for CCTV simulation */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Top CCTV Overlay */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-bold text-rose-400">REC</span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-white">{snapshot.cameraId}</span>
          </div>
          <span className="text-slate-400">{snapshot.time}</span>
        </div>

        {/* Center Frame Graphic / Human Detection Bounding Box */}
        <div className="relative z-10 flex items-center justify-center flex-1">
          {snapshot.humanDetected ? (
            <div className={`border-2 border-dashed ${isAnomaly ? 'border-rose-500 bg-rose-500/10' : 'border-emerald-400 bg-emerald-400/10'} rounded-lg p-2.5 px-4 text-center backdrop-blur-xs`}>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-white mb-0.5">
                <User className={`w-3.5 h-3.5 ${isAnomaly ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>{snapshot.humanCount} Human{snapshot.humanCount > 1 ? 's' : ''} Detected</span>
              </div>
              <span className={`text-[10px] font-mono font-bold ${isAnomaly ? 'text-rose-300' : 'text-emerald-300'}`}>
                AI Confidence: {snapshot.aiConfidence}
              </span>
            </div>
          ) : (
            <div className="border border-slate-700/60 rounded-lg p-2 text-center text-slate-500 text-[11px]">
              <span>Zero Human Motion Detected</span>
            </div>
          )}
        </div>

        {/* Bottom CCTV Zone Overlay */}
        <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-black/40 -mx-3 -mb-3 px-3 py-1.5 border-t border-slate-800/80">
          <span className="truncate">{label}</span>
          <span className="text-slate-300 font-bold">{snapshot?.zone ? snapshot.zone.split('(')[0] : 'Store Hotspot'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between ${
      isSuspicious
        ? 'border-amber-300 shadow-md ring-1 ring-amber-400/30'
        : 'border-slate-200/80 shadow-subtle hover:shadow-card'
    }`}>
      <div>
        {/* Header: Camera Name & High Risk Hotspot Badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#245CE2]" />
              <h4 className="font-bold text-slate-900 text-xs truncate max-w-[200px]">
                {snapshot.cameraName}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{snapshot.zone}</p>
          </div>

          {snapshot.isHighRisk && (
            <span className="flex-shrink-0 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              Robbery Hotspot
            </span>
          )}
        </div>

        {/* Simulated CCTV Snapshot Viewport */}
        {getCameraVisual(snapshot.simulatedVisual || 'normal', snapshot.aiStatus === 'Suspicious')}

        {/* AI Pre-Analysis Callout Banner */}
        <div className={`mt-3 p-2.5 rounded-xl border text-xs leading-relaxed ${
          snapshot.aiStatus === 'Suspicious'
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Snapshot Pre-Analysis:
            </span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
              snapshot.aiStatus === 'Suspicious'
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-emerald-600 text-white'
            }`}>
              {snapshot.aiStatus === 'Suspicious' ? 'SUSPICIOUS' : 'OK / NORMAL'}
            </span>
          </div>
          <p className="text-[11px]">{snapshot.aiAnalysis}</p>
        </div>

        {/* Human Operator Review Section */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
              Human Operator Verification:
            </span>
            <span className={`font-bold text-[11px] ${
              snapshot.employeeVerification === 'Flagged Suspicious'
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}>
              {snapshot.employeeVerification}
            </span>
          </div>

          {!isReadOnly && onVerify && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleStatusChange('Verified OK')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border ${
                  snapshot.employeeVerification === 'Verified OK'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified OK
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('Flagged Suspicious')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border ${
                  snapshot.employeeVerification === 'Flagged Suspicious'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-rose-50 text-slate-600 border-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag Suspicious
              </button>
            </div>
          )}

          {/* Operator notes */}
          {isEditingNotes ? (
            <div className="mt-2 space-y-1.5">
              <input
                type="text"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Operator observations, supervisor notified..."
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#245CE2]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-2 py-0.5 text-[11px] text-slate-500 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-2.5 py-0.5 bg-[#245CE2] text-white text-[11px] font-bold rounded"
                >
                  Save Note
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !isReadOnly && setIsEditingNotes(true)}
              className={`p-2 rounded-lg bg-slate-50 text-[11px] text-slate-600 leading-tight ${!isReadOnly ? 'cursor-pointer hover:bg-slate-100' : ''}`}
            >
              <span className="font-semibold text-slate-800">Operator Note: </span>
              {snapshot.employeeNotes || (isReadOnly ? 'No notes.' : 'Click to add observation...')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
