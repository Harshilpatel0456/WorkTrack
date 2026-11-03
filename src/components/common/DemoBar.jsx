import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Building2, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { DEMO_MODE } from '../../services/demoMode';

export const DemoBar = () => {
  const { role, quickLoginAs, switchPersona, selectedEmployeeId, selectedCustomerId } = useAuth();
  const { employees, customers, resetDemoData } = useApp();
  const navigate = useNavigate();

  if (!DEMO_MODE) {
    return (
      <div className="bg-amber-50 text-amber-900 px-6 py-2 border-b border-amber-200 text-xs">
        Live account authentication is enabled. Business pages not yet API-integrated may still show sample data.
      </div>
    );
  }

  const handleRoleChange = (targetRole) => {
    quickLoginAs(targetRole);
    if (targetRole === 'admin') navigate('/admin');
    if (targetRole === 'employee') navigate('/employee');
    if (targetRole === 'customer') navigate('/customer');
  };

  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    switchPersona('employee', id);
  };

  const handleCustomerChange = (e) => {
    const id = e.target.value;
    switchPersona('customer', id);
  };

  return (
    <div className="bg-[#172033] text-white pl-6 sm:pl-7 pr-4 py-2 border-b border-slate-700/60 text-xs flex flex-wrap items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold tracking-wider text-slate-300 uppercase">
          WorkTrack Demo Mode
        </span>
        <span className="hidden sm:inline-block text-slate-500">|</span>
        <span className="hidden md:inline-block text-slate-400">
          Role Switcher for Faculty & Stakeholder Evaluation
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Role Switcher Tabs */}
        <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => handleRoleChange('admin')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              role === 'admin'
                ? 'bg-[#245CE2] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>

          <button
            onClick={() => handleRoleChange('employee')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              role === 'employee'
                ? 'bg-[#245CE2] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Employee
          </button>

          <button
            onClick={() => handleRoleChange('customer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              role === 'customer'
                ? 'bg-[#245CE2] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Customer
          </button>
        </div>

        {/* Persona Selectors depending on Role */}
        {role === 'employee' && (
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Active Staff:</span>
            <select
              value={selectedEmployeeId || 'emp-1'}
              onChange={handleEmployeeChange}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} className="bg-slate-800 text-white">
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>
        )}

        {role === 'customer' && (
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-[11px]">Active Client:</span>
            <select
              value={selectedCustomerId || 'cust-1'}
              onChange={handleCustomerChange}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              {customers.map(cust => (
                <option key={cust.id} value={cust.id} className="bg-slate-800 text-white">
                  {cust.companyName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reset Demo Data Button */}
        <button
          onClick={resetDemoData}
          title="Reset sample data back to pristine state"
          className="flex items-center gap-1 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-transparent hover:border-rose-800/50 transition-all text-[11px]"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>
      </div>
    </div>
  );
};
