import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import {
  MessageSquare,
  Search,
  Building2,
  User,
  Clock,
  ArrowRight,
  CheckCircle,
  FileText,
} from 'lucide-react';

export const FeedbackMonitoring = () => {
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.reports.list(), adminApi.reports.allComments()])
      .then(([reports, comments]) => {
        const reportsById = new Map(reports.map((report) => [report.id, report]));
        const items = comments.flatMap((comment) => {
          const report = reportsById.get(comment.daily_report);
          return report ? [{
            ...comment,
            reportId: report.id,
            reportShift: report.shiftName,
            customerName: report.customerName,
            employeeName: report.employeeName,
            reportingDate: report.reportingDate,
            fullReport: report,
          }] : [];
        });
        if (active) {
          setFeedbackItems(items);
          setError('');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredItems = feedbackItems.filter((item) => {
    const q = (searchQuery || '').toLowerCase();
    return (
      (item.authorName || '').toLowerCase().includes(q) ||
      (item.customerName || '').toLowerCase().includes(q) ||
      (item.employeeName || '').toLowerCase().includes(q) ||
      (item.message || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#245CE2]" />
            Client Feedback & Operational Communication
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit dialogue between customers and on-site staff. Ensure questions and handovers are addressed promptly.
          </p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {loading && <div role="status" className="text-xs text-slate-500">Loading feedback threads...</div>}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feedback conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          />
        </div>
        <div className="text-xs text-slate-500">
          Total active threads: <span className="font-bold text-slate-900">{filteredItems.length}</span>
        </div>
      </div>

      {/* Feedback Threads List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No feedback comments matching search query.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all space-y-4"
            >
              {/* Top Meta info */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
                    {item.customerName}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    {item.employeeName}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-mono text-[11px]">{item.reportShift}</span>
                </div>

                <button
                  onClick={() => setSelectedReport(item.fullReport)}
                  className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Inspect Report
                </button>
              </div>

              {/* Main Comment */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#245CE2] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {item.authorName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{item.authorName}</span>
                      <span className="text-[11px] text-slate-400 font-medium ml-2">({item.authorRole})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                    {item.message}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {item.replies && item.replies.length > 0 && (
                <div className="pl-12 space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Staff Response Handover ({item.replies.length})
                  </span>
                  {item.replies.map((reply) => (
                    <div key={reply.id} className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#245CE2]">{reply.authorName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <ReportDetailModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
      />
    </div>
  );
};
