import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

export const CustomerProfile = () => {
  const { selectedCustomerId } = useAuth();
  const { customers, assignments, employees } = useApp();

  const currentCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const activeAssignments = assignments.filter((a) => a.customerId === currentCust.id && a.status === 'Approved');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Enterprise Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg ring-4 ring-slate-100 flex-shrink-0"
            style={{ backgroundColor: currentCust.color || '#245CE2' }}
          >
            {currentCust.logoLetter || currentCust.companyName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentCust.companyName}
              </h2>
              <Badge status={currentCust.accountStatus} />
            </div>

            <p className="text-xs font-semibold text-[#245CE2] mt-1">
              {currentCust.industry} • Enterprise Client Account
            </p>

            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Contact: <strong className="text-slate-800">{currentCust.contactPerson}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentCust.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {currentCust.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Client Since {currentCust.joinedDate}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{currentCust.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated Personnel Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#245CE2]" />
          Personnel Currently Deployed to {currentCust.companyName} ({activeAssignments.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeAssignments.map((asg) => {
            const emp = employees.find((e) => e.id === asg.employeeId);
            return (
              <div
                key={asg.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={emp?.avatar}
                    alt={asg.employeeName}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{asg.employeeName}</span>
                    <span className="text-slate-500 text-[11px]">{asg.shiftName.split('(')[0]}</span>
                  </div>
                </div>

                <Badge status="Active Shift" variant="success" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
