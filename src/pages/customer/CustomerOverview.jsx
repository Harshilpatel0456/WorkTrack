import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  Clock,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Paperclip,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const CustomerOverview = () => {
  const { selectedCustomerId } = useAuth();
  const { customers, assignments, reports, attendance, shifts } = useApp();
  const navigate = useNavigate();

  const currentCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Active assignments for this customer
  const customerAssignments = assignments.filter(
    (a) => a.customerId === currentCust.id && a.status === 'Approved'
  );

  // Reports associated with this customer
  const customerReports = reports.filter((r) => r.customerId === currentCust.id);
  const reportsToday = customerReports.filter((r) => r.reportingDate === todayDateStr);

  // Active shifts count covering this customer
  const activeShiftIds = [...new Set(customerAssignments.map((a) => a.shiftId))];

  // Comments / Pending feedback
  const totalComments = customerReports.reduce(
    (acc, r) => acc + (r.comments ? r.comments.length : 0),
    0
  );

  // Shift-wise activity breakdown (Morning, Afternoon, Night)
  const shiftActivity = shifts.map((shift) => {
    const assignedStaff = customerAssignments.filter((a) => a.shiftId === shift.id);
    const shiftReport = customerReports.find(
      (r) => r.shiftId === shift.id && r.reportingDate === todayDateStr
    );
    const shiftAttendance = attendance.find(
      (att) => att.customerId === currentCust.id && att.shiftId === shift.id && att.date === todayDateStr
    );

    return {
      shift,
      assignedStaff,
      shiftReport,
      shiftAttendance,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Client Transparency Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentCust.companyName}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Authorized Representative: <span className="text-white font-semibold">{currentCust.contactPerson}</span> • {currentCust.industry}
            </p>
            <p className="text-slate-400 text-xs mt-2">
              Facility Address: {currentCust.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/customer/reports')}
              className="bg-[#245CE2] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              View Today's Reports
            </button>
            <button
              onClick={() => navigate('/customer/feedback')}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Feedback Discussions
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Personnel"
          value={customerAssignments.length}
          subtitle="On-site staff allocated"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Reports Today"
          value={reportsToday.length}
          subtitle={`Out of ${activeShiftIds.length} shifts`}
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="Active Shift Intervals"
          value={activeShiftIds.length}
          subtitle="Coverage windows"
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Total Feedback Notes"
          value={totalComments}
          subtitle="Comments & questions"
          icon={MessageSquare}
          color="amber"
        />
      </div>

      {/* Shift-Wise Real-Time Activity Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#245CE2]" />
              Today's Shift-Wise Activity & Handover Status
            </h3>
            <p className="text-xs text-slate-500">Live reporting status broken down by Morning, Afternoon and Night shifts</p>
          </div>
          <button
            onClick={() => navigate('/customer/shift-reports')}
            className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
          >
            Detailed Breakdown <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {shiftActivity.map(({ shift, assignedStaff, shiftReport, shiftAttendance }) => (
            <div
              key={shift.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs">{shift.name}</span>
                  <span className="text-[11px] font-mono text-[#245CE2] font-bold">
                    {shift.startTime} – {shift.endTime}
                  </span>
                </div>

                {/* Assigned staff */}
                <div className="text-xs text-slate-600 mb-3 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Deployed Personnel ({assignedStaff.length}):
                  </span>
                  {assignedStaff.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">No staff scheduled</span>
                  ) : (
                    assignedStaff.map((asg) => (
                      <div key={asg.id} className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {asg.employeeName}
                      </div>
                    ))
                  )}
                </div>

                {/* Report status */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Report Status:</span>
                    <Badge status={shiftReport ? `Submitted (v${shiftReport.version || 1})` : 'Awaiting Shift Wrap'} />
                  </div>
                  {shiftReport && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {shiftReport.workCompleted}
                    </p>
                  )}
                </div>
              </div>

              {shiftReport && (
                <button
                  onClick={() => setSelectedReport(shiftReport)}
                  className="mt-3 w-full py-1.5 bg-blue-50 text-[#245CE2] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors text-center"
                >
                  Inspect Shift Report &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Report Updates Stream */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Shift Handover Reports</h3>
            <p className="text-xs text-slate-500">Full audit trail of work logs delivered for {currentCust.companyName}</p>
          </div>
          <button
            onClick={() => navigate('/customer/reports')}
            className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
          >
            All Reports ({customerReports.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {customerReports.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No daily reports on file for your account yet.
            </div>
          ) : (
            customerReports.slice(0, 4).map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{rep.employeeName}</span>
                    <span className="text-[11px] text-slate-400">• {rep.shiftName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">• {rep.reportingDate}</span>
                    {rep.version > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#245CE2]">
                        v{rep.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {rep.workCompleted}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <Badge status={rep.status} />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(rep.updatedAt || rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
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
