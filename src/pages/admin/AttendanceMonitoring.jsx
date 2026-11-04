import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { adminApi } from '../../services/adminApi';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  X,
} from 'lucide-react';

const localInputTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toUtc = (value) => value ? new Date(value).toISOString() : null;
const displayTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
  : '--';
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const AttendanceMonitoring = () => {
  const { showToast } = useApp();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [filters, setFilters] = useState({ employee: '', customer: '', shift: '', date: '', status: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attendance, report, employeeOptions, customerOptions, shiftOptions] = await Promise.all([
        adminApi.attendance.list(filters),
        adminApi.attendance.summary({ ...filters, date: filters.date || localDate() }),
        adminApi.employees.list(),
        adminApi.customers.list(),
        adminApi.shifts.list(),
      ]);
      setRecords(attendance);
      setSummary(report);
      setEmployees(employeeOptions);
      setCustomers(customerOptions);
      setShifts(shiftOptions);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRecords = records.filter((record) => {
    const query = search.trim().toLowerCase();
    return !query || [
      record.employee_name,
      record.customer_name,
      record.shift_name,
    ].some((value) => (value || '').toLowerCase().includes(query));
  });

  const startCorrection = (record) => setEditing({
    id: record.id,
    check_in: localInputTime(record.check_in),
    check_out: localInputTime(record.check_out),
    attendance_status: record.attendance_status,
    notes: record.notes || '',
  });

  const saveCorrection = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.attendance.correct(editing.id, {
        check_in: toUtc(editing.check_in),
        check_out: toUtc(editing.check_out),
        attendance_status: editing.attendance_status,
        notes: editing.notes,
      });
      setEditing(null);
      showToast('Attendance correction saved and audited');
      await loadData();
    } catch (requestError) {
      showToast(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const dailyStatuses = summary?.daily?.statuses || {};
  const totalHours = summary?.daily?.total_duration_hours || '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <UserCheck className="h-6 w-6 text-[#245CE2]" />
          Enterprise Attendance &amp; Punch Telemetry
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Attendance records, working duration, and administrator corrections. All times display in your local timezone.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Present / Late" value={(dailyStatuses.PRESENT || 0) + (dailyStatuses.LATE || 0)} subtitle="Daily records" icon={Clock} color="blue" />
        <StatCard title="Incomplete" value={dailyStatuses.INCOMPLETE || 0} subtitle="Missing check-out" icon={AlertCircle} color="amber" />
        <StatCard title="Absent" value={dailyStatuses.ABSENT || 0} subtitle="Missed shifts" icon={X} color="rose" />
        <StatCard title="Working Hours" value={totalHours} subtitle={`Overall records: ${summary?.overall?.total || 0}`} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-subtle">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, customer, shift…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#245CE2]" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select aria-label="Filter by employee" value={filters.employee} onChange={(e) => setFilters({ ...filters, employee: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</option>)}
          </select>
          <select aria-label="Filter by customer" value={filters.customer} onChange={(e) => setFilters({ ...filters, customer: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <option value="">All customers</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
          </select>
          <select aria-label="Filter by shift" value={filters.shift} onChange={(e) => setFilters({ ...filters, shift: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <option value="">All shifts</option>
            {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input aria-label="Filter by shift date" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="min-w-0 bg-transparent" />
          </label>
          <select aria-label="Filter by attendance status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <option value="">All statuses</option>
            {['PRESENT', 'ABSENT', 'LATE', 'INCOMPLETE'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button onClick={loadData} className="font-bold underline">Retry</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Employee</th><th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Shift</th><th className="px-4 py-3.5">Shift date</th>
                <th className="px-4 py-3.5">Check-in</th><th className="px-4 py-3.5">Check-out</th>
                <th className="px-4 py-3.5">Duration</th><th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-slate-400">Loading attendance…</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-slate-400">No attendance records match these filters.</td></tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{record.employee_name}</td>
                  <td className="px-4 py-3.5">{record.customer_name}</td>
                  <td className="px-4 py-3.5">{record.shift_name}</td>
                  <td className="px-4 py-3.5 font-mono">{record.shift_date}</td>
                  <td className="px-4 py-3.5 font-mono text-emerald-700">{displayTime(record.check_in)}</td>
                  <td className="px-4 py-3.5 font-mono text-blue-700">{displayTime(record.check_out)}</td>
                  <td className="px-4 py-3.5 font-mono">{Number(record.duration_hours).toFixed(2)} h</td>
                  <td className="px-4 py-3.5"><Badge status={record.attendance_status} /></td>
                  <td className="px-4 py-3.5"><button onClick={() => startCorrection(record)} className="font-bold text-[#245CE2] hover:underline">Correct</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="attendance-correction-title">
          <form onSubmit={saveCorrection} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="attendance-correction-title" className="font-bold text-slate-900">Correct attendance record</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close correction dialog"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500">The correction and before/after values will be recorded in the audit history.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-600">Check-in
                <input type="datetime-local" value={editing.check_in} onChange={(e) => setEditing({ ...editing, check_in: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-600">Check-out
                <input type="datetime-local" value={editing.check_out} onChange={(e) => setEditing({ ...editing, check_out: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2" />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-semibold text-slate-600">Status
              <select value={editing.attendance_status} onChange={(e) => setEditing({ ...editing, attendance_status: e.target.value })} className="w-full rounded-lg border border-slate-200 p-2">
                {['PRESENT', 'ABSENT', 'LATE', 'INCOMPLETE'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-slate-600">Notes
              <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows="3" className="w-full rounded-lg border border-slate-200 p-2" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold">Cancel</button>
              <button disabled={saving} className="rounded-lg bg-[#245CE2] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save correction'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
