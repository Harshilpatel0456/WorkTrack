import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  Award,
} from 'lucide-react';

export const EmployeeProfile = () => {
  const { selectedEmployeeId } = useAuth();
  const { employees, assignments, customers, shifts } = useApp();

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const myAssignments = assignments.filter((a) => a.employeeId === currentEmp.id && a.status === 'Approved');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={currentEmp.avatar}
            alt={currentEmp.name}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/10 shadow-md"
          />

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentEmp.name}
              </h2>
              <Badge status={currentEmp.status} />
            </div>

            <p className="text-xs font-semibold text-[#245CE2] mt-1">
              {currentEmp.roleTitle} • {currentEmp.department}
            </p>

            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">ID:</span>
                <strong className="text-slate-800">{currentEmp.employeeId}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentEmp.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {currentEmp.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {currentEmp.joiningDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Shift Authorizations */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#245CE2]" />
          Authorized Client Deployments ({myAssignments.length})
        </h3>

        <div className="space-y-3">
          {myAssignments.map((asg) => {
            const customer = customers.find((c) => c.id === asg.customerId);
            return (
              <div
                key={asg.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {asg.customerName}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {asg.shiftName} • Assigned: {asg.assignmentDate}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approved Deployment
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
