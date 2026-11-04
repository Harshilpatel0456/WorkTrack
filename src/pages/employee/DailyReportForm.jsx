import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { adminApi } from '../../services/adminApi';
import {
  FileText,
  Building2,
  User,
  Clock,
  Calendar,
  Paperclip,
  CheckCircle,
  AlertCircle,
  History,
  Send,
  Save,
  Trash2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export const DailyReportForm = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { showToast } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentEmp = user?.employeeProfile || { id: selectedEmployeeId, user: { get_full_name: user?.name } };

  useEffect(() => {
    let active = true;
    Promise.all([adminApi.schedules.list(), adminApi.reports.list()])
      .then(([scheduleRows, reportRows]) => {
        if (!active) return;
        const validSchedules = scheduleRows.filter((row) => row.status !== 'CANCELLED');
        setSchedules(validSchedules);
        setReports(reportRows);
        setSelectedShiftId((current) => current || validSchedules.find((row) => row.shiftDate === todayDateStr)?.id || validSchedules[0]?.id || '');
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [todayDateStr]);

  const primaryAssignment = schedules.find((row) => row.id === selectedShiftId);
  const primaryCustomer = {
    id: primaryAssignment?.customerId,
    companyName: primaryAssignment?.customerName || 'Assigned customer',
  };
  const primaryShift = {
    id: primaryAssignment?.shiftId,
    name: primaryAssignment?.shiftName || 'Assigned shift',
    startTime: primaryAssignment?.shiftStartTime || '',
    endTime: primaryAssignment?.shiftEndTime || '',
  };
  const existingReport = reports.find((report) => report.shift_assignment === primaryAssignment?.id);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form Fields
  const [workCompleted, setWorkCompleted] = useState('');
  const [title, setTitle] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [issues, setIssues] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [revisionSummary, setRevisionSummary] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  // Pre-fill if editing existing report
  useEffect(() => {
    if (existingReport) {
      setTitle(existingReport.title || '');
      setWorkCompleted(existingReport.workCompleted || '');
      setPendingTasks(existingReport.pendingTasks || '');
      setIssues(existingReport.issues || '');
      setAdditionalRemarks(existingReport.additionalRemarks || '');
      setAttachments(existingReport.attachments || []);
      setNewFiles([]);
    } else {
      setTitle(`Shift report - ${primaryShift.name}`);
      setWorkCompleted('');
      setPendingTasks('');
      setIssues('');
      setAdditionalRemarks('');
      setAttachments([]);
      setNewFiles([]);
    }
  }, [existingReport?.id, primaryAssignment?.id]);

  const handleAddAttachment = (event) => {
    const files = Array.from(event.target.files || []);
    setNewFiles((previous) => [...previous, ...files]);
    event.target.value = '';
  };

  const handleRemoveAttachment = (idx) => setNewFiles((previous) => previous.filter((_, i) => i !== idx));

  const uploadFiles = async (reportId) => {
    for (const file of newFiles) await adminApi.reports.uploadAttachment(reportId, file);
    setNewFiles([]);
  };

  const formData = (status) => ({
    shift_assignment: primaryAssignment.id,
    title: title.trim(),
    work_summary: workCompleted.trim(),
    tasks_completed: '',
    pending_tasks: pendingTasks,
    issues_or_blockers: issues,
    additional_remarks: additionalRemarks,
    status,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!primaryAssignment) {
      showToast('Select an assigned shift before submitting a report.', 'error');
      return;
    }
    if (!title.trim() || !workCompleted.trim()) {
      showToast('Report title and work summary are required.', 'error');
      return;
    }

    setSaving(true);
    setError('');
    try {
      let report;
      if (existingReport) {
        report = await adminApi.reports.update(existingReport.id, {
          ...formData(existingReport.status),
          change_summary: revisionSummary || `Revision ${existingReport.version + 1}`,
        });
        if (existingReport.status === 'DRAFT') report = await adminApi.reports.submit(report.id);
      } else {
        report = await adminApi.reports.create(formData('SUBMITTED'));
      }
      await uploadFiles(report.id);
      const updatedReports = await adminApi.reports.list();
      setReports(updatedReports);
      setRevisionSummary('');
      showToast('Daily report submitted successfully.');
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!primaryAssignment || !title.trim() || !workCompleted.trim()) {
      showToast('Select an assigned shift and enter a title and work summary.', 'error');
      return;
    }
    setSaving(true);
    try {
      const report = existingReport
        ? await adminApi.reports.update(existingReport.id, { ...formData('DRAFT'), change_summary: revisionSummary })
        : await adminApi.reports.create(formData('DRAFT'));
      await uploadFiles(report.id);
      setReports(await adminApi.reports.list());
      showToast('Draft saved.');
    } catch (requestError) {
      setError(requestError.message);
      showToast(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {loading && <div role="status" className="rounded-xl bg-white p-4 text-xs text-slate-500">Loading assigned shifts and reports...</div>}
      {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700">{error}</div>}
      {!loading && schedules.length > 0 && (
        <label className="block rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <span className="mb-2 block font-bold text-slate-700">Assigned shift</span>
          <select
            value={selectedShiftId}
            onChange={(event) => setSelectedShiftId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.shiftDate} · {schedule.shiftName} · {schedule.customerName}
              </option>
            ))}
          </select>
        </label>
      )}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#245CE2]" />
            Shift Daily Report Submission Terminal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official shift handover document. All submissions and subsequent revisions trigger customer notification events.
          </p>
        </div>

        {existingReport && (
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm self-start sm:self-auto"
          >
            <History className="w-4 h-4 text-[#245CE2]" />
            View Version History (v{existingReport.version})
          </button>
        )}
      </div>

      {/* Mode Banner: New vs Revision */}
      {existingReport ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                Report Already Submitted Today (Version {existingReport.version}) — Revision Mode Active
              </span>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                As per enterprise policy, only one report is maintained per shift. Editing this form will preserve your previous submissions and produce <strong>Version {existingReport.version + 1}</strong>. The client customer will be instantly notified.
              </p>
            </div>
          </div>
          <span className="font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-bold flex-shrink-0">
            Last Modified: {new Date(existingReport.updatedAt || existingReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
          <ShieldCheck className="w-5 h-5 text-[#245CE2] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Automated Population Enabled:</span>
            <p className="text-blue-700 mt-0.5 leading-relaxed">
              Customer organization, staff credentials, shift window, and reporting date are locked and verified against your active assignment.
            </p>
          </div>
        </div>
      )}

      {/* Main Report Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card space-y-6 text-xs">
        {/* Automatically Populated Metadata Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Customer Client
            </label>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#245CE2]" />
              {primaryCustomer.companyName}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Auto-populated</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Reporting Staff
            </label>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              {currentEmp.name}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{currentEmp.employeeId}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Shift Window
            </label>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {primaryShift.name}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{primaryShift.startTime} – {primaryShift.endTime}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Reporting Date
            </label>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#245CE2]" />
              {primaryAssignment?.shiftDate || todayDateStr}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Current Shift Date</span>
          </div>
        </div>

        {/* Revision summary prompt if in revision mode */}
        {existingReport && (
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason / Summary for Revision (Version {existingReport.version + 1}) *
            </label>
            <input
              type="text"
              required
              value={revisionSummary}
              onChange={(e) => setRevisionSummary(e.target.value)}
              placeholder="e.g. Added ultrasonic test results on Unit #4 hydraulic valve..."
              className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] text-slate-800 font-medium"
            />
          </div>
        )}

        {/* Field 1: Work Completed */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Work Completed During Shift *
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Detail all operational tasks, equipment serviced, tests conducted, or deliverables produced.
          </p>
          <textarea
            required
            rows={5}
            value={workCompleted}
            onChange={(e) => setWorkCompleted(e.target.value)}
            placeholder="1. Conducted scheduled maintenance on machine #2...&#10;2. Verified sensor calibrations...&#10;3. Cleaned workstations for incoming afternoon shift..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white text-slate-900 leading-relaxed font-sans"
          />
        </div>

        {/* Field 2: Pending Tasks */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Pending Tasks Handed Over to Next Shift
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Items requiring continuation, pending inventory arrivals, or unresolved jobs.
          </p>
          <textarea
            rows={3}
            value={pendingTasks}
            onChange={(e) => setPendingTasks(e.target.value)}
            placeholder="Review spare parts delivery scheduled for 16:00..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white text-slate-900 leading-relaxed"
          />
        </div>

        {/* Field 3: Issues / Challenges */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            3. Issues / Challenges Encountered
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Safety anomalies, machine bottlenecks, power fluctuations, or client concerns.
          </p>
          <textarea
            rows={3}
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Hydraulic pump exhibited minor vibration under peak load..."
            className="w-full p-4 bg-rose-50/40 border border-rose-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] text-slate-900 leading-relaxed"
          />
        </div>

        {/* Field 4: Additional Remarks */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            4. Additional Remarks
          </label>
          <textarea
            rows={2}
            value={additionalRemarks}
            onChange={(e) => setAdditionalRemarks(e.target.value)}
            placeholder="Any general comments, hand-off instructions or team mentions..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white text-slate-900 leading-relaxed"
          />
        </div>

        {/* Field 5: Attachments */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            5. File Attachments & Documentation
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Attach inspection sheets, telemetry logs, or diagnostic screenshots.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="file"
              multiple
              onChange={handleAddAttachment}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={file.id || idx}
                className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px]"
              >
                <Paperclip className="w-3.5 h-3.5 text-[#245CE2]" />
                <span className="font-semibold text-slate-800">{file.name}</span>
                <span className="text-slate-400">({file.size || '1.0 MB'})</span>
              </div>
            ))}
            {newFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-2 text-[11px]">
                <Paperclip className="w-3.5 h-3.5 text-[#245CE2]" />
                <span className="font-semibold text-slate-800">{file.name}</span>
                <button type="button" onClick={() => handleRemoveAttachment(idx)} aria-label={`Remove ${file.name}`} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Guaranteed single report per shift with automatic version audit</span>
          </div>

          <div className="flex items-center gap-3">
            {!existingReport && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4 text-slate-500" />
                Save Draft
              </button>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="w-4 h-4" />
              {existingReport ? `Save & Publish Version ${existingReport.version + 1}` : 'Submit Daily Report'}
            </button>
          </div>
        </div>
      </form>

      {/* Version History Modal */}
      {existingReport && (
        <VersionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          report={existingReport}
        />
      )}
    </div>
  );
};
