import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { adminApi } from '../../services/adminApi';
import {
  Clock,
  User,
  Building2,
  Calendar,
  FileCheck,
  Paperclip,
  History,
  Send,
  MessageSquare,
  AlertTriangle,
  Download,
  Edit3,
} from 'lucide-react';

export const ReportDetailModal = ({ isOpen, onClose, report, onOpenVersionHistory, onEditReport }) => {
  const { role, user } = useAuth();
  const { showToast } = useApp();

  const [commentText, setCommentText] = useState('');
  const [replyTextMap, setReplyTextMap] = useState({});
  const [replyingToId, setReplyingToId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !report?.id) return;
    let active = true;
    adminApi.reports.comments(report.id)
      .then((rows) => { if (active) { setComments(rows); setCommentError(''); } })
      .catch((error) => { if (active) setCommentError(error.message); });
    return () => { active = false; };
  }, [isOpen, report?.id]);

  if (!report) return null;

  const employeeName = report.employeeName || report.employee_name;
  const customerName = report.customerName || report.customer_name;
  const shiftName = report.shiftName || report.shift_name;
  const reportingDate = report.reportingDate || report.shift_date;
  const workCompleted = report.workCompleted || report.work_summary;
  const pendingTasks = report.pendingTasks || report.pending_tasks;
  const issues = report.issues || report.issues_or_blockers;
  const additionalRemarks = report.additionalRemarks || report.additional_remarks;
  const isAuthor = role === 'employee'
    && (report.employeeId || report.shift_details?.employeeId) === (user?.employeeProfile?.id || user?.id);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentBusy(true);
    try {
      await adminApi.reports.addComment(report.id, commentText.trim());
      setComments(await adminApi.reports.comments(report.id));
      setCommentText('');
      setCommentError('');
      showToast('Feedback posted.');
    } catch (error) {
      setCommentError(error.message);
    } finally {
      setCommentBusy(false);
    }
  };

  const handlePostReply = async (commentId) => {
    const text = replyTextMap[commentId];
    if (!text || !text.trim()) return;
    setCommentBusy(true);
    try {
      await adminApi.reports.reply(commentId, text.trim());
      setComments(await adminApi.reports.comments(report.id));
      setReplyTextMap(prev => ({ ...prev, [commentId]: '' }));
      setReplyingToId(null);
      setCommentError('');
    } catch (error) {
      setCommentError(error.message);
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Shift Daily Report • ${shiftName}`}
      subtitle={`Submitted by ${employeeName} for ${customerName} on ${reportingDate}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Meta Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Reporting Staff</span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
              <User className="w-3.5 h-3.5 text-[#245CE2]" />
              {employeeName}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Customer Client</span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
              {customerName}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Shift & Date</span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-[#245CE2]" />
              {reportingDate}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Version & Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge status={report.status} />
              <button
                onClick={() => {
                  onClose();
                  onOpenVersionHistory(report);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#245CE2] hover:underline bg-blue-50 px-2 py-0.5 rounded-md"
              >
                <History className="w-3 h-3" />
                v{report.version || 1}
              </button>
            </div>
          </div>
        </div>

        {/* Action Row for Employee if they want to edit */}
        {isAuthor && onEditReport && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                onClose();
                onEditReport(report);
              }}
              className="flex items-center gap-1.5 bg-[#245CE2] text-white hover:bg-[#1A45B0] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit This Report (Creates New Version)
            </button>
          </div>
        )}

        {/* Section 1: Work Completed */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            1. Work Completed During Shift
          </h4>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-subtle">
            {workCompleted}
          </div>
        </div>

        {/* Section 2: Pending Tasks */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            2. Pending Tasks Handed Over
          </h4>
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed shadow-subtle">
            {pendingTasks || 'No pending tasks recorded for the incoming shift.'}
          </div>
        </div>

        {/* Section 3: Issues / Challenges */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            3. Issues / Challenges Encountered
          </h4>
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80 text-xs text-rose-950 whitespace-pre-line leading-relaxed shadow-subtle">
            {issues || 'No obstacles or equipment issues encountered.'}
          </div>
        </div>

        {additionalRemarks && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional Remarks</h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-line">{additionalRemarks}</div>
          </div>
        )}

        {/* Section 4: Attachments */}
        {report.attachments && report.attachments.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-slate-500" />
              Attached Shift Documentation ({report.attachments.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-[#245CE2] flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{file.size || '1.2 MB'}</p>
                    </div>
                  </div>
                  <a
                    href={file.file}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-[#245CE2] rounded-lg transition-colors"
                    title="Download attachment"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Customer Feedback & Discussion Thread */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#245CE2]" />
              Customer Feedback & Handover Discussion ({comments.length})
            </h4>
          </div>

          {/* Comment Stream */}
          <div className="space-y-4 mb-5">
            {commentError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{commentError}</p>}
            {comments.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                No feedback submitted yet for this report.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{comment.authorName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">({comment.authorRole})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">{comment.message}</p>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-4 border-l-2 border-blue-300 space-y-2 mt-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-bold text-[#245CE2]">{reply.authorName}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply button / form */}
                  {replyingToId === comment.id ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Write a response..."
                        value={replyTextMap[comment.id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [comment.id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#245CE2]"
                      />
                      <button
                        onClick={() => handlePostReply(comment.id)}
                        disabled={commentBusy}
                        className="px-3 py-1.5 bg-[#245CE2] text-white rounded-lg text-xs font-semibold hover:bg-[#1A45B0]"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setReplyingToId(null)}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : role === 'employee' || role === 'admin' ? (
                    <button
                      onClick={() => setReplyingToId(comment.id)}
                      className="text-[11px] font-semibold text-[#245CE2] hover:underline inline-flex items-center gap-1"
                    >
                      Reply to this comment
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {/* New Feedback Submission Form */}
          {(role === 'customer' || role === 'admin') && <form onSubmit={handlePostComment} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder={
                role === 'customer'
                  ? 'Add feedback or questions on this daily shift report...'
                  : 'Add administrative or operational note...'
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || commentBusy}
              className="px-4 py-2.5 bg-[#245CE2] text-white rounded-xl text-xs font-bold hover:bg-[#1A45B0] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Post Feedback
            </button>
          </form>}
        </div>
      </div>
    </Modal>
  );
};
