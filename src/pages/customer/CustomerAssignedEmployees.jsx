import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { adminApi } from '../../services/adminApi';
import {
  Users,
  Clock,
  UserCheck,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
} from 'lucide-react';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const CustomerAssignedEmployees = () => {
  const { user } = useAuth();
  const [currentCust, setCurrentCust] = useState(user?.customerProfile || null);
  const [custAssignments, setCustAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [reports, setReports] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(localDate);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      adminApi.customers.me(),
      adminApi.assignments.list(),
      adminApi.customers.myEmployees(),
      adminApi.schedules.list(),
      adminApi.shifts.list(),
      adminApi.reports.list(),
    ]).then(([customer, assignmentRows, employeeRows, scheduleRows, shiftRows, reportRows]) => {
      if (!active) return;
      setCurrentCust(customer);
      setCustAssignments(assignmentRows.filter((assignment) => assignment.status === 'ACTIVE'));
      setEmployees(employeeRows);
      setSchedules(scheduleRows);
      setShifts(shiftRows);
      setReports(reportRows);
    }).catch((error) => { if (active) setAttendanceError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setAttendanceLoading(true);
    setAttendanceError('');
    Promise.all([
      adminApi.attendance.customerShifts(attendanceDate),
      adminApi.attendance.summary({
        date: attendanceDate,
        employee: employeeFilter,
        shift: shiftFilter,
      }),
      adminApi.attendance.list({
        date_from: dateFrom,
        date_to: dateTo,
        employee: employeeFilter,
        shift: shiftFilter,
      }),
    ]).then(([records, summary, history]) => {
      if (!active) return;
      setAttendanceRecords(records);
      setAttendanceSummary(summary);
      setAttendanceHistory(history);
    }).catch((error) => {
      if (active) setAttendanceError(error.message);
    }).finally(() => {
      if (active) setAttendanceLoading(false);
    });
    return () => { active = false; };
  }, [attendanceDate, dateFrom, dateTo, employeeFilter, shiftFilter]);

  const formatAttendanceTime = (value) => value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--';

  const filteredAttendance = (dateFrom || dateTo ? attendanceHistory : attendanceRecords).filter((record) =>
    (!employeeFilter || record.employee_id === employeeFilter)
    && (!shiftFilter || record.shift_id === shiftFilter)
  );
  const rangeStatusCounts = filteredAttendance.reduce((counts, record) => {
    counts[record.attendance_status] = (counts[record.attendance_status] || 0) + 1;
    return counts;
  }, {});
  const attendanceStats = dateFrom || dateTo
    ? { total: filteredAttendance.length, statuses: rangeStatusCounts }
    : attendanceSummary?.daily;
  if (!currentCust) {
    return <div role="status" className="p-6 text-sm text-slate-500">{attendanceError || 'Loading your assigned employees...'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#245CE2]" />
            Assigned Personnel & On-Site Workforce
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Certified personnel allocated to {currentCust.companyName} across operational shifts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#245CE2] px-3.5 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          {custAssignments.length} Verified Staff Allocated
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Attendance dashboard</h3>
            <p className="mt-1 text-xs text-slate-500">Records for employees assigned to your customer account.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Attendance date
            <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">From
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-xs font-semibold text-slate-600">To
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Employee
            <select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="">All employees</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Shift
            <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="">All shifts</option>
              {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
            </select>
          </label>
        </div>

        {attendanceError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{attendanceError}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Records', attendanceStats?.total ?? 0],
            ['Present', attendanceStats?.statuses?.PRESENT ?? 0],
            ['Late', attendanceStats?.statuses?.LATE ?? 0],
            ['Incomplete / absent', (attendanceStats?.statuses?.INCOMPLETE ?? 0) + (attendanceStats?.statuses?.ABSENT ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
              <strong className="mt-1 block text-lg text-slate-900">{attendanceLoading ? '…' : value}</strong>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
              <tr><th className="px-3 py-2.5">Employee</th><th className="px-3 py-2.5">Shift</th><th className="px-3 py-2.5">Check-in</th><th className="px-3 py-2.5">Check-out</th><th className="px-3 py-2.5">Hours</th><th className="px-3 py-2.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLoading ? (
                <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400">Loading attendance…</td></tr>
              ) : filteredAttendance.length === 0 ? (
                <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-400">No attendance records for this date.</td></tr>
              ) : filteredAttendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3 font-semibold text-slate-800">{record.employee_name}</td>
                  <td className="px-3 py-3">{record.shift_name}</td>
                  <td className="px-3 py-3 font-mono text-emerald-700">{formatAttendanceTime(record.check_in)}</td>
                  <td className="px-3 py-3 font-mono text-blue-700">{formatAttendanceTime(record.check_out)}</td>
                  <td className="px-3 py-3 font-mono">{Number(record.duration_hours).toFixed(2)} h</td>
                  <td className="px-3 py-3"><Badge status={record.attendance_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attendanceSummary && <p className="text-right text-[11px] text-slate-400">Overall tracked hours: {attendanceSummary.overall.total_duration_hours}</p>}
      </section>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {custAssignments.length === 0 ? (
          <div className="col-span-3 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No employees currently allocated to this client organization.
          </div>
        ) : (
          custAssignments.map((asg) => {
            const emp = employees.find((e) => e.id === asg.employeeId);
            const employeeSchedule = schedules.find(
              (schedule) => schedule.employeeId === asg.employeeId
                && schedule.shiftDate === attendanceDate
                && schedule.status !== 'CANCELLED'
            );
            const shift = shifts.find((s) => s.id === employeeSchedule?.shiftId);

            const att = attendanceRecords.find(
              (record) => record.employee_id === asg.employeeId && record.shift_date === attendanceDate
            );

            const rep = reports.find(
              (r) => r.employeeId === asg.employeeId && r.reportingDate === attendanceDate
            );

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Avatar, Name & ID */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <img
                      src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={emp?.fullName || asg.employeeName}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{emp?.fullName || asg.employeeName}</h3>
                      <p className="text-[11px] font-mono text-[#245CE2] font-semibold">{emp?.employeeId}</p>
                      <p className="text-[11px] text-slate-400 truncate">{emp?.department || emp?.roleTitle}</p>
                    </div>
                  </div>

                  {/* Shift Information */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#245CE2]" /> Shift Window:
                      </span>
                      <span className="font-bold text-slate-800">{shift?.name || employeeSchedule?.shiftName || 'No shift scheduled'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Timings:</span>
                      <span className="font-mono text-slate-700 font-semibold text-[11px]">
                        {shift ? `${shift.startTime} – ${shift.endTime}` : '--'}
                      </span>
                    </div>
                  </div>

                  {/* Statuses: Attendance & Latest Report */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Attendance:
                      </span>
                      <Badge status={att ? att.attendance_status : 'Scheduled'} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> Daily Report:
                      </span>
                      <Badge status={rep ? `Submitted (v${rep.version || 1})` : 'Pending'} />
                    </div>
                  </div>
                </div>

                {/* Footer contact button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{emp?.email}</span>
                  <span className="font-bold text-[#245CE2]">Active Staff</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
