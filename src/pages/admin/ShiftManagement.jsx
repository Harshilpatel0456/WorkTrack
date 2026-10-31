import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  Plus,
  Users,
  Building2,
  Calendar,
  Edit2,
  CheckCircle,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

export const ShiftManagement = () => {
  const { shifts, assignments, employees, customers, createShift, updateShift } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00 AM',
    endTime: '04:00 PM',
    description: '',
  });

  const getShiftIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('morning')) return <Sun className="w-5 h-5 text-amber-500" />;
    if (n.includes('afternoon')) return <Sunset className="w-5 h-5 text-orange-500" />;
    return <Moon className="w-5 h-5 text-indigo-500" />;
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      startTime: '08:00 AM',
      endTime: '04:00 PM',
      description: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      description: shift.description,
    });
  };

  const handleSaveCreate = (e) => {
    e.preventDefault();
    createShift(formData);
    setIsCreateModalOpen(false);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingShift) return;
    updateShift(editingShift.id, formData);
    setEditingShift(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#245CE2]" />
            Shift Template & Schedule Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure enterprise shift windows, operational intervals, and multi-staff coverage models.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-[#245CE2] hover:bg-[#1A45B0] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Shift
        </button>
      </div>

      {/* Shift Templates Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {shifts.map((shift) => {
          // Find personnel assigned to this shift
          const shiftAssignments = assignments.filter(
            (a) => a.shiftId === shift.id && a.status === 'Approved'
          );

          return (
            <div
              key={shift.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      {getShiftIcon(shift.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{shift.name}</h3>
                      <p className="text-[11px] font-mono font-bold text-[#245CE2] mt-0.5">
                        {shift.startTime} – {shift.endTime}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(shift)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Shift Window"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[36px]">
                  {shift.description}
                </p>

                {/* Allocated Personnel */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#245CE2]" />
                      Personnel Allocated ({shiftAssignments.length})
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {shiftAssignments.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-2">
                        No active staff assigned to this shift.
                      </div>
                    ) : (
                      shiftAssignments.map((asg) => (
                        <div
                          key={asg.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-800">{asg.employeeName}</span>
                          <span className="text-[10px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[130px]">
                            {asg.customerName}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Standard 8-hour window</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> System Standard
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocation Matrix Visualizer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Customer Shift Coverage Matrix</h3>
        <p className="text-xs text-slate-500 mb-4">
          Visualizing that different employees are seamlessly assigned to the same customer across separate shift intervals.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-4">Client Enterprise</th>
                <th className="py-3 px-4">Morning Shift (06:00 - 14:00)</th>
                <th className="py-3 px-4">Afternoon Shift (14:00 - 22:00)</th>
                <th className="py-3 px-4">Night Shift (22:00 - 06:00)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((cust) => {
                const morningStaff = assignments.filter(
                  (a) => a.customerId === cust.id && a.shiftId === 'shift-1' && a.status === 'Approved'
                );
                const afternoonStaff = assignments.filter(
                  (a) => a.customerId === cust.id && a.shiftId === 'shift-2' && a.status === 'Approved'
                );
                const nightStaff = assignments.filter(
                  (a) => a.customerId === cust.id && a.shiftId === 'shift-3' && a.status === 'Approved'
                );

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: cust.color || '#245CE2' }}
                      >
                        {cust.logoLetter}
                      </div>
                      {cust.companyName}
                    </td>

                    {/* Morning */}
                    <td className="py-3.5 px-4">
                      {morningStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-300">Uncovered</span>
                      ) : (
                        morningStaff.map((m) => (
                          <span
                            key={m.id}
                            className="inline-block bg-blue-50 text-[#245CE2] font-semibold text-[11px] px-2 py-0.5 rounded-md mr-1"
                          >
                            {m.employeeName}
                          </span>
                        ))
                      )}
                    </td>

                    {/* Afternoon */}
                    <td className="py-3.5 px-4">
                      {afternoonStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-300">Uncovered</span>
                      ) : (
                        afternoonStaff.map((a) => (
                          <span
                            key={a.id}
                            className="inline-block bg-amber-50 text-amber-700 font-semibold text-[11px] px-2 py-0.5 rounded-md mr-1"
                          >
                            {a.employeeName}
                          </span>
                        ))
                      )}
                    </td>

                    {/* Night */}
                    <td className="py-3.5 px-4">
                      {nightStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-300">Uncovered</span>
                      ) : (
                        nightStaff.map((n) => (
                          <span
                            key={n.id}
                            className="inline-block bg-indigo-50 text-indigo-700 font-semibold text-[11px] px-2 py-0.5 rounded-md mr-1"
                          >
                            {n.employeeName}
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shift Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Shift Window"
        subtitle="Establish a new recurring work interval for staff allocations"
      >
        <form onSubmit={handleSaveCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Shift Title *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Weekend Special Ops"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Time *
              </label>
              <input
                type="text"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="08:00 AM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Time *
              </label>
              <input
                type="text"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="04:00 PM"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Protocol Notes
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Operational responsibilities during this window..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Create Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Shift Modal */}
      <Modal
        isOpen={!!editingShift}
        onClose={() => setEditingShift(null)}
        title="Edit Shift Window"
        subtitle={`Adjust operating parameters for ${editingShift?.name}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Shift Title
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="text"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="text"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#245CE2]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingShift(null)}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#245CE2] hover:bg-[#1A45B0] text-white rounded-xl font-bold transition-all shadow-md"
            >
              Update Shift
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
