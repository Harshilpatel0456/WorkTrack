import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { adminApi } from '../../services/adminApi';
import {
  AlertCircle,
  Calendar,
  Clock,
  PlayCircle,
  ShieldCheck,
  StopCircle,
  Timer,
} from 'lucide-react';

const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  : '--:--';

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatDuration = (value) => value == null ? '--' : `${Number(value).toFixed(2)} h`;

export const EmployeeAttendance = () => {
  const { showToast } = useApp();
  const [shifts, setShifts] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busyShift, setBusyShift] = useState(null);
  const [error, setError] = useState('');

  const loadAttendance = useCallback(async () => {
    setError('');
    try {
      const [todayShifts, records] = await Promise.all([
        adminApi.attendance.myShifts(localDate()),
        adminApi.attendance.myAttendance(),
      ]);
      setShifts(todayShifts);
      setHistory(records);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const punch = async (item, action) => {
    setBusyShift(item.shift_assignment_id);
    try {
      if (action === 'in') await adminApi.attendance.checkIn(item.shift_assignment_id);
      else await adminApi.attendance.checkOut(item.shift_assignment_id);
      showToast(`Shift ${action === 'in' ? 'check-in' : 'check-out'} recorded`);
      await loadAttendance();
    } catch (requestError) {
      showToast(requestError.message, 'error');
    } finally {
      setBusyShift(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <Clock className="h-6 w-6 text-[#245CE2]" />
          Shift Attendance &amp; Punch Terminal
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Your assigned shifts and attendance records. Times are shown in your local timezone.
        </p>
      </div>

      <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card sm:flex-row sm:p-8">
        <div className="text-center sm:text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-[#245CE2]">
            <Timer className="h-3.5 w-3.5" /> Local system time
          </div>
          <div className="font-mono text-4xl font-black tracking-tight text-slate-900">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 sm:justify-start">
            <Calendar className="h-4 w-4 text-slate-400" />
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Punches are validated against assigned shift times.
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <button onClick={loadAttendance} className="ml-auto font-bold underline">Retry</button>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Today's assigned shifts</h3>
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400">Loading assigned shifts…</div>
        ) : shifts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No shifts are assigned for today.
          </div>
        ) : shifts.map((item) => {
          const shift = item.shift_details;
          const attendance = item.attendance;
          const checkedIn = Boolean(attendance?.check_in && !attendance?.check_out);
          const completed = Boolean(attendance?.check_out);
          const locked = Boolean(attendance?.check_in || attendance?.check_out);
          return (
            <article key={item.shift_assignment_id} className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-subtle lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-slate-900">{shift.shiftName}</h4>
                  <Badge status={item.attendance_status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {shift.customerName} · {item.shift_date} · {shift.shiftStartTime}–{shift.shiftEndTime}
                  {shift.isOvernight ? ' (overnight)' : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <span className="text-slate-500">Check-in <strong className="ml-1 font-mono text-emerald-700">{formatTime(attendance?.check_in)}</strong></span>
                  <span className="text-slate-500">Check-out <strong className="ml-1 font-mono text-blue-700">{formatTime(attendance?.check_out)}</strong></span>
                  <span className="text-slate-500">Duration <strong className="ml-1 font-mono text-slate-900">{formatDuration(attendance?.duration_hours)}</strong></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:min-w-64">
                <button
                  onClick={() => punch(item, 'in')}
                  disabled={locked || item.attendance_status === 'ABSENT' || busyShift === item.shift_assignment_id}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <PlayCircle className="h-4 w-4" /> Check in
                </button>
                <button
                  onClick={() => punch(item, 'out')}
                  disabled={!checkedIn || completed || busyShift === item.shift_assignment_id}
                  className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <StopCircle className="h-4 w-4" /> Check out
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-subtle">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">Attendance history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Shift date</th><th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Shift</th><th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th><th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((record) => (
                <tr key={record.id}>
                  <td className="px-5 py-3 font-mono">{record.shift_date}</td>
                  <td className="px-4 py-3">{record.customer_name}</td>
                  <td className="px-4 py-3">{record.shift_name}</td>
                  <td className="px-4 py-3 font-mono text-emerald-700">{formatTime(record.check_in)}</td>
                  <td className="px-4 py-3 font-mono text-blue-700">{formatTime(record.check_out)}</td>
                  <td className="px-4 py-3 font-mono">{formatDuration(record.duration_hours)}</td>
                  <td className="px-4 py-3"><Badge status={record.attendance_status} /></td>
                </tr>
              ))}
              {!loading && history.length === 0 && (
                <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400">No attendance records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
