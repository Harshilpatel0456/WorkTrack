import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import {
  UserCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
} from 'lucide-react';

export const AttendanceMonitoring = () => {
  const { attendance, employees, customers, shifts } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  // KPIs
  const checkedInCount = attendance.filter((a) => a.status === 'Checked In').length;
  const completedCount = attendance.filter((a) => a.status === 'Checked Out').length;
  const scheduledCount = attendance.filter((a) => a.status === 'Scheduled').length;
  const missedCount = attendance.filter((a) => a.status === 'Missed').length;

  const filteredAttendance = attendance.filter((att) => {
    const matchesSearch =
      att.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.shiftName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || att.status === statusFilter;
    const matchesDate = !dateFilter || att.date === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#245CE2]" />
            Enterprise Attendance & Punch Telemetry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time biometric punch logs, shift check-in times, calculated durations, and adherence tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="On Shift Right Now"
          value={checkedInCount}
          subtitle="Actively checked in"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Completed Shifts"
          value={completedCount}
          subtitle="Checked out successfully"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Upcoming / Scheduled"
          value={scheduledCount}
          subtitle="Pending start time"
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="Exceptions / Missed"
          value={missedCount}
          subtitle="Zero attendance flag"
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, customer, shift..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Date */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[11px] text-[#245CE2] hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status */}
          <div className="w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Checked In">Checked In</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Missed">Missed</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Employee</th>
                <th className="py-3.5 px-4">Client Customer</th>
                <th className="py-3.5 px-4">Shift</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check In</th>
                <th className="py-3.5 px-4">Check Out</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[11px] text-slate-700">
                          {att.employeeName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{att.employeeName}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {att.customerName}
                    </td>

                    {/* Shift */}
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded text-[11px]">
                        {att.shiftName}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {att.date}
                    </td>

                    {/* Check In */}
                    <td className="py-3.5 px-4 font-mono text-emerald-700 font-semibold">
                      {att.checkInTime || '--'}
                    </td>

                    {/* Check Out */}
                    <td className="py-3.5 px-4 font-mono text-blue-700 font-semibold">
                      {att.checkOutTime || '--'}
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      {att.duration}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge status={att.status} />
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {att.notes || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
