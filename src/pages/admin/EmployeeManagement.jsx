import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  Power,
  Mail,
  Phone,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeRecords, customerRecords, assignmentRecords] = await Promise.all([
        adminApi.employees.list(),
        adminApi.customers.list(),
        adminApi.assignments.list(),
      ]);
      setCustomers(customerRecords.map((customer) => ({
        ...customer,
        companyName: customer.companyName,
      })));
      setAssignments(assignmentRecords);
      setEmployees(employeeRecords.map((employee) => ({
        ...employee,
        name: employee.fullName || [employee.firstName, employee.lastName].filter(Boolean).join(' '),
        status: employee.status === 'ON_LEAVE'
          ? 'On Leave'
          : employee.status === 'INACTIVE' ? 'Inactive' : 'Active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        assignedCustomerIds: assignmentRecords
          .filter((assignment) => assignment.employeeId === employee.id && assignment.status === 'ACTIVE')
          .map((assignment) => assignment.customerId),
      })));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load employee management data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    joiningDate: new Date().toISOString().split('T')[0],
    roleTitle: '',
    department: 'Operations',
    status: 'Active',
    password: '',
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      email: '',
      phone: '',
      joiningDate: new Date().toISOString().split('T')[0],
      roleTitle: 'Field Specialist',
      department: 'Operations',
      status: 'Active',
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      employeeId: emp.employeeId,
      email: emp.email,
      phone: emp.phone || '',
      joiningDate: emp.joiningDate,
      roleTitle: emp.roleTitle,
      department: emp.department,
      status: emp.status,
      address: emp.address || '',
    });
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    const [firstName, ...lastName] = formData.name.trim().split(/\s+/);
    setSaving(true);
    setError('');
    try {
      await adminApi.employees.create({
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim().toLowerCase(),
        firstName,
        lastName: lastName.join(' '),
        password: formData.password,
        phone: formData.phone,
        roleTitle: formData.roleTitle,
        department: formData.department,
        joiningDate: formData.joiningDate,
        status: formData.status.toUpperCase().replace(' ', '_'),
      });
      setIsAddModalOpen(false);
      setNotice('Employee account created.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;
    const [firstName, ...lastName] = formData.name.trim().split(/\s+/);
    setSaving(true);
    setError('');
    try {
      await adminApi.employees.update(editingEmployee.id, {
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim().toLowerCase(),
        firstName,
        lastName: lastName.join(' '),
        phone: formData.phone,
        roleTitle: formData.roleTitle,
        department: formData.department,
        joiningDate: formData.joiningDate,
        status: formData.status.toUpperCase().replace(' ', '_'),
        address: formData.address,
      });
      setEditingEmployee(null);
      setNotice('Employee information updated.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (employee) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.employees.toggleStatus(employee.id);
      setNotice(`Employee ${employee.status === 'Active' ? 'deactivated' : 'activated'}.`);
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to change employee status.');
    } finally {
      setSaving(false);
    }
  };

  // Filtering
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;
    const matchesCustomer =
      customerFilter === 'All' || (emp.assignedCustomerIds && emp.assignedCustomerIds.includes(customerFilter));

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#245CE2]" />
            Employee Workforce Roster
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage staff accounts, credentials, contact details and customer field allocations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Employee
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          {/* Customer Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#245CE2] w-full sm:w-auto"
            >
              <option value="All">All Client Allocations</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 sm:px-6">Employee</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4">Assigned Clients</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-400">Loading employees…</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No employees matching the search filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const assignedCustomerNames = (emp.assignedCustomerIds || [])
                    .map((cid) => customers.find((c) => c.id === cid)?.companyName)
                    .filter(Boolean);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.roleTitle}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#245CE2]">
                        {emp.employeeId}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {emp.email}
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {emp.phone}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {emp.joiningDate}
                      </td>

                      {/* Assigned Customers */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {assignedCustomerNames.length === 0 ? (
                            <span className="text-[11px] text-slate-400">Unassigned</span>
                          ) : (
                            assignedCustomerNames.map((cName, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                              >
                                {cName}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge status={emp.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setViewingEmployee(emp)}
                            className="p-1.5 text-slate-400 hover:text-[#245CE2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Employee Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Employee Information"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => handleToggleStatus(emp)}
                            disabled={saving}
                            className={`p-1.5 rounded-lg transition-colors ${
                              emp.status === 'Active'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={emp.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        subtitle="Register a new staff member into the WorkTrack workforce directory"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Diya Patel"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="EMP-108"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Work Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@worktrack.demo"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Joining Date
              </label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role / Title
              </label>
              <input
                type="text"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                placeholder="Senior Field Engineer"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Register Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title="Edit Employee Information"
        subtitle={`Update account and role details for ${editingEmployee?.name}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employee ID
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role Title
              </label>
              <input
                type="text"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingEmployee(null)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Update Record
            </button>
          </div>
        </form>
      </Modal>

      {/* View Employee Details Modal */}
      <Modal
        isOpen={!!viewingEmployee}
        onClose={() => setViewingEmployee(null)}
        title="Employee Personnel Card"
        subtitle={`System record for ${viewingEmployee?.name} (${viewingEmployee?.employeeId})`}
      >
        {viewingEmployee && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src={viewingEmployee.avatar}
                alt={viewingEmployee.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#245CE2]/20"
              />
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingEmployee.name}</h3>
                <p className="text-slate-500 font-medium">{viewingEmployee.roleTitle} • {viewingEmployee.department}</p>
                <div className="mt-1.5">
                  <Badge status={viewingEmployee.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-medium block">Employee Code</span>
                <span className="font-bold text-slate-800 font-mono mt-0.5 block">{viewingEmployee.employeeId}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-medium block">Joining Date</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{viewingEmployee.joiningDate}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-medium block">Direct Email</span>
                <span className="font-bold text-slate-800 mt-0.5 block truncate">{viewingEmployee.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-slate-400 font-medium block">Direct Phone</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{viewingEmployee.phone}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">
                Currently Assigned Customer Accounts
              </h4>
              <div className="space-y-1.5">
                {(viewingEmployee.assignedCustomerIds || []).map((cid) => {
                  const cust = customers.find((c) => c.id === cid);
                  return (
                    <div key={cid} className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">{cust?.companyName || 'Client'}</span>
                      <span className="text-slate-500">{cust?.industry}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
