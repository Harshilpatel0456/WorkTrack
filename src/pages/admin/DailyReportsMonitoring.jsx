import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  Building2,
  User,
  History,
  Eye,
  Paperclip,
  MessageSquare,
} from 'lucide-react';

export const DailyReportsMonitoring = () => {
  const { customers, shifts, employees } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const filters = {
      search: searchQuery,
      customer: customerFilter === 'All' ? '' : customerFilter,
      shift: shiftFilter === 'All' ? '' : shiftFilter,
      employee: employeeFilter === 'All' ? '' : employeeFilter,
      date: dateFilter,
      status: statusFilter === 'All' ? '' : statusFilter,
    };
    Promise.all([adminApi.reports.list(filters), adminApi.reports.summary(filters)])
      .then(([rows, stats]) => {
        if (active) {
          setReports(rows);
          setSummary(stats);
          setError('');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchQuery, customerFilter, shiftFilter, employeeFilter, dateFilter, statusFilter]);

  const filteredReports = reports;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#245CE2]" />
            Enterprise Daily Shift Reports Command
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Global audit repository for daily operational logs, handovers, obstacle reports, and client correspondence.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work details, obstacles, names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
          >
            <option value="All">All Employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <input
            aria-label="Filter reports by date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="All">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DRAFT">Pending</option>
          </select>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
          >
            <option value="All">All Client Accounts</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-white border border-slate-200 p-3">Daily: <b>{summary.daily.total}</b></div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">Submitted: <b>{summary.daily.submitted}</b></div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">Pending: <b>{summary.daily.pending}</b></div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">Updated: <b>{summary.daily.updated}</b></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">Overall: <b>{summary.overall.total}</b></div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">Submitted: <b>{summary.overall.submitted}</b></div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">Pending: <b>{summary.overall.pending}</b></div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">Updated: <b>{summary.overall.updated}</b></div>
          </div>
        </>
      )}
      {loading && <div role="status" className="text-xs text-slate-500">Loading daily reports...</div>}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {!loading && filteredReports.length === 0 && <div className="col-span-2 rounded-xl bg-white p-8 text-center text-xs text-slate-500">No reports match these filters.</div>}
        {filteredReports.map((rep) => {
          const hasComments = rep.comments && rep.comments.length > 0;
          const hasAttachments = rep.attachments && rep.attachments.length > 0;

          return (
            <div
              key={rep.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{rep.employeeName}</span>
                      <span className="text-[11px] text-slate-400 font-medium">({rep.customerName})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#245CE2]" />
                      <span>{rep.shiftName}</span>
                      <span>•</span>
                      <span>{rep.reportingDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge status={rep.status} />
                    <button
                      onClick={() => setHistoryReport(rep)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#245CE2] hover:bg-blue-100 bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                      title="View all historical revisions"
                    >
                      <History className="w-3 h-3" />
                      v{rep.version || 1}
                    </button>
                  </div>
                </div>

                {/* Body snippets */}
                <div className="space-y-3 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                      Work Completed
                    </span>
                    <p className="text-slate-700 line-clamp-3 leading-relaxed whitespace-pre-line bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      {rep.workCompleted}
                    </p>
                  </div>

                  {rep.issues && (
                    <div>
                      <span className="font-bold text-rose-700 uppercase tracking-wider text-[10px] block mb-1">
                        Flagged Issues
                      </span>
                      <p className="text-rose-900 line-clamp-1 bg-rose-50/60 p-2 rounded-lg border border-rose-100 font-medium">
                        {rep.issues}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer row */}
              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  {hasAttachments && (
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      {rep.attachments.length} files
                    </span>
                  )}
                  {hasComments && (
                    <span className="flex items-center gap-1 text-[#245CE2] font-semibold">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {rep.comments.length} feedback notes
                    </span>
                  )}
                  <span>Last synced: {new Date(rep.updatedAt || rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <button
                  onClick={() => setSelectedReport(rep)}
                  className="px-3 py-1.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Full Report
                </button>
              </div>
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
