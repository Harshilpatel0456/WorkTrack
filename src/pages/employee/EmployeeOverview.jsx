import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
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
} from 'lucide-react';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '--';

export const EmployeeOverview = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees, assignments, shifts, showToast } = useApp();
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);
  const [myShiftRows, setMyShiftRows] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [attendanceError, setAttendanceError] = useState('');
  const [punching, setPunching] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportError, setReportError] = useState('');

  const activeEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  // Active Approved assignments for this employee
  const empAssignments = assignments.filter(
    (a) => a.employeeId === activeEmp.id && a.status === 'Approved'
  );
  const primaryAssignment = empAssignments[0];
  const primaryShift = shifts.find((s) => s.id === (primaryAssignment ? primaryAssignment.shiftId : activeEmp.currentShiftId)) || shifts[0];

  // Today's attendance record
  const todayDateStr = localDate();
  const todayShift = myShiftRows.find((row) => row.shift_date === todayDateStr) || myShiftRows[0];
  const todayAttendance = todayShift?.attendance;
  const todayAttendanceStatus = todayShift?.attendance_status || 'SCHEDULED';

  const loadAttendance = useCallback(async () => {
    try {
      const [shiftRows, records] = await Promise.all([
        adminApi.attendance.myShifts(todayDateStr),
        adminApi.attendance.myAttendance(),
      ]);
      setMyShiftRows(shiftRows);
      setMyAttendance(records);
      setAttendanceError('');
    } catch (error) {
      setAttendanceError(error.message);
    }
  }, []);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  useEffect(() => {
    let active = true;
    adminApi.reports.list()
      .then((rows) => { if (active) setReports(rows); })
      .catch((error) => { if (active) setReportError(error.message); });
    return () => { active = false; };
  }, []);

  // Today's daily report
  const todayReport = reports.find(
    (r) => r.reportingDate === todayDateStr
  );

  // My past reports
  const myReports = reports;

  const handlePunch = async (action) => {
    if (!todayShift) {
      showToast('No assigned shift is available for attendance.', 'error');
      return;
    }
    setPunching(true);
    try {
      if (action === 'in') await adminApi.attendance.checkIn(todayShift.shift_assignment_id);
      else await adminApi.attendance.checkOut(todayShift.shift_assignment_id);
      showToast(`Shift ${action === 'in' ? 'check-in' : 'check-out'} recorded`);
      await loadAttendance();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setPunching(false);
    }
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
                  Active Shift Window
                </span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {primaryShift.name} ({primaryShift.startTime} – {primaryShift.endTime})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Check-In / Check-Out Widget */}
          <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/15 flex flex-col justify-between gap-4 min-w-[280px]">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-300 font-semibold">Today's Attendance</span>
                <Badge status={todayAttendanceStatus} />
              </div>
              <p className="text-[11px] text-slate-300">
                {todayAttendance?.check_in
                  ? `Checked in: ${formatTime(todayAttendance.check_in)}${todayAttendance.check_out ? ` • Out: ${formatTime(todayAttendance.check_out)}` : ''}`
                  : todayShift ? `${todayShift.shift_details.customerName} · ${todayShift.shift_details.shiftName}` : 'No shift assigned today.'}
              </p>
              {attendanceError && <p role="alert" className="mt-2 text-[11px] text-rose-200">{attendanceError}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePunch('in')}
                disabled={!todayShift || Boolean(todayAttendance?.check_in) || todayAttendanceStatus === 'ABSENT' || punching}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Check In
              </button>
              <button
                onClick={() => handlePunch('out')}
                disabled={!todayAttendance?.check_in || Boolean(todayAttendance?.check_out) || punching}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Check Out
              </button>
            </div>
          </div>
        </div>
      </div>

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
          title="Attendance Punch"
          value={todayAttendanceStatus}
          subtitle={todayAttendance?.check_in ? `At ${formatTime(todayAttendance.check_in)}` : 'Not checked in'}
          icon={UserCheck}
          color={todayAttendanceStatus === 'PRESENT' || todayAttendanceStatus === 'LATE' ? 'emerald' : 'blue'}
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
                      <span className="text-xs font-bold text-slate-900">{rep.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({rep.reportingDate})</span>
                      {rep.version > 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#245CE2]">
                          v{rep.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {rep.workCompleted}
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
