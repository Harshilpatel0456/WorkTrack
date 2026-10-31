import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
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
  Plus,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

export const DailyReportForm = () => {
  const { user, selectedEmployeeId } = useAuth();
  const { employees, assignments, customers, shifts, reports, submitDailyReport, updateDailyReport, showToast } = useApp();

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Approved assignment
  const empAssignments = assignments.filter(
    (a) => a.employeeId === currentEmp.id && a.status === 'Approved'
  );
  const primaryAssignment = empAssignments[0];
  const primaryCustomer = customers.find(c => c.id === (primaryAssignment?.customerId || currentEmp.assignedCustomerIds?.[0])) || customers[0];
  const primaryShift = shifts.find(s => s.id === (primaryAssignment?.shiftId || currentEmp.currentShiftId)) || shifts[0];

  // Check if today's report already exists for this employee + shift
  const existingReport = reports.find(
    (r) =>
      r.employeeId === currentEmp.id &&
      r.reportingDate === todayDateStr &&
      r.customerId === primaryCustomer.id
  );

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form Fields
  const [workCompleted, setWorkCompleted] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [issues, setIssues] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [revisionSummary, setRevisionSummary] = useState('');
  const [attachments, setAttachments] = useState([
    { name: 'shift_activity_log.pdf', size: '1.2 MB' }
  ]);
  const [newFileName, setNewFileName] = useState('');

  // Pre-fill if editing existing report
  useEffect(() => {
    if (existingReport) {
      setWorkCompleted(existingReport.workCompleted || '');
      setPendingTasks(existingReport.pendingTasks || '');
      setIssues(existingReport.issues || '');
      setAdditionalRemarks(existingReport.additionalRemarks || '');
      setAttachments(existingReport.attachments || []);
    } else {
      setWorkCompleted('');
      setPendingTasks('');
      setIssues('');
      setAdditionalRemarks('');
      setAttachments([{ name: 'daily_shift_checklist.pdf', size: '820 KB' }]);
    }
  }, [existingReport?.id]);

  const handleAddAttachment = () => {
    if (!newFileName.trim()) return;
    setAttachments(prev => [...prev, { name: newFileName.trim(), size: '1.4 MB' }]);
    setNewFileName('');
  };

  const handleRemoveAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!workCompleted.trim()) {
      showToast('Please specify the work completed during your shift', 'error');
      return;
    }

    if (existingReport) {
      // Edit existing report -> creates a new revision version
      const res = updateDailyReport(
        existingReport.id,
        {
          workCompleted,
          pendingTasks,
          issues,
          additionalRemarks,
          attachments,
        },
        revisionSummary || `Revision ${existingReport.version + 1} updated by employee`
      );
      if (res.success) {
        setRevisionSummary('');
      }
    } else {
      // First time submission
      submitDailyReport({
        assignmentId: primaryAssignment?.id || 'asg-direct',
        employeeId: currentEmp.id,
        employeeName: currentEmp.name,
        customerId: primaryCustomer.id,
        customerName: primaryCustomer.companyName,
        shiftId: primaryShift.id,
        shiftName: `${primaryShift.name} (${primaryShift.startTime} – ${primaryShift.endTime})`,
        reportingDate: todayDateStr,
        workCompleted,
        pendingTasks,
        issues,
        additionalRemarks,
        attachments,
        isDraft: false,
      });
    }
  };

  const handleSaveDraft = () => {
    if (!workCompleted.trim()) {
      showToast('Please enter some text in work completed before saving draft', 'error');
      return;
    }
    submitDailyReport({
      assignmentId: primaryAssignment?.id || 'asg-direct',
      employeeId: currentEmp.id,
      employeeName: currentEmp.name,
      customerId: primaryCustomer.id,
      customerName: primaryCustomer.companyName,
      shiftId: primaryShift.id,
      shiftName: `${primaryShift.name} (${primaryShift.startTime} – ${primaryShift.endTime})`,
      reportingDate: todayDateStr,
      workCompleted,
      pendingTasks,
      issues,
      additionalRemarks,
      attachments,
      isDraft: true,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
              {todayDateStr}
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

        {/* Field 5: Attachments Simulation */}
        <div>
          <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            5. File Attachments & Documentation (UI Simulation)
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Attach inspection sheets, telemetry logs, or diagnostic screenshots.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. pressure_log_oct30.png or inspection_sheet.pdf"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
            <button
              type="button"
              onClick={handleAddAttachment}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Attach File
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px]"
              >
                <Paperclip className="w-3.5 h-3.5 text-[#245CE2]" />
                <span className="font-semibold text-slate-800">{file.name}</span>
                <span className="text-slate-400">({file.size || '1.0 MB'})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                >
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
