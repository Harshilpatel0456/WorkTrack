import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import {
  Layers,
  Clock,
  Sun,
  Sunset,
  Moon,
  Calendar,
  Building2,
  User,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const CustomerShiftReports = () => {
  const [reports, setReports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminApi.reports.list({ date: selectedDate }),
      adminApi.schedules.list({ shift_date: selectedDate }),
      adminApi.shifts.list(),
    ])
      .then(([reportRows, scheduleRows, shiftRows]) => {
        if (active) {
          setReports(reportRows);
          setSchedules(scheduleRows);
          setShifts(shiftRows);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedDate]);

  const getShiftIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('morning')) return <Sun className="w-5 h-5 text-amber-500" />;
    if (n.includes('afternoon')) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#245CE2]" />
            Shift-Wise Handover & Progression Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Compare operations sequentially across Morning, Afternoon, and Night shifts for continuous 24-hour transparency.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm self-start sm:self-auto text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="focus:outline-none text-slate-700 font-bold bg-transparent"
          />
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {loading && <div role="status" className="text-xs text-slate-500">Loading shift reports...</div>}

      {/* Three Columns: Morning, Afternoon, Night */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {shifts.filter((shift) => schedules.some((schedule) => schedule.shiftId === shift.id)).map((shift) => {
          // Find report for this shift and selected date
          const report = reports.find(
            (r) =>
              r.shiftId === shift.id &&
              r.reportingDate === selectedDate
          );

          // Find assigned staff for this shift
          const assignedStaff = schedules.filter(
            (schedule) => schedule.shiftId === shift.id
              && schedule.shiftDate === selectedDate
              && schedule.status !== 'CANCELLED'
          );

          return (
            <div
              key={shift.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between"
            >
              <div>
                {/* Shift Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      {getShiftIcon(shift.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{shift.name}</h3>
                      <p className="text-[11px] font-mono text-[#245CE2] font-semibold">
                        {shift.startTime} – {shift.endTime}
                      </p>
                    </div>
                  </div>
                  <Badge status={report ? 'Handover Logged' : 'Awaiting Report'} />
                </div>

                {/* Deployed Personnel */}
                <div className="mb-4 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Scheduled Team:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {assignedStaff.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">No staff assigned</span>
                    ) : (
                      assignedStaff.map((asg) => (
                        <span
                          key={asg.id}
                          className="bg-blue-50 text-[#245CE2] font-semibold text-[11px] px-2 py-0.5 rounded-md"
                        >
                          {asg.employeeName}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Report Content */}
                {report ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Completed Work
                      </span>
                      <p className="text-slate-700 line-clamp-4 leading-relaxed font-sans whitespace-pre-line">
                        {report.workCompleted}
                      </p>
                    </div>

                    {report.pendingTasks && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                          Handed to Next Shift:
                        </span>
                        <p className="text-amber-950 text-[11px] line-clamp-2">
                          {report.pendingTasks}
                        </p>
                      </div>
                    )}

                    {report.issues && (
                      <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                          Incident / Bottleneck Flag:
                        </span>
                        <p className="text-rose-950 text-[11px] line-clamp-2">
                          {report.issues}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                    <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    No shift report filed for {shift.name} on {selectedDate}.
                  </div>
                )}
              </div>

              {report && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    v{report.version} • {new Date(report.updatedAt || report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => setSelectedReport(report)}
                    className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review Report
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onOpenVersionHistory={(r) => {
          setSelectedReport(null);
          setHistoryReport(r);
        }}
      />

      <VersionHistoryModal
        isOpen={!!historyReport}
        onClose={() => setHistoryReport(null)}
        report={historyReport}
      />
    </div>
  );
};
