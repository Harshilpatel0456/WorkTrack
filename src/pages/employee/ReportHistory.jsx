import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { adminApi } from '../../services/adminApi';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { useNavigate } from 'react-router-dom';
import {
  History,
  FileText,
  Search,
  Calendar,
  Clock,
  Building2,
  Eye,
  Edit3,
  Paperclip,
  MessageSquare,
} from 'lucide-react';

export const ReportHistory = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees } = useApp();
  const navigate = useNavigate();

  const currentEmp = user?.employeeProfile || employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  useEffect(() => {
    let active = true;
    adminApi.reports.list()
      .then((rows) => { if (active) setReports(rows); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const myReports = reports;

  const filteredReports = myReports.filter((rep) => {
    return (
      (rep.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.shiftName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.workCompleted || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.reportingDate || '').includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#245CE2]" />
            Personal Daily Shift Report Archive
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete history of all daily shift reports and revisions submitted by {user?.name || currentEmp?.name || 'you'}.
          </p>
        </div>

        {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        {loading && <div role="status" className="text-xs text-slate-500">Loading your reports...</div>}

        <button
          onClick={() => navigate('/employee/daily-report')}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <FileText className="w-4 h-4" />
          Today's Report Form
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report details, date, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredReports.length}</span> reports
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredReports.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No report logs found for your search.
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
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#245CE2]" />
                        {rep.customerName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{rep.shiftName}</span>
                        <span>•</span>
                        <span>{rep.reportingDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge status={rep.status} />
                      <button
                        onClick={() => setHistoryReport(rep)}
                        className="bg-blue-50 text-[#245CE2] text-[11px] font-bold px-2 py-0.5 rounded-md hover:bg-blue-100 flex items-center gap-1"
                        title="Audit versions"
                      >
                        <History className="w-3 h-3" />
                        v{rep.version || 1}
                      </button>
                    </div>
                  </div>

                  {/* Work Completed */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-2 mb-3">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Summary of Work
                    </span>
                    <p className="line-clamp-3 leading-relaxed whitespace-pre-line font-sans">
                      {rep.workCompleted}
                    </p>
                  </div>

                  {rep.issues && (
                    <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 text-xs text-rose-900">
                      <span className="font-bold text-[10px] uppercase block text-rose-700">Flagged Issue:</span>
                      <p className="line-clamp-1">{rep.issues}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
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
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReport(rep)}
                      className="px-3 py-1.5 bg-[#245CE2] text-white hover:bg-[#1A45B0] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
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
