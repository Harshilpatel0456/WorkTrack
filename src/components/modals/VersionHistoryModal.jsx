import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Clock, History } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

export const VersionHistoryModal = ({ isOpen, onClose, report }) => {
  const [versions, setVersions] = useState([]);
  const [selectedVerNumber, setSelectedVerNumber] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !report?.id) return;
    let active = true;
    setLoading(true);
    setError('');
    adminApi.reports.versions(report.id).then((rows) => {
      if (!active) return;
      const history = rows.map((row) => ({
        version: row.version_number,
        timestamp: row.modified_at,
        author: row.modified_by_name || 'WorkTrack user',
        summary: row.change_summary,
        title: row.title_snapshot,
        workCompleted: row.content_snapshot?.work_summary,
        pendingTasks: row.content_snapshot?.pending_tasks,
        issues: row.content_snapshot?.issues_or_blockers,
        additionalRemarks: row.content_snapshot?.additional_remarks,
        tasksCompleted: row.content_snapshot?.tasks_completed,
        previousContent: row.previous_content_snapshot,
      }));
      setVersions(history);
      setSelectedVerNumber(history[0]?.version || null);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, report?.id]);

  if (!report) return null;
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
          {loading && <p className="py-4 text-xs text-slate-400">Loading version history…</p>}
          {error && <p role="alert" className="py-3 text-xs text-rose-600">{error}</p>}
          {!loading && !error && !versions.length && <p className="py-4 text-xs text-slate-400">No version snapshots are available.</p>}
        </div>

        {/* Right Column: Version Details / Snapshot */}
        {activeVer && <div className="md:col-span-2 space-y-4">
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
            {activeVer.title && (
              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-slate-700">Report title</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800">{activeVer.title}</div>
              </div>
            )}
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
        </div>}
      </div>
    </Modal>
  );
};
