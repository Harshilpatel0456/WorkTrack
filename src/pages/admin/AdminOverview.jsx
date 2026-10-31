import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { ReportDetailModal } from '../../components/modals/ReportDetailModal';
import { VersionHistoryModal } from '../../components/modals/VersionHistoryModal';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  UserCheck,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const AdminOverview = () => {
  const { employees, customers, assignments, reports, attendance, shifts } = useApp();
  const navigate = useNavigate();

  const [selectedReport, setSelectedReport] = useState(null);
  const [historyReport, setHistoryReport] = useState(null);

  // Compute live KPIs
  const totalEmployees = employees.length;
  const totalCustomers = customers.length;
  const activeAssignments = assignments.filter(a => a.status === 'Approved').length;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const reportsToday = reports.filter(r => r.reportingDate === todayDateStr).length;
  
  const checkedInToday = attendance.filter(a => a.date === todayDateStr && (a.status === 'Checked In' || a.status === 'Checked Out')).length;
  const attendanceRate = totalEmployees > 0 ? Math.round((checkedInToday / totalEmployees) * 100) : 0;
  const pendingReportsCount = Math.max(0, activeAssignments - reportsToday);

  // Weekly attendance trend dummy dataset for charts
  const weeklyAttendanceData = [
    { day: 'Mon', rate: 92, onTime: 88 },
    { day: 'Tue', rate: 95, onTime: 91 },
    { day: 'Wed', rate: 89, onTime: 86 },
    { day: 'Thu', rate: 96, onTime: 94 },
    { day: 'Fri', rate: 94, onTime: 90 },
    { day: 'Sat', rate: 84, onTime: 81 },
    { day: 'Sun (Today)', rate: attendanceRate || 91, onTime: attendanceRate ? Math.max(70, attendanceRate - 5) : 88 },
  ];

  // Shift-wise employee distribution
  const shiftColors = ['#245CE2', '#F59E0B', '#6366F1'];
  const shiftDistributionData = shifts.map((s, idx) => {
    const count = assignments.filter(a => a.shiftId === s.id && a.status === 'Approved').length;
    return {
      name: s.name.replace(' Shift', ''),
      value: count || (idx === 0 ? 3 : idx === 1 ? 2 : 2),
      color: shiftColors[idx % shiftColors.length],
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-[#172033] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 backdrop-blur-sm border border-blue-400/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Real-time Operational Telemetry
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Workforce Executive Command
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Monitor real-time shift allocations, automated attendance punch logs, and verified client shift reports across all active customer accounts.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => navigate('/admin/assignments')}
              className="bg-[#245CE2] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Assign Staff to Shift
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all backdrop-blur-sm"
            >
              <FileText className="w-4 h-4" />
              Review Daily Reports
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          subtitle="Registered staff"
          icon={Users}
          change="+2 this mo"
          trend="up"
          color="blue"
        />
        <StatCard
          title="Total Customers"
          value={totalCustomers}
          subtitle="Corporate accounts"
          icon={Building2}
          change="100% active"
          trend="up"
          color="purple"
        />
        <StatCard
          title="Active Allocations"
          value={activeAssignments}
          subtitle="Approved slots"
          icon={Briefcase}
          change="Balanced"
          trend="up"
          color="emerald"
        />
        <StatCard
          title="Reports Today"
          value={reportsToday}
          subtitle="Submissions logged"
          icon={FileText}
          change="Synced"
          trend="up"
          color="blue"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle="Punch-in adherence"
          icon={UserCheck}
          change="+4.2%"
          trend="up"
          color="emerald"
        />
        <StatCard
          title="Pending Reports"
          value={pendingReportsCount}
          subtitle="Shift wrap-ups due"
          icon={AlertCircle}
          change="On track"
          trend="up"
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Attendance Trend */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Attendance & On-Time Performance</h3>
              <p className="text-xs text-slate-500">Live trend comparison across 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-[#245CE2]"></span> Overall Attendance
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> On-Time Rate
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#245CE2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#245CE2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#245CE2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRate)" name="Attendance %" />
                <Area type="monotone" dataKey="onTime" stroke="#10B981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorOnTime)" name="On-Time %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift-Wise Distribution */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Shift Allocation Spread</h3>
              <span className="text-[11px] font-semibold text-[#245CE2] bg-blue-50 px-2 py-0.5 rounded-full">
                Active Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Personnel assigned by active shift template</p>

            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shiftDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {shiftDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            {shiftDistributionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-700">{item.name} Shift</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} Staff</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Tables: Recent Submissions & Today's Attendance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Report Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Shift Reports</h3>
              <p className="text-xs text-slate-500">Live submissions synced from staff devices</p>
            </div>
            <button
              onClick={() => navigate('/admin/reports')}
              className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {reports.slice(0, 4).map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{rep.employeeName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({rep.customerName})</span>
                    {rep.version > 1 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#245CE2]">
                        v{rep.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                    {rep.workCompleted}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rep.shiftName.split('(')[0]}
                    </span>
                    <span>Date: {rep.reportingDate}</span>
                  </div>
                </div>

                <Badge status={rep.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Live Attendance Overview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Attendance Overview</h3>
              <p className="text-xs text-slate-500">Real-time punch activity and shift status</p>
            </div>
            <button
              onClick={() => navigate('/admin/attendance')}
              className="text-xs font-bold text-[#245CE2] hover:underline flex items-center gap-1"
            >
              Full Log <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {attendance.slice(0, 5).map((att) => (
              <div key={att.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                    {att.employeeName.charAt(0)}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-bold text-slate-800 truncate">{att.employeeName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{att.customerName} • {att.shiftName}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <Badge status={att.status} />
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {att.checkInTime ? `In: ${att.checkInTime}` : 'Not checked in'}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
