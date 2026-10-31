import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Clock, User, History, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import { Badge } from '../common/Badge';

export const VersionHistoryModal = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  const versions = report.versionHistory || [
    {
      version: report.version || 1,
      timestamp: report.updatedAt || report.createdAt,
      author: `${report.employeeName} (Author)`,
      summary: 'Current version',
      workCompleted: report.workCompleted,
      pendingTasks: report.pendingTasks,
      issues: report.issues,
      additionalRemarks: report.additionalRemarks,
    }
  ];

  // Selected version to view diff
  const [selectedVerNumber, setSelectedVerNumber] = useState(versions[0]?.version || 1);
  const activeVer = versions.find(v => v.version === selectedVerNumber) || versions[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Version History & Revision Audit"
      subtitle={`Audit trail for Report #${report.id.slice(-6)} • ${report.shiftName} (${report.customerName})`}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Version Timeline */}
        <div className="md:col-span-1 border-r border-slate-100 pr-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Revision Timeline ({versions.length})
          </div>

          <div className="space-y-2">
            {versions.map((ver) => {
              const isSelected = ver.version === selectedVerNumber;
              const isLatest = ver.version === Math.max(...versions.map(v => v.version));

              return (
                <div
                  key={ver.version}
                  onClick={() => setSelectedVerNumber(ver.version)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#245CE2]" />
                      Version {ver.version}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                    {ver.summary || 'Shift update'}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ver.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Version Details / Snapshot */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div>
              <span className="text-xs font-bold text-slate-900">
                Viewing Revision {activeVer.version}
              </span>
              <p className="text-[11px] text-slate-500">
                Edited by <span className="font-semibold text-slate-700">{activeVer.author}</span>
              </p>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {new Date(activeVer.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Change Log / Revision Note
              </label>
              <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-slate-800 font-medium">
                {activeVer.summary || 'No custom note provided for this revision.'}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                1. Work Completed
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line text-slate-800 font-sans leading-relaxed">
                {activeVer.workCompleted}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                2. Pending Tasks Handed Over
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line text-slate-800 font-sans leading-relaxed">
                {activeVer.pendingTasks || 'No pending tasks recorded.'}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                3. Issues / Challenges Encountered
              </label>
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 whitespace-pre-line text-amber-950 font-sans leading-relaxed">
                {activeVer.issues || 'No obstacles reported.'}
              </div>
            </div>

            {activeVer.additionalRemarks && (
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  4. Additional Remarks
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line text-slate-800 font-sans leading-relaxed">
                  {activeVer.additionalRemarks}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
