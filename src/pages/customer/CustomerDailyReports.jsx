import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  History,
  Eye,
  Paperclip,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export const CustomerDailyReports = () => {
  const [customers, setCustomers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const currentCust = customers[0];
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminApi.reports.list(dateFilter ? { date: dateFilter } : {}),
      adminApi.reports.summary(dateFilter ? { date: dateFilter } : {}),
      adminApi.customers.me(),
      adminApi.customers.myEmployees(),
      adminApi.shifts.list(),
    ])
      .then(([rows, stats, customer, employeeRows, shiftRows]) => {
        if (active) {
          setReports(rows);
          setSummary(stats);
          setCustomers([customer]);
          setEmployees(employeeRows);
          setShifts(shiftRows);
          setError('');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dateFilter]);

  if (!currentCust && loading) {
    return <div role="status" className="p-6 text-sm text-slate-500">Loading customer reports...</div>;
  }

  // Filter only this customer's reports
  const customerReports = reports;

  // Distinct employees who have reports for this customer
  const assignedEmployeeIds = employees.map((employee) => employee.id);

  const filteredReports = customerReports.filter((rep) => {
    const matchesSearch =
      (rep.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.workCompleted || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.issues || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEmployee = employeeFilter === 'All' || rep.employeeId === employeeFilter;
    const matchesShift = shiftFilter === 'All' || rep.shiftId === shiftFilter;
    const matchesDate = !dateFilter || rep.reportingDate === dateFilter;

    return matchesSearch && matchesEmployee && matchesShift && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#245CE2]" />
            Client Daily Operational Shift Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete archive of work completed, task handovers, flagged challenges, and documentation for {currentCust.companyName}.
          </p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {loading && <div role="status" className="text-xs text-slate-500">Loading customer reports...</div>}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-white border border-slate-200 p-3">Reports: <b>{summary.daily.total}</b></div>
          <div className="rounded-xl bg-white border border-slate-200 p-3">Submitted: <b>{summary.daily.submitted}</b></div>
          <div className="rounded-xl bg-white border border-slate-200 p-3">Pending: <b>{summary.daily.pending}</b></div>
          <div className="rounded-xl bg-white border border-slate-200 p-3">Updated: <b>{summary.daily.updated}</b></div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="w-full lg:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work logs, staff, issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {/* Staff Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
          >
            <option value="All">All Staff Personnel</option>
            {assignedEmployeeIds.map((eid) => {
              const emp = employees.find((e) => e.id === eid);
              return (
                <option key={eid} value={eid}>
                  {emp ? emp.fullName : eid}
                </option>
              );
            })}
          </select>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
          >
            <option value="All">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Date */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
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
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredReports.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No daily reports match the current criteria for your organization.
          </div>
        ) : (
          filteredReports.map((rep) => {
            const hasAttachments = rep.attachments && rep.attachments.length > 0;
            const hasComments = rep.comments && rep.comments.length > 0;

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{rep.employeeName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">• {rep.reportingDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#245CE2]" />
                        <span>{rep.shiftName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge status={rep.status} />
                      <button
                        onClick={() => setHistoryReport(rep)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#245CE2] hover:bg-blue-100 bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                        title="View revision audit trail"
                      >
                        <History className="w-3 h-3" />
                        v{rep.version || 1}
                      </button>
                    </div>
                  </div>

                  {/* Work Completed */}
                  <div className="space-y-3 py-3 border-y border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">
                        Work Completed During Shift
                      </span>
                      <p className="text-slate-700 line-clamp-3 leading-relaxed whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                        {rep.workCompleted}
                      </p>
                    </div>

                    {rep.pendingTasks && (
                      <div>
                        <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px] block mb-1">
                          Tasks Handed Over
                        </span>
                        <p className="text-amber-950 line-clamp-2 leading-relaxed bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          {rep.pendingTasks}
                        </p>
                      </div>
                    )}

                    {rep.issues && (
                      <div>
                        <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px] block mb-1">
                          Flagged Challenges / Bottlenecks
                        </span>
                        <p className="text-rose-950 line-clamp-1 leading-relaxed bg-rose-50/50 p-2 rounded-lg border border-rose-100 font-medium">
                          {rep.issues}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    {hasAttachments && (
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Paperclip className="w-3.5 h-3.5" />
                        {rep.attachments.length} files
                      </span>
                    )}
                    {hasComments && (
                      <span className="flex items-center gap-1 text-[#245CE2] font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {rep.comments.length} comments
                      </span>
                    )}
                    <span>Last modified: {new Date(rep.updatedAt || rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <button
                    onClick={() => setSelectedReport(rep)}
                    className="px-3.5 py-1.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect & Feedback
                  </button>
                </div>
              </div>
            );
          })
        )}
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
