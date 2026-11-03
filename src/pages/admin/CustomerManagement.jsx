import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Eye,
  Power,
  Users,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Layers,
} from 'lucide-react';

export const CustomerManagement = () => {
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
      const [customerRecords, assignmentRecords] = await Promise.all([
        adminApi.customers.list(),
        adminApi.assignments.list(),
      ]);
      setCustomers(customerRecords.map((customer) => ({
        ...customer,
        accountStatus: customer.accountStatus === 'SUSPENDED'
          ? 'Suspended'
          : customer.accountStatus === 'TRIAL' ? 'Trial' : 'Active',
        color: customer.brandColor,
        logoLetter: customer.companyName?.charAt(0)?.toUpperCase() || 'C',
      })));
      setAssignments(assignmentRecords.map((assignment) => ({
        ...assignment,
        status: assignment.status === 'ACTIVE' ? 'Approved' : assignment.status,
      })));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load customer management data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    industry: 'Enterprise Services',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    accountStatus: 'Active',
    notes: '',
    password: '',
  });

  const handleOpenAdd = () => {
    setFormData({
      companyName: '',
      industry: 'Enterprise Services',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      accountStatus: 'Active',
      notes: '',
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      companyName: cust.companyName,
      industry: cust.industry || 'Enterprise Services',
      contactPerson: cust.contactPerson,
      email: cust.email,
      phone: cust.phone || '',
      address: cust.address || '',
      accountStatus: cust.accountStatus,
      notes: cust.notes || '',
    });
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.customers.create({
        companyName: formData.companyName.trim(),
        industry: formData.industry,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        accountStatus: 'ACTIVE',
      });
      setIsAddModalOpen(false);
      setNotice('Customer account created.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.customers.update(editingCustomer.id, {
        companyName: formData.companyName.trim(),
        industry: formData.industry,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        address: formData.address,
        timezone: editingCustomer.timezone,
        brandColor: editingCustomer.brandColor,
        accountStatus: editingCustomer.accountStatus.toUpperCase(),
      });
      setEditingCustomer(null);
      setNotice('Customer profile updated.');
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to update customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (customer) => {
    setSaving(true);
    setError('');
    try {
      await adminApi.customers.toggleStatus(customer.id);
      setNotice(`Customer account ${customer.accountStatus === 'Active' ? 'suspended' : 'activated'}.`);
      await loadData();
    } catch (saveError) {
      setError(saveError.message || 'Unable to change customer status.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter((cust) => {
    return (
      (cust.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#245CE2]" />
            Client Accounts & Corporate Customers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage customer accounts, contacts, and employee allocations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, contact person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredCustomers.length}</span> client partners
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">Loading customers…</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">No customer accounts found.</div>
        ) : filteredCustomers.map((cust) => {
          // Count active allocations for this customer
          const customerAssignments = assignments.filter(
            (a) => a.customerId === cust.id && a.status === 'Approved'
          );

          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
                      style={{ backgroundColor: cust.color || '#245CE2' }}
                    >
                      {cust.logoLetter || cust.companyName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{cust.companyName}</h3>
                      <p className="text-[11px] text-slate-400 font-medium">{cust.industry}</p>
                    </div>
                  </div>
                  <Badge status={cust.accountStatus} />
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#245CE2]" /> Primary Contact:
                    </span>
                    <span className="font-semibold text-slate-800">{cust.contactPerson}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Portal Email:
                    </span>
                    <span className="font-mono text-slate-700 text-[11px] truncate max-w-[200px]">
                      {cust.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                    </span>
                    <span className="text-slate-700">{cust.phone}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5 flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address:
                    </span>
                    <span className="text-slate-700 text-right truncate text-[11px]">{cust.address}</span>
                  </div>
                </div>
              </div>

              {/* Bottom stats & action buttons */}
              <div className="mt-4 pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-[#245CE2] font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {customerAssignments.length} Assigned Staff
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingCustomer(cust)}
                    className="p-1.5 text-slate-400 hover:text-[#245CE2] hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Customer Workspace"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(cust)}
                    disabled={saving}
                    className={`p-1.5 rounded-lg transition-colors ${
                      cust.accountStatus === 'Active'
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={cust.accountStatus !== 'Suspended' ? 'Suspend Account' : 'Activate Account'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Corporate Customer"
        subtitle="Provision a new enterprise client account for shift management and reporting"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Apex Industrial Solutions"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Logistics, Manufacturing, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Contact Person *
              </label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Portal Login Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@company.com"
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
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Facility Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street, City, State ZIP"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account Notes & Shift Instructions
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Specific reporting or compliance notes..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
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
              Provision Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Edit Customer Profile"
        subtitle={`Update account settings for ${editingCustomer?.companyName}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary Contact
              </label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email
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
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingCustomer(null)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer Details Modal */}
      <Modal
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        title="Customer Enterprise Profile"
        subtitle={`Account details and allocated workforce for ${viewingCustomer?.companyName}`}
      >
        {viewingCustomer && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewingCustomer.companyName}</h3>
                <p className="text-slate-500 font-medium">{viewingCustomer.industry} • Contact: {viewingCustomer.contactPerson}</p>
                <p className="text-slate-400 text-[11px] mt-1">{viewingCustomer.address}</p>
              </div>
              <Badge status={viewingCustomer.accountStatus} />
            </div>

            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#245CE2]" />
                Assigned Employees Across Shifts
              </h4>

              <div className="space-y-2">
                {assignments
                  .filter((a) => a.customerId === viewingCustomer.id && a.status === 'Approved')
                  .map((asg) => (
                    <div
                      key={asg.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{asg.employeeName}</span>
                        <span className="text-slate-500 text-[11px]">{asg.employeeCode}</span>
                      </div>
                      <Badge status="Active Allocation" variant="success" />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
