import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import {
  CalendarDays,
  Clock,
  Building2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';

export const MyShifts = () => {
  const { selectedEmployeeId } = useAuth();
  const { assignments, customers, shifts, employees } = useApp();

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];

  // Business rule: Employees must only see approved customer assignments!
  const myApprovedAssignments = assignments.filter(
    (a) => a.employeeId === currentEmp.id && a.status === 'Approved'
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#245CE2]" />
            My Approved Shifts & Client Deployments
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official authorized deployments. Personnel are only permitted on-site for shifts approved by administration.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          {myApprovedAssignments.length} Active Authorizations
        </div>
      </div>

      {/* Grid of Approved Shifts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myApprovedAssignments.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No approved shift assignments currently assigned to your profile.
          </div>
        ) : (
          myApprovedAssignments.map((asg) => {
            const customer = customers.find((c) => c.id === asg.customerId);
            const shift = shifts.find((s) => s.id === asg.shiftId);

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm"
                        style={{ backgroundColor: customer?.color || '#245CE2' }}
                      >
                        {customer?.logoLetter || 'C'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{asg.customerName}</h3>
                        <p className="text-[11px] text-slate-500">{customer?.industry}</p>
                      </div>
                    </div>
                    <Badge status="Approved" variant="success" />
                  </div>

                  {/* Shift details */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#245CE2]" /> Shift Window:
                      </span>
                      <span className="font-bold text-slate-800">{asg.shiftName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Effective Date:
                      </span>
                      <span className="font-mono text-slate-700">{asg.assignmentDate}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Authorization:
                      </span>
                      <span className="font-medium text-emerald-700">Verified by Admin</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  {customer && (
                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-600 truncate">{customer.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-600">On-site Contact: {customer.contactPerson} ({customer.phone})</span>
                      </div>
                    </div>
                  )}

                  {asg.notes && (
                    <div className="mt-3 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                      <span className="font-bold">Work Scope: </span>
                      {asg.notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Allocation Ref: {asg.id}</span>
                  <span className="text-emerald-600 font-bold">Active in Roster</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
