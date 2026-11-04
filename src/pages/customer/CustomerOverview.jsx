import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  Clock,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from 'lucide-react';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const localDateFor = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const CustomerOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentCust, setCurrentCust] = useState(user?.customerProfile || null);
  const [customerAssignments, setCustomerAssignments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceError, setAttendanceError] = useState('');
  const [reports, setReports] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [totalComments, setTotalComments] = useState(0);
  const [unresolvedComments, setUnresolvedComments] = useState(0);
  const [attendanceWeek, setAttendanceWeek] = useState([]);
  const [reportError, setReportError] = useState('');

  const todayDateStr = localDate();

  useEffect(() => {
    let active = true;
    const from = new Date();
    from.setDate(from.getDate() - 6);
    Promise.all([
      adminApi.customers.me(),
      adminApi.assignments.list(),
      adminApi.schedules.list(),
      adminApi.shifts.list(),
      adminApi.attendance.customerShifts(todayDateStr),
      adminApi.attendance.summary({ date: todayDateStr }),
      adminApi.attendance.list({ date_from: localDateFor(from), date_to: todayDateStr }),
    ]).then(([customer, assignmentRows, scheduleRows, shiftRows, records, summary, week]) => {
      if (!active) return;
      setCurrentCust(customer);
      setCustomerAssignments(assignmentRows);
      setSchedules(scheduleRows);
      setShifts(shiftRows);
      setAttendanceRecords(records);
      setAttendanceSummary(summary);
      setAttendanceWeek(week);
      setAttendanceError('');
    }).catch((error) => {
      if (active) setAttendanceError(error.message);
    });
    return () => { active = false; };
  }, [todayDateStr]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi.reports.list(),
      adminApi.reports.summary({ date: todayDateStr }),
      adminApi.reports.allComments(),
    ]).then(([rows, summary, comments]) => {
      if (!active) return;
      setReports(rows);
      setReportSummary(summary);
      setTotalComments(comments.length);
      setUnresolvedComments(comments.filter((comment) => !comment.replies?.length).length);
      setReportError('');
    }).catch((error) => {
      if (active) setReportError(error.message);
    });
    return () => { active = false; };
  }, [todayDateStr]);

  // Customer-scoped APIs return only this account's data.
  const customerReports = reports;
  const reportsToday = customerReports.filter((r) => r.reportingDate === todayDateStr);

  const activeAssignments = customerAssignments.filter((assignment) => assignment.status === 'ACTIVE');
  const todaysSchedules = schedules.filter(
    (schedule) => schedule.shiftDate === todayDateStr && schedule.status !== 'CANCELLED'
  );
  const activeShiftIds = [...new Set(todaysSchedules.map((schedule) => schedule.shiftId))];

  const completedComments = totalComments - unresolvedComments;
  const attendanceTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = localDateFor(date);
    const day = attendanceWeek.filter((record) => record.shift_date === key);
    const attended = day.filter((record) => ['PRESENT', 'LATE'].includes(record.attendance_status)).length;
    return { day: date.toLocaleDateString([], { weekday: 'short' }), percent: day.length ? Math.round((attended / day.length) * 100) : 0 };
  });

  const shiftActivity = shifts.filter((shift) => activeShiftIds.includes(shift.id)).map((shift) => {
    const assignedStaff = todaysSchedules.filter((schedule) => schedule.shiftId === shift.id);
    const shiftReport = customerReports.find(
      (r) => r.shiftId === shift.id && r.reportingDate === todayDateStr
    );
    const shiftAttendance = attendanceRecords.find(
      (att) => att.shift_id === shift.id
    );

    return {
      shift,
      assignedStaff,
      shiftReport,
      shiftAttendance,
    };
  });

  if (!currentCust) {
    return <div role="status" className="p-6 text-sm text-slate-500">{reportError || attendanceError || 'Loading your customer portal...'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Client Transparency Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentCust.companyName}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Authorized Representative: <span className="text-white font-semibold">{currentCust.contactPerson}</span> • {currentCust.industry}
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Facility Address: {currentCust.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/customer/reports')}
              className="bg-[#245CE2] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              View Today's Reports
            </button>
            <button
              onClick={() => navigate('/customer/feedback')}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Feedback Discussions
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {reportError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{reportError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Personnel"
          value={activeAssignments.length}
          subtitle="On-site staff allocated"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Reports Today"
          value={reportsToday.length}
          subtitle={`Out of ${activeShiftIds.length} shifts`}
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="Active Shift Intervals"
          value={activeShiftIds.length}
          subtitle="Coverage windows"
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Total Feedback Notes"
          value={unresolvedComments}
          subtitle={`${completedComments} replied`}
          icon={MessageSquare}
          color="amber"
        />
      </div>

      {reportError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{reportError}</p>}
      {attendanceError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{attendanceError}</p>}
      {reportSummary && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
          <h3 className="mb-3 text-sm font-bold text-slate-900">Report submissions today</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">Submitted <b>{reportSummary.daily.submitted}</b></div>
            <div className="rounded-xl bg-slate-50 p-3">Pending <b>{reportSummary.daily.pending}</b></div>
            <div className="rounded-xl bg-slate-50 p-3">Updated <b>{reportSummary.daily.updated}</b></div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-subtle">
        <h3 className="mb-3 text-sm font-bold text-slate-900">7-day attendance trend</h3>
        <div className="grid grid-cols-7 gap-2">
          {attendanceTrend.map((day) => (
            <div key={day.day} className="text-center">
              <div className="flex h-16 items-end rounded-lg bg-slate-50 p-1">
                <div title={`${day.percent}%`} className="w-full rounded bg-blue-500" style={{ height: `${Math.max(day.percent, 3)}%` }} />
              </div>
              <span className="mt-1 block text-[10px] text-slate-500">{day.day}</span>
              <span className="text-[10px] font-semibold text-slate-700">{day.percent}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-subtle">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UserCheck className="h-4 w-4 text-[#245CE2]" /> Today's workforce attendance
            </h3>
            <p className="mt-1 text-xs text-slate-500">Live records for your assigned employees · displayed in your local timezone.</p>
          </div>
          <span className="text-xs text-slate-500">
            {attendanceSummary ? `${attendanceSummary.daily.total} records · ${attendanceSummary.daily.total_duration_hours} hours` : 'Loading attendance…'}
          </span>
        </div>
        {attendanceError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{attendanceError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
              <tr><th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Shift</th><th className="px-3 py-2.5">Check-in</th><th className="px-3 py-2.5">Check-out</th><th className="px-3 py-2.5">Hours</th><th className="px-3 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceRecords.length ? attendanceRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3 font-semibold">{record.employee_name}</td>
                  <td className="px-3 py-3">{record.shift_name}</td>
                  <td className="px-3 py-3 font-mono text-emerald-700">{record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                  <td className="px-3 py-3 font-mono text-blue-700">{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                  <td className="px-3 py-3 font-mono">{Number(record.duration_hours).toFixed(2)} h</td>
                  <td className="px-3 py-3"><Badge status={record.attendance_status} /></td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400">{attendanceError ? 'Attendance could not be loaded.' : 'No attendance records for today.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shift-Wise Real-Time Activity Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#245CE2]" />
              Today's Shift-Wise Activity & Handover Status
            </h3>
            <p className="text-xs text-slate-500">Live reporting status broken down by Morning, Afternoon and Night shifts</p>
          </div>
          <button
            onClick={() => navigate('/customer/shift-reports')}
            className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
          >
            Detailed Breakdown <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {shiftActivity.map(({ shift, assignedStaff, shiftReport, shiftAttendance }) => (
            <div
              key={shift.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs">{shift.name}</span>
                  <span className="text-[11px] font-mono text-[#245CE2] font-bold">
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>

                {/* Assigned staff */}
                <div className="text-xs text-slate-600 mb-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Deployed Personnel ({assignedStaff.length}):
                  </span>
                  {assignedStaff.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">No staff scheduled</span>
                  ) : (
                    assignedStaff.map((asg) => (
                      <div key={asg.id} className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {asg.employeeName}
                      </div>
                    ))
                  )}
                </div>

                {/* Report status */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Report Status:</span>
                    <Badge status={shiftReport ? `Submitted (v${shiftReport.version || 1})` : 'Awaiting Shift Wrap'} />
                  </div>
                  {shiftReport && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {shiftReport.workCompleted}
                    </p>
                  )}
                </div>
              </div>

              {shiftReport && (
                <button
                  onClick={() => setSelectedReport(shiftReport)}
                  className="mt-3 w-full py-1.5 bg-blue-50 text-[#245CE2] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors text-center"
                >
                  Inspect Shift Report &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Report Updates Stream */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Shift Handover Reports</h3>
            <p className="text-xs text-slate-500">Full audit trail of work logs delivered for {currentCust.companyName}</p>
          </div>
          <button
            onClick={() => navigate('/customer/reports')}
            className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
          >
            All Reports ({customerReports.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {customerReports.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No daily reports on file for your account yet.
            </div>
          ) : (
            customerReports.slice(0, 4).map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{rep.employeeName}</span>
                    <span className="text-[11px] text-slate-400">• {rep.shiftName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">• {rep.reportingDate}</span>
                    {rep.version > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#245CE2]">
                        v{rep.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {rep.workCompleted}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <Badge status={rep.status} />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(rep.updatedAt || rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
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
      />

      <VersionHistoryModal
        isOpen={!!historyReport}
        onClose={() => setHistoryReport(null)}
        report={historyReport}
      />
    </div>
  );
};
