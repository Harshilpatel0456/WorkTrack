import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import {
  Users,
  Clock,
  UserCheck,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const CustomerAssignedEmployees = () => {
  const { selectedCustomerId } = useAuth();
  const { customers, assignments, employees, shifts, attendance, reports } = useApp();

  const currentCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Approved assignments for this client
  const custAssignments = assignments.filter(
    (a) => a.customerId === currentCust.id && a.status === 'Approved'
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#245CE2]" />
            Assigned Personnel & On-Site Workforce
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Certified personnel allocated to {currentCust.companyName} across operational shifts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#245CE2] px-3.5 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          {custAssignments.length} Verified Staff Allocated
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {custAssignments.length === 0 ? (
          <div className="col-span-3 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No employees currently allocated to this client organization.
          </div>
        ) : (
          custAssignments.map((asg) => {
            const emp = employees.find((e) => e.id === asg.employeeId);
            const shift = shifts.find((s) => s.id === asg.shiftId);

            // Today's attendance
            const att = attendance.find(
              (a) => a.employeeId === asg.employeeId && a.customerId === currentCust.id && a.date === todayDateStr
            );

            // Latest report
            const rep = reports.find(
              (r) => r.employeeId === asg.employeeId && r.customerId === currentCust.id && r.reportingDate === todayDateStr
            );

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Avatar, Name & ID */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <img
                      src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={asg.employeeName}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{asg.employeeName}</h3>
                      <p className="text-[11px] font-mono text-[#245CE2] font-semibold">{emp?.employeeId}</p>
                      <p className="text-[11px] text-slate-400 truncate">{emp?.roleTitle}</p>
                    </div>
                  </div>

                  {/* Shift Information */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#245CE2]" /> Shift Window:
                      </span>
                      <span className="font-bold text-slate-800">{shift?.name || asg.shiftName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Timings:</span>
                      <span className="font-mono text-slate-700 font-semibold text-[11px]">
                        {shift ? `${shift.startTime} – ${shift.endTime}` : '08:00 – 16:00'}
                      </span>
                    </div>
                  </div>

                  {/* Statuses: Attendance & Latest Report */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Today's Attendance:
                      </span>
                      <Badge status={att ? att.status : 'Scheduled'} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" /> Today's Report:
                      </span>
                      <Badge status={rep ? `Submitted (v${rep.version || 1})` : 'Pending'} />
                    </div>
                  </div>
                </div>

                {/* Footer contact button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{emp?.email}</span>
                  <span className="font-bold text-[#245CE2]">Active Staff</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
