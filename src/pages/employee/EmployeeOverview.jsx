import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useAttendance } from '../../context/AttendanceContext';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  History,
  FileCheck,
  Timer,
  PlayCircle,
  StopCircle,
} from 'lucide-react';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '--';

const formatStopwatch = (ms) => {
  if (ms == null || isNaN(ms) || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const EmployeeOverview = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees, assignments, shifts, showToast } = useApp();
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);
  const [myAttendance, setMyAttendance] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState('');

  const {
    todayShift,
    myShiftRows,
    todaySessions,
    completedSessions,
    totalCompletedHours,
    currentSessionNumber,
    activeAttendance: todayAttendance,
    isCheckedIn,
    isCheckedOut,
    stopwatchTime,
    punching,
    attendanceError,
    checkIn,
    checkOut,
    refreshAttendance,
  } = useAttendance();

  const activeEmp = (employees && employees.length > 0)
    ? (employees.find((e) => e.id === selectedEmployeeId) || employees[0])
    : null;

  // Active Approved assignments for this employee
  const empAssignments = activeEmp
    ? assignments.filter((a) => (a.employeeId === activeEmp.id || a.employee === activeEmp.id) && (a.status === 'Approved' || a.status === 'APPROVED' || a.status === 'ACTIVE'))
    : [];
  const primaryAssignment = empAssignments[0];
  const primaryShift = shifts.find((s) => s.id === (primaryAssignment ? (primaryAssignment.shiftId || primaryAssignment.shift) : activeEmp?.currentShiftId)) || shifts[0];

  // Today's attendance record
  const todayDateStr = localDate();
  const todayAttendanceStatus = isCheckedOut
    ? 'COMPLETED'
    : isCheckedIn
    ? (todayAttendance?.attendance_status || 'PRESENT')
    : (todayShift?.attendance_status || 'SCHEDULED');

  const loadAttendanceHistory = useCallback(async () => {
    try {
      const records = await adminApi.attendance.myAttendance();
      setMyAttendance(records || []);
    } catch {}
  }, []);

  useEffect(() => { loadAttendanceHistory(); }, [loadAttendanceHistory, isCheckedIn, isCheckedOut]);

  useEffect(() => {
    let active = true;
    adminApi.reports.list()
      .then((rows) => { if (active) setReports(rows); })
      .catch((error) => { if (active) setReportError(error.message); });
    return () => { active = false; };
  }, []);

  // Today's daily report
  const todayReport = reports.find(
    (r) => r.reportingDate === todayDateStr || r.shift_date === todayDateStr
  );

  // My past reports
  const myReports = reports;

  const handlePunch = async (action) => {
    try {
      if (action === 'in') {
        await checkIn();
      } else {
        await checkOut();
      }
      loadAttendanceHistory();
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Current Shift & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              On-Duty Field Terminal
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {activeEmp.name}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Staff ID: <span className="font-mono font-bold text-white">{activeEmp.employeeId}</span> • {activeEmp.roleTitle}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300 bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Assigned Customer Client
                </span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
                  {primaryAssignment ? primaryAssignment.customerName : 'Acme Industries'}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-white/20 hidden sm:block"></div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Shift Working Mode
                </span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Work-Based Punch &amp; Stopwatch
                </span>
              </div>
            </div>
          </div>

          {/* Shift Attendance & Live Stopwatch Working Time Widget */}
          <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/15 flex flex-col justify-between gap-4 min-w-[320px] shadow-lg">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Timer className={`w-3.5 h-3.5 ${isCheckedIn ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                  Shift Working Time
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                  isCheckedIn
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse'
                    : completedSessions && completedSessions.length > 0
                    ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                    : 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                }`}>
                  {isCheckedIn
                    ? `● On Duty (S${currentSessionNumber})`
                    : completedSessions && completedSessions.length > 0
                    ? `✓ ${completedSessions.length} Session${completedSessions.length === 1 ? '' : 's'} Done`
                    : 'Ready'}
                </span>
              </div>

              {/* Running Stopwatch in HH:MM:SS */}
              <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 my-2 text-center relative overflow-hidden">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">
                  {isCheckedIn
                    ? `Session ${currentSessionNumber} Stopwatch`
                    : completedSessions && completedSessions.length > 0
                    ? `Session ${completedSessions.length} Finished Duration`
                    : 'Shift Stopwatch'}
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-black text-white tracking-widest drop-shadow-md">
                  {stopwatchTime}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {isCheckedIn
                    ? `Session ${currentSessionNumber} In: ${formatTime(todayAttendance?.check_in)} (Live)`
                    : completedSessions && completedSessions.length > 0
                    ? `Last shift ended at ${formatTime(todayAttendance?.check_out)} • Ready for Session ${currentSessionNumber}`
                    : todayShift ? `${todayShift.shift_details?.customerName || primaryAssignment?.customerName || 'Assigned Site'} · Ready to begin` : 'Ready to start shift'}
                </p>
                {completedSessions && completedSessions.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-blue-200 font-medium">
                    Total today: <strong className="font-mono text-white">{totalCompletedHours.toFixed(2)}h</strong> across {completedSessions.length} shift session{completedSessions.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>

              {attendanceError && <p role="alert" className="mt-1 text-[11px] text-rose-200">{attendanceError}</p>}
            </div>

            {/* Check In / Check Out Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePunch('in')}
                disabled={isCheckedIn || punching}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <PlayCircle className="w-4 h-4" />
                {punching && !isCheckedIn
                  ? 'Starting…'
                  : completedSessions && completedSessions.length > 0
                  ? `Start Shift (S${currentSessionNumber})`
                  : 'Check In'}
              </button>
              <button
                onClick={() => handlePunch('out')}
                disabled={!isCheckedIn || punching}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <StopCircle className="w-4 h-4" />
                {punching && isCheckedIn ? 'Finishing…' : `Check Out (End S${currentSessionNumber})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Shift Sessions Multi-Session Summary Strip */}
      {todaySessions && todaySessions.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#245CE2]">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">Today's Shift Sessions ({todaySessions.length})</h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#245CE2] font-bold">
                  Total Logged: {totalCompletedHours.toFixed(2)} hrs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Flexible shift tracking: start and end sessions anytime during your workday.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {todaySessions.map((session, idx) => {
              const active = session.check_in && !session.check_out;
              return (
                <div
                  key={session.shift_assignment_id || idx}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                    active
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span className="font-bold text-[10px] uppercase">Session {idx + 1}:</span>
                  <span className="font-mono text-[11px]">
                    {formatTime(session.check_in)} – {session.check_out ? formatTime(session.check_out) : 'In Progress'}
                  </span>
                  {session.duration_hours != null && session.check_out && (
                    <span className="text-[10px] font-bold text-slate-500">
                      ({Number(session.duration_hours).toFixed(2)}h)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Allocations"
          value={empAssignments.length}
          subtitle="Approved client sites"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Shift Working Time"
          value={stopwatchTime}
          subtitle={
            isCheckedIn
              ? `Session ${currentSessionNumber} running (Live)`
              : completedSessions && completedSessions.length > 0
              ? `Total today: ${totalCompletedHours.toFixed(2)}h (${completedSessions.length} shifts)`
              : 'Not checked in'
          }
          icon={Timer}
          color={isCheckedIn ? 'emerald' : (completedSessions && completedSessions.length > 0 ? 'blue' : 'slate')}
        />
        <StatCard
          title="Daily Report Status"
          value={todayReport ? (todayReport.version > 1 ? `Submitted (v${todayReport.version})` : 'Submitted') : 'Pending Submission'}
          subtitle={todayReport ? 'Customer notified' : '1 per shift'}
          icon={FileText}
          color={todayReport ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Reports Submitted"
          value={myReports.length}
          subtitle="Historical handover logs"
          icon={History}
          color="purple"
        />
      </div>

      {/* Daily Report Callout Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 text-[#245CE2]">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {todayReport ? "Today's Shift Report is On File" : "Shift Daily Report Due Today"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {todayReport
                ? `You have submitted version ${todayReport.version}. You may review or revise it at any time during your shift.`
                : "Submit your work completed, pending tasks handover, obstacle flags, and attachments before shift conclusion."}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/employee/daily-report')}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md flex-shrink-0"
        >
          {todayReport ? (
            <>
              <History className="w-4 h-4" />
              View / Edit Today's Report
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Fill Daily Report Form
            </>
          )}
        </button>
      </div>

      {/* Two Column Section: Recent Reports & Weekly Attendance */}
      {reportError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{reportError}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Recent Daily Reports</h3>
              <p className="text-xs text-slate-500">Handover logs and revisions submitted by you</p>
            </div>
            <button
              onClick={() => navigate('/employee/history')}
              className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
            >
              Full History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {myReports.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No reports submitted yet.
              </div>
            ) : (
              myReports.slice(0, 3).map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{rep.customerName || rep.customer_name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({rep.reportingDate || rep.shift_date})</span>
                      {rep.version > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#245CE2]">
                          v{rep.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {rep.workCompleted || rep.work_summary}
                    </p>
                  </div>
                  <Badge status={rep.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Attendance Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Attendance Punch History</h3>
              <p className="text-xs text-slate-500">Biometric and self-service punch records</p>
            </div>
            <button
              onClick={() => navigate('/employee/attendance')}
              className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
            >
              Check-In Terminal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {attendanceError && <p role="alert" className="py-2 text-xs text-rose-600">{attendanceError}</p>}
            {myAttendance.slice(0, 4).map((att) => (
              <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{att.shift_date} • {att.shift_name}</span>
                  <span className="text-[11px] text-slate-400">
                    {att.customer_name}
                  </span>
                </div>
                <div className="text-right">
                  <Badge status={att.attendance_status} />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {att.check_in ? `${formatTime(att.check_in)} – ${att.check_out ? formatTime(att.check_out) : 'Open'}` : 'Absent'}
                  </p>
                </div>
              </div>
            ))}
            {!attendanceError && myAttendance.length === 0 && <p className="py-4 text-xs text-slate-400">No attendance records yet.</p>}
          </div>
        </div>
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
        onEditReport={(r) => {
          setSelectedReport(null);
          navigate('/employee/daily-report');
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
