import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import {
  MessageSquare,
  Building2,
  Clock,
  Send,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';

export const EmployeeFeedback = () => {
  const { selectedEmployeeId } = useAuth();
  const { reports, employees, replyToComment } = useApp();

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const [replyTextMap, setReplyTextMap] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  // Collect all feedback on reports submitted by this employee
  const feedbackList = [];
  reports
    .filter((r) => r.employeeId === currentEmp.id)
    .forEach((rep) => {
      (rep.comments || []).forEach((cmt) => {
        feedbackList.push({
          ...cmt,
          reportId: rep.id,
          reportCustomer: rep.customerName,
          reportShift: rep.shiftName,
          reportDate: rep.reportingDate,
          fullReport: rep,
        });
      });
    });

  const handleSendReply = (reportId, commentId) => {
    const text = replyTextMap[commentId];
    if (!text || !text.trim()) return;

    replyToComment(reportId, commentId, {
      authorName: currentEmp.name,
      authorRole: `Employee (${currentEmp.roleTitle})`,
      message: text.trim(),
    });

    setReplyTextMap((prev) => ({ ...prev, [commentId]: '' }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#245CE2]" />
          Customer Feedback & Handover Discussions
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review inquiries, remarks, and feedback from client customers regarding your submitted shift reports.
        </p>
      </div>

      {/* Threads List */}
      <div className="space-y-5">
        {feedbackList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No feedback comments received yet on your shift reports.
          </div>
        ) : (
          feedbackList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-4"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#245CE2]" />
                  <span className="font-bold text-slate-900">{item.reportCustomer}</span>
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
                  View Related Report
                </button>
              </div>

              {/* Customer Comment Bubble */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#245CE2] flex items-center justify-center font-bold text-sm flex-shrink-0">
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
                  <div className="mt-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-sans">
                    {item.message}
                  </div>
                </div>
              </div>

              {/* Replies Thread */}
              {item.replies && item.replies.length > 0 && (
                <div className="pl-12 space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Your Responses
                  </span>
                  {item.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#245CE2]">{reply.authorName} (You)</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input Form */}
              <div className="pl-12 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type a response to this customer comment..."
                    value={replyTextMap[item.id] || ''}
                    onChange={(e) => setReplyTextMap({ ...replyTextMap, [item.id]: e.target.value })}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
                  />
                  <button
                    onClick={() => handleSendReply(item.reportId, item.id)}
                    disabled={!replyTextMap[item.id]?.trim()}
                    className="px-4 py-2 bg-[#245CE2] hover:bg-[#1A45B0] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply
                  </button>
                </div>
              </div>
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
