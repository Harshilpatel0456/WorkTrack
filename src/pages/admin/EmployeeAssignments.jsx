import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const EmployeeAssignments = () => {
  const { assignments, employees, customers, shifts, createAssignment, updateAssignmentStatus } = useApp();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || '',
    employeeId: employees[0]?.id || '',
    shiftId: shifts[0]?.id || '',
    assignmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleOpenAssignModal = () => {
    setFormData({
      customerId: customers[0]?.id || '',
      employeeId: employees[0]?.id || '',
      shiftId: shifts[0]?.id || '',
      assignmentDate: new Date().toISOString().split('T')[0],
      notes: 'Standard shift allocation approved by Admin.',
    });
    setIsAssignModalOpen(true);
  };

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    const result = createAssignment(formData);
    if (result.success) {
      setIsAssignModalOpen(false);
    }
  };

  const filteredAssignments = assignments.filter((asg) => {
    const isTabMatch =
      activeTab === 'active'
        ? asg.status === 'Approved'
        : asg.status === 'Revoked' || asg.status === 'Completed';

    const matchesSearch =
      asg.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCustomer = customerFilter === 'All' || asg.customerId === customerFilter;
    const matchesShift = shiftFilter === 'All' || asg.shiftId === shiftFilter;

    return isTabMatch && matchesSearch && matchesCustomer && matchesShift;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#245CE2]" />
            Employee – Customer Shift Allocations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative allocation matrix. Assign personnel to client accounts across shifts with administrative authorization.
          </p>
        </div>

        <button
          onClick={handleOpenAssignModal}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Allocation
        </button>
      </div>

      {/* Business Rules Info Banner */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-[#245CE2] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Enterprise Allocation Policy Active:</span>
          <p className="text-blue-700 mt-0.5 leading-relaxed">
            One customer can have multiple staff members. One staff member can be allocated across multiple customers on distinct shifts. Only Admin approvals grant access to the customer workspace.
          </p>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 md:flex-none ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Allocations ({assignments.filter((a) => a.status === 'Approved').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 md:flex-none ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assignment History ({assignments.filter((a) => a.status !== 'Approved').length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
          >
            <option value="All">All Clients</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Allocated Staff</th>
                <th className="py-3.5 px-4">Client Organization</th>
                <th className="py-3.5 px-4">Shift Schedule</th>
                <th className="py-3.5 px-4">Assignment Date</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4">Administrative Notes</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No assignment records found for this view.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Staff */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#245CE2] flex items-center justify-center font-bold text-xs">
                          {asg.employeeName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{asg.employeeName}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {asg.customerName}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-100 text-slate-800 font-medium px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#245CE2]" />
                        {asg.shiftName}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {asg.assignmentDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge status={asg.status} />
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {asg.notes}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {asg.status === 'Approved' ? (
                        <button
                          onClick={() => updateAssignmentStatus(asg.id, 'Revoked')}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors border border-rose-200"
                          title="Revoke access"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => updateAssignmentStatus(asg.id, 'Approved')}
                          className="px-2.5 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors border border-emerald-200"
                          title="Re-approve assignment"
                        >
                          Re-approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Create Employee – Customer Allocation"
        subtitle="Allocate staff to a client enterprise under a specific shift template"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Client Customer Account *
            </label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.industry})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Employee to Allocate *
            </label>
            <select
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeId} • {emp.roleTitle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Shift Schedule *
            </label>
            <select
              required
              value={formData.shiftId}
              onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} – {s.endTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assignment Effective Date
            </label>
            <input
              type="date"
              required
              value={formData.assignmentDate}
              onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Administrative Assignment Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Lead technician for CNC milling line..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Authorize & Assign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
