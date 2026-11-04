import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { adminApi } from '../../services/adminApi';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import {
  MessageSquare,
  Building2,
  Clock,
  Send,
  FileText,
  User,
  Plus,
} from 'lucide-react';

export const CustomerFeedback = () => {
  const { selectedCustomerId } = useAuth();
  const { customers, showToast } = useApp();

  const currentCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const [customerReports, setCustomerReports] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newCommentReportId, setNewCommentReportId] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const loadFeedback = async () => {
    const [reports, comments] = await Promise.all([adminApi.reports.list(), adminApi.reports.allComments()]);
    const reportsById = new Map(reports.map((report) => [report.id, report]));
    setCustomerReports(reports);
    setFeedbackList(comments.flatMap((comment) => {
      const report = reportsById.get(comment.daily_report);
      return report ? [{
        ...comment,
        reportId: report.id,
        reportShift: report.shiftName,
        reportDate: report.reportingDate,
        employeeName: report.employeeName,
        fullReport: report,
      }] : [];
    }));
  };

  useEffect(() => {
    let active = true;
    loadFeedback()
      .then(() => { if (active) setError(''); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handlePostNewComment = async (e) => {
    e.preventDefault();
    if (!newCommentReportId || !newCommentText.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.reports.addComment(newCommentReportId, newCommentText.trim());
      await loadFeedback();
      setNewCommentText('');
      setNewCommentReportId('');
      setError('');
      showToast('Feedback submitted.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#245CE2]" />
          Client Feedback & Handover Discussions
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Direct communication channel with on-site staff. Inquire regarding completed deliverables or handover procedures.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {loading && <div role="status" className="text-xs text-slate-500">Loading feedback...</div>}

      {/* New Feedback Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#245CE2]" />
          Post New Feedback on a Shift Report
        </h3>

        <form onSubmit={handlePostNewComment} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">
              Select Shift Report to Comment On:
            </label>
            <select
              required
              value={newCommentReportId}
              onChange={(e) => setNewCommentReportId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            >
              <option value="">-- Choose from available reports --</option>
              {customerReports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.reportingDate} • {rep.shiftName.split('(')[0]} (Staff: {rep.employeeName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <textarea
              rows={3}
              required
              placeholder="Write your feedback, questions on equipment, or hand-off remarks..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newCommentReportId || !newCommentText.trim() || submitting}
              className="px-5 py-2 bg-[#245CE2] hover:bg-[#1A45B0] disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Feedback
            </button>
          </div>
        </form>
      </div>

      {/* Active Conversation Threads */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Active Threaded Conversations ({feedbackList.length})
        </h3>

        {feedbackList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No feedback threads logged yet.
          </div>
        ) : (
          feedbackList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#245CE2]" />
                  <span className="font-bold text-slate-900">{item.employeeName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{item.reportShift}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-mono">{item.reportDate}</span>
                </div>

                <button
                  onClick={() => setSelectedReport(item.fullReport)}
                  className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Full Report
                </button>
              </div>

              {/* Customer Comment Bubble */}
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#245CE2] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {item.authorName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{item.authorName}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({item.authorRole})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="mt-1.5 p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 text-xs text-slate-800 leading-relaxed font-sans">
                    {item.message}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {item.replies && item.replies.length > 0 && (
                <div className="pl-12 space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Staff Handover Responses ({item.replies.length})
                  </span>
                  {item.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-emerald-800">{reply.authorName}</span>
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
